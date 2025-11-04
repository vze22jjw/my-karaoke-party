/* eslint-disable */
"use client";

import {
  readLocalStorageValue,
  useFullscreen,
  useLocalStorage,
} from "@mantine/hooks";
import type { Party } from "@prisma/client";
import type { KaraokeParty, VideoInPlaylist } from "party";
import { useState, useRef, useEffect } from "react";
import useSound from "use-sound";
import { getUrl } from "~/utils/url";
import { useRouter } from "next/navigation";

import { PlayerMobilePanel } from "./components/player-mobile-panel";
import { PlayerDesktopView } from "./components/player-desktop-view";
import { usePartySocket } from "~/hooks/use-party-socket";

type Props = {
  party: Party;
  initialPlaylist: KaraokeParty; // initialPlaylist is now just a fallback
};

const MAX_SEARCH_RESULTS_KEY = "karaoke-max-results";

export default function PlayerScene({ party, initialPlaylist }: Props) {
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

  const [playHorn] = useSound("/sounds/buzzer.mp3");
  const lastHornTimeRef = useRef<number>(0);

  if (!party.hash) {
    return <div>Error: Party hash is missing.</div>;
  }

  // --- UPDATED: Use new hook return values ---
  const { currentSong, unplayedPlaylist, settings, socketActions, isConnected } = usePartySocket(party.hash);
  const useQueueRules = settings.orderByFairness;
  
  const { ref, toggle, fullscreen } = useFullscreen();

  // --- REMOVED: No longer need to derive currentVideo ---
  // const currentVideo = unplayedPlaylist[0]; 

  const handleToggleRules = async () => {
    const newRulesState = !useQueueRules;
    socketActions.toggleRules(newRulesState);
  };

  const removeSong = async (videoId: string) => {
    socketActions.removeSong(videoId);
  };

  // --- UPDATED: Use currentSong from hook ---
  const markAsPlayed = async () => {
    if (currentSong) {
      socketActions.markAsPlayed(currentSong.id);
    }
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
      <PlayerMobilePanel
        party={party}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        // --- UPDATED: Pass new props ---
        currentSong={currentSong}
        playlist={unplayedPlaylist} // playlist prop now means "upcoming queue"
        onRemoveSong={removeSong}
        onMarkAsPlayed={markAsPlayed}
        useQueueRules={useQueueRules} 
        onToggleRules={handleToggleRules} 
        maxSearchResults={maxSearchResults}
        onSetMaxResults={setMaxSearchResults}
        onCloseParty={handleCloseParty}
        isConfirmingClose={isConfirmingClose} 
        onConfirmClose={confirmCloseParty} 
        onCancelClose={cancelCloseParty} 
      />

      <PlayerDesktopView
        playerRef={ref}
        onToggleFullscreen={toggle}
        isFullscreen={fullscreen}
        // --- THIS IS THE FIX ---
        currentVideo={currentSong ?? undefined} // Convert null to undefined
        // --- END THE FIX ---
        joinPartyUrl={joinPartyUrl}
        onPlayerEnd={markAsPlayed}
      />
    </div>
  );
}
