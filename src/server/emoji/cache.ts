import { readFile, writeFile, mkdir, access } from "fs/promises";
import path from "path";
import { env } from "~/env";
import emojiMap from "~/config/emoji-map.json";

export const SUPPORTED_STYLES = ["apple", "google", "facebook", "twitter"] as const;

export type EmojiStyle = (typeof SUPPORTED_STYLES)[number];

type EmojiMap = {
  default_style: string;
  variables: Record<string, string>;
  styles: Record<string, string>;
};

const emojiMapConfig = emojiMap as EmojiMap;

export function isSupportedStyle(value: string): value is EmojiStyle {
  return (SUPPORTED_STYLES as readonly string[]).includes(value);
}

export function toCacheFilename(emoji: string, style: EmojiStyle): string {
  const codepoints = Array.from(emoji)
    .map((c) => c.codePointAt(0)?.toString(16) ?? "0")
    .join("-");
  return `${codepoints}-${style}.png`;
}

export function getCachePath(emoji: string, style: EmojiStyle): string {
  const cacheDir = env.EMOJI_CACHE_DIR;
  return path.join(cacheDir, toCacheFilename(emoji, style));
}

export async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export async function fetchAndCache(
  emoji: string,
  style: EmojiStyle,
  cachePath: string
): Promise<ArrayBuffer | null> {
  const upstreamUrl = `${env.EMOJI_CDN_BASE_URL}/${encodeURIComponent(emoji)}?style=${style}`;

  const res = await fetch(upstreamUrl);

  if (!res.ok) {
    return null;
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, buffer);

  return toArrayBuffer(buffer);
}

export async function getEmojiWithFallback(
  emoji: string,
  style: EmojiStyle
): Promise<ArrayBuffer | null> {
  const cachePath = getCachePath(emoji, style);

  if (await fileExists(cachePath)) {
    return toArrayBuffer(await readFile(cachePath));
  }

  return fetchAndCache(emoji, style, cachePath);
}

export function getEmojiStyle(emoji: string): EmojiStyle {
  const varKey = Object.keys(emojiMapConfig.variables).find(
    (key) => emojiMapConfig.variables[key] === emoji
  );

  const style = varKey ? emojiMapConfig.styles[varKey] : undefined;

  if (style && isSupportedStyle(style)) {
    return style;
  }

  if (isSupportedStyle(emojiMapConfig.default_style)) {
    return emojiMapConfig.default_style;
  }

  return "apple";
}

export async function prefetchAllEmojis() {
  const uniqueEmojis = new Map<string, EmojiStyle>();

  for (const emoji of Object.values(emojiMapConfig.variables)) {
    uniqueEmojis.set(emoji, getEmojiStyle(emoji));
  }

  for (const [emoji, style] of uniqueEmojis) {
    const cachePath = getCachePath(emoji, style);
    if (await fileExists(cachePath)) {
      continue;
    }
    try {
      await fetchAndCache(emoji, style, cachePath);
    } catch (e) {
      console.error(`Failed to prefetch emoji ${emoji} with style ${style}:`, e);
    }
  }
}
