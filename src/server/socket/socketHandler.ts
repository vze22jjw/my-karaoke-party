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
  LOG_TAG,
} from "./socketUtils";
import { debugLog } from "~/utils/debug-logger";
import { orderByRoundRobin, type FairnessPlaylistItem } from "~/utils/array";
import { type PlaylistItem } from "@prisma/client";
import youtubeAPI from "~/utils/youtube-data-api";
import { parseISO8601Duration } from "~/utils/string";

export function registerSocketEvents(io: Server) {
  io.on("connection", (socket: Socket) => {
    // --- DEBUG LOG ---
    console.log(`${LOG_TAG} New Socket Connection Accepted: ${socket.id}`);
    // -----------------

    socket.on("request-open-parties", async () => {
      debugLog(LOG_TAG, `Received 'request-open-parties' from ${socket.id}`);
      try {
        const parties = await db.party.findMany({
          where: { status: { in: ["OPEN", "STARTED"] } },
          orderBy: { createdAt: "desc" },
          select: {
            hash: true, name: true, createdAt: true, status: true,
            _count: { select: { playlistItems: true, participants: true } },
          },
        });
        const formattedParties = parties.map((party) => ({
          hash: party.hash, name: party.name, createdAt: party.createdAt.toISOString(),
          songCount: party._count.playlistItems, singerCount: party._count.participants, status: party.status,
        }));
        socket.emit("open-parties-list", { parties: formattedParties });
      } catch (error) {
        socket.emit("open-parties-list", { error: "Failed to fetch parties" });
      }
    });

    socket.on("join-party", async (data: { partyHash: string; singerName: string; avatar: string | null }) => {
      const { partyHash, singerName, avatar } = data;
      void socket.join(partyHash);
      debugLog(LOG_TAG, `Socket ${socket.id} joined room ${partyHash} as ${singerName}`);
      const party = await db.party.findUnique({ where: { hash: partyHash } });
      if (party) {
        const { isNew } = await registerParticipant(party.id, singerName, avatar);
        if (isNew) socket.broadcast.to(partyHash).emit("new-singer-joined", singerName);
        void updateAndEmitPlaylist(io, partyHash, "join-party");
        void updateAndEmitSingers(io, party.id, partyHash);
      }
    });

    socket.on("add-song", async (data: { partyHash: string; videoId: string; title: string; coverUrl: string; singerName: string }) => {
      try {
        const party = await db.party.findUnique({
          where: { hash: data.partyHash },
          include: { participants: { where: { name: data.singerName } } },
        });
        if (!party) return;
        const participant = party.participants[0];
        const { isNew } = await registerParticipant(party.id, data.singerName, participant?.avatar ?? null);
        if (isNew) socket.broadcast.to(data.partyHash).emit("new-singer-joined", data.singerName);

        const existing = await db.playlistItem.findFirst({
          where: { partyId: party.id, videoId: data.videoId, singerName: data.singerName, playedAt: null },
        });

        if (!existing) {
          const duration = await youtubeAPI.getVideoDuration(data.videoId);
          let spotifyId: string | undefined;
          try {
            const match = await spotifyService.searchTrack(data.title);
            if (match) spotifyId = match.id;
          } catch (e) { /* ignore */ }

          await db.playlistItem.create({
            data: {
              partyId: party.id, videoId: data.videoId, title: data.title, artist: "", song: "",
              coverUrl: data.coverUrl, duration: duration ? duration : getRandomDurationISO(),
              singerName: data.singerName, randomBreaker: Math.random(), spotifyId: spotifyId,
            },
          });
        }
        await updateAndEmitPlaylist(io, data.partyHash, "add-song");
        await updateAndEmitSingers(io, party.id, data.partyHash);
      } catch (error) {
        console.error("Error adding song:", error);
      }
    });

    socket.on("remove-song", async (data: { partyHash: string; videoId: string }) => {
      try {
        const party = await db.party.findUnique({ where: { hash: data.partyHash } });
        if (!party) return;
        await db.playlistItem.deleteMany({ where: { partyId: party.id, videoId: data.videoId, playedAt: null } });
        await updateAndEmitPlaylist(io, data.partyHash, "remove-song");
      } catch (error) { console.error("Error removing song:", error); }
    });

    socket.on("mark-as-played", async (data: { partyHash: string }) => {
      try {
        const party = await db.party.findUnique({
          where: { hash: data.partyHash },
          include: { playlistItems: { orderBy: [{ playedAt: "asc" }, { addedAt: "asc" }] } },
        });
        if (!party || party.status === "OPEN") return;

        const allItems: PlaylistItem[] = party.playlistItems;
        const playedItems = allItems.filter((item) => item.playedAt);
        const unplayedItems = allItems.filter((item) => !item.playedAt);
        const lastPlayedSong = playedItems.length > 0 ? playedItems.reduce((l, c) => (l.playedAt! > c.playedAt! ? l : c)) : null;

        const fairlySorted = party.orderByFairness 
          // FIX: Updated variable names to match definitions above
          ? orderByRoundRobin(allItems as FairnessPlaylistItem[], unplayedItems as FairnessPlaylistItem[], lastPlayedSong?.singerName ?? null) as PlaylistItem[]
          : unplayedItems;

        const currentSong = fairlySorted[0];
        if (!currentSong) return;

        await db.playlistItem.update({ where: { id: currentSong.id }, data: { playedAt: new Date() } });
        await db.party.update({
          where: { id: party.id },
          data: { lastActivityAt: new Date(), currentSongId: null, currentSongStartedAt: null, currentSongRemainingDuration: null },
        });
        await updateAndEmitPlaylist(io, data.partyHash, "mark-as-played");
      } catch (error) { console.error("Error marking as played:", error); }
    });

    socket.on("start-party", async (data: { partyHash: string }) => {
      try {
        await db.party.update({ where: { hash: data.partyHash }, data: { status: "STARTED", lastActivityAt: new Date() } });
        await updateAndEmitPlaylist(io, data.partyHash, "start-party");
      } catch (error) { console.error("Error starting party:", error); }
    });

    socket.on("playback-play", async (data: { partyHash: string; currentTime?: number }) => {
      try {
        const party = await db.party.findUnique({ where: { hash: data.partyHash } });
        if (!party || party.status === "OPEN") return;

        const allDbItems = await db.playlistItem.findMany({ where: { partyId: party.id }, orderBy: [{ playedAt: "asc" }, { addedAt: "asc" }] });
        const played = allDbItems.filter((i) => i.playedAt);
        const unplayed = allDbItems.filter((i) => !i.playedAt);
        const lastPlayed = played.length > 0 ? played.reduce((l, c) => (l.playedAt! > c.playedAt! ? l : c)) : null;

        const sorted = party.orderByFairness 
          ? orderByRoundRobin(allDbItems as FairnessPlaylistItem[], unplayed as FairnessPlaylistItem[], lastPlayed?.singerName ?? null) as PlaylistItem[]
          : unplayed;

        const current = sorted[0];
        if (!current) return;

        const totalSec = Math.floor((parseISO8601Duration(current.duration) ?? 0) / 1000);
        let remaining = (party.currentSongId === current.videoId && party.currentSongRemainingDuration !== null) ? party.currentSongRemainingDuration : totalSec;
        
        if (data.currentTime !== undefined && data.currentTime !== null) {
          remaining = Math.max(0, totalSec - Math.floor(data.currentTime));
        }

        const now = new Date();
        await db.party.update({
          where: { id: party.id },
          data: { currentSongId: current.videoId, currentSongStartedAt: now, currentSongRemainingDuration: remaining },
        });
        io.to(data.partyHash).emit("playback-started", { startedAt: now.toISOString(), remainingDuration: remaining });
      } catch (error) { console.error("Error starting playback:", error); }
    });

    socket.on("playback-pause", async (data: { partyHash: string }) => {
      try {
        const party = await db.party.findUnique({ where: { hash: data.partyHash } });
        if (!party || party.status === "OPEN" || !party.currentSongStartedAt || party.currentSongRemainingDuration === null) return;

        const elapsed = Math.floor((new Date().getTime() - party.currentSongStartedAt.getTime()) / 1000);
        const newRemaining = Math.max(0, party.currentSongRemainingDuration - elapsed);

        await db.party.update({
          where: { id: party.id },
          data: { currentSongStartedAt: null, currentSongRemainingDuration: newRemaining },
        });
        io.to(data.partyHash).emit("playback-paused", { remainingDuration: newRemaining });
      } catch (error) { console.error("Error pausing playback:", error); }
    });

    socket.on("toggle-rules", async (data: { partyHash: string; orderByFairness: boolean }) => {
      await db.party.update({ where: { hash: data.partyHash }, data: { orderByFairness: data.orderByFairness } });
      await updateAndEmitPlaylist(io, data.partyHash, "toggle-rules");
    });

    socket.on("toggle-playback", async (data: { partyHash: string; disablePlayback: boolean }) => {
      await db.party.update({ where: { hash: data.partyHash }, data: { disablePlayback: data.disablePlayback } });
      await updateAndEmitPlaylist(io, data.partyHash, "toggle-playback");
    });

    socket.on("close-party", async (data: { partyHash: string }) => {
      await db.party.update({ where: { hash: data.partyHash }, data: { status: "CLOSED", lastActivityAt: new Date() } });
      io.to(data.partyHash).emit("party-closed");
    });

    socket.on("heartbeat", async (data: { partyHash: string; singerName: string; avatar: string | null }) => {
      const party = await db.party.findUnique({ where: { hash: data.partyHash } });
      if (!party) return;
      await registerParticipant(party.id, data.singerName, data.avatar);
      await db.party.update({ where: { id: party.id }, data: { lastActivityAt: new Date() } });
      await updateAndEmitSingers(io, party.id, data.partyHash);
    });

    socket.on("update-idle-messages", async (data: { partyHash: string; messages: string[] }) => {
      const msgs = data.messages.map((l) => l.trim()).filter(Boolean).slice(0, 10);
      await db.party.update({ where: { hash: data.partyHash }, data: { idleMessages: msgs, lastActivityAt: new Date() } });
      io.to(data.partyHash).emit("idle-messages-updated", msgs);
    });

    socket.on("start-skip-timer", (data: { partyHash: string }) => {
      socket.broadcast.to(data.partyHash).emit("skip-timer-started");
    });

    socket.on("update-theme-suggestions", async (data: { partyHash: string; suggestions: string[] }) => {
      const suggs = data.suggestions.map((l) => l.trim()).filter(Boolean).slice(0, 10);
      await db.party.update({ where: { hash: data.partyHash }, data: { themeSuggestions: suggs, lastActivityAt: new Date() } });
      io.to(data.partyHash).emit("theme-suggestions-updated", suggs);
    });
  });
}
