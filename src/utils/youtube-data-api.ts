import axios from "axios";
import { env } from "~/env";

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

class YouTubeDataAPI {
  private apiKey: string;
  private baseUrl = "https://www.googleapis.com/youtube/v3";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // async getVideoById(videoId: string): Promise<SearchResultItem> {
  //   const response: AxiosResponse = await axios.get(`${this.baseUrl}/videos`, {
  //     params: {
  //       key: this.apiKey,
  //       id: videoId,
  //       part: "snippet",
  //     },
  //   });
  //   return response.data.items[0];
  // }

  // async getVideoByUrl(videoUrl: string): Promise<SearchResultItem> {
  //   const match = videoUrl.match(
  //     /(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
  //   );
  //   const videoId = match && match[1];

  //   if (!videoId) {
  //     throw new Error("Invalid YouTube video URL");
  //   }

  //   return this.getVideoById(videoId);
  // }

  // async getVideoByTitle(
  //   videoTitle: string,
  // ): Promise<SearchResultItem | undefined> {
  //   const response: AxiosResponse = await axios.get(`${this.baseUrl}/search`, {
  //     params: {
  //       key: this.apiKey,
  //       q: videoTitle,
  //       part: "snippet",
  //       type: "video",
  //     },
  //   });
  //   return response.data.items[0]; // Might return undefined if no match
  // }

  async searchVideo(query: string, maxResults = 10) {
    try {
      const response = await axios.get<YouTubeSearchResponse>(
        `${this.baseUrl}/search`,
        {
          params: {
            key: this.apiKey,
            part: "snippet",
            type: "video",
            q: query,
            maxResults,
          },
        },
      );

      return response.data.items;
    } catch (error) {
      console.error("YouTube API search error:", error);
      throw error;
    }
  }
}

export { YouTubeDataAPI };

const youtubeAPI = new YouTubeDataAPI(env.YOUTUBE_API_KEY);

export default youtubeAPI;
