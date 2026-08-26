/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import axios from "axios";
import { debugLog } from "~/utils/debug-logger";

const LOG_TAG = "[ArtworkService]";
const artworkMemoryCache = new Map<string, string>();

type ITunesSearchResponse = {
  resultCount: number;
  results: Array<{
    artworkUrl100?: string;
    artworkUrl60?: string;
  }>;
};

export const artworkService = {
  async resolveSongArtwork(artist: string, title: string): Promise<string | undefined> {
    const cleanTitle = title.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "").trim();
    const cleanArtist = artist.trim();
    const cacheKey = `${cleanArtist.toLowerCase()} - ${cleanTitle.toLowerCase()}`;

    if (artworkMemoryCache.has(cacheKey)) {
      return artworkMemoryCache.get(cacheKey);
    }

    try {
      const query = encodeURIComponent(`${cleanArtist} ${cleanTitle}`);
      const url = `https://itunes.apple.com/search?term=${query}&entity=song&limit=1`;

      const response = await axios.get<ITunesSearchResponse>(url, {
        timeout: 4000,
        headers: {
          "User-Agent": "MyKaraokeParty/1.0",
        },
      });

      const firstResult = response.data?.results?.[0];
      if (firstResult?.artworkUrl100) {
        // Upgrade iTunes 100x100 thumbnail to crisp 300x300 artwork
        const highResUrl = firstResult.artworkUrl100.replace("100x100bb", "300x300bb");
        artworkMemoryCache.set(cacheKey, highResUrl);
        return highResUrl;
      }
    } catch (error) {
      debugLog(LOG_TAG, `Could not resolve iTunes artwork for "${cleanArtist} - ${cleanTitle}":`, error instanceof Error ? error.message : String(error));
    }

    return undefined;
  },

  async enrichSongsWithArtwork<T extends { title: string; artist: string; coverUrl?: string }>(songs: T[]): Promise<T[]> {
    const promises = songs.map(async (song) => {
      if (song.coverUrl) return song;
      const coverUrl = await this.resolveSongArtwork(song.artist, song.title);
      return {
        ...song,
        coverUrl,
      };
    });

    return Promise.all(promises);
  },
};
