/* eslint-disable */
"use client";

import { useLocalStorage } from "@mantine/hooks";
import type { Party } from "@prisma/client";
import type { KaraokeParty, VideoInPlaylist } from "party";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { HostControlPanel } from "./components/host-control-panel"; 
import { usePartySocket } from "~/hooks/use-party-socket";

// --- THIS IS THE FIX (Part 1) ---
// This type *must* match the type in page.tsx and the hook
type InitialPartyData = {
  currentSong: VideoInPlaylist | null;
  unplayed: VideoInPlaylist[];
  played: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
  currentSongStartedAt: Date | null;
  currentSongRemainingDuration: number | null;
};
// --- END THE FIX ---

type Props = {
  party: Party;
  initialData: InitialPartyData;
};

const MAX_SEARCH_RESULTS_KEY = "karaoke-max-results";

export function HostScene({ party, initialData }: Props) {
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

  if (!party.hash) {
    return <div>Error: Party hash is missing.</div>;
  }

  const { 
    currentSong, 
    unplayedPlaylist, 
    settings, 
    socketActions, 
    isConnected,
    isSkipping,
    isPlaying, // <-- GET isPlaying
    remainingTime // <-- GET remainingTime
  } = usePartySocket(
    party.hash,
    initialData, // <-- This now has the correct type
    "Host"
  );
  
  const useQueueRules = settings.orderByFairness;
  const disablePlayback = settings.disablePlayback ?? false; 
  
  const handleToggleRules = async () => {
    const newRulesState = !useQueueRules;
    socketActions.toggleRules(newRulesState);
  };

  const handleTogglePlayback = async () => { 
    const newPlaybackState = !disablePlayback;
    socketActions.togglePlayback(newPlaybackState);
  };

  const removeSong = async (videoId: string) => {
    socketActions.removeSong(videoId);
  };

  const handleSkip = async () => {
    if (isSkipping) return; 
    socketActions.startSkipTimer(); 
    socketActions.markAsPlayed();
    socketActions.playbackPause(); // Pause for next singer
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

  return (
    // This is the tablet-view wrapper
    <div className="flex min-h-screen w-full justify-center">
      <div className="w-full sm:max-w-md"> 
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
          disablePlayback={disablePlayback} 
          onTogglePlayback={handleTogglePlayback} 
          maxSearchResults={maxSearchResults}
          onSetMaxResults={setMaxSearchResults}
          onCloseParty={handleCloseParty}
          isConfirmingClose={isConfirmingClose || isSkipping} 
          onConfirmClose={confirmCloseParty} 
          onCancelClose={cancelCloseParty}
          isSkipping={isSkipping}
          isPlaying={isPlaying}
          remainingTime={remainingTime}
        />
      </div>
    </div>
  );
}
