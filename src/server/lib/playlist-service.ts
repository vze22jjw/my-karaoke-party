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
        // Get ALL items, sort by played status (nulls last) then by when they were added
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
  const unplayedItems = allItems.filter((item) => !item.playedAt); // This is sorted by addedAt

  // --- 2. Format played songs (sorted by most recent) ---
  const playedPlaylist = playedItems
    .sort((a, b) => (b.playedAt?.getTime() ?? 0) - (a.playedAt?.getTime() ?? 0))
    .map(formatPlaylistItem);

  // --- 3. Determine and sort the unplayed queue ---

  // --- THIS IS THE FIX ---

  // Get the *actual* last singer who finished.
  // We find the most recent `playedAt` timestamp.
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

  if (useQueueRules) {
    // Run the fairness algorithm on the *ENTIRE* unplayed list
    fairlySortedUnplayed = orderByRoundRobin(
      allItems as FairnessPlaylistItem[],
      unplayedItems as FairnessPlaylistItem[], // <-- Pass the whole list
      singerToDeprioritize,
    ) as PlaylistItem[];
  } else {
    // If fairness is off, just use the default `addedAt` order
    fairlySortedUnplayed = unplayedItems;
  }

  // NOW we can determine the correct current song and remaining queue
  const currentSongItem = fairlySortedUnplayed[0] ?? null;
  const remainingUnplayed = fairlySortedUnplayed.slice(1);

  // --- END THE FIX ---

  // --- 4. Format the final lists ---
  const formattedCurrentSong = currentSongItem
    ? formatPlaylistItem(currentSongItem)
    : null;
  // The `remainingUnplayed` list is already sorted, just format it.
  const unplayedPlaylist = remainingUnplayed.map(formatPlaylistItem);

  // --- 5. Return the new object structure ---
  return {
    currentSong: formattedCurrentSong,
    unplayed: unplayedPlaylist,
    played: playedPlaylist,
    settings: {
      orderByFairness: useQueueRules,
      disablePlayback: party.disablePlayback, // <-- This was already correct
    },
  };
}
