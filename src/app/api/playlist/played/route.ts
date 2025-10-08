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

    // Mark as played
    const updated = await db.playlistItem.updateMany({
      where: {
        partyId: party.id,
        videoId: videoId,
        playedAt: null,
      },
      data: {
        playedAt: new Date(),
      },
    });

    log.info("Video marked as played", {
      partyHash,
      videoId,
      count: updated.count,
    });

    return NextResponse.json({ success: true, count: updated.count });
  } catch (error) {
    console.error("Error marking video as played:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
