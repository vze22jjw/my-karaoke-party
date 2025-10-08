import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { log } from "next-axiom";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { partyHash, videoId } = body;

    if (!partyHash || !videoId) {
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

    // Remove from playlist
    await db.playlistItem.deleteMany({
      where: {
        partyId: party.id,
        videoId: videoId,
      },
    });

    log.info("Video removed from playlist", {
      partyHash,
      videoId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing video from playlist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
