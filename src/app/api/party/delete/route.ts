/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NextResponse } from "next/server";
import { db } from "~/server/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { hash } = body as { hash: string };

    if (!hash) {
      return NextResponse.json(
        { error: "Party hash is required" },
        { status: 400 }
      );
    }

    // Find the party by hash
    const party = await db.party.findUnique({
      where: { hash },
    });

    if (!party) {
      return NextResponse.json(
        { error: "Party not found" },
        { status: 404 }
      );
    }

    // Delete the party (cascade will delete playlist items)
    await db.party.delete({
      where: { hash },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting party:", error);
    return NextResponse.json(
      { error: "Failed to delete party" },
      { status: 500 }
    );
  }
}
