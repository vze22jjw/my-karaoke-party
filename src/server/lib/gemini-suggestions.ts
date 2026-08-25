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
  year: z.string().optional(),
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
      debugLog(LOG_TAG, `Returning cached results for theme: "${themePrompt}"`);
      return cached as SuggestedSong[];
    }

    const apiKey = env.GEMINI_API_KEY!;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const promptText = `You are an expert Karaoke DJ and party curator.
Generate a list of ${count} iconic, highly recognizable, crowd-pleasing karaoke songs for the theme: "${themePrompt}".
Guidelines:
- Pick songs that people love to sing along with.
- Ensure songs are famous and commonly available with karaoke tracks on YouTube.
- Return accurate song title, original artist name, and release decade/year.`;

    try {
      debugLog(LOG_TAG, `Calling Gemini API for theme: "${themePrompt}"`);

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
            responseSchema: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING" },
                  artist: { type: "STRING" },
                  year: { type: "STRING" },
                  reason: { type: "STRING" },
                },
                required: ["title", "artist"],
              },
            },
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
        return [];
      }

      const parsedJson = JSON.parse(rawText) as unknown;
      const parsedArray = z.array(SuggestedSongSchema).safeParse(parsedJson);

      if (!parsedArray.success) {
        console.warn(LOG_TAG, "Failed to parse structured JSON from Gemini:", parsedArray.error);
        return [];
      }

      const songs = parsedArray.data;

      // 2. Cache for 7 days
      await cache.set(normalizedKey, songs, 60 * 60 * 24 * 7);
      debugLog(LOG_TAG, `Successfully cached ${songs.length} songs for "${themePrompt}"`);

      return songs;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(LOG_TAG, "Gemini API Error:", error.response?.data ?? error.message);
      } else {
        console.error(LOG_TAG, "Unexpected error:", error);
      }
      return [];
    }
  },
};
