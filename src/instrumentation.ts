export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { prefetchAllEmojis } = await import("./server/emoji/cache");
    await prefetchAllEmojis();

    // Trigger non-blocking background cache warmup for theme suggestions
    const { geminiSuggestionsService } = await import("./server/lib/gemini-suggestions");
    void geminiSuggestionsService.warmupPresetThemes().catch((err) => {
      console.warn("[Warmup] Background preset warmup error:", err);
    });
  }
}
