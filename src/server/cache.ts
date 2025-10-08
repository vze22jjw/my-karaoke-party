// Simple in-memory cache for local development
// In production with Vercel, use Vercel KV instead
const memoryCache = new Map<string, { value: unknown; expiresAt: number }>();

// Try to load Vercel KV if environment variables are set
function getKV() {
  // Check if Vercel KV environment variables are present
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const { kv } = require("@vercel/kv");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return kv;
  } catch {
    return null;
  }
}

export const cache = {
  async get<T>(key: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const kv = getKV();

    if (kv) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const value = await kv.get(key);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return value;
      } catch (error) {
        console.warn("KV get failed, falling back to memory cache", error);
      }
    }

    // Use in-memory cache
    const cached = memoryCache.get(key);
    if (!cached) return null;

    if (cached.expiresAt < Date.now()) {
      memoryCache.delete(key);
      return null;
    }

    return cached.value as T;
  },

  async set<T>(key: string, value: T, expirationInSeconds?: number) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const kv = getKV();

    if (kv) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await kv.set(key, value);
        if (expirationInSeconds && expirationInSeconds > 0) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          await kv.expire(key, expirationInSeconds);
        }
        return;
      } catch (error) {
        console.warn("KV set failed, falling back to memory cache", error);
      }
    }

    // Use in-memory cache
    const expiresAt = expirationInSeconds
      ? Date.now() + expirationInSeconds * 1000
      : Date.now() + 24 * 60 * 60 * 1000; // Default 24h

    memoryCache.set(key, { value, expiresAt });
  },
};
