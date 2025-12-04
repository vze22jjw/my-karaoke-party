import { notFound, redirect } from "next/navigation";
import { type VideoInPlaylist, type KaraokeParty } from "~/types/app-types";
import { api } from "~/trpc/server";
import { getTranslations } from "next-intl/server";
import { PartySceneTabs } from "./party-scene-tabs";

type Props = {
  params: { hash: string; locale: string };
};

type InitialPartyData = {
  currentSong: VideoInPlaylist | null;
  unplayed: VideoInPlaylist[];
  played: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
  currentSongStartedAt: Date | null;
  currentSongRemainingDuration: number | null;
  status: string;
  idleMessages: string[];
  themeSuggestions: string[];
};

export async function generateMetadata({ params }: Props) {
  const t = await getTranslations({ locale: params.locale, namespace: 'common' });
  const partyHash = params.hash;
  
  try {
    const party = await api.party.getByHash({ hash: partyHash });
    if (!party) return { title: t('appName') };
    
    return {
      title: `${party.name} - ${t('appName')}`,
    };
  } catch (e) {
    return { title: t('appName') };
  }
}

export default async function PartyHashPage({ params }: Props) {
  const partyHash = params.hash;
  const party = await api.party.getByHash({ hash: partyHash });

  if (!party) {
    notFound();
  }

  if (party.status === "CLOSED") {
    redirect("/");
  }

  let initialData: InitialPartyData = { 
    currentSong: null, 
    unplayed: [], 
    played: [], 
    settings: { 
        orderByFairness: true,
        spotifyPlaylistId: null,
        disablePlayback: false,
        spotifyLink: null,
        isManualSortActive: false
    },
    currentSongStartedAt: null,
    currentSongRemainingDuration: null,
    status: "OPEN",
    idleMessages: [],
    themeSuggestions: [],
  };
  
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const playlistRes = await fetch(`${appUrl}/api/playlist/${partyHash}`, {
      method: "GET",
      next: {
        revalidate: 0, 
      },
    });

    if (playlistRes.ok) {
      const data = (await playlistRes.json()) as InitialPartyData;
      initialData = data;
    }
  } catch (error) {
    console.warn("Failed to fetch initial playlist for party page", error);
  }
  
  return (
    <PartySceneTabs key={party.hash} party={party} initialData={initialData} />
  );
}
