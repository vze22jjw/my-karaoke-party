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
  duration_ms: number;
  external_urls: { spotify: string };
};

export type SpotifyRecommendation = {
  title: string;
  artist: string;
  coverUrl: string;
};

const LOG_TAG = "[SpotifyService]";
const DEFAULT_KARAOKE_PLAYLIST_ID = "1NXdf9sRWYkgfuHVU3LKUi"; 

// Helper to normalize strings for comparison (remove punctuation, lowercase)
const normalize = (str: string) => 
  str.toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();

// Helper to clean "noise" from a string
const cleanString = (str: string) => {
  return str
    .replace(/\b(official video|lyrics|karaoke|instrumental|hd|4k|version|karafun|sing king)\b/gi, "")
    .replace(/[\(\[\{].*?[\)\]\}]/g, "") // Remove things in brackets/parens as they are usually noise in this context
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

    // Trusted channel signature BEFORE cleaning
    const isKaraFun = /\bkarafun\b/i.test(query);
    const isSingKing = /\bsing\s*king\b/i.test(query);

    let spotifyQuery = "";
    const parts = query.split("-");

    // PARSING: Apply specific logic if we detected a known channel format
    if (parts.length >= 2) {
        if (isKaraFun) {
            // KaraFun Convention: "Title - Artist"
            const titlePart = cleanString(parts[0] ?? "");
            const artistPart = cleanString(parts.slice(1).join(" ")); // Join rest in case of extra dashes
            
            if (titlePart && artistPart) {
                spotifyQuery = `track:${titlePart} artist:${artistPart}`;
            }
        } else if (isSingKing) {
            // Sing King Convention: "Artist - Title"
            const artistPart = cleanString(parts[0] ?? "");
            const titlePart = cleanString(parts.slice(1).join(" "));
            
            if (titlePart && artistPart) {
                spotifyQuery = `artist:${artistPart} track:${titlePart}`;
            }
        }
    }

    // Fallback: If no special logic applied (or parsing failed), use "Bag of Words"
    if (!spotifyQuery) {
        spotifyQuery = cleanString(query);
    }

    const performSearch = async (q: string) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`${LOG_TAG} Searching Spotify with: "${q}"`);
        }
        return await axios.get<{ tracks: { items: SpotifyTrack[] } }>(
            "https://api.spotify.com/v1/search", 
            {
            params: { q: q, type: "track", limit: 1 },
            headers: { Authorization: `Bearer ${token}` },
            }
        );
    };

    try {
      // First Attempt: Try the constructed query (Structured or Clean)
      let res = await performSearch(spotifyQuery);
      let track = res.data.tracks.items[0];

      // VALIDATION
      // If we found a track, we must validate it against the ORIGINAL query
      // This ensures that "Blue" doesn't match "Blue Suede Shoes" just because of a lucky keyword.
      const isValid = (t: SpotifyTrack | undefined, originalQuery: string) => {
          if (!t) return false;
          const youtubeNorm = normalize(originalQuery);
          const spotifyTitleNorm = normalize(t.name);
          // Check if Spotify Title exists inside the YouTube string
          return youtubeNorm.includes(spotifyTitleNorm);
      };

      if (!isValid(track, query)) {
          // If the specific/structured search failed validation...
          // And if we used a special query (contains "track:"), try falling back to generic cleaning
          if (spotifyQuery.includes("track:")) {
              debugLog(LOG_TAG, `Structured query "${spotifyQuery}" failed validation. Retrying with generic search.`);
              const fallbackQuery = cleanString(query);
              if (fallbackQuery !== spotifyQuery) {
                  res = await performSearch(fallbackQuery);
                  track = res.data.tracks.items[0];
              }
          }
      }

      // Final check after fallback
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
