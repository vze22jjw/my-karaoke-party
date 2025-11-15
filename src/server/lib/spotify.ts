import axios from "axios";
import { env } from "~/env";
import { cache } from "../cache";
import { debugLog } from "~/utils/debug-logger"; // For new logging request

// Internal Spotify API types
type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type SpotifyImage = {
  url: string;
  height: number;
  width: number;
};

type SpotifyTrack = {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    images: SpotifyImage[];
  };
  external_urls: { spotify: string };
};

// Public type for our app
export type SpotifyRecommendation = {
  title: string;
  artist: string;
  coverUrl: string;
};

const LOG_TAG = "[SpotifyService]";

export const spotifyService = {
  async getAccessToken(): Promise<string | null> {
    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) return null;

    const CACHE_KEY = "spotify:access_token";
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const cachedToken = await cache.get<string>(CACHE_KEY);
    if (cachedToken && typeof cachedToken === "string") return cachedToken;

    try {
      const authString = Buffer.from(
        `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64");

      const res = await axios.post<SpotifyTokenResponse>(
        "https://accounts.spotify.com/api/token",
        "grant_type=client_credentials",
        {
          headers: {
            Authorization: `Basic ${authString}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const token = res.data.access_token;
      await cache.set(CACHE_KEY, token, 3500);
      return token;
    } catch (error) {
      console.error("Spotify Auth Error:", error);
      return null;
    }
  },

  async searchTrack(query: string) {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const cleanQuery = query
        .replace(/[\(\[](.*?)[\)\]]/g, "")
        .replace(/official video|lyrics|karaoke|instrumental/gi, "")
        .trim();

      const res = await axios.get<{ tracks: { items: SpotifyTrack[] } }>(
        "https://api.spotify.com/v1/search",
        {
          params: { q: cleanQuery, type: "track", limit: 1 },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const track = res.data.tracks.items[0];

      // --- DEBUG LOGGING ---
      if (track) {
        debugLog(LOG_TAG, `Match found for query: "${cleanQuery}"`, track);
      } else {
        debugLog(LOG_TAG, `No match found for query: "${cleanQuery}"`);
      }
      // ---------------------

      if (!track) return null;

      return {
        id: track.id,
        title: track.name,
        artist: track.artists[0]?.name ?? "Unknown",
        coverUrl: track.album.images[0]?.url ?? "",
        url: track.external_urls.spotify,
      };
    } catch (error) {
      debugLog(LOG_TAG, "Spotify Search Failed:", error);
      return null;
    }
  },

  async getTopKaraokeTracks(): Promise<SpotifyRecommendation[]> {
    const token = await this.getAccessToken();
    if (!token) return [];

    const CACHE_KEY = "spotify:top_karaoke";
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const cached = await cache.get<SpotifyRecommendation[]>(CACHE_KEY);
    
    if (Array.isArray(cached)) {
      return cached as SpotifyRecommendation[];
    }

    try {
      const query = "Karaoke Classics"; // Use a reliable query
      const searchRes = await axios.get<{ playlists: { items: { id: string }[] } }>(
        "https://api.spotify.com/v1/search",
        {
          params: { q: query, type: "playlist", limit: 1 },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const playlistId = searchRes.data.playlists.items[0]?.id;
      if (!playlistId) return [];

      const tracksRes = await axios.get<{ items: { track: SpotifyTrack }[] }>(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          params: { limit: 5 },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const tracks: SpotifyRecommendation[] = tracksRes.data.items.map((item) => ({
        title: item.track.name,
        artist: item.track.artists[0]?.name ?? "Unknown",
        coverUrl: item.track.album.images[0]?.url ?? "",
      }));

      await cache.set(CACHE_KEY, tracks, 60 * 60 * 24);
      return tracks;
    } catch (error) {
      console.error("Spotify Trends Error:", error);
      return [];
    }
  }
};
