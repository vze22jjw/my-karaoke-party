import { log } from "next-axiom";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { spotifyService } from "~/server/lib/spotify";
import { env } from "~/env"; // <-- IMPORT ENV

export const playlistRouter = createTRPCRouter({
  // Get playlist for a party
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

      if (!party) {
        return null;
      }

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
          spotifyId: item.spotifyId, // <-- RETURN spotifyId
        })),
        settings: {
          orderByFairness: true,
        },
      };
    }),

  // ... (keep addVideo - we fixed the handlers that call it) ...
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
      // This is the tRPC (legacy) addVideo. We'll add matching here too just in case.
      const party = await ctx.db.party.findUnique({
        where: { hash: input.partyHash },
      });
      if (!party) throw new Error("Party not found");
      const existing = await ctx.db.playlistItem.findFirst({
        where: { partyId: party.id, videoId: input.videoId, playedAt: null },
      });
      if (existing) return existing;

      let spotifyId: string | undefined;
      try {
        const match = await spotifyService.searchTrack(input.title);
        if (match) spotifyId = match.id;
      } catch (e) {/* ignore */}

      const playlistItem = await ctx.db.playlistItem.create({
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
      return playlistItem;
    }),
  // ... (keep removeVideo, markAsPlayed) ...
  removeVideo: publicProcedure
    .input(z.object({ partyHash: z.string(), videoId: z.string() }))
    .mutation(async ({ input, ctx }) => { /* ... */ }),

  markAsPlayed: publicProcedure
    .input(z.object({ partyHash: z.string(), videoId: z.string() }))
    .mutation(async ({ input, ctx }) => { /* ... */ }),

  // --- UPDATED PROCEDURE ---
  getGlobalStats: publicProcedure.query(async ({ ctx }) => {
    const hasSpotify = !!(env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET);
    
    let topSongs;

    if (hasSpotify) {
      // STRATEGY A: Smart Grouping (by Matched Song)
      const topSpotifyTracks = await ctx.db.playlistItem.groupBy({
        by: ["spotifyId"],
        where: {
          playedAt: { not: null },
          spotifyId: { not: null },
        },
        _count: {
          spotifyId: true,
        },
        orderBy: {
          _count: {
            spotifyId: "desc",
          },
        },
        take: 5,
      });

      topSongs = await Promise.all(
        topSpotifyTracks.map(async (group) => {
          const details = await ctx.db.playlistItem.findFirst({
            where: { spotifyId: group.spotifyId },
            orderBy: { playedAt: "desc" },
            select: { title: true, coverUrl: true, artist: true }
          });

          return {
            id: group.spotifyId!,
            title: details?.title ?? "Unknown",
            coverUrl: details?.coverUrl ?? "",
            count: group._count.spotifyId,
            artist: details?.artist ?? null,
          };
        })
      );
    } else {
      // STRATEGY B: Fallback Grouping (by YouTube Video)
      const rawTopSongs = await ctx.db.playlistItem.groupBy({
        by: ["videoId", "title", "coverUrl"],
        where: {
          playedAt: { not: null },
        },
        _count: {
          videoId: true,
        },
        orderBy: {
          _count: {
            videoId: "desc",
          },
        },
        take: 5,
      });

      topSongs = rawTopSongs.map(s => ({
        id: s.videoId,
        title: s.title,
        coverUrl: s.coverUrl,
        count: s._count.videoId,
        artist: null,
      }));
    }

    // Top Singers logic (Unchanged)
    const topSingers = await ctx.db.playlistItem.groupBy({
      by: ["singerName"],
      where: {
        playedAt: { not: null },
      },
      _count: {
        singerName: true,
      },
      orderBy: {
        _count: {
          singerName: "desc",
        },
      },
      take: 5,
    });

    return {
      topSongs,
      topSingers: topSingers.map((s) => ({
        name: s.singerName,
        count: s._count.singerName,
      })),
    };
  }),
});
