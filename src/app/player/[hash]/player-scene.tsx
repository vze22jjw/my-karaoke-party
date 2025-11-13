/* eslint-disable */
"use client";

import { useFullscreen } from "@mantine/hooks";
import type { Party } from "@prisma/client";
import type { KaraokeParty, VideoInPlaylist } from "party";
import { useState, useEffect, useRef, useCallback } from "react"; 
import { getUrl } from "~/utils/url";
import { useRouter } from "next/navigation";
import { Player } from "~/components/player";
import { EmptyPlayer } from "~/components/empty-player";
import { usePartySocket } from "~/hooks/use-party-socket";
import { Button } from "~/components/ui/ui/button";
import { Maximize, Minimize } from "lucide-react";
import type { RefCallback } from "react"; 
import { PlayerDisabledView } from "~/components/player-disabled-view"; 
import { parseISO8601Duration } from "~/utils/string"; 
import { PlayerDesktopView } from "./components/player-desktop-view";
import { cn } from "~/lib/utils";

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
  const mobileScreen = useFullscreen();

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
        
        {/* DESKTOP VIEW */}
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
        
        {/* MOBILE VIEW */}
        <div 
          className="relative h-full sm:hidden" 
          ref={mobileScreen.ref as RefCallback<HTMLDivElement>}
        >
          {currentSong ? (
            isPlaybackDisabled ? (
              <PlayerDisabledView
                video={currentSong}
                nextSong={nextSong} 
                joinPartyUrl={joinPartyUrl}
                isFullscreen={mobileScreen.fullscreen}
                onOpenYouTubeAndAutoSkip={handleOpenYouTubeAndAutoSkip}
                onSkip={handleSkip} 
                isSkipping={isSkipping} 
                remainingTime={remainingTime} 
              />
            ) : ( 
              <Player
                video={currentSong}
                isFullscreen={mobileScreen.fullscreen}
                {...commonPlayerProps}
              />
            )
          ) : (
            <EmptyPlayer
              joinPartyUrl={joinPartyUrl}
              className={mobileScreen.fullscreen ? "bg-gradient" : ""}
              idleMessages={idleMessages}
            />
          )}

          <Button
            onClick={mobileScreen.toggle}
            variant="ghost"
            size="icon"
            // FIX: Changed to bottom-20 for safer touch area and to clear controls
            className={cn(
              "z-[100] bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm transition-all",
              mobileScreen.fullscreen 
                ? "fixed bottom-20 right-6" 
                : "absolute bottom-20 right-3"
            )}
          >
            {mobileScreen.fullscreen ? <Minimize /> : <Maximize />}
          </Button>
        </div>
        
      </div>
    </div>
  );
}
