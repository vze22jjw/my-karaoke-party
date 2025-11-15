import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { spotifyService } from "~/server/lib/spotify";

export const spotifyRouter = createTRPCRouter({
  getTopKaraokeSongs: publicProcedure
    .input(z.object({ playlistId: z.string().nullish() }))
    .output(
      z.array(
        z.object({
          title: z.string(),
          artist: z.string(),
          coverUrl: z.string(),
        })
      )
    )
    .query(async ({ input }) => {
      return await spotifyService.getTopKaraokeTracks(input.playlistId);
    }),
});
