import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "~/env";

export async function POST(req: Request) {
  try {
    // FIX: Typed the body to prevent 'any' errors
    const body = (await req.json()) as { password: string };

    if (body.password !== env.ADMIN_TOKEN) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 },
      );
    }

    // Calculate expiration (24 hours)
    const oneDay = 24 * 60 * 60 * 1000;
    const expirationDate = new Date(Date.now() + oneDay);

    // Only use 'secure: true' if we are in production.
    const isProduction = process.env.NODE_ENV === "production";

    cookies().set("admin_token", body.password, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      expires: expirationDate,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
