// my-karaoke-party/src/app/party/[hash]/party-scene-tabs.tsx
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

// Define the localStorage key
const QUEUE_RULES_KEY = "karaoke-queue-rules";
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

  const [singers, setSingers] = useState<string[]>(() => {
    if (initialPlaylist?.playlist) {
      const uniqueSingers = Array.from(
        new Set(initialPlaylist.playlist.map((item) => item.singerName)),
      ).filter(Boolean) as string[];
      return uniqueSingers;
    }
    return [];
  });

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
    } else {
      // 1. Registrar participante na party
      fetch("/api/party/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hash: party.hash,
          name: value,
        }),
      }).catch((error) => {
        console.error("Error joining party:", error);
      });

      // 2. Send an immediate heartbeat to keep party alive on mount/join
      void sendHeartbeat();
    }
  }, [router, party.hash]);

  // Poll for singers updates every 3 seconds
  useEffect(() => {
    const fetchSingers = async () => {
      try {
        const response = await fetch(`/api/party/participants/${party.hash}`);
        if (response.ok) {
          const data = await response.json();
          const newSingers = data.singers as string[];

          // Detectar novos participantes
          const previousSingers = singers;
          const addedSingers = newSingers.filter(
            (p) => !previousSingers.includes(p),
          );

          // Mostrar toast para cada novo participante (exceto você mesmo)
          addedSingers.forEach((singer) => {
            if (singer !== name) {
              // FIX: Add page refresh when a new person joins for all viewing clients
              router.refresh();
            }
          });

          setSingers(newSingers);
        }
      } catch (error) {
        console.error("Error fetching singers:", error);
      }
    };

    // Buscar imediatamente
    fetchSingers();

    // E depois a cada 3 segundos
    const interval = setInterval(fetchSingers, 3000);
    return () => clearInterval(interval);
  }, [party.hash, singers, name, router]); // Added router and singers to dependency array

  // Poll for playlist updates every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // FIX: Read useQueueRules directly from localStorage in the polling loop
        // This ensures synchronization with the host's toggle state
        const rulesEnabled = readLocalStorageValue({
          key: QUEUE_RULES_KEY,
          defaultValue: true,
        });

        const response = await fetch(
          `/api/playlist/${party.hash}?rules=${rulesEnabled ? "true" : "false"}`,
        );

        if (response.ok) {
          const data = await response.json();
          setPlaylist(data.playlist);
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

    // FIX: Removed useQueueRules from dependency array
    return () => clearInterval(interval);
  }, [party.hash, router]);

  // Send heartbeat every 60 seconds to keep party alive
  useEffect(() => {
    // Use the reusable function
    const heartbeatInterval = setInterval(sendHeartbeat, 60000); // 60 seconds

    return () => clearInterval(heartbeatInterval);
  }, [party.hash]);

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

      // Reload playlist - FIX: Read rules fresh from local storage
      const rulesEnabled = readLocalStorageValue({
        key: QUEUE_RULES_KEY,
        defaultValue: true,
      });
      const playlistResponse = await fetch(
        `/api/playlist/${party.hash}?rules=${rulesEnabled ? "true" : "false"}`,
      );

      const data = await playlistResponse.json();
      setPlaylist(data.playlist);
    } catch (error) {
      console.error("Error adding song:", error);
      alert("Error adding song. Please try again.");
    }
  };

  const onLeaveParty = () => {
    if (confirm("Are you sure you want to leave this party?")) {
      router.push("/");
    }
  };

  return (
    <div className="container mx-auto p-4 pb-4 h-screen flex flex-col">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-outline scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl uppercase">
          {party.name}
        </h1>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="player" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">Playing</span>
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            <span className="hidden sm:inline">Add Song</span>
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

        {/* Tab 1: Player View */}
        <TabsContent value="player" className="flex-1 overflow-auto mt-0">
          <TabPlayer playlist={playlist} />
        </TabsContent>

        {/* Tab 2: Search & Add Songs */}
        <TabsContent value="search" className="flex-1 overflow-auto mt-0">
          <TabAddSong
            playlist={playlist}
            name={name}
            onVideoAdded={addSong}
          />
        </TabsContent>

        {/* Tab 3: History */}
        <TabsContent value="history" className="flex-1 overflow-auto mt-0">
          <TabHistory playlist={playlist} />
        </TabsContent>

        {/* Tab 4: Singers */}
        <TabsContent value="singers" className="flex-1 overflow-auto mt-0">
          <TabSingers
            playlist={playlist}
            singers={singers}
            name={name}
            onLeaveParty={onLeaveParty}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}