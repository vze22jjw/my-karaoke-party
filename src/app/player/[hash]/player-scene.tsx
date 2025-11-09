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

// This type *must* match the type in page.tsx and the hook
type InitialPartyData = {
  currentSong: VideoInPlaylist | null;
  unplayed: VideoInPlaylist[];
  played: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
  currentSongStartedAt: Date | null;
  currentSongRemainingDuration: number | null;
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
    remainingTime 
  } = usePartySocket(
    party.hash,
    initialData, // <-- This now has the correct type
    "Player" 
  );
  
  const { ref, toggle, fullscreen } = useFullscreen();
  const nextSong = unplayedPlaylist[0];

  const doTheSkip = useCallback(() => {
    setForceAutoplay(false); 
    socketActions.markAsPlayed(); // This advances to the next song
    socketActions.playbackPause(); // This ensures the new song is paused
  }, [socketActions]);

  // This useEffect handles your requirement:
  // "Marked Song As played after timer is over"
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

  // This handles your requirement:
  // "Skip button should cancel the timer... and show next song..."
  const handleSkip = async () => {
    socketActions.startSkipTimer(); // Let other clients know (even if brief)
    doTheSkip(); // Immediately skip and pause
  };
  
  // This handles your requirement:
  // "open on youtube button should: open video... start countdown timer"
  const handleOpenYouTubeAndAutoSkip = () => {
    if (isSkipping || !currentSong) return; 

    // 1. Tell all clients we are in "skip mode"
    socketActions.startSkipTimer(); 
  
    const durationMs = parseISO8601Duration(currentSong.duration);
  
    if (durationMs && durationMs > 0) {
      // 2. Tell server to start playback, which starts the timer for everyone
      socketActions.playbackPlay(); 
    } else {
      console.log("Song has no duration, auto-skip timer will not start.");
    }
  
    // 3. Open the YouTube tab
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
    // --- THIS IS THE FIX (Part 1) ---
    onOpenYouTubeAndAutoSkip: handleOpenYouTubeAndAutoSkip,
    // --- END THE FIX ---
  };

  return (
    <div className="w-full h-screen"> 
      <div className="flex h-full flex-col">
        
        {/* Render Desktop View (hidden on mobile) */}
        <PlayerDesktopView
          playerRef={ref as RefCallback<HTMLDivElement>}
          onToggleFullscreen={toggle}
          currentVideo={currentSong ?? undefined} 
          {...commonPlayerProps} // <-- All props are passed
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
              {...commonPlayerProps} // <-- All props are passed
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
