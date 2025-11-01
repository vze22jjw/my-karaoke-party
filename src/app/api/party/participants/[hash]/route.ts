import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { hash: string } },
) {
  try {
    const { hash } = params;

    // Buscar a party
    const party = await db.party.findUnique({
      where: { hash },
      include: {
        participants: {
          orderBy: {
            joinedAt: "asc",
          },
        },
        playlistItems: {
          select: {
            singerName: true,
          },
        },
      },
    });

    if (!party) {
      return NextResponse.json(
        { error: "Party not found" },
        { status: 404 },
      );
    }

    // Combinar participantes registrados com quem tem músicas
    const registeredSingers = party.participants.map((p) => p.name);
    const singersWithSongs = [
      ...new Set(party.playlistItems.map((item) => item.singerName)),
    ].filter(Boolean);

    // Unir ambas as listas
    const allSingers = [
      ...new Set([...registeredSingers, ...singersWithSongs]),
    ];

    return NextResponse.json({
      singers: allSingers,
    });
  } catch (error) {
    console.error("Error fetching singers:", error);
    return NextResponse.json(
      { error: "Error fetching singers" },
      { status: 500 },
    );
  }
}
