import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { password?: string };
    const { password } = body;

    // Check against the environment variable
    if (password !== process.env.ADMIN_TOKEN) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // Create response
    const response = NextResponse.json({ success: true });

    // --- FIX: Smart Secure Flag ---
    // Only set 'secure: true' if we are in production AND using HTTPS.
    // This allows the cookie to stick when testing production builds on localhost (HTTP).
    const isProduction = process.env.NODE_ENV === "production";
    const isHttps = process.env.NEXT_PUBLIC_APP_URL?.startsWith("https");
    
    response.cookies.set("admin_token_verified", "true", {
      httpOnly: true,
      secure: isProduction && isHttps, // <--- CHANGED THIS
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
