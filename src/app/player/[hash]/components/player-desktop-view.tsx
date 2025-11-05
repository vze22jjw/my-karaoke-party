"use client";

import type { KaraokeParty, VideoInPlaylist } from "party";
import { Button } from "~/components/ui/ui/button";
import { Maximize, Minimize } from "lucide-react";
import { Player } from "~/components/player";
import { EmptyPlayer } from "~/components/empty-player";
import type { RefCallback } from "react"; 

// --- THIS IS THE FIX ---
// The Props type definition must include all the new properties.
type Props = {
  playerRef: RefCallback<HTMLDivElement>;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  currentVideo: VideoInPlaylist | undefined;
  joinPartyUrl: string;
  onPlayerEnd: () => void;
  onSkip: () => void;
  forceAutoplay: boolean;
  onAutoplayed: () => void;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
};
// --- END THE FIX ---

export function PlayerDesktopView({
  playerRef,
  onToggleFullscreen,
  isFullscreen,
  currentVideo,
  joinPartyUrl,
  onPlayerEnd,
  onSkip,
  forceAutoplay,
  onAutoplayed,
  isPlaying,
  onPlay,
  onPause,
}: Props) {
  return (
    // This is hidden on mobile
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
              joinPartyUrl={joinPartyUrl}
              isFullscreen={isFullscreen}
              onPlayerEnd={onPlayerEnd}
              onSkip={onSkip}
              // --- These props will now be accepted ---
              forceAutoplay={forceAutoplay}
              onAutoplayed={onAutoplayed}
              isPlaying={isPlaying}
              onPlay={onPlay}
              onPause={onPause}
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
