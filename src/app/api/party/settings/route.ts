// src/app/api/party/settings/route.ts
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { z } from "zod";

const settingsSchema = z.object({
  hash: z.string(),
  orderByFairness: z.boolean(),
});

export async function POST(request: Request) {
  try {
    // --- START: FIX ---
    // Explicitly type the body as 'unknown' to satisfy the linter
    const body: unknown = await request.json();
    // --- END: FIX ---

    const { hash, orderByFairness } = settingsSchema.parse(body);

    const party = await db.party.update({
      where: { hash },
      data: {
        orderByFairness: orderByFairness,
        lastActivityAt: new Date(), // Also update activity
      },
    });

    return NextResponse.json({ success: true, orderByFairness: party.orderByFairness });
  } catch (error) {
    console.error("Error updating party settings:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
