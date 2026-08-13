import { type NextRequest, NextResponse } from "next/server";
import {
  getEmojiWithFallback,
  isSupportedStyle,
} from "~/server/emoji/cache";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawEmoji = searchParams.get("emoji");
  const rawStyle = searchParams.get("style");

  if (!rawEmoji || !rawStyle) {
    return NextResponse.json(
      { error: "Missing emoji or style" },
      { status: 400 }
    );
  }

  if (!isSupportedStyle(rawStyle)) {
    return NextResponse.json(
      { error: `Unsupported style. Supported: apple, google, facebook, twitter` },
      { status: 400 }
    );
  }

  const emoji = decodeURIComponent(rawEmoji);
  const style = rawStyle;

  const buffer = await getEmojiWithFallback(emoji, style);

  if (!buffer) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=604800, s-maxage=2592000",
    },
  });
}
