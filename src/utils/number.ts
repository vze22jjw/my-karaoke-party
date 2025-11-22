/**
 * Formats a number into a compact string (e.g., 1000 -> "1K", 1500 -> "1.5K").
 * Uses the browser's native Intl.NumberFormat for performance and localization.
 */
export function formatCompactNumber(num: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1, // "1.5K" instead of "1.52K"
  }).format(num);
}
