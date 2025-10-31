// my-karaoke-party/src/app/party/[hash]/party-scene-tabs.tsx
/* eslint-disable */
"use client";

import type { Party } from "@prisma/client";
import type { KaraokeParty } from "party";
import { useEffect, useState } from "react";
// FIX: Removed unnecessary alias
import { readLocalStorageValue, useLocalStorage } from "@mantine/hooks"; 
import { SongSearch } from "~/components/song-search";
import { Monitor, Music, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { PreviewPlayer } from "~/components/preview-player";
import { decode } from "html-entities";
import { toast } from "sonner";

// Define the localStorage key
const QUEUE_RULES_KEY = 'karaoke-queue-rules';

export function PartyScene({
  party,
  initialPlaylist,
}: {
  party: Party;
  initialPlaylist?: KaraokeParty;
}) {
  const [name] = useLocalStorage<string>({ key: "name" });
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("player");

  const [playlist, setPlaylist] = useState<KaraokeParty["playlist"]>(
    initialPlaylist?.playlist ?? [],
  );
  
  // FIX: Removed the useLocalStorage hook for reading rules, will read manually in poll
  
  // Lista de participantes únicos (baseado em singerName)
  // Inicializar com participantes do initialPlaylist
  const [participants, setParticipants] = useState<string[]>(() => {
    if (initialPlaylist?.playlist) {
      const uniqueParticipants = Array.from(
        new Set(initialPlaylist.playlist.map((item) => item.singerName))
      ).filter(Boolean) as string[];
      return uniqueParticipants;
    }
    return [];
  });

  // Map to control per-participant "show played songs" toggle
  const [showPlayedMap, setShowPlayedMap] = useState<Record<string, boolean>>({});
  
  // NEW STATE: Toggle visibility for full queue lists
  const [showAllNextSongs, setShowAllNextSongs] = useState(false);
  const [showAllPlayedSongs, setShowAllPlayedSongs] = useState(false);


  const togglePlayed = (participant: string) => {
    setShowPlayedMap((prev) => ({ ...prev, [participant]: !prev[participant] }));
  };
  
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

          // Mostrar toast para cada novo participante (exceto você mesmo)
          addedParticipants.forEach((participant) => {
            if (participant !== name) {
              
              // FIX: Add page refresh when a new person joins for all viewing clients
              router.refresh(); 
            }
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
  }, [party.hash, participants, name, router]); // Added router to dependency array

  // Poll for playlist updates every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // FIX: Read useQueueRules directly from localStorage in the polling loop
        // This ensures synchronization with the host's toggle state
        const rulesEnabled = readLocalStorageValue({ key: QUEUE_RULES_KEY, defaultValue: true });
        
        const response = await fetch(`/api/playlist/${party.hash}?rules=${rulesEnabled ? 'true' : 'false'}`);
        
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
      const rulesEnabled = readLocalStorageValue({ key: QUEUE_RULES_KEY, defaultValue: true });
      const playlistResponse = await fetch(`/api/playlist/${party.hash}?rules=${rulesEnabled ? 'true' : 'false'}`);
      
      const data = await playlistResponse.json();
      setPlaylist(data.playlist);
    } catch (error) {
      console.error("Error adding song:", error);
      alert("Error adding song. Please try again.");
    }
  };

  const nextVideos = playlist.filter((video) => !video.playedAt);
  const playedVideos = playlist.filter((video) => video.playedAt);
  const nextVideo = nextVideos[0] ?? null;

  // Determine which subset of songs to show
  const songsToShowNext = showAllNextSongs ? nextVideos.slice(1) : nextVideos.slice(1, 6);
  const songsToShowPlayed = showAllPlayedSongs ? playedVideos.slice().reverse() : playedVideos.slice(-5).reverse();

  return (
    <div className="container mx-auto p-4 pb-4 h-screen flex flex-col">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-outline scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
          {party.name}
        </h1>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="player" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">Playing</span>
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            <span className="hidden sm:inline">To add</span>
          </TabsTrigger>
          <TabsTrigger value="participants" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Participants</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Player View */}
        <TabsContent value="player" className="flex-1 overflow-auto mt-0">
          <div className="space-y-4">
            {/* Preview do que está tocando */}
            <div className="bg-card rounded-lg p-4 border">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Playing Now
              </h2>
              {nextVideo ? (
                <>
                  <PreviewPlayer
                    videoId={nextVideo.id}
                    title={nextVideo.title}
                    thumbnail={nextVideo.coverUrl}
                  />
                  <div className="mt-3">
                    <p className="font-medium">{decode(nextVideo.title)}</p>
                    <p className="text-sm text-muted-foreground">
                      Singing: {nextVideo.singerName}
                    </p>
                  </div>
                </>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">
                    No songs queued
                  </p>
                </div>
              )}
            </div>

            {/* Próximas músicas */}
            {nextVideos.length > 1 && (
              <div className="bg-card rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-md font-semibold">
                      Next in Line ({nextVideos.length - 1})
                    </h3>
                    {nextVideos.length > 6 && ( // Only show toggle if more than 5 songs exist
                        <button
                            type="button"
                            onClick={() => setShowAllNextSongs(prev => !prev)}
                            className="text-xs px-2 py-1 border rounded hover:bg-muted transition-colors text-white"
                        >
                            {showAllNextSongs ? 'Hide Queue' : `Show All (${nextVideos.length - 1})`}
                        </button>
                    )}
                </div>
                <ul className="space-y-2">
                  {songsToShowNext.map((video, index) => (
                    <li
                      key={video.id}
                      className="flex items-start gap-3 p-2 rounded hover:bg-muted transition-colors"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                        {index + 2}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {decode(video.title)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {video.singerName}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                {!showAllNextSongs && nextVideos.length > 6 && (
                  <p className="text-sm text-muted-foreground mt-3 text-center">
                    And {nextVideos.length - 6} more song(s)...
                  </p>
                )}
              </div>
            )}

            {/* Músicas já tocadas */}
            {playedVideos.length > 0 && (
              <div className="bg-card rounded-lg p-4 border opacity-75">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-md font-semibold">
                      Already Played ({playedVideos.length})
                    </h3>
                    {playedVideos.length > 5 && ( // Only show toggle if more than 5 played songs exist
                        <button
                            type="button"
                            onClick={() => setShowAllPlayedSongs(prev => !prev)}
                            className="text-xs px-2 py-1 border rounded hover:bg-muted transition-colors text-white"
                        >
                            {showAllPlayedSongs ? 'Hide History' : `Show All (${playedVideos.length})`}
                        </button>
                    )}
                </div>
                <ul className="space-y-1">
                  {songsToShowPlayed.map((video) => (
                    <li
                      key={video.id}
                      className="text-sm text-muted-foreground truncate"
                    >
                      • {decode(video.title)}
                    </li>
                  ))}
                </ul>
                {!showAllPlayedSongs && playedVideos.length > 5 && (
                  <p className="text-sm text-muted-foreground mt-3 text-center">
                    And {playedVideos.length - 5} more song(s) in history...
                  </p>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Search & Add Songs */}
        <TabsContent value="search" className="flex-1 overflow-auto mt-0">
          <div className="space-y-4">
            <div className="bg-card rounded-lg p-4 border">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Music className="h-5 w-5" />
                Add Songs
              </h2>
              <SongSearch onVideoAdded={addSong} playlist={playlist} />
            </div>

            {/* Minhas músicas na fila */}
            {name && (
              <div className="bg-card rounded-lg p-4 border">
                <h3 className="text-md font-semibold mb-3">
                  My Queued Songs
                </h3>
                {(() => {
                  const mySongs = nextVideos.filter(
                    (v) => v.singerName === name
                  );
                  if (mySongs.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground">
                        You haven't added any songs yet.
                      </p>
                    );
                  }
                  return (
                    <ul className="space-y-2">
                      {mySongs.map((video) => (
                        <li
                          key={video.id}
                          className="p-2 rounded bg-muted text-sm"
                        >
                          {decode(video.title)}
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Participants */}
        <TabsContent value="participants" className="flex-1 overflow-auto mt-0">
          <div className="bg-card rounded-lg p-4 border">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participants ({participants.length})
            </h2>

            {participants.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No participants yet
              </p>
            ) : (
              <div className="space-y-3">
                {participants.map((participant) => {
                  const participantSongs = playlist.filter(
                    (v) => v.singerName === participant
                  );
                  const nextSongs = participantSongs.filter((v) => !v.playedAt);
                  const playedSongs = participantSongs.filter(
                    (v) => v.playedAt
                  );
                  const showPlayed = !!showPlayedMap[participant];

                  return (
                    <div
                      key={participant}
                      className="p-4 rounded-lg border bg-muted/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                            {participant.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold">{participant}</p>
                            <p className="text-xs text-muted-foreground">
                              {participantSongs.length} song(s)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {participant === name && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                              You
                            </span>
                          )}

                          {/* Toggle button for song history */}
                          {(playedSongs.length > 0 || nextSongs.length > 0) && (
                            <button
                              type="button"
                              onClick={() => togglePlayed(participant)}
                              className="text-xs px-2 py-1 border rounded hover:bg-muted transition-colors text-white"
                            >
                              {showPlayed ? "Hide Songs" : `Show All Songs (${participantSongs.length})`}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Show songs section */}
                      {showPlayed ? (
                        // Show all songs when expanded
                        <div className="mt-2 space-y-3">
                          {nextSongs.length > 0 && (
                            <div className="pt-2 border-t">
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                In Line: {nextSongs.length}
                              </p>
                              <ul className="space-y-1">
                                {nextSongs.map((song) => (
                                  <li
                                    key={song.id}
                                    className="text-xs truncate pl-2"
                                  >
                                    • {decode(song.title)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {playedSongs.length > 0 && (
                            <div className="pt-2 border-t">
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Already sang: {playedSongs.length}
                              </p>
                              <ul className="space-y-1">
                                {playedSongs.reverse().map((song) => (
                                  <li
                                    key={song.id}
                                    className="text-xs truncate pl-2 text-muted-foreground"
                                  >
                                    • {decode(song.title)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        // Show summary when collapsed
                        <div className="text-xs text-muted-foreground">
                          {nextSongs.length > 0 && `${nextSongs.length} in line`}
                          {nextSongs.length > 0 && playedSongs.length > 0 && ' • '}
                          {playedSongs.length > 0 && `${playedSongs.length} played`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
