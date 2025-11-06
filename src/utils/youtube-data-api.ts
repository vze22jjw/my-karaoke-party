import axios from "axios";
import { env } from "~/env";

// ... (interfaces Thumbnail, Thumbnails, SearchResultSnippet, SearchResultItem, YouTubeSearchResponse remain the same)
interface Thumbnail {
  url: string;
  width: number;
  height: number;
}
interface Thumbnails {
  default: Thumbnail;
  medium: Thumbnail;
  high: Thumbnail;
}
interface SearchResultSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: Thumbnails;
  channelTitle: string;
  liveBroadcastContent: string;
  publishTime: string;
}
interface SearchResultItem {
  kind: string;
  etag: string;
  id: {
    kind: string;
    videoId: string;
  };
  snippet: SearchResultSnippet;
}
interface YouTubeSearchResponse {
  kind: string;
  etag: string;
  nextPageToken: string;
  regionCode: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: SearchResultItem[];
}
// --- THIS IS THE NEW INTERFACE FOR THE VIDEOS.LIST ENDPOINT ---
interface VideoDetailsResponse {
  items: {
    id: string;
    contentDetails: {
      duration: string;
    };
  }[];
}


class YouTubeDataAPI {
  private apiKeys: string[];
  private baseUrl = "https://www.googleapis.com/youtube/v3";

  constructor(apiKeys: string[]) {
    this.apiKeys = apiKeys;
  }

  // --- THIS IS THE NEW FUNCTION ---
  async getVideoDuration(videoId: string): Promise<string | null> {
    let lastError: unknown;

    for (const [index, apiKey] of this.apiKeys.entries()) {
      try {
        const response = await axios.get<VideoDetailsResponse>(
          `${this.baseUrl}/videos`,
          {
            params: {
              key: apiKey,
              part: "contentDetails",
              id: videoId,
            },
          },
        );

        const duration = response.data.items[0]?.contentDetails?.duration;
        return duration ?? null; // e.g., "PT4M13S"

      } catch (error) {
        console.error(`Get video duration with API key #${index + 1} failed: `, error);
        lastError = error;
        // Continue to next API key
      }
    }
    
    // All keys failed
    console.error(`All YouTube API keys failed. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
    return null;
  }
  // --- END NEW FUNCTION ---

  async searchVideo(query: string, maxResults = 10) {
    let lastError: unknown;

    for (const [index, apiKey] of this.apiKeys.entries()) {
      try {
        console.log(`Searching for "${query}" with API key #${index + 1}`);

        const response = await axios.get<YouTubeSearchResponse>(
          `${this.baseUrl}/search`,
          {
            params: {
              key: apiKey,
              part: "snippet",
              type: "video",
              q: query,
              maxResults,
            },
          },
        );

        return response.data.items;
      } catch (error) {
        console.error(`Search for "${query}" with API key #${index + 1} failed: `, error);
        lastError = error;
        // Continue to next API key
      }
    }

    // If we get here, all API keys failed
    throw new Error(
      `All YouTube API keys failed. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );
  }
}

export { YouTubeDataAPI };

const apiKeys = env.YOUTUBE_API_KEY.split(",");

const youtubeAPI = new YouTubeDataAPI(apiKeys);

export default youtubeAPI;
