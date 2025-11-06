/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { log } from "next-axiom";
import youtubeAPI from "~/utils/youtube-data-api";

// --- THIS IS THE FIX (Part 1) ---
// Define a type for the incoming request body
type AddSongBody = {
  partyHash: string;
  videoId: string;
  title: string;
  artist?: string;
  song?: string;
  coverUrl: string;
  singerName: string;
};
// --- END THE FIX (Part 1) ---

export async function POST(request: Request) {
  try {
    // --- THIS IS THE FIX (Part 2) ---
    // Cast the body to the new type
    const body = (await request.json()) as AddSongBody;
    const { partyHash, videoId, title, artist, song, coverUrl, singerName } = body;
    // --- END THE FIX (Part 2) ---

    if (!partyHash || !videoId || !title || !singerName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find party
    const party = await db.party.findUnique({
      where: { hash: partyHash },
    });

    if (!party) {
      return NextResponse.json(
        { error: "Party not found" },
        { status: 404 }
      );
    }

    // Check if video already exists in playlist (not played)
    const existing = await db.playlistItem.findFirst({
      where: {
        partyId: party.id,
        videoId: videoId,
        playedAt: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Video already in playlist", item: existing },
        { status: 200 }
      );
    }

    const duration = await youtubeAPI.getVideoDuration(videoId);
    log.info(`Fetched duration for ${videoId}: ${duration ?? 'N/A'}`);

    // Add to playlist
    const playlistItem = await db.playlistItem.create({
      data: {
        partyId: party.id,
        videoId,
        title,
        // --- THIS IS THE FIX (Part 3) ---
        // Use ?? (nullish coalescing) instead of ||
        artist: artist ?? "",
        song: song ?? "",
        // --- END THE FIX (Part 3) ---
        coverUrl,
        duration: duration, 
        singerName,
        randomBreaker: Math.random(), 
      },
    });

    log.info("Video added to playlist", {
      partyHash,
      videoId,
      singerName,
    });

    return NextResponse.json({ success: true, item: playlistItem });
  } catch (error) {
    console.error("Error adding video to playlist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
