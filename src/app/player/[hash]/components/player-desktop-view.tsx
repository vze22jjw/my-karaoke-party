"use client";

import type { VideoInPlaylist } from "party"; 
import { Button } from "~/components/ui/ui/button";
import { Maximize, Minimize } from "lucide-react";
import { Player } from "~/components/player";
import { EmptyPlayer } from "~/components/empty-player";
import type { RefCallback } from "react"; 
import { PlayerDisabledView } from "~/components/player-disabled-view"; // <-- IMPORTED

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
  onPlay: (currentTime?: number) => void;
  onPause: () => void;
  remainingTime: number; 
  onOpenYouTubeAndAutoSkip: () => void;
  isPlaybackDisabled: boolean; // <-- ADDED PROP
  isSkipping: boolean; // <-- ADDED PROP
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
  isPlaybackDisabled, // <-- ADDED PROP
  isSkipping, // <-- ADDED PROP
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

          {/* === THIS IS THE FIX === */}
          {/* This logic now correctly prioritizes isPlaybackDisabled */}
          {currentVideo ? (
            isPlaybackDisabled ? (
              <PlayerDisabledView
                video={currentVideo}
                nextSong={nextSong}
                joinPartyUrl={joinPartyUrl}
                isFullscreen={isFullscreen}
                onOpenYouTubeAndAutoSkip={onOpenYouTubeAndAutoSkip}
                onSkip={onSkip}
                isSkipping={isSkipping}
                remainingTime={remainingTime}
              />
            ) : (
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
                onPlay={onPlay}
                onPause={onPause}
                remainingTime={remainingTime}
                onOpenYouTubeAndAutoSkip={onOpenYouTubeAndAutoSkip}
              />
            )
          ) : (
            <EmptyPlayer
              joinPartyUrl={joinPartyUrl}
              className={isFullscreen ? "bg-gradient" : ""}
            />
          )}
          {/* === END THE FIX === */}

        </div>
      </div>
    </div>
  );
}
