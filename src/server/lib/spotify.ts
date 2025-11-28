/* eslint-disable */
import axios, { AxiosError } from "axios";
import { env } from "~/env";
import { cache } from "../cache";
import { debugLog } from "~/utils/debug-logger";

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

export type SpotifyRecommendation = {
  title: string;
  artist: string;
  coverUrl: string;
};

const LOG_TAG = "[SpotifyService]";
const DEFAULT_KARAOKE_PLAYLIST_ID = "1NXdf9sRWYkgfuHVU3LKUi"; // Use a playlist user other than Spotify default to return data

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

      if (track) {
        debugLog(LOG_TAG, `Match found for query: "${cleanQuery}"`, track);
      } else {
        debugLog(LOG_TAG, `No match found for query: "${cleanQuery}"`);
      }

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

  async getTopKaraokeTracks(playlistId?: string | null): Promise<SpotifyRecommendation[]> {
    const token = await this.getAccessToken();
    if (!token) return [];

    const idToUse = playlistId || DEFAULT_KARAOKE_PLAYLIST_ID;
    
    const CACHE_KEY = `spotify:top_tracks:${idToUse}`;
    
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const cached = await cache.get<SpotifyRecommendation[]>(CACHE_KEY);
    
    if (Array.isArray(cached)) {
      return cached as SpotifyRecommendation[];
    }

    try {
      debugLog(LOG_TAG, `Fetching tracks from playlist: ${idToUse}`);
      
      const tracksRes = await axios.get<{ items: { track: SpotifyTrack }[] }>(
        `https://api.spotify.com/v1/playlists/${idToUse}/tracks`,
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

      await cache.set(CACHE_KEY, tracks, 60 * 60 * 24); // Cache for 24h
      return tracks;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error(`Spotify Trends Error (Playlist ID: ${idToUse}):`, error.response?.data ?? error.message);
      } else {
        console.error(`Spotify Trends Error (Playlist ID: ${idToUse}):`, error);
      }

      if (playlistId && playlistId !== DEFAULT_KARAOKE_PLAYLIST_ID) {
        debugLog(LOG_TAG, `Custom playlist failed. Falling back to default.`);
        return this.getTopKaraokeTracks(DEFAULT_KARAOKE_PLAYLIST_ID);
      }
      return [];
    }
  }
};
