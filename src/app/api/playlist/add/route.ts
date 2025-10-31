/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { log } from "next-axiom";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { partyHash, videoId, title, artist, song, coverUrl, duration, singerName } = body;

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

    // Add to playlist
    const playlistItem = await db.playlistItem.create({
      data: {
        partyId: party.id,
        videoId,
        title,
        artist: artist || "",
        song: song || "",
        coverUrl,
        duration: duration || "",
        singerName,
        randomBreaker: Math.random(), // Add random breaker
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
