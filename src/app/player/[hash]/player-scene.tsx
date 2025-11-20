/* eslint-disable */
"use client";

import { useFullscreen } from "@mantine/hooks";
import type { Party } from "@prisma/client";
import type { KaraokeParty, VideoInPlaylist } from "~/types/app-types";
import { useState, useEffect, useRef, useCallback } from "react"; 
import { getUrl } from "~/utils/url";
import { useRouter } from "next/navigation";
// Player component is no longer directly used here
// EmptyPlayer is no longer directly used here
// Button, Maximize, Minimize, cn are no longer used here
import { usePartySocket } from "~/hooks/use-party-socket";
import type { RefCallback } from "react"; 
// PlayerDisabledView is no longer directly used here
import { parseISO8601Duration } from "~/utils/string"; 
import { PlayerDesktopView } from "./components/player-desktop-view";

type InitialPartyData = {
  currentSong: VideoInPlaylist | null;
  unplayed: VideoInPlaylist[];
  played: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
  currentSongStartedAt: Date | null;
  currentSongRemainingDuration: number | null;
  status: string;
  idleMessages: string[];
  themeSuggestions: string[];
};

type Props = {
  party: Party;
  initialData: InitialPartyData;
};

export default function PlayerScene({ party, initialData }: Props) {
  const router = useRouter();
  const [forceAutoplay, setForceAutoplay] = useState(false);
  
  if (!party.hash) {
    return <div>Error: Party hash is missing.</div>;
  }

  const { 
    currentSong, 
    unplayedPlaylist, 
    socketActions, 
    isPlaying,
    settings, 
    isSkipping, 
    remainingTime, 
    idleMessages 
  } = usePartySocket(
    party.hash,
    initialData,
    "Player" 
  );
  
  const desktopScreen = useFullscreen();
  // const mobileScreen = useFullscreen(); // --- FIX: REMOVED MOBILE FULLSCREEN ---

  const nextSong = unplayedPlaylist[0];

  const doTheSkip = useCallback(() => {
    setForceAutoplay(false); 
    socketActions.markAsPlayed();
    socketActions.playbackPause();
  }, [socketActions]);

  useEffect(() => {
    if (isSkipping && remainingTime <= 0) {
      const durationMs = parseISO8601Duration(currentSong?.duration);
      if (durationMs && durationMs > 0) {
        console.log("Auto-skip timer finished, skipping song.");
        doTheSkip(); 
      }
    }
  }, [isSkipping, remainingTime, currentSong, doTheSkip]);

  const handlePlayerEnd = async () => {
    doTheSkip(); 
  };

  const handleSkip = async () => {
    socketActions.startSkipTimer(); 
    doTheSkip(); 
  };
  
  const handleOpenYouTubeAndAutoSkip = () => {
    if (!currentSong) return; 

    socketActions.startSkipTimer(); 
  
    const durationMs = parseISO8601Duration(currentSong.duration);
  
    if (durationMs && durationMs > 0) {
      socketActions.playbackPlay(); 
    } else {
      console.log("Song has no duration, auto-skip timer will not start.");
    }
  
    window.open(
      `https://www.youtube.com/watch?v=${currentSong.id}#mykaraokeparty`,
      "_blank",
      "fullscreen=yes",
    );
  };

  
  const handlePlay = (currentTime?: number) => {
    socketActions.playbackPlay(currentTime); 
  };
  
  const handlePause = () => {
    socketActions.playbackPause();
  };

  const joinPartyUrl = getUrl(`/join/${party.hash}`);
  
  const isPlaybackDisabled = settings.disablePlayback ?? false;

  const commonPlayerProps = {
    joinPartyUrl: joinPartyUrl,
    onPlayerEnd: handlePlayerEnd,
    onSkip: handleSkip,
    forceAutoplay: forceAutoplay,
    onAutoplayed: () => setForceAutoplay(false),
    isPlaying: isPlaying,
    onPlay: handlePlay, 
    onPause: handlePause,
    remainingTime: remainingTime,
    nextSong: nextSong,
    onOpenYouTubeAndAutoSkip: handleOpenYouTubeAndAutoSkip,
  };

  return (
    <div className="w-full h-screen"> 
      <div className="flex h-full flex-col">
        
        {/* --- FIX: RENDER ONLY DESKTOP VIEW --- */}
        <PlayerDesktopView
          playerRef={desktopScreen.ref as RefCallback<HTMLDivElement>}
          onToggleFullscreen={desktopScreen.toggle}
          isFullscreen={desktopScreen.fullscreen}
          currentVideo={currentSong ?? undefined}
          isPlaybackDisabled={isPlaybackDisabled}
          isSkipping={isSkipping}
          idleMessages={idleMessages} 
          {...commonPlayerProps}
        />
        {/* --- FIX: ENTIRE MOBILE VIEW DIV REMOVED --- */}
        
      </div>
    </div>
  );
}
