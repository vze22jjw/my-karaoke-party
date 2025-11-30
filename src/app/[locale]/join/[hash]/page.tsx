import JoinScene from "../join-scene";
import { api } from "~/trpc/server";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

type Props = {
  params: { hash: string; locale: string };
};

export async function generateMetadata({ params }: Props) {
  const t = await getTranslations({ locale: params.locale, namespace: 'join' });
  const partyHash = params.hash;
  
  try {
    const party = await api.party.getByHash({ hash: partyHash });
    if (!party) return { title: 'My Karaoke Party' };
    
    return { 
      title: `${t('title')} - ${party.name}` 
    };
  } catch (e) {
    return { title: 'My Karaoke Party' };
  }
}

export default async function JoinPartyHashPage({ params }: Props) {
  const partyHash = params.hash;

  const party = await api.party.getByHash({ hash: partyHash });

  if (!party) {
    notFound();
  }

  if (party.status === "CLOSED") {
    redirect("/");
  }

  return <JoinScene partyHash={partyHash} partyName={party.name} />;
}
