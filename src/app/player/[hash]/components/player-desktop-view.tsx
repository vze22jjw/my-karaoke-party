"use client";

import type { VideoInPlaylist } from "party"; 
import { Button } from "~/components/ui/ui/button";
import { Maximize, Minimize } from "lucide-react";
import { Player } from "~/components/player";
import { EmptyPlayer } from "~/components/empty-player";
import type { RefCallback } from "react"; 
import { PlayerDisabledView } from "~/components/player-disabled-view";

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
  isPlaybackDisabled: boolean;
  isSkipping: boolean;
  idleMessages: string[]; 
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
  isPlaybackDisabled,
  isSkipping,
  idleMessages, 
}: Props) {
  return (
    <div className="hidden sm:block sm:w-full h-screen"> 
      <div className="flex h-full flex-col">
        <div className="relative h-full" ref={playerRef}>
          
          {/* Content Rendered First */}
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
              idleMessages={idleMessages} 
            />
          )}

          {/* Fullscreen Toggle Button Rendered Last */}
          <Button
            onClick={onToggleFullscreen}
            variant="ghost"
            size="icon"
            // FIX: Added translate-z-0 (via style) to force new stacking context/layer over video
            // Increased z-index to z-[100]
            className="absolute bottom-6 right-3 z-[100] bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm"
            style={{ transform: "translate3d(0, 0, 0)" }}
          >
            {isFullscreen ? <Minimize /> : <Maximize />}
          </Button>

        </div>
      </div>
    </div>
  );
}
