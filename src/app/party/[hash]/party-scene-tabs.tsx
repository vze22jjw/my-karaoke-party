/* eslint-disable */
"use client";

import type { Party } from "@prisma/client";
import type { InitialPartyData } from "~/types/app-types";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  readLocalStorageValue,
  useLocalStorage,
  useViewportSize,
} from "@mantine/hooks";
import { Monitor, Music, Users, Lightbulb, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TabPlayer } from "./components/tab-player";
import { TabAddSong } from "./components/tab-add-song";
import { TabHistory } from "./components/tab-history";
import { TabSingers } from "./components/tab-singers";
import { usePartySocket } from "~/hooks/use-party-socket";
import { toast } from "sonner";
import { decode } from "html-entities";
import { PartyTourModal } from "./components/party-tour-modal";
import Confetti from "react-canvas-confetti";
import { FitText } from "~/components/fit-text";

const MAX_QUEUE_PER_SINGER = 9;

export function PartySceneTabs({
  party,
  initialData,
}: {
  party: Party;
  initialData: InitialPartyData;
}) {
  const [name] = useLocalStorage<string>({ key: "name", defaultValue: "" });
  const router = useRouter();
  const [activeTab, setActiveTab] = useLocalStorage({
    key: "karaoke-party-active-tab",
    defaultValue: "player",
  });

  const [searchQuery, setSearchQuery] = useState("");

  const [hasSeenTour, setHasSeenTour] = useLocalStorage({
    key: "has_seen_guest_tour_v1",
    defaultValue: false,
  });
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const { width, height } = useViewportSize();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const confettiRef = useRef<any>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onConfettiInit = useCallback((instance: any) => {
    confettiRef.current = instance;
  }, []);

  const fireConfetti = useCallback(() => {
    let attempts = 0;
    const maxAttempts = 20; 

    const attemptFire = () => {
      if (confettiRef.current) {
        confettiRef.current({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          zIndex: 9999,
        });
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(attemptFire, 100);
      }
    };

    attemptFire();
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !hasSeenTour) {
      setIsTourOpen(true);
    }
  }, [isMounted, hasSeenTour]);

  const handleCloseTour = () => {
    setIsTourOpen(false);
    setHasSeenTour(true);
    setActiveTab("singers");
    setTimeout(() => {
      fireConfetti();
    }, 300);
  };

  const handleReplayTour = () => {
    setIsTourOpen(true);
  };

  const {
    currentSong,
    unplayedPlaylist,
    playedPlaylist,
    socketActions,
    participants,
    isPlaying,
    remainingTime,
    partyStatus,
    idleMessages,
    themeSuggestions,
    settings,
  } = usePartySocket(party.hash!, initialData, name);

  useEffect(() => {
    const value = readLocalStorageValue({ key: "name" });
    if (!value) {
      router.push(`/join/${party.hash}`);
    }
  }, [router, party.hash]);

  const myCurrentSongs = useMemo(() => {
    return unplayedPlaylist.filter(v => v.singerName === name && !v.playedAt);
  }, [unplayedPlaylist, name]);
  
  const hasReachedQueueLimit = useMemo(() => {
    return myCurrentSongs.length >= MAX_QUEUE_PER_SINGER;
  }, [myCurrentSongs.length]);

  const addSong = async (videoId: string, title: string, coverUrl: string) => {
    if (hasReachedQueueLimit) return;

    try {
      socketActions.sendHeartbeat();
      socketActions.addSong(videoId, title, coverUrl, name);
      toast.success("Song added to queue!", {
        description: decode(title),
      });
    } catch (error) {
      console.error("Error adding song:", error);
      toast.error("Error adding song", {
        description: "Please try again.",
      });
    }
  };

  const handleSuggestionClick = (title: string, artist: string) => {
    const query = `${title} ${artist}`.trim();
    setSearchQuery(query);
    setActiveTab("add");
  };

  const handleSearchConsumed = () => {
    setSearchQuery("");
  };

  const onLeaveParty = () => {
    router.push("/");
  };

  return (
    <div className="container mx-auto p-4 pb-4 h-screen flex flex-col">
      
      <Confetti
        refConfetti={onConfettiInit}
        width={width}
        height={height}
        style={{
          position: "fixed",
          width: "100%",
          height: "100%",
          zIndex: 9999,
          top: 0,
          left: 0,
          pointerEvents: "none",
        }}
      />

      {isTourOpen && (
        <PartyTourModal 
            isOpen={isTourOpen} 
            onClose={handleCloseTour} 
            onFireConfetti={fireConfetti}
        />
      )}

      <div className="flex-shrink-0">
        <FitText className="text-outline scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl text-center uppercase">
          {party.name}
        </FitText>
        {partyStatus === "OPEN" && (
          <p className="text-center text-green-400 font-medium animate-pulse">
            Party is OPEN (Waiting for host to start)
          </p>
        )}
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
            <span className="flex items-center gap-1">
              <Music className="h-4 w-4" />
              <Plus className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">Add</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <span className="hidden sm:inline">Suggestions</span>
          </TabsTrigger>
          <TabsTrigger value="singers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Singers</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="player" className="flex-1 overflow-y-auto mt-0">
          <TabPlayer
            currentSong={currentSong}
            playlist={unplayedPlaylist}
            playedPlaylist={playedPlaylist}
          />
        </TabsContent>

        <TabsContent value="add" className="flex-1 overflow-y-auto mt-0">
          <TabAddSong
            playlist={[
              ...(currentSong ? [currentSong] : []),
              ...unplayedPlaylist,
            ]}
            name={name}
            onVideoAdded={addSong}
            initialSearchQuery={searchQuery}
            onSearchQueryConsumed={handleSearchConsumed}
            hasReachedQueueLimit={hasReachedQueueLimit}
            maxQueuePerSinger={MAX_QUEUE_PER_SINGER}
          />
        </TabsContent>

        <TabsContent value="singers" className="flex-1 overflow-y-auto mt-0">
          <TabSingers
            currentSong={currentSong}
            unplayedPlaylist={unplayedPlaylist}
            playedPlaylist={playedPlaylist}
            participants={participants}
            name={name}
            onLeaveParty={onLeaveParty}
            isPlaying={isPlaying}
            remainingTime={remainingTime}
            onReplayTour={handleReplayTour}
          />
        </TabsContent>
        <TabsContent value="history" className="flex-1 overflow-y-auto mt-0">
          <TabHistory
            themeSuggestions={themeSuggestions}
            spotifyPlaylistId={settings.spotifyPlaylistId}
            onSuggestionClick={handleSuggestionClick}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
