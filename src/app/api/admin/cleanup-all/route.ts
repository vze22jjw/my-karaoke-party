import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

/**
 * DELETE /api/admin/cleanup-all
 *
 * Deleta TODAS as parties abertas no sistema.
 * Use com cuidado! Este endpoint remove todas as festas sem exceção.
 *
 * Proteção básica: requer um token de admin via header ou query param
 */
export async function DELETE(request: NextRequest) {
  try {
    // Proteção básica: verificar token de admin
    const authHeader = request.headers.get("authorization");
    const tokenFromQuery = request.nextUrl.searchParams.get("token");
    const adminToken = process.env.ADMIN_TOKEN ?? "change-me-in-production";

    const providedToken = authHeader?.replace("Bearer ", "") ?? tokenFromQuery;

    if (providedToken !== adminToken) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid admin token" },
        { status: 401 }
      );
    }

    // Contar parties antes de deletar
    const countBefore = await db.party.count();

    // Deletar todas as parties (cascade vai deletar os playlist items)
    const result = await db.party.deleteMany();

    return NextResponse.json({
      success: true,
      message: "All parties deleted successfully",
      deletedCount: result.count,
      totalBefore: countBefore,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error deleting all parties:", error);
    return NextResponse.json(
      { error: "Failed to delete parties" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/cleanup-all
 *
 * Retorna estatísticas das parties sem deletar (preview)
 */
export async function GET() {
  try {
    const totalParties = await db.party.count();

    const partiesWithItems = await db.party.findMany({
      select: {
        id: true,
        name: true,
        hash: true,
        createdAt: true,
        _count: {
          select: {
            playlistItems: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalPlaylistItems = partiesWithItems.reduce(
      (sum, party) => sum + party._count.playlistItems,
      0
    );

    return NextResponse.json({
      totalParties,
      totalPlaylistItems,
      parties: partiesWithItems.map((party) => ({
        name: party.name,
        hash: party.hash,
        createdAt: party.createdAt,
        songsCount: party._count.playlistItems,
      })),
    });
  } catch (error) {
    console.error("Error fetching parties stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch parties stats" },
      { status: 500 }
    );
  }
}
