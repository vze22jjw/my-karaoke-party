import { api } from "~/trpc/server";
import { env } from "~/env";
import { notFound } from "next/navigation";
import { type KaraokeParty } from "party";
import { JoinScene } from "~/components/join-scene";

export default async function PartyPage({
  params,
}: {
  params: { hash: string };
}) {
  const partyHash = params.hash;

  const party = await api.party.getByHash({ hash: partyHash });

  if (!party) {
    return <div>Party not found</div>;
  }

  const req = await fetch(
    `${env.NEXT_PUBLIC_PARTYKIT_URL}/party/${partyHash}`,
    {
      method: "GET",
      next: {
        revalidate: 0,
      },
    },
  );

  if (!req.ok) {
    if (req.status === 404) {
      notFound();
    } else {
      throw new Error("Something went wrong.");
    }
  }

  const playlist = (await req.json()) as KaraokeParty;

  return (
    <JoinScene key={party.hash} party={party} initialPlaylist={playlist} />
  );

  // const party = await api.party.getByHash({ hash: params.hash });

  // if (!party) {
  //   return <div>Party not found</div>;
  // }

  // const video = await api.party.fetchNextVideo({ partyId: party.id });

  // if (!video) {
  //   return <NoMoreVideos key={party.id} party={party} />;
  // }

  // return <Player key={video.id} party={party} videoId={video.id} />;
}
