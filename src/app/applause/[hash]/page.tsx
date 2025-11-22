import { api } from "~/trpc/server";
import { notFound } from "next/navigation";
import ApplauseScene from "./applause-scene";
import type { VideoInPlaylist } from "~/types/app-types";
import { env } from "~/env";

type Props = {
  params: { hash: string };
};

export async function generateMetadata({ params }: Props) {
  const partyHash = params.hash;
  const party = await api.party.getByHash({ hash: partyHash });
  if (!party) notFound();
  return { title: `Applause for ${party.name}` };
}

export default async function ApplausePage({ params }: Props) {
  const partyHash = params.hash;
  const party = await api.party.getByHash({ hash: partyHash });
  if (!party) notFound();
  
  let currentSong: VideoInPlaylist | null = null;
  let unplayed: VideoInPlaylist[] = [];

  try {
    // Use env var for public URL, fallback to localhost for internal container fetch
    const baseUrl = env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
    
    const playlistRes = await fetch(`${baseUrl}/api/playlist/${partyHash}`, { 
      method: "GET", 
      next: { revalidate: 0 }, 
    });
    
    if (playlistRes.ok) {
        const data = (await playlistRes.json()) as { 
          currentSong: VideoInPlaylist | null, 
          unplayed: VideoInPlaylist[] 
        };
        currentSong = data.currentSong ?? null;
        unplayed = data.unplayed ?? [];
    } else {
        console.error(`ApplausePage: Failed to fetch song data. Status: ${playlistRes.status}`);
    }
  } catch (error) {
    console.warn("Failed to fetch current song for applause page", error);
  }

  return (
    <ApplauseScene 
      partyHash={partyHash} 
      initialCurrentSong={currentSong} 
      initialUnplayed={unplayed} 
    />
  );
}
