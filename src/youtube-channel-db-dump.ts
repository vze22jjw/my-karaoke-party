import { argv } from "node:process";
import { youtube_v3 } from "@googleapis/youtube";
import { db } from "./server/db";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import dotenv from "dotenv";
import { Prisma } from "@prisma/client";

// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
dotenv.config();

// get first Node.js command line argument
const channelId = argv[2];

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
let nextPageToken: string | undefined = undefined;

do {
  const result = await getPlaylistVideos(uploadsPlaylistId, nextPageToken);
  const videos = result.videos;

  const batch1 = videos.slice(0, 25);
  const batch2 = videos.slice(25);

  const enrichBatch1 = enrichWithArtistSong(batch1);
  const enrichBatch2 = enrichWithArtistSong(batch2);

  const [enriched1, enriched2] = await Promise.all([
    enrichBatch1,
    enrichBatch2,
  ]);

  await writeVideosToDatabase([...enriched1, ...enriched2]);

  // let batch = videos.slice(0, 25);
  // if (batch.length === 0) continue;

  // let enriched = await enrichWithArtistSong(batch);
  // await writeVideosToDatabase(enriched);

  // batch = videos.slice(25);
  // if (batch.length === 0) continue;

  // enriched = await enrichWithArtistSong(batch);
  // await writeVideosToDatabase(enriched);

  // const [batch1, batch2] = await Promise.allSettled([
  //   async () => {
  //     const batch = videos.slice(0, 25);
  //     if (batch.length === 0) return;

  //     const enriched = await enrichWithArtistSong(batch);
  //     await writeVideosToDatabase(enriched);
  //   },
  //   async () => {
  //     const batch = videos.slice(25);
  //     if (batch.length === 0) return;

  //     const enriched = await enrichWithArtistSong(batch);
  //     await writeVideosToDatabase(enriched);
  //   },
  // ]);

  nextPageToken = result.nextPageToken ?? undefined;
  console.log("nextPageToken: " + nextPageToken);
} while (nextPageToken);

console.log("Done indexing videos in channel: + channelId");
