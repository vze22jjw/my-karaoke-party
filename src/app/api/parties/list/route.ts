import { NextResponse } from "next/server";
import { db } from "~/server/db";
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Busca parties criadas nas últimas 24 horas e ordena por criação mais recente
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const parties = await db.party.findMany({
      where: {
        createdAt: {
          gte: oneDayAgo,
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
            participants: true, // <-- Added this
          },
        },
      },
    });

    // Formata a resposta
    const formattedParties = parties.map((party) => ({
      hash: party.hash,
      name: party.name,
      createdAt: party.createdAt,
      songCount: party._count.playlistItems,
      singerCount: party._count.participants, // <-- Added this
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
