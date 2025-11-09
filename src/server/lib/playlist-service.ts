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
  currentSongRemainingDuration: number | null; // <-- Add this
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

  // --- THIS IS THE FIX (Part 2) ---
  // If the song is playing, we pass the start time.
  // If it's paused or stopped, we pass the stored remaining duration.
  let remainingDuration: number | null = null;
  
  if (party.currentSongStartedAt) {
    // Song is actively playing, pass the remaining duration from when it was started
    remainingDuration = party.currentSongRemainingDuration;
  } else if (party.currentSongRemainingDuration) {
    // Song is paused, pass the stored remaining duration
    remainingDuration = party.currentSongRemainingDuration;
  } else if (formattedCurrentSong?.duration) {
    // Song is stopped, get its full duration
    remainingDuration = Math.floor((parseISO8601Duration(formattedCurrentSong.duration) ?? 0) / 1000);
  }
  // --- END THE FIX ---

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
  };
}
