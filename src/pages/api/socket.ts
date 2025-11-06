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

type NextApiResponseWithSocket = NextApiResponse & {
  socket: NetSocket & {
    server: HttpServer & {
      io: Server;
    };
  };
};

const LOG_TAG = "[SocketServer]";

// --- ALL HELPER FUNCTIONS MOVED HERE, BEFORE SocketHandler ---

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
        Settings: partyData.settings,
        CurrentSong: partyData.currentSong?.title ?? "None",
        Unplayed: formatPlaylistForLog(partyData.unplayed),
        Played: formatPlaylistForLog(partyData.played),
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
          where: { createdAt: { gte: oneDayAgo } },
          orderBy: { createdAt: "desc" },
          select: {
            hash: true,
            name: true,
            createdAt: true,
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
        
        // This will now work because updateAndEmitPlaylist is defined above
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
            socket.broadcast.to(data.partyHash).emit("new-singer-joined", data.singerName);
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
            await db.playlistItem.create({
              data: {
                partyId: party.id,
                videoId: data.videoId,
                title: data.title,
                artist: "",
                song: "",
                coverUrl: data.coverUrl,
                duration: "",
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
          data: { lastActivityAt: new Date() },
        });

        await updateAndEmitPlaylist(io, data.partyHash, "mark-as-played");
      } catch (error) {
        console.error("Error marking as played:", error);
      }
    });
    
    socket.on("playback-play", (data: { partyHash: string }) => {
      debugLog(LOG_TAG, `Received 'playback-play' for room ${data.partyHash}`);
      io.to(data.partyHash).emit("playback-state-play");
    });

    socket.on("playback-pause", (data: { partyHash: string }) => {
      debugLog(LOG_TAG, `Received 'playback-pause' for room ${data.partyHash}`);
      io.to(data.partyHash).emit("playback-state-pause");
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
        await db.party.delete({ where: { hash: data.partyHash } });
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

    socket.on("start-skip-timer", (data: { partyHash: string }) => {
      debugLog(LOG_TAG, `Broadcasting 'skip-timer-started' to room ${data.partyHash}`);
      socket.broadcast.to(data.partyHash).emit("skip-timer-started");
    });
  });

  res.end();
};

export default SocketHandler;