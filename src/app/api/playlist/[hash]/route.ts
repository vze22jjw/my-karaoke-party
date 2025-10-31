import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { orderByRoundRobin, type FairnessPlaylistItem } from "~/utils/array";
import type { PlaylistItem } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: { hash: string } }
) {
  try {
    const partyHash = params.hash;
    
    // Read query parameter for queue rules
    const url = new URL(request.url);
    const useQueueRules = url.searchParams.get("rules") !== 'false';

    // Find party with playlist
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
      return NextResponse.json(
        { error: "Party not found" },
        { status: 404 }
      );
    }
    
    const allItems: PlaylistItem[] = party.playlistItems; 
    
    // --- 1. Separate Played and Unplayed Songs ---
    const playedItems = allItems.filter(item => item.playedAt);
    const unplayedItems = allItems.filter(item => !item.playedAt);

    // Determine the current playing song and the rest of the queue
    const currentSong = unplayedItems[0];
    const remainingUnplayed = unplayedItems.slice(1);

    // Determine the last played song (which may or may not be the one currently playing).
    const lastPlayedSong = playedItems.length > 0 
      ? playedItems.reduce((latest, current) => {
        if (!latest.playedAt || !current.playedAt) return latest;
        return current.playedAt > latest.playedAt ? current : latest;
      })
      : null;

    const singerToDeprioritize = currentSong?.singerName ?? lastPlayedSong?.singerName ?? null;

    let sortedRemainingUnplayed: PlaylistItem[] = [];

    // --- 2. Conditional Sorting Logic ---
    if (useQueueRules) {
        // Apply Round Robin Fairness Sorting (Rules ON)
        sortedRemainingUnplayed = orderByRoundRobin(
            allItems as FairnessPlaylistItem[],
            remainingUnplayed as FairnessPlaylistItem[],
            singerToDeprioritize 
        ) as PlaylistItem[];
    } else {
        // Simple FIFO/AddedAt Sorting (Rules Disabled)
        // FIX: Re-add explicit sort by addedAt on a copy to guarantee FIFO order.
        sortedRemainingUnplayed = [...remainingUnplayed].sort((a, b) => 
            a.addedAt.getTime() - b.addedAt.getTime()
        );
    }


    // --- 3. Recombine the final playlist: Played -> Current Song -> Sorted Queue ---
    let finalPlaylist: PlaylistItem[] = [...playedItems];
    
    // Add the locked current song back if it exists
    if (currentSong) {
        finalPlaylist.push(currentSong);
    }
    
    // Add the rest of the sorted queue. 
    finalPlaylist = [...finalPlaylist, ...sortedRemainingUnplayed];


    // Format playlist
    const playlist = finalPlaylist.map((item) => ({
      id: item.videoId,
      title: item.title,
      artist: item.artist ?? "",
      song: item.song ?? "",
      coverUrl: item.coverUrl,
      duration: item.duration,
      singerName: item.singerName,
      playedAt: item.playedAt,
    }));

    return NextResponse.json({
      playlist,
      settings: {
        orderByFairness: useQueueRules, // Reflect the state of the rules in the response
      },
    });
  } catch (error) {
    console.error("Error fetching playlist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
