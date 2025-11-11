/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Server as HttpServer } from "http";
import { type NextApiRequest, type NextApiResponse } from "next";
import { type Socket as NetSocket } from "net";
import { Server, type Socket } from "socket.io";
import { db } from "~/server/db";
import { getFreshPlaylist } from "~/server/lib/playlist-service";
import { debugLog, formatPlaylistForLog } from "~/utils/debug-logger";
import { type PlaylistItem } from "@prisma/client";
import { orderByRoundRobin, type FairnessPlaylistItem } from "~/utils/array";
import youtubeAPI from "~/utils/youtube-data-api";
import { parseISO8601Duration } from "~/utils/string";

type NextApiResponseWithSocket = NextApiResponse & {
  socket: NetSocket & {
    server: HttpServer & {
      io: Server;
    };
  };
};

const LOG_TAG = "[SocketServer]";

// Helper function to generate a random duration
// Min: 3:27 (207s), Max: 4:20 (260s)
function getRandomDurationISO(): string {
  const minSeconds = 207;
  const maxSeconds = 260;
  const randomSeconds =
    Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
  
  const minutes = Math.floor(randomSeconds / 60);
  const seconds = randomSeconds % 60;
  
  const isoDuration = `PT${minutes}M${seconds}S`;

  debugLog(LOG_TAG, `Generated random fallback duration: ${isoDuration}`);

  return isoDuration;
}

type Participant = {
  name: string;
  role: string;
};

async function getSingers(partyId: number): Promise<Participant[]> {
  const participants = await db.partyParticipant.findMany({
    where: { partyId },
    orderBy: { joinedAt: "asc" }, 
    select: {
      name: true,
      role: true, 
    },
  });
  
  const uniqueParticipants = new Map<string, Participant>();
  for (const p of participants) {
    if (!uniqueParticipants.has(p.name) || p.role === "Host") {
      uniqueParticipants.set(p.name, p);
    }
  }
  
  return Array.from(uniqueParticipants.values());
}

async function updateAndEmitSingers(io: Server, partyId: number, partyHash: string) {
  try {
    const participants = await getSingers(partyId); 
    debugLog(LOG_TAG, `Emitting 'singers-updated' to room ${partyHash}`, participants);
    io.to(partyHash).emit("singers-updated", participants); 
  } catch (error) {
    console.error("Error emitting singers:", error);
  }
}

async function registerParticipant(partyId: number, name: string): Promise<{ isNew: boolean }> {
  if (!name || name.trim() === "" || name === "Host" || name === "Player") {
    return { isNew: false }; 
  }

  try {
    const existing = await db.partyParticipant.findUnique({
      where: {
        partyId_name: { 
          partyId,
          name,
        },
      },
    });

    if (existing) {
      return { isNew: false };
    }

    await db.partyParticipant.create({
      data: {
        partyId,
        name,
        role: "Guest", // Explicitly set to Guest
      },
    });
    
    return { isNew: true };

  } catch (error) {
    if ((error as any).code === 'P2002') { 
      return { isNew: false };
    }
    console.error("Error registering participant:", error);
    return { isNew: false };
  }
}

const updateAndEmitPlaylist = async (io: Server, partyHash: string, triggeredBy: string) => {
  try {
    const partyData = await getFreshPlaylist(partyHash);
    
    debugLog(
      LOG_TAG,
      `Emitting 'playlist-updated' to room ${partyHash} (triggered by ${triggeredBy})`,
      {
        Status: partyData.status,
        Settings: partyData.settings,
        CurrentSong: partyData.currentSong?.title ?? "None",
        Unplayed: formatPlaylistForLog(partyData.unplayed),
        Played: formatPlaylistForLog(partyData.played),
        IdleMessages: partyData.idleMessages,
      }
    );
    
    io.to(partyHash).emit("playlist-updated", partyData);
  } catch (error) {
    console.error(`Error updating playlist for ${partyHash}:`, error);
    if ((error as Error).message === "Party not found") {
      debugLog(LOG_TAG, `Emitting 'party-closed' to room ${partyHash}`);
      io.to(partyHash).emit("party-closed");
    }
  }
};

// --- MAIN SocketHandler ---

const SocketHandler = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (res.socket.server.io) {
    debugLog(LOG_TAG, "Socket is already running");
    res.end();
    return;
  }

  debugLog(LOG_TAG, "Starting Socket.io server...");
  const io = new Server(res.socket.server, {
    path: "/api/socket",
    addTrailingSlash: false,
  });
  res.socket.server.io = io;

  io.on("connection", (socket: Socket) => {
    debugLog(LOG_TAG, `Socket connected: ${socket.id}`);

    socket.on("request-open-parties", async () => {
      debugLog(LOG_TAG, `Received 'request-open-parties' from ${socket.id}`);
      try {
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);
        const parties = await db.party.findMany({
          where: { 
            createdAt: { gte: oneDayAgo },
            status: { not: "CLOSED" }
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

    socket.on("join-party", async (data: { partyHash: string, singerName: string }) => {
      const { partyHash, singerName } = data;
      void socket.join(partyHash);
      debugLog(LOG_TAG, `Socket ${socket.id} joined room ${partyHash} as ${singerName}`);
      
      const party = await db.party.findUnique({ where: { hash: partyHash } });
      if (party) {
        const { isNew } = await registerParticipant(party.id, singerName);
        if (isNew) {
          socket.broadcast.to(partyHash).emit("new-singer-joined", singerName);
        }
        
        void updateAndEmitPlaylist(io, partyHash, "join-party");
        void updateAndEmitSingers(io, party.id, partyHash);
      }
    });

    socket.on(
      "add-song",
      async (data: {
        partyHash: string;
        videoId: string;
        title: string;
        coverUrl: string;
        singerName: string;
      }) => {
        debugLog(LOG_TAG, `Received 'add-song' for room ${data.partyHash}`, data);
        try {
          const party = await db.party.findUnique({ where: { hash: data.partyHash } });
          if (!party) return;

          const { isNew } = await registerParticipant(party.id, data.singerName);
          if (isNew) {
            // --- THIS IS THE FIX ---
            // Ensures the "new-singer-joined" toast is only sent
            // to clients in the *same party* (room).
            socket.broadcast.to(data.partyHash).emit("new-singer-joined", data.singerName);
            // --- END THE FIX ---
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
            debugLog(LOG_TAG, `Fetched duration for ${data.videoId}: ${duration ?? 'N/A'}`);

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

    socket.on("remove-song", async (data: { partyHash: string; videoId: string }) => {
      debugLog(LOG_TAG, `Received 'remove-song' for room ${data.partyHash}`, data);
      try {
        const party = await db.party.findUnique({ where: { hash: data.partyHash } });
        if (!party) return;

        await db.playlistItem.deleteMany({
          where: { partyId: party.id, videoId: data.videoId, playedAt: null },
        });
        await updateAndEmitPlaylist(io, data.partyHash, "remove-song");
      } catch (error) {
        console.error("Error removing song:", error);
      }
    });

    socket.on("mark-as-played", async (data: { partyHash: string }) => {
      debugLog(LOG_TAG, `Received 'mark-as-played' for room ${data.partyHash}`, data);
      try {
        const party = await db.party.findUnique({
          where: { hash: data.partyHash },
          include: { 
            playlistItems: { 
              orderBy: [{ playedAt: "asc" }, { addedAt: "asc" }],
            } 
          }
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
                (latest.playedAt?.getTime() ?? 0) > (current.playedAt?.getTime() ?? 0)
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
      debugLog(LOG_TAG, `Received 'start-party' for room ${data.partyHash}`, data);
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
    
    socket.on("playback-play", async (data: { partyHash: string, currentTime?: number }) => {
      debugLog(LOG_TAG, `Received 'playback-play' for room ${data.partyHash}`, data);
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
          orderBy: [{ playedAt: "asc" }, { addedAt: "asc" }]
        });
        
        const playedItems = allDbItems.filter(item => item.playedAt);
        const unplayedItems = allDbItems.filter(item => !item.playedAt);
        
        const lastPlayedSong = playedItems.length > 0
            ? playedItems.reduce((latest, current) =>
                (latest.playedAt?.getTime() ?? 0) > (current.playedAt?.getTime() ?? 0) ? latest : current)
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
        
        const totalDurationMs = parseISO8601Duration(currentSong.duration) ?? 0;
        const totalDurationSec = Math.floor(totalDurationMs / 1000);

        if (data.currentTime !== undefined && data.currentTime !== null) {
          debugLog(LOG_TAG, `Scrub detected. New time: ${data.currentTime}s`);
          remainingDuration = Math.max(0, totalDurationSec - Math.floor(data.currentTime));
        } else {
          remainingDuration = party.currentSongId === currentSong.videoId && party.currentSongRemainingDuration !== null
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
    });

    socket.on("playback-pause", async (data: { partyHash: string }) => {
      debugLog(LOG_TAG, `Received 'playback-pause' for room ${data.partyHash}`);
      try {
        const party = await db.party.findUnique({ where: { hash: data.partyHash } });
        
        if (!party) {
          debugLog(LOG_TAG, "Playback-pause failed: Party not found.");
          return;
        }

        if (party.status === "OPEN") {
          debugLog(LOG_TAG, "Party is OPEN, playback disabled.");
          return;
        }

        if (!party.currentSongStartedAt || party.currentSongRemainingDuration === null) {
          debugLog(LOG_TAG, "Playback-pause failed: Not playing or no duration.");
          return;
        }

        const elapsedMs = new Date().getTime() - party.currentSongStartedAt.getTime();
        const elapsedSeconds = Math.floor(elapsedMs / 1000);

        const newRemainingDuration = Math.max(0, party.currentSongRemainingDuration - elapsedSeconds);

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

    socket.on("toggle-rules", async (data: { partyHash: string; orderByFairness: boolean }) => {
      debugLog(LOG_TAG, `Received 'toggle-rules' for room ${data.partyHash}`, data);
      try {
        await db.party.update({
          where: { hash: data.partyHash },
          data: { orderByFairness: data.orderByFairness },
        });
        await updateAndEmitPlaylist(io, data.partyHash, "toggle-rules");
      } catch (error) {
        console.error("Error toggling rules:", error);
      }
    });
    
    socket.on("toggle-playback", async (data: { partyHash: string; disablePlayback: boolean }) => {
      debugLog(LOG_TAG, `Received 'toggle-playback' for room ${data.partyHash}`, data);
      try {
        await db.party.update({
          where: { hash: data.partyHash },
          data: { disablePlayback: data.disablePlayback },
        });
        await updateAndEmitPlaylist(io, data.partyHash, "toggle-playback");
      } catch (error) {
        console.error("Error toggling playback:", error);
      }
    });

    socket.on("close-party", async (data: { partyHash: string }) => {
      debugLog(LOG_TAG, `Received 'close-party' for room ${data.partyHash}`, data);
      try {
        await db.party.update({ 
          where: { hash: data.partyHash },
          data: {
            status: "CLOSED",
            lastActivityAt: new Date(),
          }
        });
        debugLog(LOG_TAG, `Emitting 'party-closed' to room ${data.partyHash}`);
        io.to(data.partyHash).emit("party-closed");
      } catch (error) {
        console.error("Error closing party:", error);
      }
    });

    socket.on("heartbeat", async (data: { partyHash: string, singerName: string }) => {
      try {
        const party = await db.party.findUnique({ where: { hash: data.partyHash } });
        if (!party) return;

        await registerParticipant(party.id, data.singerName);
        
        await db.party.update({
          where: { id: party.id },
          data: { lastActivityAt: new Date() },
        });

        await updateAndEmitSingers(io, party.id, data.partyHash);
      } catch (error) {
        console.error("Error handling heartbeat:", error);
      }
    });

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
      debugLog(LOG_TAG, `Broadcasting 'skip-timer-started' to room ${data.partyHash}`);
      socket.broadcast.to(data.partyHash).emit("skip-timer-started");
    });
  });

  res.end();
};

export default SocketHandler;
