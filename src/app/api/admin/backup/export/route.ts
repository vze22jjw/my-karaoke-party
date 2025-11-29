import { type NextRequest, NextResponse } from "next/server";
import { backupService } from "~/server/lib/backup-service";
import { env } from "~/env";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = cookies().get("admin_token")?.value;
  if (token !== env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hash = req.nextUrl.searchParams.get("hash") ?? undefined;
  
  try {
    const data = await backupService.exportParties(hash);
    
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="mkp_backup_${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}
