import { log } from "next-axiom";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { spotifyService } from "~/server/lib/spotify";
import { env } from "~/env";

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
          spotifyId: item.spotifyId,
        })),
        settings: {
          orderByFairness: party.orderByFairness,
          disablePlayback: party.disablePlayback,
          spotifyPlaylistId: party.spotifyPlaylistId, 
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

      if (!party) {
        throw new Error("Party not found");
      }

      const existing = await ctx.db.playlistItem.findFirst({
        where: {
          partyId: party.id,
          videoId: input.videoId,
          playedAt: null,
        },
      });

      if (existing) {
        log.warn("Video already in playlist", {
          partyHash: input.partyHash,
          videoId: input.videoId,
        });
        return existing;
      }

      let spotifyId: string | undefined;
      try {
        const match = await spotifyService.searchTrack(input.title);
        if (match) {
          spotifyId = match.id;
          log.info("Matched Spotify Track", { youtube: input.title, spotify: match.title });
        }
      } catch (e) {
      }

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
          spotifyId: spotifyId, 
        },
      });

      log.info("Video added to playlist", {
        partyHash: input.partyHash,
        videoId: input.videoId,
        singerName: input.singerName,
      });

      return playlistItem;
    }),

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

  getGlobalStats: publicProcedure.query(async ({ ctx }) => {
    const hasSpotify = !!(env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET);
    
    let topSongs;

    if (hasSpotify) {
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

    // 1. Fetch raw songs sung count
    const topSingersRaw = await ctx.db.playlistItem.groupBy({
      by: ["singerName"],
      where: {
        playedAt: { not: null },
      },
      _count: {
        singerName: true,
      },
    });

    const singerNames = topSingersRaw.map(s => s.singerName);

    // 2. Fetch applause counts for these singers
    const participants = await ctx.db.partyParticipant.findMany({
      where: {
        name: { in: singerNames }
      },
      select: {
        name: true,
        applauseCount: true, 
      }
    });

    const applauseMap = new Map(participants.map(p => [p.name, p.applauseCount]));

    const allSingers = topSingersRaw.map(s => {
      const songsSung = s._count.singerName;
      const applause = applauseMap.get(s.singerName) ?? 0;
      return {
        name: s.singerName,
        count: songsSung,
        applauseCount: applause, 
      };
    });

    // List 1: Top Singers by Songs Sung (Tie-break with Applause)
    const topSingersBySongs = [...allSingers].sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count; 
      }
      return b.applauseCount - a.applauseCount;
    }).slice(0, 5);

    // List 2: Top Singers by Applause (Tie-break with Songs)
    const topSingersByApplause = [...allSingers].sort((a, b) => {
      if (b.applauseCount !== a.applauseCount) {
        return b.applauseCount - a.applauseCount; 
      }
      return b.count - a.count;
    }).slice(0, 5);

    return {
      topSongs,
      topSingersBySongs,
      topSingersByApplause,
      // Keep legacy prop for safety until client updates fully propagate, though we won't use it
      topSingers: topSingersBySongs, 
    };
  }),
});
