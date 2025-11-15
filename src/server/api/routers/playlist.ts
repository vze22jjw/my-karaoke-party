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
              { playedAt: "asc" }, // Played items first (nulls last in PostgreSQL)
              { addedAt: "asc" },  // Then by when they were added
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

  // Add a video to the playlist
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

      if (!party) {
        throw new Error("Party not found");
      }

      // Check if video already exists in this party's playlist
      const existing = await ctx.db.playlistItem.findFirst({
        where: {
          partyId: party.id,
          videoId: input.videoId,
          playedAt: null, // Only check unplayed videos
        },
      });

      if (existing) {
        log.warn("Video already in playlist", {
          partyHash: input.partyHash,
          videoId: input.videoId,
        });
        return existing;
      }

      // --- SPOTIFY MATCHING ---
      let spotifyId: string | undefined;
      try {
        const match = await spotifyService.searchTrack(input.title);
        if (match) {
          spotifyId = match.id;
          log.info("Matched Spotify Track", { youtube: input.title, spotify: match.title });
        }
      } catch (e) {
        // Ignore errors, don't block adding the song
      }
      // ------------------------------

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

      log.info("Video added to playlist", {
        partyHash: input.partyHash,
        videoId: input.videoId,
        singerName: input.singerName,
      });

      return playlistItem;
    }),

  // Remove a video from the playlist
  removeVideo: publicProcedure
    .input(
      z.object({
        partyHash: z.string(),
        videoId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const party = await ctx.db.party.findUnique({
        where: { hash: input.partyHash },
      });

      if (!party) {
        throw new Error("Party not found");
      }

      await ctx.db.playlistItem.deleteMany({
        where: {
          partyId: party.id,
          videoId: input.videoId,
        },
      });

      log.info("Video removed from playlist", {
        partyHash: input.partyHash,
        videoId: input.videoId,
      });

      return { success: true };
    }),

  // Mark a video as played
  markAsPlayed: publicProcedure
    .input(
      z.object({
        partyHash: z.string(),
        videoId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const party = await ctx.db.party.findUnique({
        where: { hash: input.partyHash },
      });

      if (!party) {
        throw new Error("Party not found");
      }

      const updated = await ctx.db.playlistItem.updateMany({
        where: {
          partyId: party.id,
          videoId: input.videoId,
          playedAt: null,
        },
        data: {
          playedAt: new Date(),
        },
      });

      log.info("Video marked as played", {
        partyHash: input.partyHash,
        videoId: input.videoId,
      });

      return { success: true, count: updated.count };
    }),

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
  // -------------------------
});
