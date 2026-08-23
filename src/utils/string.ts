import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function removeKaraokeInstrumentalWording(inputString: string) {
  const regex = /\[(?:karaoke|instrumental)\]|\((?:karaoke|instrumental)\)/gi;
  return inputString.replace(regex, "");
}

export function removeBracketedContent(inputString: string) {
  const regex = /\[[^\]]*\]|\([^)]*\)/g;
  return inputString.replace(regex, "");
}

/**
 * Formats an ISO 8601 duration string (e.g., "PT4M13S") into "4:13".
 */
export function formatISODuration(durationString: string | undefined | null): string {
  if (!durationString) return ""; // Return empty string if no duration

  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = durationString.match(regex);

  if (!matches) return "";

  const hours = parseInt(matches[1] ?? '0');
  const minutes = parseInt(matches[2] ?? '0');
  const seconds = parseInt(matches[3] ?? '0');

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  
  const displayMinutes = Math.floor(totalSeconds / 60);
  const displaySeconds = totalSeconds % 60;

  return `${displayMinutes}:${displaySeconds < 10 ? '0' : ''}${displaySeconds}`;
}

/**
 * Parses an ISO 8601 duration string (e.g., "PT4M13S") into milliseconds.
 */
export function parseISO8601Duration(durationString: string | undefined | null): number | null {
  if (!durationString) return null;

  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = durationString.match(regex);

  if (!matches) return null;

  const hours = parseInt(matches[1] ?? '0');
  const minutes = parseInt(matches[2] ?? '0');
  const seconds = parseInt(matches[3] ?? '0');

  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

/**
 * Converts seconds into an ISO 8601 duration string (e.g. 225 -> "PT3M45S").
 */
export function secondsToISODuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  let result = "PT";
  if (hours > 0) result += `${hours}H`;
  if (minutes > 0 || hours > 0) result += `${minutes}M`;
  result += `${seconds}S`;
  return result;
}

/**
 * Cleans noisy karaoke/instrumental tags and bracketed metadata for display on the player UI only.
 * E.g.: "Starboy ft. Daft Punk - The Weeknd Karaoke 【With Guide Melody】 Instrumental" -> "Starboy ft. Daft Punk - The Weeknd"
 */
export function cleanPlayerTitle(title: string): string {
  if (!title) return "";
  let clean = title;

  // Remove bracketed contents: (...), [...], {...}, 【...】, 〔...〕, （...）, 「...」, 『...』
  clean = clean.replace(/[\(\[\{【〔（「『][^\)\]\}】〕）」』]*[\)\]\}】〕）」』]/g, " ");

  // Remove common karaoke noise keywords case-insensitively
  clean = clean.replace(/\b(official video|lyrics|karaoke|instrumental|hd|4k|version|with guide melody|guide melody|karafun|sing king|backing track|lower key|higher key|original key)\b/gi, " ");

  // Clean trailing/leading dashes, pipes, dots, and colons
  clean = clean.replace(/[-|:;•~_—–\s]+$/, "");
  clean = clean.replace(/^[-|:;•~_—–\s]+/, "");

  // Collapse multiple spaces
  clean = clean.replace(/\s+/g, " ").trim();

  // If cleaning resulted in an empty string (e.g. video was literally titled "Karaoke"), fallback to original
  return clean || title;
}

