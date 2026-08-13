export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { prefetchAllEmojis } = await import("./server/emoji/cache");
    await prefetchAllEmojis();
  }
}
