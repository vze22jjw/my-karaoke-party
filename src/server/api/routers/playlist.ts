import { log } from "next-axiom";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { spotifyService } from "~/server/lib/spotify"; // <-- Import

export const playlistRouter = createTRPCRouter({
  getPlaylist: publicProcedure
    .input(z.object({ partyHash: z.string() }))
    .query(async ({ input, ctx }) => {
      const party = await ctx.db.party.findUnique({
        where: { hash: input.partyHash },
        include: {
          playlistItems: {
            orderBy: [
              { playedAt: "asc" }, 
              { addedAt: "asc" }, 
            ],
          },
        },
      });

      if (!party) return null;

      return {
        playlist: party.playlistItems.map((item) => ({
          id: item.videoId,
          title: item.title,
          artist: item.artist ?? "",
          song: item.song ?? "",
          coverUrl: item.coverUrl,
          duration: item.duration,
          singerName: item.singerName,
          playedAt: item.playedAt,
          spotifyId: item.spotifyId, // <-- Return the matched ID
        })),
        settings: {
          orderByFairness: true,
        },
      };
    }),

  addVideo: publicProcedure
    .input(
      z.object({
        partyHash: z.string(),
        videoId: z.string(),
        title: z.string(),
        artist: z.string().optional(),
        song: z.string().optional(),
        coverUrl: z.string(),
        duration: z.string().optional(),
        singerName: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const party = await ctx.db.party.findUnique({
        where: { hash: input.partyHash },
      });

      if (!party) throw new Error("Party not found");

      // Check duplicates...
      const existing = await ctx.db.playlistItem.findFirst({
        where: {
          partyId: party.id,
          videoId: input.videoId,
          playedAt: null,
        },
      });
      if (existing) return existing;

      // --- SPOTIFY MATCHING ---
      let spotifyId: string | undefined;
      try {
        // This searches Spotify for the song title to find a match
        // If keys are missing, this returns null instantly.
        const match = await spotifyService.searchTrack(input.title);
        if (match) {
          spotifyId = match.id;
          log.info("Matched Spotify Track", { youtube: input.title, spotify: match.title });
        }
      } catch (e) {
        // Ignore errors
      }
      // ------------------------

      return await ctx.db.playlistItem.create({
        data: {
          partyId: party.id,
          videoId: input.videoId,
          title: input.title,
          artist: input.artist,
          song: input.song,
          coverUrl: input.coverUrl,
          duration: input.duration,
          singerName: input.singerName,
          spotifyId: spotifyId, // <-- Save match
        },
      });
    }),
    
    // ... keep removeVideo, markAsPlayed, getGlobalStats as they were ...
    removeVideo: publicProcedure
    .input(z.object({ partyHash: z.string(), videoId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const party = await ctx.db.party.findUnique({ where: { hash: input.partyHash } });
      if (!party) throw new Error("Party not found");
      await ctx.db.playlistItem.deleteMany({
        where: { partyId: party.id, videoId: input.videoId },
      });
      return { success: true };
    }),

  markAsPlayed: publicProcedure
    .input(z.object({ partyHash: z.string(), videoId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const party = await ctx.db.party.findUnique({ where: { hash: input.partyHash } });
      if (!party) throw new Error("Party not found");
      const updated = await ctx.db.playlistItem.updateMany({
        where: { partyId: party.id, videoId: input.videoId, playedAt: null },
        data: { playedAt: new Date() },
      });
      return { success: true, count: updated.count };
    }),

  getGlobalStats: publicProcedure.query(async ({ ctx }) => {
    const topSongs = await ctx.db.playlistItem.groupBy({
      by: ["videoId", "title", "coverUrl"],
      where: { playedAt: { not: null } },
      _count: { videoId: true },
      orderBy: { _count: { videoId: "desc" } },
      take: 5,
    });
    const topSingers = await ctx.db.playlistItem.groupBy({
      by: ["singerName"],
      where: { playedAt: { not: null } },
      _count: { singerName: true },
      orderBy: { _count: { singerName: "desc" } },
      take: 5,
    });
    return {
      topSongs: topSongs.map((s) => ({
        id: s.videoId,
        title: s.title,
        coverUrl: s.coverUrl,
        count: s._count.videoId,
      })),
      topSingers: topSingers.map((s) => ({
        name: s.singerName,
        count: s._count.singerName,
      })),
    };
  }),
});
