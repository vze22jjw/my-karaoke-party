import { notFound, redirect } from "next/navigation";
import { type VideoInPlaylist, type KaraokeParty } from "~/types/app-types";
import { api } from "~/trpc/server";

import { PartySceneTabs } from "./party-scene-tabs";

type Props = {
  params: { hash: string };
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
  const partyHash = params.hash;
  const party = await api.party.getByHash({ hash: partyHash });
  if (!party) {
    notFound();
  }
  return {
    title: `${party.name} - Party Singers`,
  };
}

export default async function PartyHashPage({ params }: Props) {
  const partyHash = params.hash;
  const party = await api.party.getByHash({ hash: partyHash });

  if (!party) {
    notFound();
  }

  // SECURITY: Server-side check to prevent access if closed
  if (party.status === "CLOSED") {
    redirect("/");
  }

  let initialData: InitialPartyData = { 
    currentSong: null, 
    unplayed: [], 
    played: [], 
    settings: { 
        orderByFairness: true,
        spotifyPlaylistId: null
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
