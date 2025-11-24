/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { NextResponse } from "next/server";
import { db } from "~/server/db";
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const twentyMinutesAgo = new Date();
    twentyMinutesAgo.setMinutes(twentyMinutesAgo.getMinutes() - 20);

    const deletedParties = await db.party.deleteMany({
      where: {
        lastActivityAt: {
          lt: twentyMinutesAgo,
        },
      },
    });

    console.log(`Cleanup job: Deleted ${deletedParties.count} inactive parties`);

    return NextResponse.json({
      success: true,
      deletedCount: deletedParties.count,
      cleanupTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in cleanup job:", error);
    return NextResponse.json(
      { error: "Failed to cleanup parties" },
      { status: 500 }
    );
  }
}
