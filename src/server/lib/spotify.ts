import axios from "axios";
import { env } from "~/env";
import { cache } from "../cache";

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

export const spotifyService = {
  async getAccessToken(): Promise<string | null> {
    // 1. Check environment variables
    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) return null;

    const CACHE_KEY = "spotify:access_token";
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const cachedToken = await cache.get<string>(CACHE_KEY);
    if (cachedToken && typeof cachedToken === "string") return cachedToken;

    try {
      const authString = Buffer.from(
        `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64");

      // 2. CORRECTED URL: Accounts Service
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

      // 3. CORRECTED URL: Search API
      const res = await axios.get<{ tracks: { items: SpotifyTrack[] } }>(
        "https://api.spotify.com/v1/search",
        {
          params: { q: cleanQuery, type: "track", limit: 1 },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const track = res.data.tracks.items[0];
      if (!track) return null;

      return {
        id: track.id,
        title: track.name,
        artist: track.artists[0]?.name ?? "Unknown",
        coverUrl: track.album.images[0]?.url ?? "",
        url: track.external_urls.spotify,
      };
    } catch (error) {
      return null;
    }
  },

  // 4. BETTER DEFAULT QUERY: "Karaoke Classics"
  async getTopKaraokeTracks(query = "Karaoke Classics"): Promise<SpotifyRecommendation[]> {
    const token = await this.getAccessToken();
    if (!token) return [];

    const CACHE_KEY = `spotify:top:${query.toLowerCase().replace(/\s/g, '_')}`;
    
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const cached = await cache.get<SpotifyRecommendation[]>(CACHE_KEY);
    
    if (Array.isArray(cached)) {
      return cached as SpotifyRecommendation[];
    }

    try {
      // 5. CORRECTED URL: Search API
      const searchRes = await axios.get<{ playlists: { items: { id: string; name: string }[] } }>(
        "https://api.spotify.com/v1/search",
        {
          params: { q: query, type: "playlist", limit: 1 },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const playlistItem = searchRes.data.playlists.items[0];
      if (!playlistItem) {
        console.warn(`Spotify: No playlist found for query "${query}"`);
        return [];
      }

      console.log(`Spotify: Found playlist "${playlistItem.name}" (${playlistItem.id})`);

      // 6. CORRECTED URL: Playlist Tracks API
      const tracksRes = await axios.get<{ items: { track: SpotifyTrack }[] }>(
        `https://api.spotify.com/v1/playlists/${playlistItem.id}/tracks`,
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
