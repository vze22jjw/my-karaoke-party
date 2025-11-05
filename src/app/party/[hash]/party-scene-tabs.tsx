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

type InitialPartyData = {
  currentSong: VideoInPlaylist | null;
  unplayed: VideoInPlaylist[];
  played: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
};

export function PartyScene({
  party,
  initialData,
}: {
  party: Party;
  initialData: InitialPartyData;
}) {
  const [name] = useLocalStorage<string>({ key: "name", defaultValue: "Guest" });
  const router = useRouter();
  const [activeTab, setActiveTab] = useLocalStorage({
    key: ACTIVE_TAB_KEY,
    defaultValue: "player",
  });

  const { 
    currentSong, 
    unplayedPlaylist, 
    playedPlaylist, 
    socketActions,
    singers // <-- Get singers list from hook
  } = usePartySocket(
    party.hash!,
    initialData,
    name // <-- Pass name to hook
  );
  
  // --- REMOVED: allSongs useMemo, it's no longer needed ---

  useEffect(() => {
    const value = readLocalStorageValue({ key: "name" });
    // Redirect if name is not set
    if (!value) {
      router.push(`/join/${party.hash}`);
    }
  }, [router, party.hash]);

  // --- REMOVED: useEffect poller for singers ---

  const addSong = async (videoId: string, title: string, coverUrl: string) => {
    try {
      socketActions.sendHeartbeat(); // Send heartbeat (which includes name)
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
          {/* --- THIS IS THE FIX --- */}
          <TabSingers
            currentSong={currentSong}
            unplayedPlaylist={unplayedPlaylist}
            playedPlaylist={playedPlaylist}
            singers={singers}
            name={name}
            onLeaveParty={onLeaveParty}
          />
          {/* --- END THE FIX --- */}
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
