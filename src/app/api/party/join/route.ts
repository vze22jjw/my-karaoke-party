import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { hash?: string; name?: string };
    const { hash, name } = body;

    if (!hash || !name) {
      return NextResponse.json(
        { error: "Hash e nome são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se a party existe
    const party = await db.party.findUnique({
      where: { hash },
    });

    if (!party) {
      return NextResponse.json(
        { error: "Party não encontrada" },
        { status: 404 }
      );
    }

    // Registrar o participante (upsert para evitar duplicatas)
    await db.partyParticipant.upsert({
      where: {
        partyId_name: {
          partyId: party.id,
          name: name,
        },
      },
      create: {
        partyId: party.id,
        name: name,
      },
      update: {
        // Não precisa atualizar nada, apenas garantir que existe
      },
    });

    return NextResponse.json({
      success: true,
      message: "Participante registrado",
    });
  } catch (error) {
    console.error("Error joining party:", error);
    return NextResponse.json(
      { error: "Erro ao registrar participante" },
      { status: 500 }
    );
  }
}
