/* eslint-disable */
"use client";

import {
  useFullscreen,
  useLocalStorage,
} from "@mantine/hooks";
import type { Party } from "@prisma/client";
import type { KaraokeParty, VideoInPlaylist } from "party";
import { useState, useRef } from "react";
import useSound from "use-sound";
import { getUrl } from "~/utils/url";
import { useRouter } from "next/navigation";

import { HostControlPanel } from "./components/host-control-panel";
import { PlayerDesktopView } from "./components/player-desktop-view";
import { usePartySocket } from "~/hooks/use-party-socket";

type InitialPartyData = {
  currentSong: VideoInPlaylist | null;
  unplayed: VideoInPlaylist[];
  played: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
};

type Props = {
  party: Party;
  initialData: InitialPartyData;
};

const MAX_SEARCH_RESULTS_KEY = "karaoke-max-results";

export default function PlayerScene({ party, initialData }: Props) {
  const router = useRouter();
  
  const [isConfirmingClose, setIsConfirmingClose] = useState(false); 

  const [activeTab, setActiveTab] = useLocalStorage({
    key: "karaoke-player-active-tab",
    defaultValue: "playlist",
  });
  
  const [maxSearchResults, setMaxSearchResults] = useLocalStorage<number>({
    key: MAX_SEARCH_RESULTS_KEY,
    defaultValue: 10,
  });
  
  const [forceAutoplay, setForceAutoplay] = useState(false);

  const [playHorn] = useSound("/sounds/buzzer.mp3");
  const lastHornTimeRef = useRef<number>(0);

  if (!party.hash) {
    // --- THIS IS THE FIX ---
    return <div>Error: Party hash is missing.</div>;
    // --- END THE FIX ---
  }

  const { 
    currentSong, 
    unplayedPlaylist, 
    settings, 
    socketActions, 
    isConnected,
    isPlaying
  } = usePartySocket(
    party.hash,
    initialData,
  );
  
  const useQueueRules = settings.orderByFairness;
  
  const { ref, toggle, fullscreen } = useFullscreen();

  const handleToggleRules = async () => {
    const newRulesState = !useQueueRules;
    socketActions.toggleRules(newRulesState);
  };

  const removeSong = async (videoId: string) => {
    socketActions.removeSong(videoId);
  };

  const handlePlayerEnd = async () => {
    setForceAutoplay(false);
    socketActions.markAsPlayed();
  };

  const handleSkip = async () => {
    setForceAutoplay(true);
    socketActions.markAsPlayed();
  };
  
  const handlePlay = () => {
    socketActions.playbackPlay();
  };
  
  const handlePause = () => {
    socketActions.playbackPause();
  };

  const handleCloseParty = () => {
    setIsConfirmingClose(true);
  };

  const confirmCloseParty = async () => {
    socketActions.closeParty();
    setIsConfirmingClose(false);
  };

  const cancelCloseParty = () => {
    setIsConfirmingClose(false);
  };

  const joinPartyUrl = getUrl(`/join/${party.hash}`);

  return (
    <div className="flex h-screen w-full flex-col sm:flex-row sm:flex-nowrap">
      {/* --- This is the Mobile Controller View --- */}
      <HostControlPanel
        party={party}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentSong={currentSong}
        playlist={unplayedPlaylist}
        onRemoveSong={removeSong}
        onMarkAsPlayed={handleSkip}
        useQueueRules={useQueueRules} 
        onToggleRules={handleToggleRules} 
        maxSearchResults={maxSearchResults}
        onSetMaxResults={setMaxSearchResults}
        onCloseParty={handleCloseParty}
        isConfirmingClose={isConfirmingClose} 
        onConfirmClose={confirmCloseParty} 
        onCancelClose={cancelCloseParty}
        // --- REMOVED: isPlaying, onPlay, onPause props ---
      />
      
      {/* --- This is the Desktop Player View --- */}
      <PlayerDesktopView
        playerRef={ref}
        onToggleFullscreen={toggle}
        isFullscreen={fullscreen}
        currentVideo={currentSong ?? undefined}
        joinPartyUrl={joinPartyUrl}
        onPlayerEnd={handlePlayerEnd}
        onSkip={handleSkip} 
        forceAutoplay={forceAutoplay} 
        onAutoplayed={() => setForceAutoplay(false)}
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onPause={handlePause}
      />
    </div>
  );
}
