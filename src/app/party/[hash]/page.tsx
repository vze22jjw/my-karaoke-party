import { notFound } from "next/navigation";
import { type KaraokeParty } from "party";
import { api } from "~/trpc/server";
import { PartyScene } from "./party-scene";

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
    return <div>Party not found</div>;
  }

  // Initialize with empty playlist - will be loaded via REST API polling
  const playlist: KaraokeParty = {
    playlist: [],
    settings: { orderByFairness: true }
  };

  return (
    <PartyScene key={party.hash} party={party} initialPlaylist={playlist} />
  );
}
