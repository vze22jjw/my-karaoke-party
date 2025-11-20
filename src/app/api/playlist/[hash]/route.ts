import { NextResponse } from "next/server";
import { getFreshPlaylist } from "~/server/lib/playlist-service";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { hash: string } }
) {
  try {
    const partyHash = params.hash;
    const partyData = await getFreshPlaylist(partyHash);
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
