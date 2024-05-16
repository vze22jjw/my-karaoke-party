import { db } from "~/server/db";

const videosData = [
  {
    id: "VVamRqV2uCc",
    title: "Survivor • Eye Of The Tiger (CC) 🎤 [Karaoke] [Instrumental]",
    artist: "Survivor",
    song: "Eye Of The Tiger",
  },
  {
    id: "50eVhKgv5OM",
    title:
      "Linkin Park • In The End (CC) (Upgraded Video) 🎤 [Karaoke] [Instrumental Lyrics]",
    artist: "Linkin Park",
    song: "In The End",
  },
  {
    id: "CqdGFzAIYdI",
    title:
      "Red Hot Chili Peppers • The Zephyr Song (Upgraded Video) (CC) 🎤 [Karaoke] [Instrumental]",
    artist: "Red Hot Chili Peppers",
    song: "The Zephyr Song",
  },
];

const partyData = {
  name: "My Karaoke Party",
};

async function main() {
  console.log(`Start seeding...`);

  await db.video.createMany({
    data: videosData.map((video) => ({
      id: video.id,
      title: video.title,
      artist: video.artist,
      song: video.song,
    })),
  });

  const party = await db.party.createWithHash(partyData);

  console.log(`Created party with hash: ${party.hash}`);

  await db.videosOnParties.createMany({
    data: videosData.map((video) => ({
      videoId: video.id,
      partyId: party.id,
    })),
  });
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
