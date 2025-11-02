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

// Removed reorder helper function

type Props = {
  party: Party;
  initialPlaylist: KaraokeParty;
};

export default function PlayerScene({ party, initialPlaylist }: Props) {
  const router = useRouter();
  const [playlist, setPlaylist] = useState<KaraokeParty["playlist"]>(
    initialPlaylist.playlist ?? [],
  );
  const [singers, setSingers] = useState<string[]>([]);
  // const [showSearch, setShowSearch] = useState(true); // <-- REMOVED

  // State for the new tabs
  const [activeTab, setActiveTab] = useLocalStorage({
    key: "karaoke-player-active-tab",
    defaultValue: "playlist",
  });

  const [useQueueRules, setUseQueueRules] = useLocalStorage({
    key: "karaoke-queue-rules",
    defaultValue: true, // Default to ON (Fairness)
  });

  const [playHorn] = useSound("/sounds/buzzer.mp3");
  const lastHornTimeRef = useRef<number>(0);

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
      {/* Hide/Show Button REMOVED */}

      {/* Left panel with queue list - Mobile Only */}
      <div
        className="w-full overflow-hidden border-r border-border sm:hidden"
      >
        {/* FIX: Changed the outer div to use flex-col h-full to manage vertical space */}
        <div className="flex flex-col h-full p-4 pt-14">
          {/* Fixed content area: flex-shrink-0 ensures it keeps its height */}
          <div className="flex-shrink-0">
            {/* Add party name at top - APPLIED RESPONSIVE FONT SIZE */}
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

            {/* --- Tab 1: Playlist Content --- */}
            <TabsContent
              value="playlist"
              className="flex-1 overflow-y-auto mt-0 space-y-2"
            >
              {nextVideos.length > 0 ? (
                nextVideos.map((video, index) => {
                  const isLocked = index === 0;

                  // Placeholder for Drag and Drop Item
                  return (
                    <div
                      key={video.id}
                      // Removed cn and drag-related classes (cursor-grab, hover:bg-muted)
                      className={
                        "p-2 rounded-lg bg-muted/50 border border-border flex gap-2 items-center"
                      }
                    >
                      {/* Thumbnail - reduced size */}
                      <div className="relative w-16 aspect-video flex-shrink-0">
                        <Image
                          src={video.coverUrl}
                          fill={true}
                          className="rounded-md object-cover"
                          alt={video.title}
                          sizes="64px"
                        />
                      </div>

                      {/* Song info and controls - improved truncation */}
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-center gap-1 mb-1">
                          <span
                            className={cn(
                              "font-mono text-xs text-muted-foreground",
                              isLocked && "font-bold text-primary",
                            )}
                          >
                            #{index + 1}
                          </span>
                          <p className="font-medium text-xs truncate">
                            {decode(video.title)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground truncate">
                            {video.singerName}
                          </p>
                          <div className="flex gap-1 flex-shrink-0">
                            {index === 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-yellow-300 hover:bg-gray-400"
                                onClick={() => markAsPlayed()}
                              >
                                <SkipForward className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-500 hover:bg-gray-400"
                              onClick={() => removeSong(video.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-muted-foreground text-sm">
                  No songs in queue
                </p>
              )}
            </TabsContent>

            {/* --- Tab 2: Settings Content --- */}
            <TabsContent
              value="settings"
              className="flex-1 overflow-y-auto mt-0 space-y-4"
            >
              {/* Queue Rules (Moved) */}
              <div className="flex-shrink-0">
                <h2 className="font-semibold text-lg mb-2">Controls</h2>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-primary-foreground/80">
                    Queue Rules
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {useQueueRules ? "ON (Fairness)" : "OFF (Manual)"}
                    </span>

                    {/* Slide Toggle Switch */}
                    <button
                      onClick={handleToggleRules}
                      aria-checked={useQueueRules}
                      role="switch"
                      className={cn(
                        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                        useQueueRules ? "bg-green-500" : "bg-red-500",
                      )}
                    >
                      <span className="sr-only">Toggle Queue Rules</span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          useQueueRules ? "translate-x-5" : "translate-x-0",
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Add Songs Link (Moved) */}
              <div className="flex-shrink-0">
                <h2 className="font-semibold text-lg mb-2">Add Songs</h2>
                <a
                  href={`/party/${party.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-primary hover:text-primary/80 font-medium text-sm"
                >
                  👉 Open Page to Add Songs
                </a>
              </div>

              {/* Close Party Button (New) */}
              <div className="flex-shrink-0 pt-4 border-t border-destructive/20">
                <h2 className="font-semibold text-lg mb-2 text-destructive">
                  Danger Zone
                </h2>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleCloseParty}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Close Party
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  This will permanently delete the party and its playlist for
                  everyone.
                </p>
              </div>
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
