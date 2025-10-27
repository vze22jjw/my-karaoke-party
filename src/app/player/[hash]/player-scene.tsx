/* eslint-disable */
"use client";

import { readLocalStorageValue, useFullscreen } from "@mantine/hooks";
import type { Party } from "@prisma/client";
import { ListPlus, Maximize, Minimize, SkipForward, X } from "lucide-react";
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

  const [playHorn] = useSound("/sounds/buzzer.mp3");
  const lastHornTimeRef = useRef<number>(0);

  // Poll for playlist updates every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/playlist/${party.hash}`);
        if (response.ok) {
          const data = await response.json();
          setPlaylist(data.playlist);
        }
      } catch (error) {
        console.error("Error fetching playlist:", error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [party.hash]);

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
    const heartbeatInterval = setInterval(async () => {
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
    }, 60000); // 60 seconds

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

      // Reload playlist
      const playlistResponse = await fetch(`/api/playlist/${party.hash}`);
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

      // Reload playlist
      const playlistResponse = await fetch(`/api/playlist/${party.hash}`);
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

        // Reload playlist
        const playlistResponse = await fetch(`/api/playlist/${party.hash}`);
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

  return (
    <div className="flex h-screen w-full flex-row flex-nowrap">
      <div className="grow-0 basis-1/3 overflow-y-auto border-r border-slate-500 px-4">
        <div className="py-4 space-y-4">
          <div className="text-center">
            <h1 className="text-outline scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
              {party.name}
            </h1>
          </div>
          <div className="flex justify-center">
            <ButtonHoverGradient
              onClick={handleCloseParty}
              type="button"
              className="bg-red-600"
            >
              Close Party ❌
            </ButtonHoverGradient>
          </div>
        </div>
        <SongSearch
          key={party.hash}
          playlist={playlist}
          onVideoAdded={addSong}
        />
      </div>
      <div className="grow-0 basis-2/3 overflow-auto">
        <div className="flex h-full flex-col">
          <div className="relative h-5/6" ref={ref}>
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
          <div className="h-1/6 min-h-[150px] border-t border-slate-500 p-4">
            {nextVideos.length > 0 ? (
              <>
                <div className="no-scrollbar flex h-full flex-row space-x-2 overflow-x-scroll">
                  {nextVideos.map((v, i) => (
                    <div
                      key={v.id}
                      className="relative flex aspect-[4/3] h-full items-center justify-center rounded-lg bg-slate-200 p-3 text-center text-primary-foreground animate-in slide-in-from-bottom first:border-2 first:border-amber-500"
                    >
                      <Image
                        src={v.coverUrl}
                        fill={true}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="rounded-lg hover:opacity-50"
                        alt="Cover"
                      />

                      <Button
                        variant="link"
                        size="icon"
                        className="absolute right-0 top-0 z-10 hover:bg-gray-400"
                        onClick={() => {
                          removeSong(v.id);
                        }}
                      >
                        <X color="red" />
                      </Button>

                      {i === 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute bottom-0 right-0 z-10 rounded text-yellow-300 hover:bg-gray-400"
                          onClick={() => {
                            markAsPlayed();
                          }}
                        >
                          <SkipForward />
                        </Button>
                      )}

                      {/* <div>{decode(v.title)}</div> */}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex aspect-[4/3] h-full items-center justify-center rounded-lg border-2 border-dashed border-slate-500 bg-slate-200 p-3 text-center text-slate-500">
                <ListPlus
                  size={32}
                  strokeWidth={1.5}
                  className="animate-bounce"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
