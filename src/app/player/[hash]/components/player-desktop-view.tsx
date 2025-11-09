"use client";

import type { VideoInPlaylist } from "party"; 
import { Button } from "~/components/ui/ui/button";
import { Maximize, Minimize } from "lucide-react";
import { Player } from "~/components/player";
import { EmptyPlayer } from "~/components/empty-player";
import type { RefCallback } from "react"; 

type Props = {
  playerRef: RefCallback<HTMLDivElement>;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  currentVideo: VideoInPlaylist | undefined;
  nextSong: VideoInPlaylist | undefined; 
  joinPartyUrl: string;
  onPlayerEnd: () => void;
  onSkip: () => void;
  forceAutoplay: boolean;
  onAutoplayed: () => void;
  isPlaying: boolean;
  // --- THIS IS THE FIX (Part 1) ---
  onPlay: (currentTime?: number) => void;
  // --- END THE FIX ---
  onPause: () => void;
  remainingTime: number; 
  onOpenYouTubeAndAutoSkip: () => void;
};

export function PlayerDesktopView({
  playerRef,
  onToggleFullscreen,
  isFullscreen,
  currentVideo,
  nextSong, 
  joinPartyUrl,
  onPlayerEnd,
  onSkip,
  forceAutoplay,
  onAutoplayed,
  isPlaying,
  onPlay,
  onPause,
  remainingTime, 
  onOpenYouTubeAndAutoSkip,
}: Props) {
  return (
    <div className="hidden sm:block sm:w-full h-screen"> 
      <div className="flex h-full flex-col">
        <div className="relative h-full" ref={playerRef}>
          <Button
            onClick={onToggleFullscreen}
            variant="ghost"
            size="icon"
            className="absolute bottom-0 right-3 z-10"
          >
            {isFullscreen ? <Minimize /> : <Maximize />}
          </Button>
          {currentVideo ? (
            <Player
              video={currentVideo}
              nextSong={nextSong}
              joinPartyUrl={joinPartyUrl}
              isFullscreen={isFullscreen}
              onPlayerEnd={onPlayerEnd}
              onSkip={onSkip}
              forceAutoplay={forceAutoplay}
              onAutoplayed={onAutoplayed}
              isPlaying={isPlaying}
              onPlay={onPlay} // <-- This now passes the new function
              onPause={onPause}
              remainingTime={remainingTime}
              onOpenYouTubeAndAutoSkip={onOpenYouTubeAndAutoSkip}
            />
          ) : (
            <EmptyPlayer
              joinPartyUrl={joinPartyUrl}
              className={isFullscreen ? "bg-gradient" : ""}
            />
          )}
        </div>
      </div>
    </div>
  );
}
