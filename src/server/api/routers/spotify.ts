import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { spotifyService } from "~/server/lib/spotify";

export const spotifyRouter = createTRPCRouter({
  getTopKaraokeSongs: publicProcedure
    .output(
      z.array(
        z.object({
          title: z.string(),
          artist: z.string(),
          coverUrl: z.string(),
        })
      )
    )
    .query(async () => {
      return await spotifyService.getTopKaraokeTracks();
    }),
});
