import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "~/env";

export async function POST(req: Request) {
  try {
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const isHttps = appUrl.startsWith("https://");
    const isProduction = process.env.NODE_ENV === "production";
    
    // Only use secure cookie if we are definitely on HTTPS in production
    const useSecureCookie = isProduction && isHttps;

    cookies().set("admin_token", body.password, {
      httpOnly: true,
      secure: useSecureCookie,
      sameSite: "lax",
      path: "/",
      expires: expirationDate,
    });
    
    // Set verification cookie
    cookies().set("admin_token_verified", "true", {
        httpOnly: false, 
        secure: useSecureCookie,
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
