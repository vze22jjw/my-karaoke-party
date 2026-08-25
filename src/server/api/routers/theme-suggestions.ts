import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { geminiSuggestionsService, SuggestedSongSchema } from "~/server/lib/gemini-suggestions";
import { THEME_PRESETS } from "~/config/theme-presets";

export const themeSuggestionsRouter = createTRPCRouter({
  isAvailable: publicProcedure.query(() => {
    return {
      isAvailable: geminiSuggestionsService.isConfigured(),
    };
  }),

  getPresetThemes: publicProcedure.query(() => {
    return {
      presets: THEME_PRESETS,
      isAvailable: geminiSuggestionsService.isConfigured(),
    };
  }),

  getThemedSongs: publicProcedure
    .input(
      z.object({
        themeId: z.string().optional(),
        customPrompt: z.string().optional(),
      })
    )
    .output(z.array(SuggestedSongSchema))
    .query(async ({ input }) => {
      let promptToUse = input.customPrompt?.trim();

      if (!promptToUse && input.themeId) {
        const preset = THEME_PRESETS.find((p) => p.id === input.themeId);
        if (preset) {
          promptToUse = preset.prompt;
        }
      }

      if (!promptToUse) {
        return [];
      }

      return await geminiSuggestionsService.generateSongsForTheme(promptToUse, 15);
    }),

  getHostThemeSongs: publicProcedure
    .input(
      z.object({
        themes: z.array(z.string()),
      })
    )
    .output(
      z.array(
        z.object({
          theme: z.string(),
          songs: z.array(SuggestedSongSchema),
        })
      )
    )
    .query(async ({ input }) => {
      const validThemes = input.themes.filter((t) => t.trim().length > 0);
      if (validThemes.length === 0 || !geminiSuggestionsService.isConfigured()) {
        return [];
      }

      const results = await Promise.all(
        validThemes.map(async (theme) => {
          const songs = await geminiSuggestionsService.generateSongsForTheme(theme, 10);
          return {
            theme,
            songs,
          };
        })
      );

      return results;
    }),
});
