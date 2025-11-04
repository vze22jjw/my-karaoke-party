import { db } from "~/server/db";
import { orderByRoundRobin, type FairnessPlaylistItem } from "~/utils/array";
import type { PlaylistItem } from "@prisma/client";
import { type KaraokeParty, type VideoInPlaylist } from "party";

/**
 * Fetches and sorts the playlist for a given party.
 * This logic is extracted from the original API route /api/playlist/[hash]
 */
export async function getFreshPlaylist(partyHash: string): Promise<{
  unplayed: VideoInPlaylist[];
  played: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
}> {
  const party = await db.party.findUnique({
    where: { hash: partyHash },
    include: {
      playlistItems: {
        // Fetch all items, ordered by playedAt then addedAt (FIFO base order)
        orderBy: [
          { playedAt: "asc" },
          { addedAt: "asc" },
        ],
      },
    },
  });

  if (!party) {
    throw new Error("Party not found");
  }
  
  const useQueueRules = party.orderByFairness;
  const allItems: PlaylistItem[] = party.playlistItems; 
  
  // --- 1. Separate Played and Unplayed Songs ---
  const playedItems = allItems.filter(item => item.playedAt);
  const unplayedItems = allItems.filter(item => !item.playedAt);

  // --- 2. Format played songs (e.g., sort by most recent) ---
  const playedPlaylist = playedItems
    .sort((a, b) => b.playedAt!.getTime() - a.playedAt!.getTime()) // Sort by most recent first
    .map((item) => ({
      id: item.videoId,
      title: item.title,
      artist: item.artist ?? "",
      song: item.song ?? "",
      coverUrl: item.coverUrl,
      duration: item.duration ?? undefined,
      singerName: item.singerName,
      playedAt: item.playedAt,
      createdAt: item.addedAt,
    }));

  // --- 3. Determine and sort the unplayed queue ---
  const currentSong = unplayedItems[0];
  const remainingUnplayed = unplayedItems.slice(1);

  const lastPlayedSong = playedItems.length > 0 
    ? playedItems.reduce((latest, current) => {
      if (!latest.playedAt || !current.playedAt) return latest;
      return current.playedAt > latest.playedAt ? current : latest;
    })
    : null;

  const singerToDeprioritize = currentSong?.singerName ?? lastPlayedSong?.singerName ?? null;

  let sortedRemainingUnplayed: PlaylistItem[] = [];

  if (useQueueRules) {
      sortedRemainingUnplayed = orderByRoundRobin(
          allItems as FairnessPlaylistItem[],
          remainingUnplayed as FairnessPlaylistItem[],
          singerToDeprioritize 
      ) as PlaylistItem[];
  } else {
      sortedRemainingUnplayed = [...remainingUnplayed].sort((a, b) => 
          a.addedAt.getTime() - b.addedAt.getTime()
      );
  }

  // --- 4. Recombine just the unplayed list ---
  const finalUnplayedList: PlaylistItem[] = [];
  if (currentSong) {
      finalUnplayedList.push(currentSong);
  }
  finalUnplayedList.push(...sortedRemainingUnplayed);

  // Format unplayed list
  const unplayedPlaylist = finalUnplayedList.map((item) => ({
    id: item.videoId,
    title: item.title,
    artist: item.artist ?? "",
    song: item.song ?? "",
    coverUrl: item.coverUrl,
    duration: item.duration ?? undefined,
    singerName: item.singerName,
    playedAt: item.playedAt,
    createdAt: item.addedAt,
  }));

  // --- 5. Return the new object structure ---
  return {
    unplayed: unplayedPlaylist,
    played: playedPlaylist,
    settings: {
      orderByFairness: useQueueRules,
    },
  };
}
