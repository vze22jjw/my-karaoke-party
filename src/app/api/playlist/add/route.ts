/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { log } from "next-axiom";
import youtubeAPI from "~/utils/youtube-data-api";
// --- 1. IMPORT SPOTIFY SERVICE ---
import { spotifyService } from "~/server/lib/spotify";
import { debugLog } from "~/utils/debug-logger"; // For debug logging

const LOG_TAG = "[SpotifyService-REST]";

type AddSongBody = {
  partyHash: string;
  videoId: string;
  title: string;
  artist?: string;
  song?: string;
  coverUrl: string;
  singerName: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AddSongBody;
    const { partyHash, videoId, title, artist, song, coverUrl, singerName } = body;

    if (!partyHash || !videoId || !title || !singerName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find party
    const party = await db.party.findUnique({
      where: { hash: partyHash },
    });

    if (!party) {
      return NextResponse.json(
        { error: "Party not found" },
        { status: 404 }
      );
    }

    // Check if video already exists in playlist (not played)
    const existing = await db.playlistItem.findFirst({
      where: {
        partyId: party.id,
        videoId: videoId,
        playedAt: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Video already in playlist", item: existing },
        { status: 200 }
      );
    }

    const duration = await youtubeAPI.getVideoDuration(videoId);
    log.info(`Fetched duration for ${videoId}: ${duration ?? 'N/A'}`);

    // --- 2. ADD SPOTIFY MATCHING LOGIC ---
    let spotifyId: string | undefined;
    try {
      // This will log the result if debug is enabled
      const match = await spotifyService.searchTrack(title);
      if (match) {
        spotifyId = match.id;
        log.info("Matched Spotify Track", { youtube: title, spotify: match.title });
        debugLog(LOG_TAG, "Matched Spotify Track", { youtube: title, spotify: match.title });
      }
    } catch (e) {
      log.warn("Spotify match failed", { error: (e as Error).message });
      debugLog(LOG_TAG, "Spotify match failed", e);
    }
    // ------------------------------------

    // Add to playlist
    const playlistItem = await db.playlistItem.create({
      data: {
        partyId: party.id,
        videoId,
        title,
        artist: artist ?? "",
        song: song ?? "",
        coverUrl,
        duration: duration, 
        singerName,
        randomBreaker: Math.random(), 
        spotifyId: spotifyId, // <-- 3. SAVE THE ID
      },
    });

    log.info("Video added to playlist", {
      partyHash,
      videoId,
      singerName,
    });

    return NextResponse.json({ success: true, item: playlistItem });
  } catch (error) {
    console.error("Error adding video to playlist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
