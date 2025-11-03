import { api } from "~/trpc/server";
import { notFound } from "next/navigation";
import { type KaraokeParty } from "party";
import PlayerScene from "./player-scene";

type Props = {
  params: { hash: string };
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

  // Initialize with a default, but fetch the REAL settings
  let playlist: KaraokeParty = { playlist: [], settings: { orderByFairness: true } };

  try {
    // --- START: FIX ---
    // Use the environment variable for the app URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    
    const playlistRes = await fetch(`${appUrl}/api/playlist/${partyHash}`, {
      method: "GET",
      next: {
        revalidate: 0, // Force dynamic fetch
      },
    });

    if (playlistRes.ok) {
      // --- FIX: Cast the JSON response to the 'KaraokeParty' type ---
      const data = (await playlistRes.json()) as KaraokeParty;

      // BUG FIX: Use the settings from the API, don't hardcode
      playlist = { 
        playlist: data.playlist, 
        settings: data.settings // <-- This was the bug
      };
    }
    // --- END: FIX ---
  } catch (error) {
    console.warn("Failed to fetch initial playlist for player", error);
    // Fallback to the default playlist (with orderByFairness: true)
  }

  return <PlayerScene party={party} initialPlaylist={playlist} />;
}
