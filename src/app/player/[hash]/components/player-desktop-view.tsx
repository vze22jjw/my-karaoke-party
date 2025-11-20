"use client";

import type { VideoInPlaylist } from "~/types/app-types"; 
import { Button } from "~/components/ui/ui/button";
import { Maximize, Minimize } from "lucide-react";
import { Player } from "~/components/player";
import { EmptyPlayer } from "~/components/empty-player";
import type { RefCallback } from "react"; 
import { PlayerDisabledView } from "~/components/player-disabled-view";
import { cn } from "~/lib/utils";

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
    // --- START FIX: Removed "hidden sm:block" responsive classes ---
    <div className="w-full h-screen"> 
    {/* --- END FIX --- */}
      <div className="flex h-full flex-col">
        <div className="relative h-full" ref={playerRef}>
          
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

          <Button
            onClick={onToggleFullscreen}
            variant="ghost"
            size="icon"
            // FIX: Increased bottom padding to bottom-20 to clear YouTube controls
            className={cn(
              "z-[100] bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm transition-all",
              isFullscreen 
                ? "fixed bottom-20 right-6" 
                : "absolute bottom-20 right-3"
            )}
            style={{ transform: "translate3d(0, 0, 0)" }}
          >
            {isFullscreen ? <Minimize /> : <Maximize />}
          </Button>

        </div>
      </div>
    </div>
  );
}
