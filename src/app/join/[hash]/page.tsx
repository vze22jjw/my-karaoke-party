import JoinScene from "../join-scene";
import { api } from "~/trpc/server"; // Import server-side api
import { notFound } from "next/navigation"; // Import notFound

export default async function JoinPartyHashPage({
  params,
}: {
  params: { hash: string };
}) {
  const partyHash = params.hash;

  // Fetch party details
  const party = await api.party.getByHash({ hash: partyHash });

  // Handle party not found
  if (!party) {
    notFound();
  }

  return <JoinScene partyHash={partyHash} partyName={party.name} />;
}
