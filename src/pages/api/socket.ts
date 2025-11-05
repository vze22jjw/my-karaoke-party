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

type NextApiResponseWithSocket = NextApiResponse & {
  socket: NetSocket & {
    server: HttpServer & {
      io: Server;
    };
  };
};

const LOG_TAG = "[SocketServer]";

// --- START FIX ---

// partyId is a number
async function getSingers(partyId: number): Promise<string[]> {
  const participants = await db.partyParticipant.findMany({
    where: { partyId },
    // Use `joinedAt` as per your schema
    orderBy: { joinedAt: "desc" },
  });
  // Use `name` as per your schema
  const uniqueNames = [...new Set(participants.map((p) => p.name))];
  return uniqueNames;
}

// partyId is a number
async function updateAndEmitSingers(io: Server, partyId: number, partyHash: string) {
  try {
    const singerList = await getSingers(partyId);
    debugLog(LOG_TAG, `Emitting 'singers-updated' to room ${partyHash}`, singerList);
    io.to(partyHash).emit("singers-updated", singerList);
  } catch (error) {
    console.error("Error emitting singers:", error);
  }
}

// partyId is a number, and the field is `name`
async function registerParticipant(partyId: number, name: string): Promise<{ isNew: boolean }> {
  if (!name || name.trim() === "" || name === "Host") {
    return { isNew: false };
  }

  try {
    const existing = await db.partyParticipant.findUnique({
      where: {
        // Use `partyId_name` as per your schema's @@unique
        partyId_name: {
          partyId,
          name,
        },
      },
    });

    await db.partyParticipant.upsert({
      where: {
        partyId_name: {
          partyId,
          name,
        },
      },
      create: { // Use `name`
        partyId,
        name,
      },
      update: { // Use `name`
        name: name,
      },
    });
    
    return { isNew: !existing };

  } catch (error) {
    console.error("Error registering participant:", error);
    return { isNew: false };
  }
}
// --- END FIX ---


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

  const updateAndEmitPlaylist = async (partyHash: string, triggeredBy: string) => {
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

  io.on("connection", (socket: Socket) => {
    debugLog(LOG_TAG, `Socket connected: ${socket.id}`);

    // UPDATED: join-party handler
    socket.on("join-party", async (data: { partyHash: string, singerName: string }) => {
      // The client calls it `singerName`, but we'll pass it to our helper as `name`
      const { partyHash, singerName: name } = data;
      void socket.join(partyHash);
      debugLog(LOG_TAG, `Socket ${socket.id} joined room ${partyHash} as ${name}`);
      
      const party = await db.party.findUnique({ where: { hash: partyHash } });
      if (party) {
        // Register participant
        const { isNew } = await registerParticipant(party.id, name);
        if (isNew) {
          socket.broadcast.to(partyHash).emit("new-singer-joined", name);
        }
        
        void updateAndEmitPlaylist(partyHash, "join-party");
        void updateAndEmitSingers(io, party.id, partyHash);
      }
    });

    // UPDATED: add-song handler
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

          // Pass `data.singerName` as the `name` parameter
          const { isNew } = await registerParticipant(party.id, data.singerName);
          if (isNew) {
            socket.broadcast.to(data.partyHash).emit("new-singer-joined", data.singerName);
          }

          const existing = await db.playlistItem.findFirst({
            where: { partyId: party.id, videoId: data.videoId, playedAt: null },
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
          await updateAndEmitPlaylist(data.partyHash, "add-song");
          await updateAndEmitSingers(io, party.id, data.partyHash);
        } catch (error) {
          console.error("Error adding song:", error);
        }
      },
    );

    // Remove Song
    socket.on("remove-song", async (data: { partyHash: string; videoId: string }) => {
      debugLog(LOG_TAG, `Received 'remove-song' for room ${data.partyHash}`, data);
      try {
        const party = await db.party.findUnique({ where: { hash: data.partyHash } });
        if (!party) return;

        await db.playlistItem.deleteMany({
          where: { partyId: party.id, videoId: data.videoId },
        });
        await updateAndEmitPlaylist(data.partyHash, "remove-song");
      } catch (error) {
        console.error("Error removing song:", error);
      }
    });

    // Mark as Played
    socket.on("mark-as-played", async (data: { partyHash: string }) => {
      debugLog(LOG_TAG, `Received 'mark-as-played' for room ${data.partyHash}`, data);
      try {
        const party = await db.party.findUnique({
          where: { hash: data.partyHash },
          include: { 
            playlistItems: { 
              where: { playedAt: null }, 
              orderBy: { addedAt: 'asc' },
              take: 1
            } 
          }
        });

        if (!party || party.playlistItems.length === 0) {
          debugLog(LOG_TAG, "Party not found or no items to play");
          return;
        }

        const currentSong = party.playlistItems[0];
        if (!currentSong) return;

        debugLog(LOG_TAG, `Marking song ${currentSong.id} as played`);

        await db.playlistItem.update({
          where: { id: currentSong.id },
          data: { playedAt: new Date() },
        });

        await db.party.update({
          where: { id: party.id },
          data: { lastActivityAt: new Date() },
        });

        await updateAndEmitPlaylist(data.partyHash, "mark-as-played");
      } catch (error) {
        console.error("Error marking as played:", error);
      }
    });

    // Playback Handlers
    socket.on("playback-play", (data: { partyHash: string }) => {
      debugLog(LOG_TAG, `Received 'playback-play' for room ${data.partyHash}`);
      io.to(data.partyHash).emit("playback-state-play");
    });

    socket.on("playback-pause", (data: { partyHash: string }) => {
      debugLog(LOG_TAG, `Received 'playback-pause' for room ${data.partyHash}`);
      io.to(data.partyHash).emit("playback-state-pause");
    });

    // Toggle Rules
    socket.on("toggle-rules", async (data: { partyHash: string; orderByFairness: boolean }) => {
      debugLog(LOG_TAG, `Received 'toggle-rules' for room ${data.partyHash}`, data);
      try {
        await db.party.update({
          where: { hash: data.partyHash },
          data: { orderByFairness: data.orderByFairness },
        });
        await updateAndEmitPlaylist(data.partyHash, "toggle-rules");
      } catch (error) {
        console.error("Error toggling rules:", error);
      }
    });

    // Close Party
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

    // Heartbeat
    socket.on("heartbeat", async (data: { partyHash: string, singerName: string }) => {
      try {
        const party = await db.party.findUnique({ where: { hash: data.partyHash } });
        if (!party) return;

        // Pass `data.singerName` as the `name` parameter
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
  });

  res.end();
};

export default SocketHandler;
