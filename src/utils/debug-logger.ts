/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { type KaraokeParty } from "~/types/app-types";

// Check both server-side and client-side env vars
const IS_DEBUG_MODE =
  process.env.EVENT_DEBUG === "true" ||
  process.env.NEXT_PUBLIC_EVENT_DEBUG === "true";

/**
 * Formats a playlist array into a simple, readable string array of titles for logging.
 */
export const formatPlaylistForLog = (
  playlist: KaraokeParty["playlist"],
): string[] => {
  if (!Array.isArray(playlist)) {
    return ["(Invalid playlist data)"];
  }
  if (playlist.length === 0) {
    return ["(Playlist is empty)"];
  }
  // --- This includes your requested duration logging ---
  return playlist.map(
    (item, index) =>
      `${index + 1}: ${item?.title ?? "N/A"} (${
        item?.duration ?? "No Duration"
      })`,
  );
};

/**
 * Conditionally logs messages to the console if debug mode is enabled.
 * @param tag A tag to identify the log source, e.g., [SocketServer]
 * @param message The log message.
 * @param data Optional data to log using console.dir for better inspection.
 */
export const debugLog = (tag: string, message: string, data?: unknown) => {
  if (!IS_DEBUG_MODE) {
    return;
  }

  const timestamp = new Date().toISOString().split("T")[1]!.slice(0, 12); 

  console.log(`[${timestamp}] ${tag} ${message}`);

  if (data) {
    console.dir(data, { depth: 3 });
  }
};
