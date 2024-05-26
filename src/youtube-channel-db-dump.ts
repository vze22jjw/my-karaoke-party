import { argv } from "node:process";
import { youtube_v3 } from "@googleapis/youtube";
import { db } from "./server/db";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import dotenv from "dotenv";
import { type Prisma } from "@prisma/client";
import { retry, handleAll, ExponentialBackoff } from "cockatiel";

// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
dotenv.config();

// get first Node.js command line argument
const channelId = argv[2];
const initialPageToken = argv[3];

console.log("Initial page token: " + initialPageToken ?? "none");

if (!channelId) {
  console.error("Please provide a YouTube channel ID as an argument");
  process.exit(1);
}

console.log(channelId);

const youtube = new youtube_v3.Youtube({
  apiVersion: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

const channels = (
  await youtube.channels.list({
    forHandle: channelId,
    part: ["contentDetails"],
  })
).data.items;

if (!channels?.[0]) {
  console.error("No channel found with ID", channelId);
  process.exit(1);
}

const uploadsPlaylistId = channels[0].contentDetails?.relatedPlaylists?.uploads;

if (!uploadsPlaylistId) {
  console.error(
    "Could not find the uploads playlist ID for channel ID",
    channelId,
  );
  process.exit(1);
}

const model = openai("gpt-4o");
// const model = openai("gpt-3.5-turbo-0125");

type VideoInput = {
  id: string;
  title: string;
  coverUrl: string;
};

async function getPlaylistVideos(
  playlistId: string,
  pageToken: string | undefined,
) {
  const { items, nextPageToken } = (
    await youtube.playlistItems.list({
      part: ["snippet"],
      playlistId: playlistId,
      maxResults: 50,
      pageToken,
    })
  ).data;

  if (items == undefined) {
    console.error(
      "No videos found in the uploads playlist for channel ID",
      channelId,
    );
    process.exit(1);
  }

  const karaokeVideos = items.filter((item) =>
    item.snippet?.title?.toUpperCase().includes("KARAOKE"),
  );

  if (!karaokeVideos.length) return { videos: [], nextPageToken };

  const contentDetails = await youtube.videos.list({
    id: karaokeVideos.map((item) => item.snippet!.resourceId!.videoId!),
    part: ["contentDetails"],
  });

  const videos = karaokeVideos.map((item) => ({
    id: item.snippet!.resourceId!.videoId!,
    title: item.snippet!.title!,
    coverUrl: item.snippet!.thumbnails!.high!.url!,
    duration: contentDetails.data.items!.find(
      (v) => v.id === item.snippet!.resourceId!.videoId!,
    )?.contentDetails!.duration,
  })) satisfies VideoInput[];

  return { videos, nextPageToken };
}

async function enrichWithArtistSong(videos: VideoInput[]) {
  if (videos.length === 0) return [];

  // Use Vercel AI SDK to prompt ChatGPT 4o
  const { object } = await generateObject({
    model: model,
    schema: z.object({
      videos: z.array(
        z.object({
          id: z.string(),
          artist: z.string(),
          song: z.string(),
          title: z.string(),
          coverUrl: z.string(),
          duration: z.string(),
        }),
      ),
    }),
    prompt:
      "Your job is to identity the artist name and song title from a list of YouTube video titles. Each part is usually separated by a special character (usually -, | or •, but could be others). Also, some titles will have the artist first and others the song title first. Include a property 'artist' and 'song' in each JSON object (make sure you don't remove any of the existing properties) and return the whole array inside the 'videos' property. Both properties have to be populated for each entry. Use the most popular casing for each artist and song name (avoid all caps or all lowercase). If an artist appears more than once, make sure to use the same style and casing in each occurrence. Here's the JSON array of YouTube videos: " +
      JSON.stringify(videos),
  });

  return object.videos;
}

async function writeVideosToDatabase(videos: Prisma.VideoCreateManyInput[]) {
  await db.video.createMany({
    data: videos,
    skipDuplicates: true,
  });
}

// ###
let nextPageToken = initialPageToken;

const retryPolicy = retry(handleAll, {
  maxAttempts: 3,
  backoff: new ExponentialBackoff({ initialDelay: 1000, maxDelay: 10000 }),
});

retryPolicy.onRetry((reason) =>
  console.log("retrying a function call:", reason),
);

const pagesFailed = Array<string>();

do {
  const result = await getPlaylistVideos(uploadsPlaylistId, nextPageToken);
  const videos = result.videos;

  if (videos.length > 0) {
    const batch1 = videos.slice(0, 25);
    const batch2 = videos.slice(25);

    const enrichBatch1 = enrichWithArtistSong(batch1);
    const enrichBatch2 = enrichWithArtistSong(batch2);

    try {
      console.log(
        `Enriching videos with OpenAI ${model.modelId}... [${batch1.length + batch2.length}]`,
      );
      const [enriched1, enriched2] = await retryPolicy.execute(() =>
        Promise.all([enrichBatch1, enrichBatch2]),
      );

      // Promise.all([
      //   enrichBatch1,
      //   enrichBatch2,
      // ]);

      console.log("Writing videos to database...");
      await writeVideosToDatabase([...enriched1, ...enriched2]);
    } catch (error) {
      if (error instanceof Error)
        console.error("Error enriching videos with OpenAI:", error);

      pagesFailed.push(nextPageToken!);
    }
  }

  nextPageToken = result.nextPageToken ?? undefined;
  console.log("nextPageToken: " + nextPageToken);
} while (nextPageToken);

console.log("Done indexing videos in channel:" + channelId);
console.log({ pagesFailed });
