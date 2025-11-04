import { NextResponse } from "next/server";
// --- IMPORT THE NEW SERVICE ---
import { getFreshPlaylist } from "~/server/lib/playlist-service";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { hash: string } }
) {
  try {
    const partyHash = params.hash;
    
    // --- USE THE NEW SERVICE ---
    // This will return the new { currentSong, unplayed, played, settings } object
    const partyData = await getFreshPlaylist(partyHash);

    // --- RETURN THE NEW DATA STRUCTURE ---
    // This makes this API route return the same thing as the socket.
    return NextResponse.json(partyData);

  } catch (error) {
    console.error("Error fetching playlist:", error);
    if ((error as Error).message === "Party not found") {
      return NextResponse.json(
        { error: "Party not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
