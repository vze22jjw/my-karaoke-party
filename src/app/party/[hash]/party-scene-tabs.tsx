/* eslint-disable */
"use client";

import type { Party } from "@prisma/client";
import type { KaraokeParty } from "party";
import { useEffect, useState } from "react";
import { readLocalStorageValue, useLocalStorage } from "@mantine/hooks";
import { Monitor, Music, Users, History } from "lucide-react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TabPlayer } from "./components/tab-player";
import { TabAddSong } from "./components/tab-add-song";
import { TabHistory } from "./components/tab-history";
import { TabSingers } from "./components/tab-singers";

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

  const [playlist, setPlaylist] = useState<KaraokeParty["playlist"]>(
    initialPlaylist?.playlist ?? [],
  );

  const [orderByFairness, setOrderByFairness] = useState<boolean>(
    initialPlaylist?.settings.orderByFairness ?? true,
  );

  const [singers, setSingers] = useState<string[]>([]);

  // Reusable function to send heartbeat
  const sendHeartbeat = async () => {
    try {
      await fetch("/api/party/heartbeat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hash: party.hash }),
      });
    } catch (error) {
      console.error("Error sending heartbeat:", error);
    }
  };

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
        // --- START: FIX ---
        // Add { cache: 'no-store' } here as well
        const response = await fetch(`/api/party/participants/${party.hash}`, {
          cache: 'no-store',
        });
        // --- END: FIX ---

        if (response.ok) {
          const data = await response.json();
          setSingers(data.singers);

          // Auto-join/register singer if not in list
          if (name && data.singers && !data.singers.includes(name)) {
            await fetch("/api/party/join", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ hash: party.hash, name: name }),
            });
          }
        } else if (response.status === 404) {
          clearInterval(interval);
          alert("The party has been closed by the host.");
          router.push("/");
        }
      } catch (error) {
        console.error("Error fetching singers:", error);
      }
    }, 3000); // 3 seconds

    return () => clearInterval(interval);
  }, [party.hash, singers, name, router]); // Added router and singers to dependency array

  // Poll for playlist updates every 3 seconds
  // --- UPDATE POLLING EFFECT ---
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // --- START: FIX ---
        // Add { cache: 'no-store' } to prevent stale data
        const response = await fetch(
          `/api/playlist/${party.hash}`,
          { cache: 'no-store' } 
        );
        // --- END: FIX ---

        if (response.ok) {
          const data = await response.json();
          setPlaylist(data.playlist);
          setOrderByFairness(data.settings.orderByFairness);
        } else if (response.status === 404) {
          // Party was deleted
          clearInterval(interval);
          alert("The party has been closed by the host.");
          router.push("/");
        }
      } catch (error) {
        console.error("Error fetching playlist:", error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [party.hash, router]);

  // Send heartbeat every 60 seconds to keep party alive
  useEffect(() => {
    const heartbeatInterval = setInterval(async () => {
      void sendHeartbeat();
    }, 60000); // 60 seconds

    return () => clearInterval(heartbeatInterval);
  }, [party.hash]);

  // --- UPDATE addSong ---
  const addSong = async (videoId: string, title: string, coverUrl: string) => {
    try {
      // Send an immediate heartbeat before adding song
      void sendHeartbeat();

      // Use REST API
      const response = await fetch("/api/playlist/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partyHash: party.hash,
          videoId,
          title,
          coverUrl,
          singerName: name,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add song");
      }

      // Reload playlist
      // --- UPDATE PLAYLIST FETCH ---
      const playlistResponse = await fetch(
        `/api/playlist/${party.hash}`,
        // --- START: FIX ---
        // Also add no-store here to get immediate feedback after adding
        { cache: 'no-store' }
        // --- END: FIX ---
      );

      const data = await playlistResponse.json();
      setPlaylist(data.playlist);
      setOrderByFairness(data.settings.orderByFairness);
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
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-4 flex-shrink-0">
          <TabsTrigger value="player" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span className="sm:inline">Playing</span>
          </TabsTrigger>
          <TabsTrigger value="add" className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            <span className="sm:inline">Add</span>
          </TabsTrigger>
          <TabsTrigger value="singers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="sm:inline">Singers</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="sm:inline">History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="player"
          className="flex-1 overflow-y-auto mt-0"
        >
          <TabPlayer playlist={playlist} />
        </TabsContent>

        <TabsContent value="add" className="flex-1 overflow-y-auto mt-0">
          <TabAddSong
            playlist={playlist}
            name={name}
            onVideoAdded={addSong}
          />
        </TabsContent>

        <TabsContent
          value="singers"
          className="flex-1 overflow-y-auto mt-0"
        >
          <TabSingers
            playlist={playlist}
            singers={singers}
            name={name}
            onLeaveParty={onLeaveParty}
          />
        </TabsContent>
        <TabsContent
          value="history"
          className="flex-1 overflow-y-auto mt-0"
        >
          <TabHistory playlist={playlist} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
