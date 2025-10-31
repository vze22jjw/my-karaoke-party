/* eslint-disable */
"use client";

import { readLocalStorageValue, useFullscreen, useLocalStorage } from "@mantine/hooks";
import type { Party } from "@prisma/client";
import { ListPlus, Maximize, Minimize, SkipForward, X, Eye, EyeOff, Scale } from "lucide-react";
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
import { decode } from 'html-entities';
import { cn } from "~/lib/utils"; // Import cn for utility classes

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
  const [participants, setParticipants] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(true);
  
  const [useQueueRules, setUseQueueRules] = useLocalStorage({
    key: 'karaoke-queue-rules',
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
        const response = await fetch(`/api/playlist/${party.hash}?rules=${useQueueRules ? 'true' : 'false'}`);
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

  // Poll for participants updates every 3 seconds
  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const response = await fetch(`/api/party/participants/${party.hash}`);
        if (response.ok) {
          const data = await response.json();
          const newParticipants = data.participants as string[];

          // Detectar novos participantes
          const previousParticipants = participants;
          const addedParticipants = newParticipants.filter(
            (p) => !previousParticipants.includes(p)
          );

          // Mostrar toast para cada novo participante
          addedParticipants.forEach((participant) => {
            // REMOVED: toast.success(`🎤 ${participant} joined the party!`, { duration: 3000 });
          });

          setParticipants(newParticipants);
        }
      } catch (error) {
        console.error("Error fetching participants:", error);
      }
    };

    // Buscar imediatamente
    fetchParticipants();

    // E depois a cada 3 segundos
    const interval = setInterval(fetchParticipants, 3000);
    return () => clearInterval(interval);
  }, [party.hash, participants]);

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
        const response = await fetch(`/api/playlist/${party.hash}?rules=${newRulesState ? 'true' : 'false'}`);
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
      const playlistResponse = await fetch(`/api/playlist/${party.hash}?rules=${useQueueRules ? 'true' : 'false'}`);
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
      const playlistResponse = await fetch(`/api/playlist/${party.hash}?rules=${useQueueRules ? 'true' : 'false'}`);
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
        const playlistResponse = await fetch(`/api/playlist/${party.hash}?rules=${useQueueRules ? 'true' : 'false'}`);
        const data = await playlistResponse.json();
        setPlaylist(data.playlist);
      } catch (error) {
        console.error("Error marking as played:", error);
      }
    }
  };
  
  const handleCloseParty = async () => {
    if (!confirm("Are you sure you want to close this party? All data will be lost.")) {
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
      {/* Toggle button remains the same */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 bg-background/50 backdrop-blur-sm hidden sm:flex items-center justify-center"
        onClick={() => setShowSearch(prev => !prev)}
        aria-label={showSearch ? "Hide queue panel" : "Show queue panel"}
      >
        {showSearch ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>

      {/* Left panel with queue list - FIX APPLIED HERE */}
      <div 
        className={`
          w-full 
          sm:transition-all sm:duration-300 
          overflow-hidden border-r border-border
          ${
            showSearch 
              ? 'sm:w-1/6 sm:opacity-100' // Desktop Visible: Set width and opacity
              : 'sm:w-0 sm:opacity-0'     // Desktop Hidden: Collapse width and hide content
          }
        `}
      >
        {/* FIX: Changed the outer div to use flex-col h-full to manage vertical space */}
        <div className="flex flex-col h-full p-4 pt-14">
          
          {/* Fixed content area: flex-shrink-0 ensures it keeps its height */}
          <div className="flex-shrink-0">
            {/* Add party name at top - APPLIED RESPONSIVE FONT SIZE */}
            <h1 className="text-outline scroll-m-20 text-3xl sm:text-xl font-extrabold tracking-tight mb-4 truncate w-full text-center">
              {party.name}
            </h1>

            {/* New Queue Rules Toggle */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-primary-foreground/80">Queue Rules</span>
              <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                      {useQueueRules ? 'ON (Fairness)' : 'OFF (Manual)'}
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
            {/* Removed Drag & Drop related messages and simulation button */}


            {/* Party page link */}
            <a 
              href={`/party/${party.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mb-6 text-primary hover:text-primary/80 font-medium text-sm"
            >
              👉 Add Songs
            </a>
            
            <h2 className="font-semibold text-lg mb-2">Queue</h2>
          </div>

          {/* Scrollable song list container: flex-1 ensures it takes all remaining space */}
          <div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
            {nextVideos.length > 0 ? (
              nextVideos.map((video, index) => {
                  const isLocked = index === 0;

                  // Placeholder for Drag and Drop Item
                  return (
                      <div 
                          key={video.id}
                          // Removed cn and drag-related classes (cursor-grab, hover:bg-muted)
                          className={"p-2 rounded-lg bg-muted/50 border border-border flex gap-2 items-center"}
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
                                  <span className={cn(
                                      "font-mono text-xs text-muted-foreground",
                                      isLocked && 'font-bold text-primary'
                                  )}>
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
          </div>
        </div>
      </div>

      {/* Right panel with player - adjusted width */}
      <div 
        className={`
          hidden 
          sm:block 
          sm:w-5/6 
          sm:transition-all sm:duration-300 
          mt-14 
          ${
            showSearch ? '' : 'sm:w-full'
          }
        `}
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
