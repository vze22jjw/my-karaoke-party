import { notFound, redirect } from "next/navigation";
import { api } from "~/trpc/server";
import { getTranslations } from "next-intl/server";
import { HostScene } from "./host-scene";
import { env } from "~/env";
import type { InitialPartyData } from "~/types/app-types";
import { cookies, headers } from "next/headers";

type Props = {
  params: { hash: string; locale: string };
};

export async function generateMetadata({ params }: Props) {
  const t = await getTranslations({ locale: params.locale, namespace: 'common' });
  const partyHash = params.hash;
  
  try {
    const party = await api.party.getByHash({ hash: partyHash });
    if (!party) return { title: t('appName') };
    
    return {
      title: `Host: ${party.name} - ${t('appName')}`,
    };
  } catch (e) {
    return { title: t('appName') };
  }
}

export default async function HostPartyPage({ params }: Props) {
  const headersList = headers();
  const cookiesList = cookies();  
  const authHeader = headersList.get("authorization");
  const hasAuthHeader = authHeader === `Bearer ${env.ADMIN_TOKEN}`;
  const hasCookie = cookiesList.has("admin_token");

  if (!hasCookie && !hasAuthHeader) {
    redirect("/");
  }

  const partyHash = params.hash;
  const party = await api.party.getByHash({ hash: partyHash });

  if (!party) {
    notFound();
  }

  if (party.status === "CLOSED") {
    redirect("/host");
  }

  let initialData: InitialPartyData = { 
    currentSong: null, 
    unplayed: [], 
    played: [], 
    settings: { 
        orderByFairness: true, 
        disablePlayback: false, 
        spotifyPlaylistId: null, 
        spotifyLink: null,
        isManualSortActive: false
    },
    currentSongStartedAt: null,
    currentSongRemainingDuration: null,
    status: "OPEN",
    idleMessages: [],
    themeSuggestions: [],
  };
  
  try {
    const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const playlistRes = await fetch(`${baseUrl}/api/playlist/${partyHash}`, {
      method: "GET",
      next: {
        revalidate: 0, 
      },
    });

    if (playlistRes.ok) {
      const data = (await playlistRes.json()) as InitialPartyData;
      initialData = data;
    }
  } catch (error) {
    console.warn("Failed to fetch initial playlist for host page", error);
  }

  return (
    <HostScene 
      key={params.locale} 
      party={party} 
      initialData={initialData} 
      hostName={null} 
    />
  );
}
