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
  duration_ms: number;
  external_urls: { spotify: string };
};

export type SpotifyRecommendation = {
  title: string;
  artist: string;
  coverUrl: string;
};

const LOG_TAG = "[SpotifyService]";

// ⚠️ NEW SPOTIFY REQUIREMENT: 
// You MUST own or collaborate on this playlist ID using your Premium Developer account.
// If you do not own the playlist, the API will successfully authenticate but return NO items.
const DEFAULT_KARAOKE_PLAYLIST_ID = "1NXdf9sRWYkgfuHVU3LKUi"; 

// Helper to normalize strings for comparison (remove punctuation, lowercase)
const normalize = (str: string) => 
  str.toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();

// Helper to clean "noise" from a string
const cleanString = (str: string) => {
  return str
    .replace(/\b(official video|lyrics|karaoke|instrumental|hd|4k|version|karafun|sing king)\b/gi, "")
    .replace(/[\(\[\{].*?[\)\]\}]/g, "") // Remove things in brackets/parens as they are usually noise
    .replace(/[-|]/g, " ") // Replace separators with spaces
    .replace(/\s+/g, " ")
    .trim();
};

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

      // RESTORED: Real Spotify Accounts Token URL
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

    const isKaraFun = /\bkarafun\b/i.test(query);
    const isSingKing = /\bsing\s*king\b/i.test(query);

    let spotifyQuery = "";
    const parts = query.split("-");

    if (parts.length >= 2) {
        if (isKaraFun) {
            const titlePart = cleanString(parts[0] ?? "");
            const artistPart = cleanString(parts.slice(1).join(" "));
            
            if (titlePart && artistPart) {
                spotifyQuery = `track:${titlePart} artist:${artistPart}`;
            }
        } else if (isSingKing) {
            const artistPart = cleanString(parts[0] ?? "");
            const titlePart = cleanString(parts.slice(1).join(" "));
            
            if (titlePart && artistPart) {
                spotifyQuery = `artist:${artistPart} track:${titlePart}`;
            }
        }
    }

    if (!spotifyQuery) {
        spotifyQuery = cleanString(query);
    }

    const performSearch = async (q: string) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`${LOG_TAG} Searching Spotify with: "${q}"`);
        }
        // RESTORED: Real Spotify API Search URL
        return await axios.get<{ tracks: { items: SpotifyTrack[] } }>(
            "https://api.spotify.com/v1/search", 
            {
            params: { q: q, type: "track", limit: 1 },
            headers: { Authorization: `Bearer ${token}` },
            }
        );
    };

    try {
      let res = await performSearch(spotifyQuery);
      let track = res.data.tracks.items[0];

      const isValid = (t: SpotifyTrack | undefined, originalQuery: string) => {
          if (!t) return false;
          const youtubeNorm = normalize(originalQuery);
          const spotifyTitleNorm = normalize(t.name);
          return youtubeNorm.includes(spotifyTitleNorm);
      };

      if (!isValid(track, query)) {
          if (spotifyQuery.includes("track:")) {
              debugLog(LOG_TAG, `Structured query "${spotifyQuery}" failed validation. Retrying with generic search.`);
              const fallbackQuery = cleanString(query);
              if (fallbackQuery !== spotifyQuery) {
                  res = await performSearch(fallbackQuery);
                  track = res.data.tracks.items[0];
              }
          }
      }

      if (!isValid(track, query)) {
          debugLog(LOG_TAG, `Validation Failed: Spotify track "${track?.name}" not found in YouTube title "${query}"`);
          return null; 
      }

      debugLog(LOG_TAG, `Match confirmed: "${track!.name}" by ${track!.artists[0]?.name}`);

      return {
        id: track!.id,
        title: track!.name,
        artist: track!.artists[0]?.name ?? "Unknown",
        coverUrl: track!.album.images[0]?.url ?? "",
        url: track!.external_urls.spotify,
      };
    } catch (error) {
      debugLog(LOG_TAG, "Spotify Search Failed:", error);
      return null;
    }
  },

  async getTopKaraokeTracks(playlistId?: string | null): Promise<SpotifyRecommendation[]> {
    const token = await this.getAccessToken();
    if (!token) return [];

    // FIX: Using Nullish Coalescing (??) instead of Logical OR (||)
    const idToUse = playlistId ?? DEFAULT_KARAOKE_PLAYLIST_ID;
    const CACHE_KEY = `spotify:top_tracks:${idToUse}`;
    
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const cached = await cache.get<SpotifyRecommendation[]>(CACHE_KEY);
    
    if (Array.isArray(cached)) {
      return cached as SpotifyRecommendation[];
    }

    try {
      debugLog(LOG_TAG, `Fetching items from playlist: ${idToUse}`);
      
      // RESTORED: Real Spotify API Playlist Items URL
      const tracksRes = await axios.get<{ items?: { item?: SpotifyTrack; track?: SpotifyTrack }[] }>(
        `https://api.spotify.com/v1/playlists/${idToUse}/items`,
        {
          params: { limit: 5 },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!tracksRes.data.items) {
         console.warn(`${LOG_TAG} Playlist contents hidden by Spotify API. You must be the owner of the playlist ID: ${idToUse}`);
         return [];
      }

      const tracks: SpotifyRecommendation[] = tracksRes.data.items
        // FIX: Using Nullish Coalescing (??) instead of Logical OR (||)
        .map((entry) => entry.item ?? entry.track) 
        .filter((trackData): trackData is SpotifyTrack => !!trackData)
        .map((trackData) => ({
          title: trackData.name,
          artist: trackData.artists[0]?.name ?? "Unknown",
          coverUrl: trackData.album.images[0]?.url ?? "",
        }));

      await cache.set(CACHE_KEY, tracks, 60 * 60 * 24); 
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
