import { kv } from "@vercel/kv";

export const cache = {
  async get<T>(key: string) {
    const value = await kv.get<T>(key);

    return value;
  },

  async set<T>(key: string, value: T) {
    await kv.set(key, value);
  },
};
