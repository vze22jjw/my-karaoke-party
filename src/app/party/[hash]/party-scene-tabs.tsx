/* eslint-disable */
"use client";

import type { Party } from "@prisma/client";
import type { KaraokeParty, VideoInPlaylist } from "party";
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
import { PartyTourModal } from "./components/party-tour-modal";
import Confetti from "react-canvas-confetti";
import { toast } from "sonner";
import { decode } from "html-entities";

const ACTIVE_TAB_KEY = "karaoke-party-active-tab";
const GUEST_TOUR_KEY = "has_seen_guest_tour_v1";

type InitialPartyData = {
  currentSong: VideoInPlaylist | null;
  unplayed: VideoInPlaylist[];
  played: VideoInPlaylist[];
  settings: KaraokeParty["settings"]; // This now includes spotifyPlaylistId
  currentSongStartedAt: Date | null;
  currentSongRemainingDuration: number | null;
  status: string;
  idleMessages: string[];
  themeSuggestions: string[];
};

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
    key: ACTIVE_TAB_KEY,
    defaultValue: "player",
  });

  // --- ADD THIS ---
  const [searchQuery, setSearchQuery] = useState("");
  // --- END ADD ---

  const [hasSeenTour, setHasSeenTour] = useLocalStorage({
    key: GUEST_TOUR_KEY,
    defaultValue: false,
  });
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // --- START: CONFETTI LOGIC ---
  const { width, height } = useViewportSize();
  const confettiRef = useRef<confetti.CreateTypes | null>(null);

  const onConfettiInit = useCallback((instance: confetti.CreateTypes | null) => {
    confettiRef.current = instance;
  }, []);

  const fireConfetti = useCallback(() => {
    if (confettiRef.current) {
      confettiRef.current({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 200,
      });
    }
  }, []);
  // --- END: CONFETTI LOGIC ---

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
    setTimeout(() => {
      fireConfetti();
    }, 300);
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
    settings, // <-- Get settings object from hook
  } = usePartySocket(party.hash!, initialData, name);

  useEffect(() => {
    const value = readLocalStorageValue({ key: "name" });
    if (!value) {
      router.push(`/join/${party.hash}`);
    }
  }, [router, party.hash]);

  const addSong = async (videoId: string, title: string, coverUrl: string) => {
    try {
      socketActions.sendHeartbeat();
      socketActions.addSong(videoId, title, coverUrl, name);

      // --- ADD TOAST NOTIFICATION ---
      toast.success("Song added to queue!", {
        description: decode(title),
      });
      // --- END ADD ---
    } catch (error) {
      console.error("Error adding song:", error);
      // --- IMPROVE TOAST ---
      toast.error("Error adding song", {
        description: "Please try again.",
      });
      // --- END IMPROVE ---
    }
  };

  // --- ADD THIS ---
  // This function is for *suggested* adds (from TabHistory)
  const handleSuggestionClick = (title: string, artist: string) => {
    const query = `${title} ${artist}`.trim();
    setSearchQuery(query);
    setActiveTab("add");
    toast.info(`Searching for "${query}"...`);
  };

  const handleSearchConsumed = () => {
    setSearchQuery("");
  };
  // --- END ADD ---

  const onLeaveParty = () => {
    router.push("/");
  };

  return (
    <div className="container mx-auto p-4 pb-4 h-screen flex flex-col">
      <PartyTourModal isOpen={isTourOpen} onClose={handleCloseTour} />

      {/* --- ADD CONFETTI COMPONENT --- */}
      <Confetti
        refConfetti={onConfettiInit}
        width={width}
        height={height}
        style={{
          position: "fixed",
          width: "100%",
          height: "100%",
          zIndex: 200,
          top: 0,
          left: 0,
          pointerEvents: "none", // Crucial
        }}
      />
      {/* --- END CONFETTI COMPONENT --- */}

      <div className="flex-shrink-0">
        <h1 className="text-outline scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl text-center uppercase">
          {party.name}
        </h1>
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
              ...unplayedPlaylist,
              ...(currentSong ? [currentSong] : []),
            ]} // Pass full playlist
            name={name}
            onVideoAdded={addSong}
            // --- ADD THESE PROPS ---
            initialSearchQuery={searchQuery}
            onSearchQueryConsumed={handleSearchConsumed}
            // --- END ADD ---
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
          />
        </TabsContent>
        <TabsContent value="history" className="flex-1 overflow-y-auto mt-0">
          <TabHistory
            themeSuggestions={themeSuggestions}
            // --- PASS THE PROP ---
            spotifyPlaylistId={settings.spotifyPlaylistId}
            // --- ADD THIS PROP ---
            onSuggestionClick={handleSuggestionClick}
            // --- END ADD ---
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
