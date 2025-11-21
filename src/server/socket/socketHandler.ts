/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { type Server, type Socket } from "socket.io";
import { db } from "~/server/db";
import { spotifyService } from "~/server/lib/spotify";
import {
  getRandomDurationISO,
  registerParticipant,
  updateAndEmitPlaylist,
  updateAndEmitSingers,
  LOG_TAG, // FIX: Removed unused 'type Participant'
} from "./socketUtils";
import { debugLog } from "~/utils/debug-logger";
import { orderByRoundRobin, type FairnessPlaylistItem } from "~/utils/array";
import { type PlaylistItem } from "@prisma/client";
import youtubeAPI from "~/utils/youtube-data-api";
import { parseISO8601Duration } from "~/utils/string";

export function registerSocketEvents(io: Server) {
  io.on("connection", (socket: Socket) => {
    debugLog(LOG_TAG, `Socket connected: ${socket.id}`);

    socket.on("request-open-parties", async () => {
      debugLog(LOG_TAG, `Received 'request-open-parties' from ${socket.id}`);
      try {
        const parties = await db.party.findMany({
          where: {
            status: { in: ["OPEN", "STARTED"] },
          },
          orderBy: { createdAt: "desc" },
          select: {
            hash: true,
            name: true,
            createdAt: true,
            status: true,
            _count: {
              select: { playlistItems: true, participants: true },
            },
          },
        });

        const formattedParties = parties.map((party) => ({
          hash: party.hash,
          name: party.name,
          createdAt: party.createdAt.toISOString(),
          songCount: party._count.playlistItems,
          singerCount: party._count.participants,
          status: party.status,
        }));

        socket.emit("open-parties-list", { parties: formattedParties });
      } catch (error) {
        console.error("Error fetching open parties:", error);
        socket.emit("open-parties-list", { error: "Failed to fetch parties" });
      }
    });

    socket.on(
      "join-party",
      async (data: {
        partyHash: string;
        singerName: string;
        avatar: string | null;
      }) => {
        const { partyHash, singerName, avatar } = data;
        void socket.join(partyHash);
        debugLog(
          LOG_TAG,
          `Socket ${socket.id} joined room ${partyHash} as ${singerName} with avatar ${avatar}`,
        );

        const party = await db.party.findUnique({ where: { hash: partyHash } });
        if (party) {
          const { isNew } = await registerParticipant(
            party.id,
            singerName,
            avatar,
          );
          if (isNew) {
            socket.broadcast
              .to(partyHash)
              .emit("new-singer-joined", singerName);
          }

          void updateAndEmitPlaylist(io, partyHash, "join-party");
          void updateAndEmitSingers(io, party.id, partyHash);
        }
      },
    );

    socket.on(
      "add-song",
      async (data: {
        partyHash: string;
        videoId: string;
        title: string;
        coverUrl: string;
        singerName: string;
      }) => {
        debugLog(
          LOG_TAG,
          `Received 'add-song' for room ${data.partyHash}`,
          data,
        );
        try {
          const party = await db.party.findUnique({
            where: { hash: data.partyHash },
            include: { participants: { where: { name: data.singerName } } }, 
          });
          if (!party) return;

          const participant = party.participants[0];
          const avatar = participant?.avatar ?? null;

          const { isNew } = await registerParticipant(
            party.id,
            data.singerName,
            avatar,
          );
          if (isNew) {
            socket.broadcast
              .to(data.partyHash)
              .emit("new-singer-joined", data.singerName);
          }

          const existing = await db.playlistItem.findFirst({
            where: {
              partyId: party.id,
              videoId: data.videoId,
              singerName: data.singerName,
              playedAt: null,
            },
          });

          if (!existing) {
            const duration = await youtubeAPI.getVideoDuration(data.videoId);
            debugLog(
              LOG_TAG,
              `Fetched duration for ${data.videoId}: ${duration ?? "N/A"}`,
            );

            let spotifyId: string | undefined;
            try {
              const match = await spotifyService.searchTrack(data.title);
              if (match) {
                spotifyId = match.id;
              }
            } catch (e) {
              debugLog(LOG_TAG, "Spotify match failed", e);
            }

            await db.playlistItem.create({
              data: {
                partyId: party.id,
                videoId: data.videoId,
                title: data.title,
                artist: "",
                song: "",
                coverUrl: data.coverUrl,
                duration: duration ? duration : getRandomDurationISO(),
                singerName: data.singerName,
                randomBreaker: Math.random(),
                spotifyId: spotifyId,
              },
            });
          }
          await updateAndEmitPlaylist(io, data.partyHash, "add-song");
          await updateAndEmitSingers(io, party.id, data.partyHash);
        } catch (error) {
          console.error("Error adding song:", error);
        }
      },
    );

    socket.on(
      "remove-song",
      async (data: { partyHash: string; videoId: string }) => {
        debugLog(
          LOG_TAG,
          `Received 'remove-song' for room ${data.partyHash}`,
          data,
        );
        try {
          const party = await db.party.findUnique({
            where: { hash: data.partyHash },
          });
          if (!party) return;

          await db.playlistItem.deleteMany({
            where: { partyId: party.id, videoId: data.videoId, playedAt: null },
          });
          await updateAndEmitPlaylist(io, data.partyHash, "remove-song");
        } catch (error) {
          console.error("Error removing song:", error);
        }
      },
    );

    socket.on("mark-as-played", async (data: { partyHash: string }) => {
      debugLog(
        LOG_TAG,
        `Received 'mark-as-played' for room ${data.partyHash}`,
        data,
      );
      try {
        const party = await db.party.findUnique({
          where: { hash: data.partyHash },
          include: {
            playlistItems: {
              orderBy: [{ playedAt: "asc" }, { addedAt: "asc" }],
            },
          },
        });

        if (!party) {
          debugLog(LOG_TAG, "Party not found, cannot mark as played.");
          return;
        }

        if (party.status === "OPEN") {
          debugLog(LOG_TAG, "Party is OPEN, skipping disabled.");
          return;
        }

        const allItems: PlaylistItem[] = party.playlistItems;
        const playedItems = allItems.filter((item) => item.playedAt);
        const unplayedItems = allItems.filter((item) => !item.playedAt);

        const lastPlayedSong =
          playedItems.length > 0
            ? playedItems.reduce((latest, current) =>
                (latest.playedAt?.getTime() ?? 0) >
                (current.playedAt?.getTime() ?? 0)
                  ? latest
                  : current,
              )
            : null;
        const singerToDeprioritize = lastPlayedSong?.singerName ?? null;

        let fairlySortedUnplayed: PlaylistItem[] = [];
        if (party.orderByFairness) {
          fairlySortedUnplayed = orderByRoundRobin(
            allItems as FairnessPlaylistItem[],
            unplayedItems as FairnessPlaylistItem[],
            singerToDeprioritize,
          ) as PlaylistItem[];
        } else {
          fairlySortedUnplayed = unplayedItems; // Already sorted by addedAt
        }

        const currentSong = fairlySortedUnplayed[0];

        if (!currentSong) {
          debugLog(LOG_TAG, "No song to mark as played.");
          return;
        }

        debugLog(LOG_TAG, `Marking song ${currentSong.id} as played`);
        await db.playlistItem.update({
          where: { id: currentSong.id },
          data: { playedAt: new Date() },
        });

        await db.party.update({
          where: { id: party.id },
          data: {
            lastActivityAt: new Date(),
            currentSongId: null,
            currentSongStartedAt: null,
            currentSongRemainingDuration: null,
          },
        });

        await updateAndEmitPlaylist(io, data.partyHash, "mark-as-played");
      } catch (error) {
        console.error("Error marking as played:", error);
      }
    });

    socket.on("start-party", async (data: { partyHash: string }) => {
      debugLog(
        LOG_TAG,
        `Received 'start-party' for room ${data.partyHash}`,
        data,
      );
      try {
        await db.party.update({
          where: { hash: data.partyHash },
          data: {
            status: "STARTED",
            lastActivityAt: new Date(),
          },
        });
        await updateAndEmitPlaylist(io, data.partyHash, "start-party");
      } catch (error) {
        console.error("Error starting party:", error);
      }
    });

    socket.on(
      "playback-play",
      async (data: { partyHash: string; currentTime?: number }) => {
        debugLog(
          LOG_TAG,
          `Received 'playback-play' for room ${data.partyHash}`,
          data,
        );
        try {
          const party = await db.party.findUnique({
            where: { hash: data.partyHash },
          });
          if (!party) return;

          if (party.status === "OPEN") {
            debugLog(LOG_TAG, "Party is OPEN, playback disabled.");
            return;
          }

          const allDbItems = await db.playlistItem.findMany({
            where: { partyId: party.id },
            orderBy: [{ playedAt: "asc" }, { addedAt: "asc" }],
          });

          const playedItems = allDbItems.filter((item) => item.playedAt);
          const unplayedItems = allDbItems.filter((item) => !item.playedAt);

          const lastPlayedSong =
            playedItems.length > 0
              ? playedItems.reduce((latest, current) =>
                  (latest.playedAt?.getTime() ?? 0) >
                  (current.playedAt?.getTime() ?? 0)
                    ? latest
                    : current,
                )
              : null;

          let fairlySortedUnplayed: PlaylistItem[] = [];
          if (party.orderByFairness) {
            fairlySortedUnplayed = orderByRoundRobin(
              allDbItems as FairnessPlaylistItem[],
              unplayedItems as FairnessPlaylistItem[],
              lastPlayedSong?.singerName ?? null,
            ) as PlaylistItem[];
          } else {
            fairlySortedUnplayed = unplayedItems;
          }

          const currentSong = fairlySortedUnplayed[0];
          if (!currentSong) {
            debugLog(LOG_TAG, "Playback-play failed: No current song found.");
            return;
          }

          const now = new Date();
          let remainingDuration: number;

          const totalDurationMs =
            parseISO8601Duration(currentSong.duration) ?? 0;
          const totalDurationSec = Math.floor(totalDurationMs / 1000);

          if (data.currentTime !== undefined && data.currentTime !== null) {
            debugLog(
              LOG_TAG,
              `Scrub detected. New time: ${data.currentTime}s`,
            );
            remainingDuration = Math.max(
              0,
              totalDurationSec - Math.floor(data.currentTime),
            );
          } else {
            remainingDuration =
              party.currentSongId === currentSong.videoId &&
              party.currentSongRemainingDuration !== null
                ? party.currentSongRemainingDuration
                : totalDurationSec;
          }

          await db.party.update({
            where: { id: party.id },
            data: {
              currentSongId: currentSong.videoId,
              currentSongStartedAt: now,
              currentSongRemainingDuration: remainingDuration,
            },
          });

          io.to(data.partyHash).emit("playback-started", {
            startedAt: now.toISOString(),
            remainingDuration: remainingDuration, // in seconds
          });
        } catch (error) {
          console.error("Error starting playback:", error);
        }
      },
    );

    socket.on("playback-pause", async (data: { partyHash: string }) => {
      debugLog(
        LOG_TAG,
        `Received 'playback-pause' for room ${data.partyHash}`,
      );
      try {
        const party = await db.party.findUnique({
          where: { hash: data.partyHash },
        });

        if (!party) {
          debugLog(LOG_TAG, "Playback-pause failed: Party not found.");
          return;
        }

        if (party.status === "OPEN") {
          debugLog(LOG_TAG, "Party is OPEN, playback disabled.");
          return;
        }

        if (
          !party.currentSongStartedAt ||
          party.currentSongRemainingDuration === null
        ) {
          debugLog(
            LOG_TAG,
            "Playback-pause failed: Not playing or no duration.",
          );
          return;
        }

        const elapsedMs =
          new Date().getTime() - party.currentSongStartedAt.getTime();
        const elapsedSeconds = Math.floor(elapsedMs / 1000);

        const newRemainingDuration = Math.max(
          0,
          party.currentSongRemainingDuration - elapsedSeconds,
        );

        await db.party.update({
          where: { id: party.id },
          data: {
            currentSongStartedAt: null,
            currentSongRemainingDuration: newRemainingDuration,
          },
        });

        io.to(data.partyHash).emit("playback-paused", {
          remainingDuration: newRemainingDuration,
        });
      } catch (error) {
        console.error("Error pausing playback:", error);
      }
    });

    socket.on(
      "toggle-rules",
      async (data: { partyHash: string; orderByFairness: boolean }) => {
        debugLog(
          LOG_TAG,
          `Received 'toggle-rules' for room ${data.partyHash}`,
          data,
        );
        try {
          await db.party.update({
            where: { hash: data.partyHash },
            data: { orderByFairness: data.orderByFairness },
          });
          await updateAndEmitPlaylist(io, data.partyHash, "toggle-rules");
        } catch (error) {
          console.error("Error toggling rules:", error);
        }
      },
    );

    socket.on(
      "toggle-playback",
      async (data: { partyHash: string; disablePlayback: boolean }) => {
        debugLog(
          LOG_TAG,
          `Received 'toggle-playback' for room ${data.partyHash}`,
          data,
        );
        try {
          await db.party.update({
            where: { hash: data.partyHash },
            data: { disablePlayback: data.disablePlayback },
          });
          await updateAndEmitPlaylist(io, data.partyHash, "toggle-playback");
        } catch (error) {
          console.error("Error toggling playback:", error);
        }
      },
    );

    socket.on("close-party", async (data: { partyHash: string }) => {
      debugLog(
        LOG_TAG,
        `Received 'close-party' for room ${data.partyHash}`,
        data,
      );
      try {
        await db.party.update({
          where: { hash: data.partyHash },
          data: {
            status: "CLOSED",
            lastActivityAt: new Date(),
          },
        });
        debugLog(LOG_TAG, `Emitting 'party-closed' to room ${data.partyHash}`);
        io.to(data.partyHash).emit("party-closed");
      } catch (error) {
        console.error("Error closing party:", error);
      }
    });

    socket.on(
      "heartbeat",
      async (data: {
        partyHash: string;
        singerName: string;
        avatar: string | null;
      }) => {
        try {
          const party = await db.party.findUnique({
            where: { hash: data.partyHash },
          });
          if (!party) return;

          await registerParticipant(party.id, data.singerName, data.avatar);

          await db.party.update({
            where: { id: party.id },
            data: { lastActivityAt: new Date() },
          });

          await updateAndEmitSingers(io, party.id, data.partyHash);
        } catch (error) {
          console.error("Error handling heartbeat:", error);
        }
      },
    );

    socket.on(
      "update-idle-messages",
      async (data: { partyHash: string; messages: string[] }) => {
        debugLog(
          LOG_TAG,
          `Received 'update-idle-messages' for room ${data.partyHash}`,
        );
        try {
          // Clean, filter, and limit to 10
          const messagesArray = data.messages
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, 10);

          await db.party.update({
            where: { hash: data.partyHash },
            data: {
              idleMessages: messagesArray,
              lastActivityAt: new Date(),
            },
          });

          // Broadcast the new list to ALL clients in the room
          debugLog(
            LOG_TAG,
            `Emitting 'idle-messages-updated' to room ${data.partyHash}`,
          );
          io.to(data.partyHash).emit("idle-messages-updated", messagesArray);
        } catch (error) {
          console.error("Error updating idle messages:", error);
        }
      },
    );

    socket.on("start-skip-timer", (data: { partyHash: string }) => {
      debugLog(
        LOG_TAG,
        `Broadcasting 'skip-timer-started' to room ${data.partyHash}`,
      );
      socket.broadcast.to(data.partyHash).emit("skip-timer-started");
    });

    socket.on(
      "update-theme-suggestions",
      async (data: { partyHash: string; suggestions: string[] }) => {
        debugLog(
          LOG_TAG,
          `Received 'update-theme-suggestions' for room ${data.partyHash}`,
        );
        try {
          // Clean and filter
          const suggestionsArray = data.suggestions
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, 10);

          await db.party.update({
            where: { hash: data.partyHash },
            data: {
              themeSuggestions: suggestionsArray,
              lastActivityAt: new Date(),
            },
          });

          debugLog(
            LOG_TAG,
            `Emitting 'theme-suggestions-updated' to room ${data.partyHash}`,
          );
          io.to(data.partyHash).emit(
            "theme-suggestions-updated",
            suggestionsArray,
          );
        } catch (error) {
          console.error("Error updating theme suggestions:", error);
        }
      },
    );
  });
}
