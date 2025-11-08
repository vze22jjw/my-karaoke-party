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
// --- THIS IS THE CORRECT IMPORT PATH ---
import { PlayerDesktopView } from "./components/player-desktop-view";

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

export default function PlayerScene({ party, initialData }: Props) {
  const router = useRouter();
  const [forceAutoplay, setForceAutoplay] = useState(false);
  
  const autoSkipTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    remainingTime 
  } = usePartySocket(
    party.hash,
    initialData,
    "Player" 
  );
  
  const { ref, toggle, fullscreen } = useFullscreen();
  const nextSong = unplayedPlaylist[0];

  const doTheSkip = useCallback(() => {
    if (autoSkipTimerRef.current) {
      clearTimeout(autoSkipTimerRef.current);
      autoSkipTimerRef.current = null;
    }
    setForceAutoplay(false); 
    socketActions.markAsPlayed(); // Advances playlist
    socketActions.playbackPause(); // Pauses for next singer
  }, [socketActions]);

  useEffect(() => {
    if (isSkipping && isPlaying && remainingTime <= 0) {
      const durationMs = parseISO8601Duration(currentSong?.duration);
      
      if (durationMs && durationMs > 0) {
        console.log("Auto-skip timer finished, skipping song.");
        doTheSkip();
      } else if (isPlaying) {
        console.log("Song has no duration, auto-skip disabled. Pausing timer.");
        socketActions.playbackPause();
      }
    }
  }, [isSkipping, isPlaying, remainingTime, currentSong, socketActions, doTheSkip]);


  useEffect(() => {
    return () => {
      if (autoSkipTimerRef.current) {
        clearTimeout(autoSkipTimerRef.current);
      }
    };
  }, []);

  const handlePlayerEnd = async () => {
    doTheSkip(); 
  };

  const handleSkip = async () => {
    socketActions.startSkipTimer(); 
    doTheSkip(); 
  };
  
  const handleOpenYouTubeAndAutoSkip = () => {
    if (isSkipping || !currentSong) return; 

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

  
  const handlePlay = () => {
    socketActions.playbackPlay();
  };
  
  const handlePause = () => {
    socketActions.playbackPause();
  };

  const joinPartyUrl = getUrl(`/join/${party.hash}`);
  
  const isPlaybackDisabled = settings.disablePlayback ?? false;

  const commonPlayerProps = {
    joinPartyUrl: joinPartyUrl,
    isFullscreen: fullscreen,
    onPlayerEnd: handlePlayerEnd,
    onSkip: handleSkip,
    forceAutoplay: forceAutoplay,
    onAutoplayed: () => setForceAutoplay(false),
    isPlaying: isPlaying,
    onPlay: handlePlay,
    onPause: handlePause,
    remainingTime: remainingTime,
    nextSong: nextSong,
  };

  return (
    <div className="w-full h-screen"> 
      <div className="flex h-full flex-col">
        
        {/* Render Desktop View (hidden on mobile) */}
        <PlayerDesktopView
          playerRef={ref as RefCallback<HTMLDivElement>}
          onToggleFullscreen={toggle}
          currentVideo={currentSong ?? undefined} 
          {...commonPlayerProps}
        />
        
        {/* Render Mobile View (hidden on desktop) */}
        <div className="relative h-full sm:hidden" ref={ref as RefCallback<HTMLDivElement>}>
          <Button
            onClick={toggle}
            variant="ghost"
            size="icon"
            className="absolute bottom-0 right-3 z-10"
          >
            {fullscreen ? <Minimize /> : <Maximize />}
          </Button>
          
          {isPlaybackDisabled && currentSong ? ( 
            <PlayerDisabledView
              video={currentSong}
              nextSong={nextSong} 
              joinPartyUrl={joinPartyUrl}
              isFullscreen={fullscreen}
              onOpenYouTubeAndAutoSkip={handleOpenYouTubeAndAutoSkip}
              onSkip={handleSkip} 
              isSkipping={isSkipping} 
              remainingTime={remainingTime} 
            />
          ) : currentSong ? ( 
            <Player
              video={currentSong}
              {...commonPlayerProps}
            />
          ) : (
            <EmptyPlayer
              joinPartyUrl={joinPartyUrl}
              className={fullscreen ? "bg-gradient" : ""}
            />
          )}
        </div>
        
      </div>
    </div>
  );
}
