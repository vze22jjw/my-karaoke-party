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
