import { z } from "zod";
import { env } from "~/env";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const partyRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({ name: z.string().min(3) }))
    .mutation(async ({ ctx, input }) => {
      const party = await ctx.db.party.createWithHash(input);

      const res = await fetch(
        `${env.NEXT_PUBLIC_PARTYKIT_URL}/party/${party.hash}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) {
        await ctx.db.party.delete({ where: { id: party.id } });

        throw new Error("Failed to create party");
      }

      return party;
    }),

  getByHash: publicProcedure
    .input(z.object({ hash: z.string() }))
    .query(({ input, ctx }) => {
      const party = ctx.db.party.findUnique({ where: { hash: input.hash } });

      return party;
    }),

  fetchNextVideo: publicProcedure
    .input(z.object({ partyId: z.number() }))
    .query(async ({ input, ctx }) => {
      const nextVideo = await ctx.db.videosOnParties.findFirst({
        where: { partyId: input.partyId, playedAt: null },
        orderBy: { addedAt: "asc" },
        include: { video: true },
      });

      if (!nextVideo) {
        return null;
      }

      return nextVideo.video;
    }),

  markVideoAsPlayed: publicProcedure
    .input(z.object({ videoId: z.string(), partyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.videosOnParties.update({
        where: {
          partyId_videoId: {
            partyId: input.partyId,
            videoId: input.videoId,
          },
        },
        data: { playedAt: new Date() },
      });

      return true;
    }),
});
