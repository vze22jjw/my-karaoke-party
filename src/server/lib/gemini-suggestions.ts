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

type GeminiResponsePart = {
  text?: string;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiResponsePart[];
  };
};

type GeminiApiResponse = {
  candidates?: GeminiCandidate[];
};

const GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.7-flash",
];

export const geminiSuggestionsService = {
  isConfigured(): boolean {
    return !!env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0;
  },

  async generateSongsForTheme(
    themePrompt: string,
    count = 10,
    category?: string,
    subTheme?: string
  ): Promise<SuggestedSong[]> {
    if (!this.isConfigured()) {
      debugLog(LOG_TAG, "GEMINI_API_KEY is not configured.");
      return [];
    }

    const normalizedKey = `gemini_theme:${themePrompt.toLowerCase().trim()}`;

    // 1. Check In-Memory Cache
    const cached = await cache.get<SuggestedSong[]>(normalizedKey);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      debugLog(LOG_TAG, `Memory Cache Hit for theme: "${themePrompt}" (${cached.length} songs)`);
      return cached as SuggestedSong[];
    }

    // 2. Check PostgreSQL Database Cache
    try {
      const dbEntry = await db.suggestionCache.findUnique({
        where: { cacheKey: normalizedKey },
      });

      if (dbEntry && Array.isArray(dbEntry.songs) && dbEntry.songs.length > 0) {
        const parsed = z.array(SuggestedSongSchema).safeParse(dbEntry.songs);
        if (parsed.success && parsed.data.length > 0) {
          debugLog(LOG_TAG, `DB Cache Hit for theme: "${themePrompt}" (${parsed.data.length} songs)`);
          await cache.set(normalizedKey, parsed.data, 60 * 60 * 24 * 7);
          return parsed.data;
        }
      }
    } catch (dbErr) {
      debugLog(LOG_TAG, "DB Cache lookup error:", dbErr instanceof Error ? dbErr.message : String(dbErr));
    }

    // 3. Generate from Google Gemini API
    const apiKey = env.GEMINI_API_KEY!;
    const promptText = `You are an expert Karaoke DJ and party curator.
Return a JSON array containing EXACTLY ${count} unique, iconic, crowd-pleasing karaoke songs for the theme: "${themePrompt}".
Guidelines:
- Pick famous songs that people love to sing along with.
- Ensure songs are well-known and commonly available as karaoke versions on YouTube.
- Output fields for each item: title, artist, year.
- Do not return duplicate songs.`;

    for (const modelName of GEMINI_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      try {
        debugLog(LOG_TAG, `Calling Gemini API (${modelName}) for theme: "${themePrompt}"`);

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
            },
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 45000,
          }
        );

        const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          debugLog(LOG_TAG, `Empty response received from Gemini API on ${modelName}`);
          continue;
        }

        const parsedJson = JSON.parse(rawText) as unknown;
        const parsedArray = z.array(SuggestedSongSchema).safeParse(parsedJson);

        if (!parsedArray.success) {
          console.warn(LOG_TAG, "Failed to parse structured JSON from Gemini:", parsedArray.error);
          continue;
        }

        const rawSongs = parsedArray.data.slice(0, count);

        if (rawSongs.length > 0) {
          // 4. Enrich songs with Album Cover Artwork
          debugLog(LOG_TAG, `Enriching ${rawSongs.length} songs with cover artwork...`);
          const enrichedSongs = await artworkService.enrichSongsWithArtwork(rawSongs);

          // 5. Persist to PostgreSQL Database
          try {
            await db.suggestionCache.upsert({
              where: { cacheKey: normalizedKey },
              update: {
                songs: enrichedSongs,
                category: category ?? null,
                subTheme: subTheme ?? null,
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

          // 6. Cache in Memory
          await cache.set(normalizedKey, enrichedSongs, 60 * 60 * 24 * 7);

          return enrichedSongs;
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.warn(LOG_TAG, `Gemini API error on ${modelName}:`, error.message);
        } else {
          console.warn(LOG_TAG, `Unexpected error on ${modelName}:`, error);
        }
      }
    }

    return [];
  },

  /**
   * Background warmup routine to pre-seed all preset themes into PostgreSQL on startup
   */
  async warmupPresetThemes(): Promise<void> {
    if (!this.isConfigured()) {
      debugLog(LOG_TAG, "Skipping warmup: GEMINI_API_KEY is not configured.");
      return;
    }

    debugLog(LOG_TAG, `Starting background cache warmup for ${ALL_PRESET_PILLS.length} preset pills...`);

    for (let i = 0; i < ALL_PRESET_PILLS.length; i++) {
      const pill = ALL_PRESET_PILLS[i];
      if (!pill) continue;

      const normalizedKey = `gemini_theme:${pill.promptGuide.toLowerCase().trim()}`;

      try {
        const exists = await db.suggestionCache.findUnique({
          where: { cacheKey: normalizedKey },
          select: { id: true },
        });

        if (exists) {
          debugLog(LOG_TAG, `[Warmup ${i + 1}/${ALL_PRESET_PILLS.length}] Already cached in DB: "${pill.name}"`);
          continue;
        }

        debugLog(LOG_TAG, `[Warmup ${i + 1}/${ALL_PRESET_PILLS.length}] Generating songs for preset: "${pill.name}"`);
        await this.generateSongsForTheme(pill.promptGuide, 10, undefined, pill.name);

        // 1.5 second polite delay between warmup calls to stay well within Gemini quota
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (err) {
        console.warn(LOG_TAG, `Warmup error for preset "${pill.name}":`, err instanceof Error ? err.message : String(err));
      }
    }

    debugLog(LOG_TAG, "Background cache warmup completed!");
  },
};
