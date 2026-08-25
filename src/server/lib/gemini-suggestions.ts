/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import axios from "axios";
import { z } from "zod";
import { env } from "~/env";
import { cache } from "../cache";
import { debugLog } from "~/utils/debug-logger";

const LOG_TAG = "[GeminiSuggestions]";

export const SuggestedSongSchema = z.object({
  title: z.string(),
  artist: z.string(),
  year: z.union([z.string(), z.number()]).transform((v) => String(v)).optional(),
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
  "gemini-flash-latest",
  "gemini-pro-latest",
];

export const geminiSuggestionsService = {
  isConfigured(): boolean {
    return !!env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0;
  },

  async generateSongsForTheme(themePrompt: string, count = 15): Promise<SuggestedSong[]> {
    if (!this.isConfigured()) {
      debugLog(LOG_TAG, "GEMINI_API_KEY is not configured.");
      return [];
    }

    const normalizedKey = `gemini_theme:${themePrompt.toLowerCase().trim()}`;

    // 1. Check Cache
    const cached = await cache.get<SuggestedSong[]>(normalizedKey);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      debugLog(LOG_TAG, `Returning cached results for theme: "${themePrompt}" (${cached.length} songs)`);
      return cached as SuggestedSong[];
    }

    const apiKey = env.GEMINI_API_KEY!;
    const promptText = `You are an expert Karaoke DJ and party curator.
Return a JSON array containing EXACTLY ${count} unique, iconic, crowd-pleasing karaoke songs for the theme: "${themePrompt}".
Guidelines:
- Pick famous songs that people love to sing along with.
- Ensure songs are well-known and commonly available as karaoke versions on YouTube.
- Output fields for each item: title, artist, year.
- Do not return duplicate songs.`;

    // Try models in order until one succeeds
    for (const modelName of GEMINI_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          debugLog(LOG_TAG, `Calling Gemini API (${modelName}, attempt ${attempt}) for theme: "${themePrompt}"`);

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
              timeout: 15000,
            }
          );

          const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) {
            debugLog(LOG_TAG, "Empty response received from Gemini API");
            break;
          }

          const parsedJson = JSON.parse(rawText) as unknown;
          const parsedArray = z.array(SuggestedSongSchema).safeParse(parsedJson);

          if (!parsedArray.success) {
            console.warn(LOG_TAG, "Failed to parse structured JSON from Gemini:", parsedArray.error);
            break;
          }

          const songs = parsedArray.data;

          if (songs.length > 0) {
            // Cache for 7 days
            await cache.set(normalizedKey, songs, 60 * 60 * 24 * 7);
            debugLog(LOG_TAG, `Successfully cached ${songs.length} songs for "${themePrompt}" using ${modelName}`);
            return songs;
          }
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            if (status === 404) {
              debugLog(LOG_TAG, `Model ${modelName} returned 404. Trying next model.`);
              break;
            }
            console.warn(LOG_TAG, `Gemini API error on ${modelName} (attempt ${attempt}):`, error.message);
          } else {
            console.warn(LOG_TAG, `Unexpected error on ${modelName}:`, error);
          }

          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }
    }

    return [];
  },
};
