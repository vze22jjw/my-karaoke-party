import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { password?: string };
    const { password } = body;

    if (password !== process.env.ADMIN_TOKEN) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }
    const response = NextResponse.json({ success: true });
    const isProduction = process.env.NODE_ENV === "production";
    const isHttps = process.env.NEXT_PUBLIC_APP_URL?.startsWith("https");
    
    response.cookies.set("admin_token_verified", "true", {
      httpOnly: true,
      secure: isProduction && isHttps,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
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
