/* eslint-disable */
"use client";

import type { Party } from "@prisma/client";
import type { KaraokeParty } from "party";
import { useEffect, useState } from "react";
import { readLocalStorageValue, useLocalStorage } from "@mantine/hooks";
import { SongSearch } from "~/components/song-search";
import { Monitor, Music, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { PreviewPlayer } from "~/components/preview-player";
import { decode } from "html-entities";
import { toast } from "sonner";

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

  // Sort playlist according to:
  // 1) not-yet-sung first (playedAt === null)
  // 2) singer who has sung less frequently (played count ascending)
  // 3) singer with fewer total items in playlist (total count ascending)
  // 4) tie-break by id (stable-ish)
  const sortPlaylist = (pl: KaraokeParty["playlist"]) => {
    if (!pl || pl.length === 0) return pl;

    // Compute played counts and total counts per singer
    const playedCountBySinger: Record<string, number> = {};
    const totalCountBySinger: Record<string, number> = {};

    for (const v of pl) {
      const s = (v.singerName || ""); // normalize empty -> ""
      totalCountBySinger[s] = (totalCountBySinger[s] || 0) + 1;
      if (v.playedAt) {
        playedCountBySinger[s] = (playedCountBySinger[s] || 0) + 1;
      }
    }

    return [...pl].sort((a, b) => {
      // 1) not-yet-sung first
      const aPlayedFlag = a.playedAt ? 1 : 0;
      const bPlayedFlag = b.playedAt ? 1 : 0;
      if (aPlayedFlag !== bPlayedFlag) return aPlayedFlag - bPlayedFlag;

      const aSinger = a.singerName || "";
      const bSinger = b.singerName || "";

      // 2) singer who has sung less frequently (played count asc)
      const aPlayedCount = playedCountBySinger[aSinger] || 0;
      const bPlayedCount = playedCountBySinger[bSinger] || 0;
      if (aPlayedCount !== bPlayedCount) return aPlayedCount - bPlayedCount;

      // 3) singer with fewer total items in playlist (total count asc)
      const aTotal = totalCountBySinger[aSinger] || 0;
      const bTotal = totalCountBySinger[bSinger] || 0;
      if (aTotal !== bTotal) return aTotal - bTotal;

      // 4) final tie-breaker: id (lexicographic)
      return String(a.id).localeCompare(String(b.id));
    });
  };

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

  const togglePlayed = (participant: string) => {
    setShowPlayedMap((prev) => ({ ...prev, [participant]: !prev[participant] }));
  };

  useEffect(() => {
    const value = readLocalStorageValue({ key: "name" });

    if (!value) {
      router.push(`/join/${party.hash}`);
    } else {
      // Registrar participante na party
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

          // Mostrar toast para cada nuevo participante (exceto você mesmo)
          addedParticipants.forEach((participant) => {
            if (participant !== name) {
              toast.success(`🎤 ${participant} joined the party!`, {
                duration: 3000,
              });
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
  }, [party.hash, participants, name]);

  // Poll for playlist updates every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/playlist/${party.hash}`);
        if (response.ok) {
          const data = await response.json();
          // apply sorting on every fetch
          setPlaylist(sortPlaylist(data.playlist));
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

  const addSong = async (videoId: string, title: string, coverUrl: string) => {
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
          singerName: name,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add song");
      }

      // Reload playlist
      const playlistResponse = await fetch(`/api/playlist/${party.hash}`);
      const data = await playlistResponse.json();
      // apply sorting right after add
      setPlaylist(sortPlaylist(data.playlist));
    } catch (error) {
      console.error("Error adding song:", error);
      alert("Error adding song. Please try again.");
    }
  };

  const nextVideos = playlist.filter((video) => !video.playedAt);
  const playedVideos = playlist.filter((video) => video.playedAt);
  const nextVideo = nextVideos[0] ?? null;

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
                    // onEnded={handleNext}
                  />
                  <div className="mt-4">
                    <h3 className="text-md font-semibold mb-2">
                      Next in Queue ({nextVideos.length})
                    </h3>
                    <ul className="space-y-1">
                      {nextVideos.slice(0, 6).map((video) => (
                        <li
                          key={video.id}
                          className="text-sm text-muted-foreground truncate"
                        >
                          • {decode(video.title)}
                        </li>
                      ))}
                    </ul>
                    {nextVideos.length > 6 && (
                      <p className="text-sm text-muted-foreground mt-3 text-center">
                        And more {nextVideos.length - 6} song(s)...
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Waiting for the next song to be added...
                </p>
              )}
            </div>

            {/* Músicas já tocadas */}
            {playedVideos.length > 0 && (
              <div className="bg-card rounded-lg p-4 border opacity-75">
                <h3 className="text-md font-semibold mb-3">
                  Already Played ({playedVideos.length})
                </h3>
                <ul className="space-y-1">
                  {playedVideos.slice(-5).reverse().map((video) => (
                    <li
                      key={video.id}
                      className="text-sm text-muted-foreground truncate"
                    >
                      • {decode(video.title)}
                    </li>
                  ))}
                </ul>
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

                          {/* Toggle button for played songs */}
                          {playedSongs.length > 0 && (
                            <button
                              type="button"
                              onClick={() => togglePlayed(participant)}
                              className="text-xs px-2 py-1 border rounded hover:bg-muted transition-colors"
                            >
                              {showPlayed ? "Hide history" : `Show history (${playedSongs.length})`}
                            </button>
                          )}
                        </div>
                      </div>

                      {nextSongs.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            In Line: {nextSongs.length}
                          </p>
                          <ul className="space-y-1">
                            {nextSongs.slice(0, 3).map((song) => (
                              <li
                                key={song.id}
                                className="text-xs truncate pl-2"
                              >
                                • {decode(song.title)}
                              </li>
                            ))}
                            {nextSongs.length > 3 && (
                              <li className="text-xs text-muted-foreground pl-2">
                                + {nextSongs.length - 3} more...
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Played songs dropdown */}
                      {playedSongs.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground">
                              Already sang: {playedSongs.length}
                            </p>
                          </div>

                          {showPlayed && (
                            <ul className="space-y-1 mt-2">
                              {playedSongs
                                .slice(-10)
                                .reverse()
                                .map((song) => (
                                  <li
                                    key={song.id}
                                    className="text-xs truncate pl-2"
                                  >
                                    • {decode(song.title)}
                                  </li>
                                ))}
                            </ul>
                          )}
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
