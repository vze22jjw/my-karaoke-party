import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const applauseSchema = z.object({
  partyHash: z.string(),
  singerName: z.string(),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const { partyHash, singerName } = applauseSchema.parse(body);

    const party = await db.party.findUnique({ where: { hash: partyHash } });
    if (!party) return NextResponse.json({ error: "Party not found" }, { status: 404 });

    await db.partyParticipant.update({
      where: { partyId_name: { partyId: party.id, name: singerName } },
      data: { applauseCount: { increment: 1 } },
    });

    await db.party.update({ where: { id: party.id }, data: { lastActivityAt: new Date() } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
