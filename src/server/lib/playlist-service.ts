import { db } from "~/server/db";
import { orderByRoundRobin, type FairnessPlaylistItem } from "~/utils/array";
import type { PlaylistItem } from "@prisma/client";
import { type KaraokeParty, type VideoInPlaylist } from "party";
import { parseISO8601Duration } from "~/utils/string"; // Import the parser

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
  currentSongStartedAt: Date | null;
  currentSongRemainingDuration: number | null;
  status: string; // <-- ADDED
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

  const playedItems = allItems.filter((item) => item.playedAt);
  const unplayedItems = allItems.filter((item) => !item.playedAt);

  const playedPlaylist = playedItems
    .sort((a, b) => (b.playedAt?.getTime() ?? 0) - (a.playedAt?.getTime() ?? 0))
    .map(formatPlaylistItem);

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
    fairlySortedUnplayed = orderByRoundRobin(
      allItems as FairnessPlaylistItem[],
      unplayedItems as FairnessPlaylistItem[], 
      singerToDeprioritize,
    ) as PlaylistItem[];
  } else {
    fairlySortedUnplayed = unplayedItems;
  }

  const currentSongItem = fairlySortedUnplayed[0] ?? null;
  const remainingUnplayed = fairlySortedUnplayed.slice(1);

  const formattedCurrentSong = currentSongItem
    ? formatPlaylistItem(currentSongItem)
    : null;
  const unplayedPlaylist = remainingUnplayed.map(formatPlaylistItem);

  let remainingDuration: number | null = null;
  
  if (party.currentSongStartedAt) {
    remainingDuration = party.currentSongRemainingDuration;
  } else if (party.currentSongRemainingDuration) {
    remainingDuration = party.currentSongRemainingDuration;
  } else if (formattedCurrentSong?.duration) {
    remainingDuration = Math.floor((parseISO8601Duration(formattedCurrentSong.duration) ?? 0) / 1000);
  }

  // --- START: NEW PARTY STATE LOGIC ---
  if (party.status === "OPEN") {
    // Party is open, but not started. Don't show a current song.
    // Put the "current" song back at the start of the unplayed list.
    const allUnplayed = currentSongItem
      ? [formatPlaylistItem(currentSongItem), ...unplayedPlaylist]
      : unplayedPlaylist;
  
    return {
      currentSong: null,
      unplayed: allUnplayed, // Full unplayed list
      played: playedPlaylist,
      settings: {
        orderByFairness: useQueueRules,
        disablePlayback: party.disablePlayback,
      },
      currentSongStartedAt: null,
      currentSongRemainingDuration: null,
      status: party.status, // Pass the status
    };
  
  } else {
    // Party is STARTED, return the normal state.
    return {
      currentSong: formattedCurrentSong,
      unplayed: unplayedPlaylist,
      played: playedPlaylist,
      settings: {
        orderByFairness: useQueueRules,
        disablePlayback: party.disablePlayback,
      },
      currentSongStartedAt: party.currentSongStartedAt,
      currentSongRemainingDuration: remainingDuration,
      status: party.status, // Pass the status
    };
  }
  // --- END: NEW PARTY STATE LOGIC ---
}
