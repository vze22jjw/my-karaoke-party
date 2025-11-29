import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  cookies().delete("admin_token");
  cookies().delete("admin_token_verified");

  return NextResponse.json({ success: true });
}
