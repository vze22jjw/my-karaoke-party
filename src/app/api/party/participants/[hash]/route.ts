import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { hash: string } }
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
        { error: "Party não encontrada" },
        { status: 404 }
      );
    }

    // Combinar participantes registrados com quem tem músicas
    const registeredParticipants = party.participants.map((p) => p.name);
    const participantsWithSongs = [
      ...new Set(party.playlistItems.map((item) => item.singerName)),
    ].filter(Boolean);

    // Unir ambas as listas
    const allParticipants = [
      ...new Set([...registeredParticipants, ...participantsWithSongs]),
    ];

    return NextResponse.json({
      participants: allParticipants,
    });
  } catch (error) {
    console.error("Error fetching participants:", error);
    return NextResponse.json(
      { error: "Erro ao buscar participantes" },
      { status: 500 }
    );
  }
}
