import { notFound } from "next/navigation";
import { type KaraokeParty } from "party";
import { env } from "~/env";
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

  // Try to get playlist from PartyKit, but use empty playlist if not available
  let playlist: KaraokeParty = { playlist: [], settings: { orderByFairness: true } };

  try {
    const req = await fetch(
      `${env.NEXT_PUBLIC_PARTYKIT_URL}/party/${partyHash}`,
      {
        method: "GET",
        next: {
          revalidate: 0,
        },
      },
    );

    if (req.ok) {
      playlist = (await req.json()) as KaraokeParty;
    } else {
      console.warn("PartyKit not available - using empty playlist");
    }
  } catch (error) {
    console.warn("PartyKit not available - using empty playlist", error);
  }

  return (
    <PartyScene key={party.hash} party={party} initialPlaylist={playlist} />
  );
}
