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
import { orderByRoundRobin, type FairnessPlaylistItem } from "~/utils/array";
import { type PlaylistItem } from "@prisma/client";
import youtubeAPI from "~/utils/youtube-data-api";
import { parseISO8601Duration } from "~/utils/string";

const addSongRateLimit = new Map<string, number>();
const RATE_LIMIT_WINDOW = 2000; // 2 seconds

function ensureHost(socket: Socket): boolean {
  const role = socket.data.role as string | undefined;
  if (role !== "Host") {
    socket.emit("error", { message: "Unauthorized: Host access required." });
    return false;
  }
  return true;
}

export function registerSocketEvents(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`${LOG_TAG} New Socket Connection Accepted: ${socket.id}`);

    socket.on("request-open-parties", async () => {
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
      console.log(`${LOG_TAG} Socket ${socket.id} joined room ${partyHash} as ${singerName}`);
      
      const party = await db.party.findUnique({ where: { hash: partyHash } });
      if (party) {
        const { isNew } = await registerParticipant(party.id, singerName, avatar);
        
        const participant = await db.partyParticipant.findUnique({
            where: { partyId_name: { partyId: party.id, name: singerName } },
            select: { role: true }
        });
        if (participant) {
            socket.data.role = participant.role;
        }

        // FIX: Explicitly grant Host privileges to the "Player" client.
        if (singerName === "Player") {
            socket.data.role = "Host";
        }

        if (isNew) socket.broadcast.to(partyHash).emit("new-singer-joined", singerName);
        void updateAndEmitPlaylist(io, partyHash, "join-party");
        void updateAndEmitSingers(io, party.id, partyHash);
      }
    });

    socket.on("add-song", async (data: { partyHash: string; videoId: string; title: string; coverUrl: string; singerName: string }) => {
      try {
        const lastRequest = addSongRateLimit.get(socket.id) ?? 0;
        const now = Date.now();
        if (now - lastRequest < RATE_LIMIT_WINDOW) {
            socket.emit("error", { message: "Please wait a few seconds before adding another song." });
            return;
        }
        addSongRateLimit.set(socket.id, now);

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
          const durationISO = await youtubeAPI.getVideoDuration(data.videoId);
          
          const durationMs = parseISO8601Duration(durationISO);
          if (durationMs && durationMs > 10 * 60 * 1000) { // 10 minutes in ms
             socket.emit("error", { message: "Video too long! Max duration is 10 minutes." });
             return;
          }

          let spotifyId: string | undefined;
          let cleanArtist: string | undefined; // <-- NEW
          let cleanSong: string | undefined;   // <-- NEW

          try {
            // Get rich metadata from Spotify service
            const match = await spotifyService.searchTrack(data.title);
            if (match) {
                spotifyId = match.id;
                cleanArtist = match.artist; // <-- CAPTURE
                cleanSong = match.title;    // <-- CAPTURE
            }
          } catch (e) { /* ignore */ }

          await db.playlistItem.create({
            data: {
              partyId: party.id, 
              videoId: data.videoId, 
              // Use cleaned metadata if available, otherwise fallback to raw YouTube title
              title: cleanSong ?? data.title,    
              artist: cleanArtist ?? "", 
              song: cleanSong ?? "", 
              coverUrl: data.coverUrl, 
              duration: durationISO ? durationISO : getRandomDurationISO(),
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
        socket.emit("error", { message: "Failed to add song." });
      }
    });

    // --- PROTECTED HOST ACTIONS (Rest of file unchanged) ---

    socket.on("remove-song", async (data: { partyHash: string; videoId: string }) => {
      if (!ensureHost(socket)) return;
      try {
        const party = await db.party.findUnique({ where: { hash: data.partyHash } });
        if (!party) return;
        await db.playlistItem.deleteMany({ where: { partyId: party.id, videoId: data.videoId, playedAt: null } });
        await updateAndEmitPlaylist(io, data.partyHash, "remove-song");
      } catch (error) { console.error("Error removing song:", error); }
    });

    socket.on("mark-as-played", async (data: { partyHash: string }) => {
      if (!ensureHost(socket)) return;
      try {
        const party = await db.party.findUnique({
          where: { hash: data.partyHash },
          include: { playlistItems: { orderBy: [{ playedAt: "asc" }, { addedAt: "asc" }] } },
        });
        if (!party || party.status === "OPEN") return;

        const allItems: PlaylistItem[] = party.playlistItems;
        const playedItems = allItems.filter((item) => item.playedAt);
        const unplayedItems = allItems.filter((item) => !item.playedAt);
        
        const priorityItems = unplayedItems.filter(i => i.isPriority);
        const standardItems = unplayedItems.filter(i => !i.isPriority);

        const lastPlayedSong = playedItems.length > 0 ? playedItems.reduce((l, c) => (l.playedAt! > c.playedAt! ? l : c)) : null;

        let sortedStandard: PlaylistItem[] = [];
        if (party.orderByFairness) {
            sortedStandard = orderByRoundRobin(allItems as FairnessPlaylistItem[], standardItems as FairnessPlaylistItem[], lastPlayedSong?.singerName ?? null) as PlaylistItem[];
        } else {
            sortedStandard = standardItems;
        }

        const finalQueue = [...priorityItems, ...sortedStandard];
        const currentSong = finalQueue[0];
        
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
      if (!ensureHost(socket)) return;
      try {
        await db.party.update({ where: { hash: data.partyHash }, data: { status: "STARTED", lastActivityAt: new Date() } });
        await updateAndEmitPlaylist(io, data.partyHash, "start-party");
      } catch (error) { console.error("Error starting party:", error); }
    });

    socket.on("refresh-party", async (data: { partyHash: string }) => {
       if (!ensureHost(socket)) return;
       await updateAndEmitPlaylist(io, data.partyHash, "refresh-party");
    });

    socket.on("playback-play", async (data: { partyHash: string; currentTime?: number }) => {
      if (!ensureHost(socket)) return;
      try {
        const party = await db.party.findUnique({ where: { hash: data.partyHash } });
        if (!party || party.status === "OPEN") return;

        const allDbItems = await db.playlistItem.findMany({ where: { partyId: party.id }, orderBy: [{ playedAt: "asc" }, { addedAt: "asc" }] });
        const played = allDbItems.filter((i) => i.playedAt);
        const unplayed = allDbItems.filter((i) => !i.playedAt);
        
        const priorityItems = unplayed.filter(i => i.isPriority);
        const standardItems = unplayed.filter(i => !i.isPriority);
        const lastPlayed = played.length > 0 ? played.reduce((l, c) => (l.playedAt! > c.playedAt! ? l : c)) : null;

        let sortedStandard: PlaylistItem[] = [];
        if (party.orderByFairness) {
            sortedStandard = orderByRoundRobin(allDbItems as FairnessPlaylistItem[], standardItems as FairnessPlaylistItem[], lastPlayed?.singerName ?? null) as PlaylistItem[];
        } else {
            sortedStandard = standardItems;
        }
        const finalQueue = [...priorityItems, ...sortedStandard];
        const current = finalQueue[0];

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
      if (!ensureHost(socket)) return;
      try {
        const party = await db.party.findUnique({ where: { hash: data.partyHash } });
        if (!party?.currentSongStartedAt || party.currentSongRemainingDuration === null) return;

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
      if (!ensureHost(socket)) return;
      await db.party.update({ where: { hash: data.partyHash }, data: { orderByFairness: data.orderByFairness } });
      await updateAndEmitPlaylist(io, data.partyHash, "toggle-rules");
    });

    socket.on("toggle-playback", async (data: { partyHash: string; disablePlayback: boolean }) => {
      if (!ensureHost(socket)) return;
      await db.party.update({ where: { hash: data.partyHash }, data: { disablePlayback: data.disablePlayback } });
      await updateAndEmitPlaylist(io, data.partyHash, "toggle-playback");
    });

    socket.on("close-party", async (data: { partyHash: string }) => {
      if (!ensureHost(socket)) return;
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
      if (!ensureHost(socket)) return;
      const msgs = data.messages.map((l) => l.trim()).filter(Boolean).slice(0, 10);
      await db.party.update({ where: { hash: data.partyHash }, data: { idleMessages: msgs, lastActivityAt: new Date() } });
      io.to(data.partyHash).emit("idle-messages-updated", msgs);
    });

    socket.on("start-skip-timer", (data: { partyHash: string }) => {
      if (!ensureHost(socket)) return;
      socket.broadcast.to(data.partyHash).emit("skip-timer-started");
    });

    socket.on("update-theme-suggestions", async (data: { partyHash: string; suggestions: string[] }) => {
      if (!ensureHost(socket)) return;
      const suggs = data.suggestions.map((l) => l.trim()).filter(Boolean).slice(0, 10);
      await db.party.update({ where: { hash: data.partyHash }, data: { themeSuggestions: suggs, lastActivityAt: new Date() } });
      io.to(data.partyHash).emit("theme-suggestions-updated", suggs);
    });

    socket.on("toggle-manual-sort", async (data: { partyHash: string; isActive: boolean }) => {
        if (!ensureHost(socket)) return;
        await db.party.update({
            where: { hash: data.partyHash },
            data: { isManualSortActive: data.isActive }
        });
        await updateAndEmitPlaylist(io, data.partyHash, "toggle-manual-sort");
    });

    socket.on("save-queue-order", async (data: { partyHash: string; newOrderIds: string[] }) => {
        if (!ensureHost(socket)) return;
        try {
            const party = await db.party.findUnique({ where: { hash: data.partyHash } });
            if (!party) return;

            const unplayed = await db.playlistItem.findMany({ where: { partyId: party.id, playedAt: null } });
            if (unplayed.length === 0) return;
            
            const sortedByTime = [...unplayed].sort((a, b) => a.addedAt.getTime() - b.addedAt.getTime());
            const baseTime = sortedByTime[0]?.addedAt.getTime() ?? Date.now();

            const updates = data.newOrderIds.map((videoId, index) => {
                const newAddedAt = new Date(baseTime + (index * 1000));
                return db.playlistItem.updateMany({
                    where: { partyId: party.id, videoId: videoId, playedAt: null },
                    data: { 
                        addedAt: newAddedAt, 
                        isPriority: true 
                    }
                });
            });

            await db.$transaction(updates);
            await db.party.update({ where: { id: party.id }, data: { isManualSortActive: false } });
            await updateAndEmitPlaylist(io, data.partyHash, "save-queue-order");
        } catch (error) {
            console.error("Error saving queue order:", error);
        }
    });

    socket.on("toggle-priority", async (data: { partyHash: string; videoId: string }) => {
        if (!ensureHost(socket)) return;
        try {
            const party = await db.party.findUnique({ where: { hash: data.partyHash } });
            if (!party) return;

            const item = await db.playlistItem.findFirst({
                where: { partyId: party.id, videoId: data.videoId, playedAt: null }
            });

            if (item && !item.isPriority) {
                await db.playlistItem.update({
                    where: { id: item.id },
                    data: { 
                        isPriority: true, 
                    }
                });
                await updateAndEmitPlaylist(io, data.partyHash, "toggle-priority");
            }
        } catch (error) {
            console.error("Error toggling priority:", error);
        }
    });
  });
}
