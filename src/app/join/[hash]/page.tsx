import { api } from "~/trpc/server";
import { env } from "~/env";
import { notFound } from "next/navigation";
import { type KaraokeParty } from "party";
import JoinScene from "../join-scene";

export default async function JoinPartyHashPage({
  params,
}: {
  params: { hash: string };
}) {
  const partyHash = params.hash;

  return <JoinScene partyHash={partyHash} />;
}
