import { Player } from "~/components//player";
import { api } from "~/trpc/server";
import { env } from "~/env";
import { notFound } from "next/navigation";
import { type KaraokeParty } from "party";

export default async function PartyPage({
  params,
}: {
  params: { hash: string };
}) {
  const partyHash = params.hash;

  const partyPromise = api.party.getByHash({ hash: partyHash });

  const req = fetch(`${env.NEXT_PUBLIC_PARTYKIT_URL}/party/${partyHash}`, {
    method: "GET",
    next: {
      revalidate: 0,
    },
  });

  const [party, partyKitRes] = await Promise.all([partyPromise, req]);

  if (!party) {
    notFound();
  }

  if (!partyKitRes.ok) {
    if (partyKitRes.status === 404) {
      notFound();
    } else {
      throw new Error("Something went wrong.");
    }
  }

  const playlist = (await partyKitRes.json()) as KaraokeParty;

  return <Player key={party.hash} party={party} initialPlaylist={playlist} />;
}
