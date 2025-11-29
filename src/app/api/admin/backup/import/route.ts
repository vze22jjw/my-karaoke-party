import { type NextRequest, NextResponse } from "next/server";
import { backupService, type BackupFile } from "~/server/lib/backup-service";
import { env } from "~/env";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const token = cookies().get("admin_token")?.value;
  if (token !== env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json() as BackupFile;
    
    if (!body.version || !body.data || !Array.isArray(body.data)) {
      return NextResponse.json({ error: "Invalid backup file format" }, { status: 400 });
    }

    const result = await backupService.importParties(body);
    
    return NextResponse.json({
        success: true,
        details: result
    });
  } catch (error) {
    console.error("Import failed:", error);
    return NextResponse.json({ error: "Restore failed. Check file format." }, { status: 500 });
  }
}
