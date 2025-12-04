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

    const singerUpdate = db.partyParticipant.update({
      where: { partyId_name: { partyId: party.id, name: singerName } },
      data: { applauseCount: { increment: 1 } },
    });

    let songUpdate = null;
    if (party.currentSongId) {
        const activeItem = await db.playlistItem.findFirst({
            where: {
                partyId: party.id,
                videoId: party.currentSongId,
                playedAt: null
            }
        });

        if (activeItem) {
            songUpdate = db.playlistItem.update({
                where: { id: activeItem.id },
                data: { applauseCount: { increment: 1 } }
            });
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promises: any[] = [singerUpdate];
    
    if (songUpdate) promises.push(songUpdate);
    
    promises.push(
        db.party.update({ where: { id: party.id }, data: { lastActivityAt: new Date() } })
    );

    await db.$transaction(promises);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
