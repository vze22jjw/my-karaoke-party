import { log } from "next-axiom";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const youtubeRouter = createTRPCRouter({
  search: publicProcedure
    .input(z.object({ keyword: z.string() }))
    .query(async ({ input, ctx }) => {
      log.info("Searching for videos", { keyword: input.keyword });
      const videos = await ctx.youtube.searchVideo(input.keyword, 24);

      return videos;
    }),
});
