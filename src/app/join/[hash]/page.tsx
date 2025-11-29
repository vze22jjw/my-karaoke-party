import JoinScene from "~/app/join/join-scene";
import { api } from "~/trpc/server";
import { notFound, redirect } from "next/navigation";

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
  
  // ADDED CHECK: If party is closed, redirect to home.
  if (party.status === "CLOSED") {
    redirect("/");
  }

  return <JoinScene partyHash={partyHash} partyName={party.name} />;
}
