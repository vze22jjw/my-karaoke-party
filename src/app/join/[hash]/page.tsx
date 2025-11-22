import { JoinScene } from "~/app/join/join-scene";
import { api } from "~/trpc/server";
import { notFound } from "next/navigation";

export default async function JoinPartyHashPage({
  params,
}: {
  params: { hash: string };
}) {
  const partyHash = params.hash;

  const party = await api.party.getByHash({ hash: partyHash });

  if (!party) {
    notFound();
  }

  return <JoinScene partyHash={partyHash} partyName={party.name} />;
}
