import { api } from "~/trpc/server";
import { notFound } from "next/navigation";
import ApplauseScene from "./applause-scene";
import type { VideoInPlaylist } from "~/types/app-types";
import { env } from "~/env";
import { getTranslations } from 'next-intl/server';

type Props = {
  params: { hash: string; locale: string };
};

export async function generateMetadata({ params }: Props) {
  const t = await getTranslations({ locale: params.locale, namespace: 'applause' });
  const partyHash = params.hash;
  
  try {
    const party = await api.party.getByHash({ hash: partyHash });
    if (!party) return { title: 'My Karaoke Party' };
    
    return { 
      title: `${t('title')} ${party.name}` 
    };
  } catch (e) {
    return { title: 'My Karaoke Party' };
  }
}

export default async function ApplausePage({ params }: Props) {
  const partyHash = params.hash;
  let currentSong: VideoInPlaylist | null = null;
  let unplayed: VideoInPlaylist[] = [];

  try {
    // Verify party exists first
    const party = await api.party.getByHash({ hash: partyHash });
    if (!party) notFound();

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
    }
  } catch (error) {
    console.warn("Failed to fetch data for applause page", error);
    // Even if fetch fails, we let the scene load and connect via socket
  }

  return (
    <ApplauseScene 
      partyHash={partyHash} 
      initialCurrentSong={currentSong} 
      initialUnplayed={unplayed} 
    />
  );
}
