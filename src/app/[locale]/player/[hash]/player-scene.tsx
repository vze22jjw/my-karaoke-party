/* eslint-disable */
"use client";

import { useFullscreen } from "@mantine/hooks";
import type { Party } from "@prisma/client";
import type { KaraokeParty, VideoInPlaylist } from "~/types/app-types";
import { useState, useEffect, useRef, useCallback } from "react"; 
import { getUrl } from "~/utils/url";
import { useRouter } from "~/navigation";
import { usePartySocket } from "~/hooks/use-party-socket";
import type { RefCallback } from "react"; 
import { parseISO8601Duration } from "~/utils/string"; 
import { PlayerDesktopView } from "./components/player-desktop-view";
import { useTranslations } from "next-intl";

type InitialPartyData = {
  currentSong: VideoInPlaylist | null;
  unplayed: VideoInPlaylist[];
  played: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
  currentSongStartedAt: Date | null;
  currentSongRemainingDuration: number | null;
  currentSongErrorCode: string | null;
  currentSongOpenedOnYouTube: boolean;
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
  const t = useTranslations('player');
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
    currentSongErrorCode,
    currentSongOpenedOnYouTube,
    isSkipping, 
    remainingTime, 
    idleMessages,
    partyStatus
  } = usePartySocket(
    party.hash,
    initialData,
    "Player",
  );
  
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.error("Fullscreen error:", err));
    } else {
      document.exitFullscreen().catch((err) => console.error("Exit fullscreen error:", err));
    }
  }, []);

  const nextSong = unplayedPlaylist[0];

  const isIntermissionMode = partyStatus === "OPEN" && playedPlaylist.length > 0;

  let defaultMessage = "";

  if (partyStatus === "OPEN") {
    if (playedPlaylist.length === 0) {
        defaultMessage = t('startSoon');
    } else {
        defaultMessage = t('intermission');
    }
  } else {
    defaultMessage = t('callToAction');
  }

  const displayMessages = [defaultMessage, ...idleMessages];

  const doTheSkip = useCallback((status: "COMPLETED" | "SKIPPED" | "ERROR") => {
    setForceAutoplay(false); 
    socketActions.markAsPlayed(status);
  }, [socketActions]);

  const handlePlayerEnd = async () => {
    doTheSkip("COMPLETED"); 
  };

  const handleSkip = async () => {
    let status: "COMPLETED" | "SKIPPED" | "ERROR";
    if (isPlaybackDisabled) {
      status = currentSongOpenedOnYouTube ? "COMPLETED" : "SKIPPED";
    } else {
      status = currentSongErrorCode ? "ERROR" : "SKIPPED";
    }
    doTheSkip(status); 
  };
  
  const handleOpenYouTubeAndAutoSkip = () => {
    if (!currentSong) return; 
    if (!settings.disablePlayback && currentSongErrorCode) {
      // In-app error page: just open YouTube, song stays until host skips
      socketActions.openedOnYouTube();
    } else if (settings.disablePlayback) {
      // YouTube-open mode: record that we opened it, but do not skip
      socketActions.openedOnYouTube();
    }
    window.open(
      `https://www.youtube.com/watch?v=${currentSong.id}#mykaraokeparty`,
      "_blank",
      "fullscreen=yes",
    );
  };
  
  const handlePlay = (currentTime?: number, actualDuration?: number) => {
    socketActions.playbackPlay(currentTime, actualDuration); 
  };
  
  const handlePause = (currentTime?: number) => {
    socketActions.playbackPause(currentTime);
  };

  const joinPartyUrl = getUrl(`/join/${party.hash}`);
  const isPlaybackDisabled = settings.disablePlayback ?? false;

  const displayedVideo = isIntermissionMode ? undefined : (currentSong ?? undefined);

  const handlePlayerError = useCallback((errorCode: string) => {
    socketActions.playbackError(errorCode);
  }, [socketActions]);

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
    onPlayerError: handlePlayerError,
  };

  return (
    <div className="w-full h-screen"> 
      <div className="flex h-full flex-col">

        <PlayerDesktopView
          onToggleFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
          currentVideo={displayedVideo}
          isPlaybackDisabled={isPlaybackDisabled}
          currentSongErrorCode={currentSongErrorCode}
          isSkipping={isSkipping}          
          idleMessages={displayMessages} 
          {...commonPlayerProps}
        />
        
      </div>
    </div>
  );
}
