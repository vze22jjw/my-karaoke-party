import { api } from "~/trpc/server";
import { notFound } from "next/navigation";
import { type VideoInPlaylist, type KaraokeParty } from "~/types/app-types";
import { HostScene } from "./host-scene"; 
import { cookies } from "next/headers";
import { AdminLogin } from "~/components/admin-login";
import { getTranslations } from "next-intl/server";

type Props = {
  params: { hash: string; locale: string };
};

type InitialPartyData = {
  currentSong: VideoInPlaylist | null;
  unplayed: VideoInPlaylist[];
  played: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
  currentSongStartedAt: Date | null;
  currentSongRemainingDuration: number | null;
  status: string;
  idleMessages: string[];
  themeSuggestions: string[]; 
};

export async function generateMetadata({ params }: Props) {
  const t = await getTranslations({ locale: params.locale, namespace: 'host' });
  const partyHash = params.hash;
  
  try {
    const party = await api.party.getByHash({ hash: partyHash });
    if (!party) return { title: 'My Karaoke Party' };
    
    return {
      title: `${party.name} - ${t('dashboardTitle')}`,
    };
  } catch (e) {
    return { title: 'My Karaoke Party' };
  }
}

export default async function HostPage({ params }: Props) {
  const cookieStore = cookies();
  const isAuthenticated = cookieStore.get("admin_token_verified")?.value === "true";

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  const partyHash = params.hash;
  const [party, hostName] = await Promise.all([
    api.party.getByHash({ hash: partyHash }),
    api.party.getHostName({ hash: partyHash }),
  ]);

  if (!party) {
    notFound();
  }

  let initialData: InitialPartyData = { 
    currentSong: null, 
    unplayed: [], 
    played: [], 
    settings: { 
      orderByFairness: true,
      spotifyPlaylistId: null
    },
    currentSongStartedAt: null,
    currentSongRemainingDuration: null,
    status: "OPEN",
    idleMessages: [],
    themeSuggestions: [],
  };

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const playlistRes = await fetch(`${appUrl}/api/playlist/${partyHash}`, {
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

  return <HostScene party={party} initialData={initialData} hostName={hostName ?? "Host"} />;
}
