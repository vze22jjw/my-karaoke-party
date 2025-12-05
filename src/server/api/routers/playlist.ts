import { log } from "next-axiom";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { spotifyService } from "~/server/lib/spotify";
import { env } from "~/env";
import { TRPCError } from "@trpc/server";
import { cookies } from "next/headers";
import { parseISO8601Duration } from "~/utils/string";

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
          isPriority: item.isPriority,
          isManual: item.isManual,
          applauseCount: item.applauseCount,
        })),
        settings: {
          orderByFairness: party.orderByFairness,
          disablePlayback: party.disablePlayback,
          spotifyPlaylistId: party.spotifyPlaylistId,
          isManualSortActive: party.isManualSortActive,
          spotifyLink: party.spotifyLink,
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
      const token = cookies().get("admin_token")?.value;
      if (token !== env.ADMIN_TOKEN) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Host access required" });
      }

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
      const token = cookies().get("admin_token")?.value;
      if (token !== env.ADMIN_TOKEN) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Host access required" });
      }

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
    let rareGemSongs;

    if (hasSpotify) {
      const topSpotifyTracks = await ctx.db.playlistItem.groupBy({
        by: ["spotifyId"],
        where: {
          playedAt: { not: null },
          spotifyId: { not: null },
        },
        _count: { spotifyId: true },
        orderBy: { _count: { spotifyId: "desc" } },
        take: 5,
      });

      const rareSpotifyTracks = await ctx.db.playlistItem.groupBy({
        by: ["spotifyId"],
        where: {
          playedAt: { not: null },
          spotifyId: { not: null },
        },
        _count: { spotifyId: true },
        orderBy: { _count: { spotifyId: "asc" } }, // Ascending for rare
        take: 5,
      });

      const fetchSpotifyDetails = async (tracks: typeof topSpotifyTracks) => {
        return await Promise.all(
          tracks.map(async (group) => {
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
      };

      topSongs = await fetchSpotifyDetails(topSpotifyTracks);
      rareGemSongs = await fetchSpotifyDetails(rareSpotifyTracks);

    } else {
      const rawTopSongs = await ctx.db.playlistItem.groupBy({
        by: ["videoId", "title", "coverUrl"],
        where: { playedAt: { not: null } },
        _count: { videoId: true },
        orderBy: { _count: { videoId: "desc" } },
        take: 5,
      });

      const rawRareSongs = await ctx.db.playlistItem.groupBy({
        by: ["videoId", "title", "coverUrl"],
        where: { playedAt: { not: null } },
        _count: { videoId: true },
        orderBy: { _count: { videoId: "asc" } },
        take: 5,
      });

      const formatRawSongs = (songs: typeof rawTopSongs) => 
        songs.map(s => ({
          id: s.videoId,
          title: s.title,
          coverUrl: s.coverUrl,
          count: s._count.videoId,
          artist: null,
        }));

      topSongs = formatRawSongs(rawTopSongs);
      rareGemSongs = formatRawSongs(rawRareSongs);
    }

    const getArtistStats = async (orderBy: "asc" | "desc") => {
        const raw = await ctx.db.playlistItem.groupBy({
            by: ["artist"],
            where: {
                playedAt: { not: null },
                AND: [{ artist: { not: null } }, { artist: { not: "" } }]
            },
            _count: { artist: true },
            orderBy: { _count: { artist: orderBy } },
            take: 5,
        });
        return raw.map(a => ({ name: a.artist!, count: a._count.artist }));
    };

    const topArtists = await getArtistStats("desc");
    const rareGemArtists = await getArtistStats("asc");

    // 1. Total Global Songs Played
    const totalGlobalSongs = await ctx.db.playlistItem.count({
        where: { playedAt: { not: null } }
    });

    // 2. Total Global Applause
    const totalApplauseAgg = await ctx.db.partyParticipant.aggregate({
        _sum: { applauseCount: true }
    });
    const totalGlobalApplause = totalApplauseAgg._sum.applauseCount ?? 0;

    // 3. Best Dressed
    const topAvatarRaw = await ctx.db.partyParticipant.groupBy({
        by: ["avatar"],
        where: { avatar: { not: null } },
        _count: { avatar: true },
        orderBy: { _count: { avatar: "desc" } },
        take: 1
    });
    const bestDressed = topAvatarRaw[0] ? {
        avatar: topAvatarRaw[0].avatar,
        count: topAvatarRaw[0]._count.avatar
    } : null;

    // 4. Marathon Runner (Global)
    const allPlayedItems = await ctx.db.playlistItem.findMany({
        where: { playedAt: { not: null }, duration: { not: null } },
        select: { singerName: true, duration: true }
    });

    const singerDurationMap = new Map<string, number>();
    allPlayedItems.forEach(item => {
        if (item.duration) {
            const ms = parseISO8601Duration(item.duration) ?? 0;
            const current = singerDurationMap.get(item.singerName) ?? 0;
            singerDurationMap.set(item.singerName, current + ms);
        }
    });

    let maxDurationMs = 0;
    let marathonSingerName: string | null = null;
    for (const [singer, duration] of singerDurationMap.entries()) {
        if (duration > maxDurationMs) {
            maxDurationMs = duration;
            marathonSingerName = singer;
        }
    }

    const marathonRunner = marathonSingerName ? {
        name: marathonSingerName,
        totalDurationMs: maxDurationMs
    } : null;

    // 5. Top Songs by Applause ("Encore")
    const topApplauseSongsRaw = await ctx.db.playlistItem.groupBy({
        by: ["title", "singerName"],
        where: { applauseCount: { gt: 0 } },
        _sum: { applauseCount: true },
        orderBy: { _sum: { applauseCount: "desc" } },
        take: 5
    });
    
    const topSongsByApplause = topApplauseSongsRaw.map((s, i) => ({
        rank: i + 1,
        title: s.title,
        applause: s._sum.applauseCount ?? 0,
        singer: s.singerName
    }));

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

    const participants = await ctx.db.partyParticipant.findMany({
      where: {
        name: { in: singerNames }
      },
      select: {
        name: true,
        applauseCount: true, 
      }
    });

    const applauseMap = new Map<string, number>();
    participants.forEach(p => {
        const current = applauseMap.get(p.name) ?? 0;
        applauseMap.set(p.name, current + p.applauseCount);
    });

    const allSingers = topSingersRaw.map(s => ({
        name: s.singerName,
        count: s._count.singerName,
        applauseCount: applauseMap.get(s.singerName) ?? 0, 
    }));

    // One Hit Wonder (Least hits, most applause)
    const sortedForOneHit = [...allSingers].sort((a, b) => {
        if (a.count !== b.count) {
            return a.count - b.count; 
        }
        return b.applauseCount - a.applauseCount;
    });

    const oneHitWonderRaw = sortedForOneHit[0];
    const oneHitWonder = oneHitWonderRaw ? {
        name: oneHitWonderRaw.name,
        applauseCount: oneHitWonderRaw.applauseCount
    } : null;

    const topSingersBySongs = [...allSingers].sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count; 
      }
      return b.applauseCount - a.applauseCount;
    }).slice(0, 5);

    const topSingersByApplause = [...allSingers].sort((a, b) => {
      if (b.applauseCount !== a.applauseCount) {
        return b.applauseCount - a.applauseCount; 
      }
      return b.count - a.count;
    }).slice(0, 5);

    return {
      topSongs,
      rareGemSongs,
      topArtists,
      rareGemArtists,
      topSingersBySongs,
      topSingersByApplause,
      topSingers: topSingersBySongs, 
      topSongsByApplause,
      globalStats: {
          totalSongs: totalGlobalSongs,
          totalApplause: totalGlobalApplause,
          bestDressed,
          oneHitWonder,
          marathonRunner 
      }
    };
  }),
});
