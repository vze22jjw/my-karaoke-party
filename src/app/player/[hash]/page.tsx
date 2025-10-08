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

  // Try to get playlist from PartyKit, but use empty playlist if not available
  // Fetch playlist from database via REST API
  let playlist: KaraokeParty = { playlist: [], settings: { orderByFairness: true } };

  try {
    const playlistRes = await fetch(`http://localhost:3000/api/playlist/${partyHash}`, {
      method: "GET",
      next: {
        revalidate: 0,
      },
    });

    if (playlistRes.ok) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data = await playlistRes.json();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      playlist = { playlist: data.playlist, settings: { orderByFairness: true } };
    }
  } catch (error) {
    console.warn("Failed to fetch playlist", error);
  }

  return <PlayerScene party={party} initialPlaylist={playlist} />;
}
