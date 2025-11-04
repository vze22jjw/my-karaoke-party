import { api } from "~/trpc/server";
import { notFound } from "next/navigation";
// --- IMPORT NEW TYPES ---
import { type VideoInPlaylist, type KaraokeParty } from "party";
import PlayerScene from "./player-scene";

type Props = {
  params: { hash: string };
};

// --- DEFINE NEW DATA TYPE ---
type InitialPartyData = {
  currentSong: VideoInPlaylist | null;
  unplayed: VideoInPlaylist[];
  played: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
};

export async function generateMetadata({ params }: Props) {
  const partyHash = params.hash;
  const party = await api.party.getByHash({ hash: partyHash });
  if (!party) {
    notFound();
  }
  return {
    title: party.name,
  };
}

export default async function PartyPage({ params }: Props) {
  const partyHash = params.hash;
  const party = await api.party.getByHash({ hash: partyHash });

  if (!party) {
    notFound();
  }

  // --- UPDATED: Set default for new data structure ---
  let initialData: InitialPartyData = { 
    currentSong: null, 
    unplayed: [], 
    played: [], 
    settings: { orderByFairness: true } 
  };

  try {
    // --- UPDATED: Use NEXT_PUBLIC_APP_URL from env ---
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const playlistRes = await fetch(`${appUrl}/api/playlist/${partyHash}`, {
      method: "GET",
      next: {
        revalidate: 0, // Force dynamic fetch
      },
    });

    if (playlistRes.ok) {
      // --- UPDATED: Cast to new data structure ---
      const data = (await playlistRes.json()) as InitialPartyData;
      initialData = data;
    }
  } catch (error) {
    console.warn("Failed to fetch initial playlist for player", error);
  }

  // --- UPDATED: Pass new prop ---
  return <PlayerScene party={party} initialData={initialData} />;
}
