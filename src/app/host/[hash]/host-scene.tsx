/* eslint-disable */
"use client";

import { useLocalStorage } from "@mantine/hooks";
import type { Party } from "@prisma/client";
import type { KaraokeParty, VideoInPlaylist } from "party";
import { useState, useRef } from "react";
import useSound from "use-sound";
import { useRouter } from "next/navigation";
import { HostControlPanel } from "./components/host-control-panel";
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
    isPlaying,
    // singers list is available, but host page doesn't show it
  } = usePartySocket(
    party.hash,
    initialData,
    "Host" // <-- Pass "Host" as the singerName
  );
  
  const useQueueRules = settings.orderByFairness;

  const handleToggleRules = async () => {
    // ... (function unchanged)
    const newRulesState = !useQueueRules;
    socketActions.toggleRules(newRulesState);
  };

  const removeSong = async (videoId: string) => {
    // ... (function unchanged)
    socketActions.removeSong(videoId);
  };

  const handleSkip = async () => {
    // ... (function unchanged)
    socketActions.markAsPlayed();
    socketActions.playbackPlay();
  };
  
  const handlePlay = () => {
    // ... (function unchanged)
    socketActions.playbackPlay();
  };
  
  const handlePause = () => {
    // ... (function unchanged)
    socketActions.playbackPause();
  };

  const handleCloseParty = () => {
    // ... (function unchanged)
    setIsConfirmingClose(true);
  };

  const confirmCloseParty = async () => {
    // ... (function unchanged)
    socketActions.closeParty();
    setIsConfirmingClose(false);
  };

  const cancelCloseParty = () => {
    // ... (function unchanged)
    setIsConfirmingClose(false);
  };

  return (
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
      isPlaying={isPlaying}
      onPlay={handlePlay}
      onPause={handlePause}
    />
  );
}
