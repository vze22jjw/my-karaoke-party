import { NoMoreVideos } from "~/components/no-more-videos";
import { Player } from "~/components//player";
import { api } from "~/trpc/server";

export default async function PartyPage({
  params,
}: {
  params: { hash: string };
}) {
  const party = await api.party.getByHash({ hash: params.hash });

  if (!party) {
    return <div>Party not found</div>;
  }

  const video = await api.party.fetchNextVideo({ partyId: party.id });

  if (!video) {
    return <NoMoreVideos key={party.id} party={party} />;
  }

  return <Player key={video.id} party={party} videoId={video.id} />;
}
