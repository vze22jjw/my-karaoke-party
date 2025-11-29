import { db } from "~/server/db";
import { orderByRoundRobin, type FairnessPlaylistItem } from "~/utils/array";
import type { PlaylistItem } from "@prisma/client";
import { type KaraokeParty, type VideoInPlaylist } from "~/types/app-types";
import { parseISO8601Duration } from "~/utils/string";

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
    spotifyId: item.spotifyId,
    isPriority: item.isPriority,
    isManual: item.isManual, 
  };
}

export async function getFreshPlaylist(partyHash: string): Promise<{
  currentSong: VideoInPlaylist | null;
  unplayed: VideoInPlaylist[];
  played: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
  currentSongStartedAt: Date | null;
  currentSongRemainingDuration: number | null;
  status: string;
  idleMessages: string[]; 
  themeSuggestions: string[];
}> {
  const party = await db.party.findUnique({
    where: { hash: partyHash },
    include: {
      playlistItems: {
        orderBy: [{ playedAt: "asc" }, { addedAt: "asc" }],
      },
    },
  });

  if (!party) throw new Error("Party not found");

  const useQueueRules = party.orderByFairness;
  const allItems: PlaylistItem[] = party.playlistItems;

  const playedItems = allItems.filter((item) => item.playedAt);
  const unplayedItems = allItems.filter((item) => !item.playedAt);

  // --- 1. PIN CURRENT SONG ---
  let pinnedCurrentSong: PlaylistItem | null = null;
  if (party.status === "STARTED" && party.currentSongId) {
      const idx = unplayedItems.findIndex(item => item.videoId === party.currentSongId);
      if (idx !== -1) {
          pinnedCurrentSong = unplayedItems[idx]!;
          unplayedItems.splice(idx, 1); 
      }
  }

  // --- 2. SEPARATE VIPs ---
  const priorityItems = unplayedItems.filter(i => i.isPriority);
  const standardPool = unplayedItems.filter(i => !i.isPriority);

  let sortedStandardItems: PlaylistItem[] = [];

  if (useQueueRules) {
    const manualItems = standardPool.filter(i => i.isManual);
    const floatingItems = standardPool.filter(i => !i.isManual);

    const lastPlayedSong = playedItems.length > 0
      ? playedItems.reduce((latest, current) =>
          (latest.playedAt?.getTime() ?? 0) > (current.playedAt?.getTime() ?? 0) ? latest : current,
        )
      : null;
    const singerToDeprioritize = lastPlayedSong?.singerName ?? null;

    const sortedFloating = orderByRoundRobin(
      allItems as FairnessPlaylistItem[],
      floatingItems as FairnessPlaylistItem[], 
      singerToDeprioritize,
    ) as PlaylistItem[];

    const merged: PlaylistItem[] = [];
    let floatIndex = 0;
    const totalSize = manualItems.length + sortedFloating.length;

    for (let i = 0; i < totalSize; i++) {
        const manualItemForSlot = manualItems.find(m => m.orderIndex === i);
        if (manualItemForSlot) {
            merged.push(manualItemForSlot);
        } else {
            if (floatIndex < sortedFloating.length) {
                merged.push(sortedFloating[floatIndex]!);
                floatIndex++;
            }
        }
    }
    while (floatIndex < sortedFloating.length) {
        merged.push(sortedFloating[floatIndex]!);
        floatIndex++;
    }
    sortedStandardItems = merged;

  } else {
    sortedStandardItems = standardPool;
  }

  // --- 3. FINAL ASSEMBLY ---
  const finalQueue: PlaylistItem[] = [];
  
  if (pinnedCurrentSong) {
      finalQueue.push(pinnedCurrentSong);
  }
  
  finalQueue.push(...priorityItems);
  finalQueue.push(...sortedStandardItems);

  const currentSongItem = finalQueue[0] ?? null;
  const remainingUnplayed = finalQueue.slice(1);

  const formattedCurrentSong = currentSongItem ? formatPlaylistItem(currentSongItem) : null;
  const unplayedPlaylist = remainingUnplayed.map(formatPlaylistItem);
  const playedPlaylist = playedItems
    .sort((a, b) => (b.playedAt?.getTime() ?? 0) - (a.playedAt?.getTime() ?? 0))
    .map(formatPlaylistItem);

  let remainingDuration: number | null = null;
  if (party.currentSongStartedAt) {
     remainingDuration = party.currentSongRemainingDuration;
  } else if (party.currentSongRemainingDuration) {
     remainingDuration = party.currentSongRemainingDuration;
  } else if (formattedCurrentSong?.duration) {
     remainingDuration = Math.floor((parseISO8601Duration(formattedCurrentSong.duration) ?? 0) / 1000);
  }

  const settings: KaraokeParty["settings"] = {
    orderByFairness: useQueueRules,
    disablePlayback: party.disablePlayback,
    spotifyPlaylistId: party.spotifyPlaylistId,
    spotifyLink: party.spotifyLink, // <-- ADDED HERE
    isManualSortActive: party.isManualSortActive,
  };

  if (party.status === "OPEN") {
    const allUnplayed = currentSongItem
      ? [formatPlaylistItem(currentSongItem), ...unplayedPlaylist]
      : unplayedPlaylist;
  
    return {
      currentSong: null,
      unplayed: allUnplayed,
      played: playedPlaylist,
      settings,
      currentSongStartedAt: null,
      currentSongRemainingDuration: null,
      status: party.status,
      idleMessages: party.idleMessages,
      themeSuggestions: party.themeSuggestions,
    };
  } else {
    return {
      currentSong: formattedCurrentSong,
      unplayed: unplayedPlaylist,
      played: playedPlaylist,
      settings,
      currentSongStartedAt: party.currentSongStartedAt,
      currentSongRemainingDuration: remainingDuration,
      status: party.status,
      idleMessages: party.idleMessages,
      themeSuggestions: party.themeSuggestions,
    };
  }
}
