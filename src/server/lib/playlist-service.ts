import { db } from "~/server/db";
import { orderByRoundRobin, type FairnessPlaylistItem } from "~/utils/array";
import type { PlaylistItem } from "@prisma/client";
import { type KaraokeParty, type VideoInPlaylist } from "party";

/**
 * Helper to format Prisma items into the VideoInPlaylist type.
 */
function formatPlaylistItem(item: PlaylistItem): VideoInPlaylist {
  return {
    id: item.videoId,
    title: item.title,
    artist: item.artist ?? "",
    song: item.song ?? "",
    coverUrl: item.coverUrl,
    duration: item.duration ?? undefined,
    singerName: item.singerName,
    playedAt: item.playedAt,
    createdAt: item.addedAt,
  };
}

/**
 * Fetches and sorts the playlist for a given party.
 * Returns the playlist separated into current, unplayed, and played.
 */
export async function getFreshPlaylist(partyHash: string): Promise<{
  currentSong: VideoInPlaylist | null;
  unplayed: VideoInPlaylist[];
  played: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
}> {
  const party = await db.party.findUnique({
    where: { hash: partyHash },
    include: {
      playlistItems: {
        orderBy: [{ playedAt: "asc" }, { addedAt: "asc" }],
      },
    },
  });

  if (!party) {
    throw new Error("Party not found");
  }

  const useQueueRules = party.orderByFairness;
  const allItems: PlaylistItem[] = party.playlistItems;

  // --- 1. Separate Played and Unplayed Songs ---
  const playedItems = allItems.filter((item) => item.playedAt);
  const unplayedItems = allItems.filter((item) => !item.playedAt);

  // --- 2. Format played songs (sorted by most recent) ---
  const playedPlaylist = playedItems
    .sort((a, b) => (b.playedAt?.getTime() ?? 0) - (a.playedAt?.getTime() ?? 0))
    .map(formatPlaylistItem);

  // --- 3. Determine and sort the unplayed queue ---
  const currentSongItem = unplayedItems[0] ?? null;
  const remainingUnplayed = unplayedItems.slice(1);

  const lastPlayedSong = playedItems.length > 0 ? playedItems[0] : null;
  const singerToDeprioritize =
    currentSongItem?.singerName ?? lastPlayedSong?.singerName ?? null;

  let sortedRemainingUnplayed: PlaylistItem[] = [];

  if (useQueueRules) {
    sortedRemainingUnplayed = orderByRoundRobin(
      allItems as FairnessPlaylistItem[],
      remainingUnplayed as FairnessPlaylistItem[],
      singerToDeprioritize,
    ) as PlaylistItem[];
  } else {
    sortedRemainingUnplayed = [...remainingUnplayed].sort(
      (a, b) => a.addedAt.getTime() - b.addedAt.getTime(),
    );
  }

  // --- 4. Format the final lists ---
  const formattedCurrentSong = currentSongItem
    ? formatPlaylistItem(currentSongItem)
    : null;
  const unplayedPlaylist = sortedRemainingUnplayed.map(formatPlaylistItem);

  // --- 5. Return the new object structure ---
  return {
    currentSong: formattedCurrentSong,
    unplayed: unplayedPlaylist,
    played: playedPlaylist,
    settings: {
      orderByFairness: useQueueRules,
    },
  };
}
