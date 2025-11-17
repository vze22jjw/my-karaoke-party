/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { type Server } from "socket.io";
import { db } from "~/server/db";
import { getFreshPlaylist } from "~/server/lib/playlist-service";
import { debugLog, formatPlaylistForLog } from "~/utils/debug-logger";

export const LOG_TAG = "[SocketServer]";

/**
 * Helper function to generate a random duration
 * Min: 3:27 (207s), Max: 4:20 (260s)
 */
export function getRandomDurationISO(): string {
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

export type Participant = {
  name: string;
  role: string;
  avatar: string | null;
};

/**
 * Gets a formatted list of unique participants for a party.
 */
export async function getSingers(partyId: number): Promise<Participant[]> {
  const participants = await db.partyParticipant.findMany({
    where: { partyId },
    orderBy: { joinedAt: "asc" },
    select: {
      name: true,
      role: true,
      avatar: true, // <-- Select avatar
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

/**
 * Fetches the latest singer list and emits it to the room.
 */
export async function updateAndEmitSingers(
  io: Server,
  partyId: number,
  partyHash: string,
) {
  try {
    const participants = await getSingers(partyId);
    debugLog(
      LOG_TAG,
      `Emitting 'singers-updated' to room ${partyHash}`,
      participants,
    );
    io.to(partyHash).emit("singers-updated", participants);
  } catch (error) {
    console.error("Error emitting singers:", error);
  }
}

/**
 * Creates or updates a participant in the database.
 * Returns { isNew: true } if a new participant was created.
 */
export async function registerParticipant(
  partyId: number,
  name: string,
  avatar: string | null,
): Promise<{ isNew: boolean }> {
  // Ignore system/empty names
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
      // If they exist, just update their avatar if it's different
      if (existing.avatar !== avatar) {
        await db.partyParticipant.update({
          where: { id: existing.id },
          data: { avatar: avatar },
        });
        debugLog(LOG_TAG, `Updated avatar for ${name}`);
      }
      return { isNew: false };
    }

    // If they don't exist, create them
    await db.partyParticipant.create({
      data: {
        partyId,
        name,
        avatar: avatar,
        role: "Guest",
      },
    });

    return { isNew: true };
  } catch (error) {
    if ((error as any).code === "P2002") {
      // Race condition, someone else created it, try to update avatar just in case
      try {
        await db.partyParticipant.update({
          where: { partyId_name: { partyId, name } },
          data: { avatar: avatar },
        });
      } catch (updateError) {
        // ignore
      }
      return { isNew: false };
    }
    console.error("Error registering participant:", error);
    return { isNew: false };
  }
}

/**
 * Fetches the fresh, sorted playlist state and emits it to the room.
 */
export const updateAndEmitPlaylist = async (
  io: Server,
  partyHash: string,
  triggeredBy: string,
) => {
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
      },
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
