/* eslint-disable */
"use client";

import { useFullscreen } from "@mantine/hooks";
import type { Party } from "@prisma/client";
import type { KaraokeParty, VideoInPlaylist } from "~/types/app-types";
import { useState, useEffect, useRef, useCallback } from "react"; 
import { getUrl } from "~/utils/url";
import { useRouter } from "next/navigation";
import { usePartySocket } from "~/hooks/use-party-socket";
import type { RefCallback } from "react"; 
import { parseISO8601Duration } from "~/utils/string"; 
import { PlayerDesktopView } from "./components/player-desktop-view";
import LoaderFull from "~/components/loader-full"; 

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
    playedPlaylist, 
    socketActions, 
    isPlaying,
    settings, 
    isSkipping, 
    remainingTime, 
    idleMessages,
    partyStatus
  } = usePartySocket(
    party.hash,
    initialData,
    "Player" 
  );
  
  const desktopScreen = useFullscreen();
  const nextSong = unplayedPlaylist[0];

  // Intermission Logic: If status is OPEN but we have played songs, we are in intermission.
  const isIntermissionMode = partyStatus === "OPEN" && playedPlaylist.length > 0;

  // State Detection & Message Logic
  let defaultMessage = "";

  if (partyStatus === "OPEN") {
    if (playedPlaylist.length === 0) {
        // 1. Before Party
        defaultMessage = "The Party Will Start In A Moment...";
    } else {
        // 2. Intermission
        defaultMessage = "Your Host Is Taking a Break...";
    }
  } else {
    // 3. Party is STARTED but queue is empty
    defaultMessage = "Got a Song? Let's Sing!";
  }

  const displayMessages = [defaultMessage, ...idleMessages];

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

  // Force EmptyPlayer if we are in "Intermission" mode (OPEN status)
  const displayedVideo = isIntermissionMode ? undefined : (currentSong ?? undefined);

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
        
        <PlayerDesktopView
          playerRef={desktopScreen.ref as RefCallback<HTMLDivElement>}
          onToggleFullscreen={desktopScreen.toggle}
          isFullscreen={desktopScreen.fullscreen}
          currentVideo={displayedVideo}
          isPlaybackDisabled={isPlaybackDisabled}
          isSkipping={isSkipping}
          
          // Pass the calculated messages
          idleMessages={displayMessages} 
          
          {...commonPlayerProps}
        />
        
      </div>
    </div>
  );
}
