import { api } from "~/trpc/server";
import { notFound } from "next/navigation";
import { type VideoInPlaylist, type KaraokeParty } from "party";
import { HostScene } from "./host-scene"; 

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
  status: string; // <-- ADD THIS
};

export async function generateMetadata({ params }: Props) {
  const partyHash = params.hash;
  const party = await api.party.getByHash({ hash: partyHash });
  if (!party) {
    notFound();
  }
  return {
    title: `${party.name} - Host Controls`,
  };
}

export default async function HostPage({ params }: Props) {
  const partyHash = params.hash;
  const party = await api.party.getByHash({ hash: partyHash });

  if (!party) {
    notFound();
  }

  let initialData: InitialPartyData = { 
    currentSong: null, 
    unplayed: [], 
    played: [], 
    settings: { orderByFairness: true },
    currentSongStartedAt: null,
    currentSongRemainingDuration: null,
    status: "OPEN", // <-- ADD THIS
  };

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const playlistRes = await fetch(`${appUrl}/api/playlist/${partyHash}`, {
      method: "GET",
      next: {
        revalidate: 0, // Force dynamic fetch
      },
    });

    if (playlistRes.ok) {
      const data = (await playlistRes.json()) as InitialPartyData;
      initialData = data;
    }
  } catch (error) {
    console.warn("Failed to fetch initial playlist for host page", error);
  }

  return <HostScene party={party} initialData={initialData} />;
}
