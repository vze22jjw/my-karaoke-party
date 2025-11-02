/* eslint-disable */
"use client";

import {
  readLocalStorageValue,
  useFullscreen,
  useLocalStorage,
} from "@mantine/hooks";
import type { Party } from "@prisma/client";
import {
  ListPlus,
  Maximize,
  Minimize,
  SkipForward,
  X,
  Eye,
  EyeOff,
  Scale,
  ListMusic, // Added icon
  Settings, // Added icon
  AlertTriangle, // Added icon
  Search, // Added icon
} from "lucide-react";
import Image from "next/image";
import type { KaraokeParty, VideoInPlaylist } from "party";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import useSound from "use-sound";
import { EmptyPlayer } from "~/components/empty-player";
import { Player } from "~/components/player";
import { SongSearch } from "~/components/song-search";
import { Button } from "~/components/ui/ui/button";
import { ButtonHoverGradient } from "~/components/ui/ui/button-hover-gradient";
import { getUrl } from "~/utils/url";
import { useRouter } from "next/navigation";
import { decode } from "html-entities";
import { cn } from "~/lib/utils"; // Import cn for utility classes
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"; // Added tabs import

// --- Import new child components ---
import { TabPlaylist } from "./components/tab-playlist";
import { TabSettings } from "./components/tab-settings";

type Props = {
  party: Party;
  initialPlaylist: KaraokeParty;
};

const MAX_SEARCH_RESULTS_KEY = "karaoke-max-results";

export default function PlayerScene({ party, initialPlaylist }: Props) {
  const router = useRouter();
  const [playlist, setPlaylist] = useState<KaraokeParty["playlist"]>(
    initialPlaylist.playlist ?? [],
  );
  const [singers, setSingers] = useState<string[]>([]);

  // State for the new tabs
  const [activeTab, setActiveTab] = useLocalStorage({
    key: "karaoke-player-active-tab",
    defaultValue: "playlist",
  });

  const [useQueueRules, setUseQueueRules] = useLocalStorage({
    key: "karaoke-queue-rules",
    defaultValue: true, // Default to ON (Fairness)
  });

  const [maxSearchResults, setMaxSearchResults] = useLocalStorage<number>({
    key: MAX_SEARCH_RESULTS_KEY,
    defaultValue: 10,
  });

  const [playHorn] = useSound("/sounds/buzzer.mp3");
  const lastHornTimeRef = useRef<number>(0);

  // --- START: Compile Error Fix ---
  // This guard ensures that party.hash is treated as a string below.
  if (!party.hash) {
    // This should technically never be hit if the page loads,
    // but it satisfies TypeScript's type-checking.
    return <div>Error: Party hash is missing.</div>;
  }
  // --- END: Compile Error Fix ---

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

  // Function to process and set the new playlist from the server
  // Revert back to simple assignment as local reordering logic is removed
  const processAndSetPlaylist = (data: { playlist: VideoInPlaylist[] }) => {
    setPlaylist(data.playlist);
  };

  // Poll for playlist updates every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Pass useQueueRules as a query parameter
        const response = await fetch(
          `/api/playlist/${party.hash}?rules=${useQueueRules ? "true" : "false"}`,
        );
        if (response.ok) {
          const data = await response.json();
          processAndSetPlaylist(data);
        }
      } catch (error) {
        console.error("Error fetching playlist:", error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [party.hash, useQueueRules]); // useQueueRules is in dependency array for persistence

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

          // Mostrar toast para cada novo participante
          addedSingers.forEach((singer) => {
            // REMOVED: toast.success(`🎤 ${singer} joined the party!`, { duration: 3000 });
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
  }, [party.hash, singers]);

  // Send heartbeat every 60 seconds to keep party alive
  useEffect(() => {
    const heartbeatInterval = setInterval(sendHeartbeat, 60000); // 60 seconds

    return () => clearInterval(heartbeatInterval);
  }, [party.hash]);

  const { ref, toggle, fullscreen } = useFullscreen();

  const currentVideo = playlist.find((video) => !video.playedAt);
  const nextVideos = playlist.filter((video) => !video.playedAt);
  // Removed playedVideos = playlist.filter((video) => video.playedAt);

  // Handler for the toggle button that sends an immediate heartbeat and manages order
  const handleToggleRules = async () => {
    const newRulesState = !useQueueRules;
    setUseQueueRules(newRulesState); // useLocalStorage automatically saves to browser

    void sendHeartbeat();

    // Fetch the server's list immediately to reset the client list to the new sorting mode
    try {
      const response = await fetch(
        `/api/playlist/${party.hash}?rules=${newRulesState ? "true" : "false"}`,
      );
      if (response.ok) {
        const data = await response.json();
        setPlaylist(data.playlist);
      }
    } catch (error) {
      console.error("Error fetching playlist on toggle:", error);
    }
  };

  const addSong = async (videoId: string, title: string, coverUrl: string) => {
    const singerName = readLocalStorageValue({
      key: "name",
      defaultValue: "Host",
    });

    try {
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
          singerName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add song");
      }

      // Reload playlist, passing the rules state
      const playlistResponse = await fetch(
        `/api/playlist/${party.hash}?rules=${useQueueRules ? "true" : "false"}`,
      );
      const data = await playlistResponse.json();
      setPlaylist(data.playlist);
    } catch (error) {
      console.error("Error adding song:", error);
    }
  };

  const removeSong = async (videoId: string) => {
    try {
      // Use REST API
      const response = await fetch("/api/playlist/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partyHash: party.hash,
          videoId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove song");
      }

      // Reload playlist, passing the rules state
      const playlistResponse = await fetch(
        `/api/playlist/${party.hash}?rules=${useQueueRules ? "true" : "false"}`,
      );
      const data = await playlistResponse.json();
      setPlaylist(data.playlist);
    } catch (error) {
      console.error("Error removing song:", error);
    }
  };

  const markAsPlayed = async () => {
    if (currentVideo) {
      try {
        // Use REST API
        const response = await fetch("/api/playlist/played", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            partyHash: party.hash,
            videoId: currentVideo.id,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to mark as played");
        }

        // Reload playlist, passing the rules state
        const playlistResponse = await fetch(
          `/api/playlist/${party.hash}?rules=${useQueueRules ? "true" : "false"}`,
        );
        const data = await playlistResponse.json();
        setPlaylist(data.playlist);
      } catch (error) {
        console.error("Error marking as played:", error);
      }
    }
  };

  const handleCloseParty = async () => {
    if (
      !confirm(
        "Are you sure you want to close this party? All data will be lost.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/party/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hash: party.hash,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete party");
      }

      // Redirect to home page
      router.push("/");
    } catch (error) {
      console.error("Error closing party:", error);
      alert("Error closing the party. Please try again.");
    }
  };

  const joinPartyUrl = getUrl(`/join/${party.hash}`);

  // Removed isDraggable variable

  return (
    <div className="flex h-screen w-full flex-col sm:flex-row sm:flex-nowrap">
      {/* Left panel with queue list - Mobile Only */}
      <div
        className="w-full overflow-hidden border-r border-border sm:hidden"
      >
        <div className="flex flex-col h-full p-4 pt-14">
          {/* Fixed content area: flex-shrink-0 ensures it keeps its height */}
          <div className="flex-shrink-0">
            <h1 className="text-outline scroll-m-20 text-3xl sm:text-xl font-extrabold tracking-tight mb-4 truncate w-full text-center uppercase">
              {party.name}
            </h1>
          </div>

          {/* --- START: Tabs Component --- */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0">
              <TabsTrigger value="playlist" className="flex items-center gap-2">
                <ListMusic className="h-4 w-4" />
                <span className="inline">Playlist</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* --- Tab 1: Playlist Content (Refactored) --- */}
            <TabsContent
              value="playlist"
              className="flex-1 overflow-y-auto mt-0 space-y-2"
            >
              <TabPlaylist
                playlist={playlist}
                onRemoveSong={removeSong}
                onMarkAsPlayed={markAsPlayed}
              />
            </TabsContent>

            {/* --- Tab 2: Settings Content (Refactored) --- */}
            <TabsContent
              value="settings"
              className="flex-1 overflow-y-auto mt-0 space-y-6"
            >
              <TabSettings
                useQueueRules={useQueueRules}
                onToggleRules={handleToggleRules}
                partyHash={party.hash}
                maxSearchResults={maxSearchResults}
                onSetMaxResults={setMaxSearchResults}
                onCloseParty={handleCloseParty}
              />
            </TabsContent>
          </Tabs>
          {/* --- END: Tabs Component --- */}
        </div>
      </div>

      {/* Right panel with player - Desktop Only */}
      <div
        className="hidden sm:block sm:w-full"
      >
        <div className="flex h-full flex-col">
          <div className="relative h-full" ref={ref}>
            <Button
              onClick={toggle}
              variant="ghost"
              size="icon"
              className="absolute bottom-0 right-3 z-10"
            >
              {fullscreen ? <Minimize /> : <Maximize />}
            </Button>
            {currentVideo ? (
              <Player
                key={currentVideo.id}
                video={currentVideo}
                joinPartyUrl={joinPartyUrl}
                isFullscreen={fullscreen}
                onPlayerEnd={() => {
                  markAsPlayed();
                }}
              />
            ) : (
              <EmptyPlayer
                joinPartyUrl={joinPartyUrl}
                className={fullscreen ? "bg-gradient" : ""}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
