/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
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

    // Update lastActivityAt
    const party = await db.party.update({
      where: { hash },
      data: {
        lastActivityAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, lastActivityAt: party.lastActivityAt });
  } catch (error) {
    console.error("Error updating party activity:", error);
    return NextResponse.json(
      { error: "Failed to update party activity" },
      { status: 500 }
    );
  }
}
