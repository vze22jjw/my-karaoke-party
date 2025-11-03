import { notFound } from "next/navigation";
import { type KaraokeParty } from "party";
import { api } from "~/trpc/server";
import { PartyScene } from "./party-scene-tabs";

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

export default async function PartyHashPage({ params }: Props) {
  const partyHash = params.hash;

  const party = await api.party.getByHash({ hash: partyHash });

  if (!party) {
    notFound();
  }

  // --- START: FIX ---
  // Fetch the initial playlist and settings, just like the player page does
  let playlist: KaraokeParty = { playlist: [], settings: { orderByFairness: true } };

  try {
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
      
      // Correctly assign the fetched playlist and settings
      playlist = { 
        playlist: data.playlist, 
        settings: data.settings 
      };
    }
  } catch (error) {
    console.warn("Failed to fetch initial playlist for party page", error);
    // Fallback to the default playlist (with orderByFairness: true)
  }
  // --- END: FIX ---

  return (
    <PartyScene key={party.hash} party={party} initialPlaylist={playlist} />
  );
}
