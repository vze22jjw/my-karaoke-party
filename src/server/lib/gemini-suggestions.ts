/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import axios from "axios";
import { z } from "zod";
import { env } from "~/env";
import { cache } from "../cache";
import { db } from "../db";
import { artworkService } from "./artwork-service";
import { ALL_PRESET_PILLS } from "~/config/theme-presets";
import { PRESET_SEED_DATA } from "./seed-presets-data";
import { debugLog } from "~/utils/debug-logger";

const LOG_TAG = "[GeminiSuggestions]";

export const SuggestedSongSchema = z.object({
  title: z.string(),
  artist: z.string(),
  year: z.union([z.string(), z.number()]).transform((v) => String(v)).optional(),
  coverUrl: z.string().optional(),
  reason: z.string().optional(),
});

export type SuggestedSong = z.infer<typeof SuggestedSongSchema>;

export type ThemedSuggestionsResponse = {
  songs: SuggestedSong[];
  isBlockedBySafety?: boolean;
};

type GeminiResponsePart = {
  text?: string;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiResponsePart[];
  };
  finishReason?: string;
};

type PromptFeedback = {
  blockReason?: string;
  safetyRatings?: Array<{
    category: string;
    probability: string;
  }>;
};

type GeminiApiResponse = {
  candidates?: GeminiCandidate[];
  promptFeedback?: PromptFeedback;
};

const GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3-flash-preview",
];

export const TEST_SAFETY_TRIGGER = "twelve rubber chicken soup set on fire";
export const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

/**
 * Normalizes and formats theme prompts by removing redundant keywords
 * and prefixing all prompts with "karaoke singalongs".
 */
export function formatThemePrompt(themePrompt: string): string {
  const cleaned = themePrompt
    .replace(/\bkaraoke\b/gi, "")
    .replace(/\bsingalongs?\b/gi, "")
    .replace(/\bcrowd[- ]pleasers?\b/gi, "")
    .replace(/\bchart[- ]toppers?\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > 0
    ? `karaoke singalongs: ${cleaned}`
    : `karaoke singalongs: popular party hits`;
}

export const geminiSuggestionsService = {
  isConfigured(): boolean {
    return !!env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0;
  },

  /**
   * Directly calls Google Gemini API to generate songs, enriches with iTunes artwork,
   * and persists into PostgreSQL suggestionCache.
   */
  async fetchSongsFromGemini(
    themePrompt: string,
    count = 10,
    category?: string,
    subTheme?: string
  ): Promise<ThemedSuggestionsResponse> {
    const normalizedPrompt = themePrompt.toLowerCase().trim();

    // 0. Safety trigger test pattern
    if (normalizedPrompt.includes(TEST_SAFETY_TRIGGER)) {
      debugLog(LOG_TAG, `Safety test trigger matched: "${themePrompt}"`);
      return { songs: [], isBlockedBySafety: true };
    }

    const normalizedKey = `gemini_theme:${normalizedPrompt}`;
    const apiKey = env.GEMINI_API_KEY!;
    const effectiveTheme = formatThemePrompt(themePrompt);
    const promptText = `You are an expert Karaoke DJ and party curator.
Return a JSON array containing EXACTLY ${count} unique, iconic songs for the theme: "${effectiveTheme}".
Guidelines:
- Provide a diverse, high-energy rotation of famous songs across different artists in this style.
- Pick songs that people love to sing along with and are available on YouTube.
- Output fields for each item: title, artist, year.
- Do not return duplicate songs.`;

    let safetyBlocked = false;

    for (const modelName of GEMINI_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      try {
        debugLog(LOG_TAG, `Calling Gemini API (${modelName}) for theme: "${effectiveTheme}"`);

        const response = await axios.post<GeminiApiResponse>(
          url,
          {
            contents: [
              {
                parts: [{ text: promptText }],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 1.0,
              topP: 0.95,
            },
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 35000,
          }
        );

        // Check for Google safety blocks
        const blockReason = response.data?.promptFeedback?.blockReason;
        const candidateFinishReason = response.data?.candidates?.[0]?.finishReason;

        if (
          blockReason === "SAFETY" ||
          blockReason === "PROHIBITED_CONTENT" ||
          blockReason === "BLOCKLIST" ||
          candidateFinishReason === "SAFETY" ||
          candidateFinishReason === "PROHIBITED_CONTENT"
        ) {
          debugLog(LOG_TAG, `Prompt flagged by Gemini safety filter (${blockReason ?? candidateFinishReason}): "${themePrompt}"`);
          safetyBlocked = true;
          break;
        }

        const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          debugLog(LOG_TAG, `Empty response received from Gemini API on ${modelName}`);
          continue;
        }

        // Check if Gemini returned a refusal
        if (
          rawText.toLowerCase().includes("cannot fulfill this request") ||
          rawText.toLowerCase().includes("unable to fulfill this request") ||
          rawText.toLowerCase().includes("i cannot provide") ||
          rawText.toLowerCase().includes("i am unable to provide")
        ) {
          debugLog(LOG_TAG, `Refusal text returned by Gemini on ${modelName} for "${themePrompt}"`);
          safetyBlocked = true;
          break;
        }

        const parsedJson = JSON.parse(rawText) as unknown;
        const parsedArray = z.array(SuggestedSongSchema).safeParse(parsedJson);

        if (!parsedArray.success) {
          console.warn(LOG_TAG, "Failed to parse structured JSON from Gemini:", parsedArray.error);
          continue;
        }

        const rawSongs = parsedArray.data.slice(0, count);

        if (rawSongs.length > 0) {
          // Enrich with iTunes high-res artwork
          debugLog(LOG_TAG, `Enriching ${rawSongs.length} songs with cover artwork...`);
          const enrichedSongs = await artworkService.enrichSongsWithArtwork(rawSongs);

          // Persist to PostgreSQL Database with updated timestamp
          try {
            await db.suggestionCache.upsert({
              where: { cacheKey: normalizedKey },
              update: {
                songs: enrichedSongs,
                category: category ?? null,
                subTheme: subTheme ?? null,
                updatedAt: new Date(),
              },
              create: {
                cacheKey: normalizedKey,
                songs: enrichedSongs,
                category: category ?? null,
                subTheme: subTheme ?? null,
              },
            });
            debugLog(LOG_TAG, `Persisted ${enrichedSongs.length} songs to PostgreSQL DB for "${themePrompt}"`);
          } catch (dbSaveErr) {
            console.error(LOG_TAG, "Failed to save songs to PostgreSQL DB:", dbSaveErr);
          }

          // Cache in Memory (7 days)
          await cache.set(normalizedKey, enrichedSongs, 60 * 60 * 24 * 7);

          return { songs: enrichedSongs };
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const data = error.response?.data as { promptFeedback?: PromptFeedback; error?: { message?: string } } | undefined;
          if (data?.promptFeedback?.blockReason === "SAFETY" || data?.error?.message?.includes("SAFETY")) {
            safetyBlocked = true;
            break;
          }
          console.warn(LOG_TAG, `Gemini API error on ${modelName}:`, status ?? error.message);
        } else {
          console.warn(LOG_TAG, `Unexpected error on ${modelName}:`, error);
        }
      }
    }

    if (safetyBlocked) {
      return { songs: [], isBlockedBySafety: true };
    }

    return { songs: [] };
  },

  async generateSongsForTheme(
    themePrompt: string,
    count = 10,
    category?: string,
    subTheme?: string,
    forceFresh = false
  ): Promise<ThemedSuggestionsResponse> {
    const normalizedPrompt = themePrompt.toLowerCase().trim();

    // 0. Safety trigger test pattern
    if (normalizedPrompt.includes(TEST_SAFETY_TRIGGER)) {
      debugLog(LOG_TAG, `Safety test trigger matched: "${themePrompt}"`);
      return { songs: [], isBlockedBySafety: true };
    }

    const normalizedKey = `gemini_theme:${normalizedPrompt}`;

    // 1. If not forcing fresh, check In-Memory Cache
    if (!forceFresh) {
      const cached = await cache.get<SuggestedSong[]>(normalizedKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        debugLog(LOG_TAG, `Memory Cache Hit for theme: "${themePrompt}" (${cached.length} songs)`);
        return { songs: cached as SuggestedSong[] };
      }

      // 2. Check PostgreSQL Database Cache (with 1-week TTL validation)
      try {
        const dbEntry = await db.suggestionCache.findUnique({
          where: { cacheKey: normalizedKey },
        });

        if (dbEntry && Array.isArray(dbEntry.songs) && dbEntry.songs.length > 0) {
          const ageMs = Date.now() - new Date(dbEntry.updatedAt ?? dbEntry.createdAt).getTime();
          const isStale = this.isConfigured() && ageMs > ONE_WEEK_MS;

          if (!isStale) {
            const parsed = z.array(SuggestedSongSchema).safeParse(dbEntry.songs);
            if (parsed.success && parsed.data.length > 0) {
              debugLog(LOG_TAG, `DB Cache Hit for theme: "${themePrompt}" (${parsed.data.length} songs)`);
              await cache.set(normalizedKey, parsed.data, 60 * 60 * 24 * 7);
              return { songs: parsed.data };
            }
          } else {
            debugLog(LOG_TAG, `DB Cache Stale (>1 week old) for theme: "${themePrompt}". Refreshing from Gemini.`);
          }
        }
      } catch (dbErr) {
        debugLog(LOG_TAG, "DB Cache lookup error:", dbErr instanceof Error ? dbErr.message : String(dbErr));
      }
    }

    // If Gemini is not configured, check for static seed match
    if (!this.isConfigured()) {
      debugLog(LOG_TAG, "GEMINI_API_KEY not configured. Checking seed presets.");
      const matchingPill = ALL_PRESET_PILLS.find((p) => p.promptGuide.toLowerCase().trim() === themePrompt.toLowerCase().trim());
      if (matchingPill && PRESET_SEED_DATA[matchingPill.id]) {
        const seedEntry = PRESET_SEED_DATA[matchingPill.id]!;
        const enriched = await artworkService.enrichSongsWithArtwork(seedEntry.songs);
        return { songs: enriched };
      }
      return { songs: [] };
    }

    // 3. Generate from Google Gemini API
    const geminiResult = await this.fetchSongsFromGemini(themePrompt, count, category, subTheme);
    if (geminiResult.songs.length > 0 || geminiResult.isBlockedBySafety) {
      return geminiResult;
    }

    // Fallback: If Gemini was rate limited or failed, use curated seed data for preset themes
    const matchingPill = ALL_PRESET_PILLS.find((p) => p.promptGuide.toLowerCase().trim() === themePrompt.toLowerCase().trim());
    if (matchingPill && PRESET_SEED_DATA[matchingPill.id]) {
      const seedEntry = PRESET_SEED_DATA[matchingPill.id]!;
      debugLog(LOG_TAG, `Returning enriched seed fallback for "${matchingPill.name}"`);
      const enriched = await artworkService.enrichSongsWithArtwork(seedEntry.songs);
      return { songs: enriched };
    }

    return { songs: [] };
  },

  /**
   * Background warmup routine:
   * - If Gemini is configured: checks all presets, refreshing any that are older than 1 week or un-seeded.
   * - If Gemini is not configured: seeds all 24 presets with static offline data + artwork.
   */
  async warmupPresetThemes(): Promise<void> {
    debugLog(LOG_TAG, `Starting preset themes warmup (Gemini Configured: ${this.isConfigured()})...`);

    for (const pill of ALL_PRESET_PILLS) {
      const normalizedKey = `gemini_theme:${pill.promptGuide.toLowerCase().trim()}`;
      try {
        const existing = await db.suggestionCache.findUnique({
          where: { cacheKey: normalizedKey },
        });

        if (this.isConfigured()) {
          const isStale = !existing || (Date.now() - new Date(existing.updatedAt ?? existing.createdAt).getTime() > ONE_WEEK_MS);
          if (isStale) {
            debugLog(LOG_TAG, `Warmup refreshing "${pill.name}" from Gemini...`);
            const res = await this.fetchSongsFromGemini(pill.promptGuide, 10, pill.id, pill.name);
            if (res.songs.length === 0 && !existing && PRESET_SEED_DATA[pill.id]) {
              // Seed fallback if Gemini fails on initial run
              const seed = PRESET_SEED_DATA[pill.id]!;
              const enriched = await artworkService.enrichSongsWithArtwork(seed.songs);
              await db.suggestionCache.upsert({
                where: { cacheKey: normalizedKey },
                update: { songs: enriched, category: seed.category, subTheme: seed.subTheme },
                create: { cacheKey: normalizedKey, category: seed.category, subTheme: seed.subTheme, songs: enriched },
              });
            }
            await new Promise((r) => setTimeout(r, 500));
          }
        } else {
          // Offline / No Gemini key mode: seed static data if missing
          if (!existing && PRESET_SEED_DATA[pill.id]) {
            const seed = PRESET_SEED_DATA[pill.id]!;
            const enriched = await artworkService.enrichSongsWithArtwork(seed.songs);
            await db.suggestionCache.create({
              data: {
                cacheKey: normalizedKey,
                category: seed.category,
                subTheme: seed.subTheme,
                songs: enriched,
              },
            });
            await cache.set(normalizedKey, enriched, 60 * 60 * 24 * 7);
            debugLog(LOG_TAG, `Seeded initial 10 songs with artwork for: "${pill.name}"`);
          }
        }
      } catch (err) {
        debugLog(LOG_TAG, `Warmup error for "${pill.name}":`, err instanceof Error ? err.message : String(err));
      }
    }

    debugLog(LOG_TAG, "Preset themes warmup routine completed!");
  },

  /**
   * On-Demand Host Refresh:
   * Forces regeneration of all 24 preset pills via Gemini and refreshes the database cache.
   */
  async refreshAllPresetsFromGemini(): Promise<{ success: boolean; updatedCount: number }> {
    if (!this.isConfigured()) {
      return { success: false, updatedCount: 0 };
    }

    debugLog(LOG_TAG, `Manual on-demand refresh triggered for ${ALL_PRESET_PILLS.length} presets from Gemini...`);
    let updatedCount = 0;

    for (const pill of ALL_PRESET_PILLS) {
      try {
        const res = await this.fetchSongsFromGemini(pill.promptGuide, 10, pill.id, pill.name);
        if (res.songs.length > 0) {
          updatedCount++;
        }
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        console.error(LOG_TAG, `Failed to manually refresh "${pill.name}":`, err);
      }
    }

    debugLog(LOG_TAG, `Manual on-demand refresh finished! Updated ${updatedCount}/${ALL_PRESET_PILLS.length} presets.`);
    return { success: true, updatedCount };
  },

  /**
   * Returns all 24 preset pill songs in a single dictionary for instant 0ms client-side switching
   */
  async getAllPresetSongs(): Promise<Record<string, SuggestedSong[]>> {
    try {
      const allDb = await db.suggestionCache.findMany();
      const map: Record<string, SuggestedSong[]> = {};

      for (const pill of ALL_PRESET_PILLS) {
        const normalizedKey = `gemini_theme:${pill.promptGuide.toLowerCase().trim()}`;
        const dbMatch = allDb.find((item) => item.cacheKey === normalizedKey);
        if (dbMatch && Array.isArray(dbMatch.songs) && dbMatch.songs.length > 0) {
          const parsed = z.array(SuggestedSongSchema).safeParse(dbMatch.songs);
          if (parsed.success && parsed.data.length > 0) {
            map[pill.id] = parsed.data;
          }
        }
        // Fallback to seed data if not in DB yet
        if (!map[pill.id] && PRESET_SEED_DATA[pill.id]) {
          map[pill.id] = PRESET_SEED_DATA[pill.id]!.songs;
        }
      }

      return map;
    } catch (err) {
      console.error(LOG_TAG, "Failed to get all preset songs:", err);
      // Return static seed fallback
      const fallbackMap: Record<string, SuggestedSong[]> = {};
      for (const [key, val] of Object.entries(PRESET_SEED_DATA)) {
        fallbackMap[key] = val.songs;
      }
      return fallbackMap;
    }
  },
};
