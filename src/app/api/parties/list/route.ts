import { NextResponse } from "next/server";
import { db } from "~/server/db";
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch ALL parties that are currently OPEN or STARTED
    // We no longer filter by time; we rely on the status (and auto-cleanup for inactive ones)
    const parties = await db.party.findMany({
      where: {
        status: {
          in: ["OPEN", "STARTED"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        hash: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            playlistItems: true,
            participants: true,
          },
        },
      },
    });

    // Format the response
    const formattedParties = parties.map((party) => ({
      hash: party.hash,
      name: party.name,
      createdAt: party.createdAt,
      songCount: party._count.playlistItems,
      singerCount: party._count.participants,
    }));

    return NextResponse.json(formattedParties);
  } catch (error) {
    console.error("Error fetching parties:", error);
    return NextResponse.json(
      { error: "Failed to fetch parties" },
      { status: 500 },
    );
  }
}
