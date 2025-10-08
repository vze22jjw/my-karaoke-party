import { NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET(
  request: Request,
  { params }: { params: { hash: string } }
) {
  try {
    const partyHash = params.hash;

    // Find party with playlist
    const party = await db.party.findUnique({
      where: { hash: partyHash },
      include: {
        playlistItems: {
          orderBy: [
            { playedAt: "asc" }, // Played items first (nulls last)
            { addedAt: "asc" },  // Then by when added
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

    // Format playlist
    const playlist = party.playlistItems.map((item) => ({
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
        orderByFairness: true,
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
