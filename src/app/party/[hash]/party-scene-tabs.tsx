/* eslint-disable */
"use client";

import type { Party } from "@prisma/client";
import type { KaraokeParty, VideoInPlaylist } from "party";
import { useEffect, useState, useMemo } from "react";
import { readLocalStorageValue, useLocalStorage } from "@mantine/hooks";
import { Monitor, Music, Users, History } from "lucide-react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TabPlayer } from "./components/tab-player";
import { TabAddSong } from "./components/tab-add-song";
import { TabHistory } from "./components/tab-history";
import { TabSingers } from "./components/tab-singers";

import { usePartySocket } from "~/hooks/use-party-socket";

const ACTIVE_TAB_KEY = "karaoke-party-active-tab";

export function PartyScene({
  party,
  initialPlaylist,
}: {
  party: Party;
  initialPlaylist?: KaraokeParty;
}) {
  const [name] = useLocalStorage<string>({ key: "name" });
  const router = useRouter();
  const [activeTab, setActiveTab] = useLocalStorage({
    key: ACTIVE_TAB_KEY,
    defaultValue: "player",
  });

  const { currentSong, unplayedPlaylist, playedPlaylist, settings, socketActions, isConnected } = usePartySocket(party.hash!);
  
  const [singers, setSingers] = useState<string[]>([]);

  // Combine all songs for the singers tab
  const allSongs = useMemo(() => {
    return [...(currentSong ? [currentSong] : []), ...unplayedPlaylist, ...playedPlaylist];
  }, [currentSong, unplayedPlaylist, playedPlaylist]);


  useEffect(() => {
    const value = readLocalStorageValue({ key: "name" });
    if (!value) {
      router.push(`/join/${party.hash}`);
    }
  }, [router, party.hash]);

  // Poll for singers updates every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/party/participants/${party.hash}`, {
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          setSingers(data.singers);

          if (name && data.singers && !data.singers.includes(name)) {
            await fetch("/api/party/join", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ hash: party.hash, name: name }),
            });
          }
        } else if (response.status === 404) {
          clearInterval(interval);
        }
      } catch (error) {
        console.error("Error fetching singers:", error);
      }
    }, 3000); 

    return () => clearInterval(interval);
  }, [party.hash, singers, name, router]); 

  const addSong = async (videoId: string, title: string, coverUrl: string) => {
    try {
      socketActions.sendHeartbeat();
      socketActions.addSong(videoId, title, coverUrl, name);
    } catch (error) {
      console.error("Error adding song:", error);
      alert("Error adding song. Please try again.");
    }
  };

  const onLeaveParty = () => {
    router.push("/");
  };

  return (
    <div className="container mx-auto p-4 pb-4 h-screen flex flex-col">
      <div className="flex-shrink-0">
        <h1 className="text-outline scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl text-center uppercase">
          {party.name}
        </h1>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden mt-4"
      >
        <TabsList className="grid w-full grid-cols-4 mb-4 flex-shrink-0">
          <TabsTrigger value="player" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">Playing</span>
          </TabsTrigger>
          <TabsTrigger value="add" className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
          <TabsTrigger value="singers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Singers</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="player"
          className="flex-1 overflow-y-auto mt-0"
        >
          <TabPlayer 
            currentSong={currentSong} 
            playlist={unplayedPlaylist} 
            playedPlaylist={playedPlaylist}
          />
        </TabsContent>

        <TabsContent value="add" className="flex-1 overflow-y-auto mt-0">
          <TabAddSong
            playlist={unplayedPlaylist}
            name={name}
            onVideoAdded={addSong}
          />
        </TabsContent>

        <TabsContent
          value="singers"
          className="flex-1 overflow-y-auto mt-0"
        >
          <TabSingers
            playlist={allSongs}
            singers={singers}
            name={name}
            onLeaveParty={onLeaveParty}
            // --- THIS IS THE FIX: Removed the line below ---
            // partyHash={party.hash!}
          />
        </TabsContent>
        <TabsContent
          value="history"
          className="flex-1 overflow-y-auto mt-0"
        >
          <TabHistory playlist={playedPlaylist} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
