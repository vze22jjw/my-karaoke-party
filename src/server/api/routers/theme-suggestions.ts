import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { geminiSuggestionsService, SuggestedSongSchema } from "~/server/lib/gemini-suggestions";
import { THEME_CATEGORIES, getPresetPillById } from "~/config/theme-presets";

export const ThemedSongsResultSchema = z.object({
  songs: z.array(SuggestedSongSchema),
  isBlockedBySafety: z.boolean().optional(),
});

export const themeSuggestionsRouter = createTRPCRouter({
  isAvailable: publicProcedure.query(() => {
    return {
      isAvailable: geminiSuggestionsService.isConfigured(),
    };
  }),

  getCategories: publicProcedure.query(() => {
    const isConfigured = geminiSuggestionsService.isConfigured();
    return {
      categories: isConfigured
        ? THEME_CATEGORIES
        : THEME_CATEGORIES.filter((c) => !c.isCustom),
      isAvailable: isConfigured,
    };
  }),

  getAllPresetSongs: publicProcedure
    .output(z.record(z.array(SuggestedSongSchema)))
    .query(async () => {
      return await geminiSuggestionsService.getAllPresetSongs();
    }),

  getThemedSongs: publicProcedure
    .input(
      z.object({
        pillId: z.string().optional(),
        themeId: z.string().optional(),
        customPrompt: z.string().optional(),
      })
    )
    .output(ThemedSongsResultSchema)
    .query(async ({ input }) => {
      // If custom prompt is requested and Gemini is not configured, do not process
      if (input.customPrompt && !geminiSuggestionsService.isConfigured()) {
        return { songs: [] };
      }

      let promptToUse = input.customPrompt?.trim();
      let subThemeName: string | undefined;

      const targetPillId = input.pillId ?? input.themeId;
      if (!promptToUse && targetPillId) {
        const pill = getPresetPillById(targetPillId);
        if (pill) {
          promptToUse = pill.promptGuide;
          subThemeName = pill.name;
        }
      }

      if (!promptToUse) {
        return { songs: [] };
      }

      return await geminiSuggestionsService.generateSongsForTheme(promptToUse, 10, undefined, subThemeName);
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
          const res = await geminiSuggestionsService.generateSongsForTheme(theme, 10, "Party Themes", theme);
          return {
            theme,
            songs: res.songs,
          };
        })
      );

      return results;
    }),
});
