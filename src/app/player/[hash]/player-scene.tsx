/* eslint-disable */
"use client";

import { readLocalStorageValue, useFullscreen } from "@mantine/hooks";
import type { Party } from "@prisma/client";
import { ListPlus, Maximize, Minimize, SkipForward, X, Eye, EyeOff, Scale } from "lucide-react";
import Image from "next/image";
import type { KaraokeParty } from "party";
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
  
  // New state for queue rules, defaults to true (active)
  const [useQueueRules, setUseQueueRules] = useState(true); 

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

  // Poll for playlist updates every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Pass useQueueRules as a query parameter
        const response = await fetch(`/api/playlist/${party.hash}?rules=${useQueueRules ? 'true' : 'false'}`);
        if (response.ok) {
          const data = await response.json();
          setPlaylist(data.playlist);
        }
      } catch (error) {
        console.error("Error fetching playlist:", error);
      }
    }, 3000);

    // Dependency: Include useQueueRules so the interval restarts when the rule setting changes
    return () => clearInterval(interval);
  }, [party.hash, useQueueRules]);

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
            toast.success(`🎤 ${participant} joined the party!`, {
              duration: 3000,
            });
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

  // Throttled horn function
  const playThrottledHorn = () => {
    const now = Date.now();
    const timeSinceLastHorn = now - lastHornTimeRef.current;

    if (timeSinceLastHorn >= 5000) { // 5 seconds in milliseconds
      toast.success("Someone sent a horn!");
      playHorn();
      lastHornTimeRef.current = now;
    } else {
      console.log(`Horn throttled. Try again in ${Math.ceil((5000 - timeSinceLastHorn) / 1000)} seconds.`);
    }
  };

  const { ref, toggle, fullscreen } = useFullscreen();

  const currentVideo = playlist.find((video) => !video.playedAt);
  const nextVideos = playlist.filter((video) => !video.playedAt);

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
      // setShowOpenInYouTubeButton(false);

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

  // Handler for the toggle button that sends an immediate heartbeat
  const handleToggleRules = () => {
    setUseQueueRules(prev => {
      // Send an immediate heartbeat on user interaction
      void sendHeartbeat(); 
      return !prev;
    });
  };

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

      {/* Left panel with queue list - reduced width to 1/6 */}
      <div 
        className={`
          w-full 
          sm:w-1/6 
          sm:transition-all sm:duration-300 
          overflow-hidden border-r border-border
          ${
            showSearch ? 'sm:opacity-100' : 'sm:w-0 sm:opacity-0'
          }
        `}
      >
        <div className="p-4 mt-14">
          {/* Add party name at top */}
          <h1 className="text-xl font-bold mb-4 truncate">
            {party.name}
          </h1>

          {/* New Queue Rules Toggle */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-primary-foreground/80">Queue Rules Enabled</span>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleToggleRules}
                aria-label={useQueueRules ? "Disable Round Robin" : "Enable Round Robin"}
            >
                {/* Red circle for OFF (false), Green circle for ON (true) */}
                <div 
                    className={`h-4 w-4 rounded-full transition-colors ${
                        useQueueRules ? 'bg-green-500' : 'bg-red-500'
                    }`}
                />
            </Button>
          </div>

          {/* Party page link */}
          <a 
            href={`/party/${party.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mb-6 text-primary hover:text-primary/80 font-medium text-sm"
          >
            👉 Add Songs
          </a>

          {/* Queue list with thumbnails */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Queue</h2>
            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              {nextVideos.length > 0 ? (
                nextVideos.map((video, index) => (
                  <div 
                    key={video.id}
                    className="p-2 rounded-lg bg-muted/50 border border-border flex gap-2 items-center"
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
                        <span className="font-mono text-xs text-muted-foreground">
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
                ))
              ) : (
                <p className="text-muted-foreground text-sm">
                  No songs in queue
                </p>
              )}
            </div>
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
