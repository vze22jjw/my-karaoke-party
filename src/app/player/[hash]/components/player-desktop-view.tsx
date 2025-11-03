"use client";

import type { KaraokeParty } from "party";
import { Button } from "~/components/ui/ui/button";
import { Maximize, Minimize } from "lucide-react";
import { Player } from "~/components/player";
import { EmptyPlayer } from "~/components/empty-player";
// --- FIX: Removed unused 'RefObject' import ---
import type { RefCallback } from "react"; 

// --- START: FIX ---
// Changed type from RefObject<HTMLDivElement> to React.RefCallback<HTMLDivElement>
// to match the type returned by the useFullscreen hook.
type Props = {
  playerRef: RefCallback<HTMLDivElement>; // <-- Corrected type
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  currentVideo: KaraokeParty["playlist"][number] | undefined;
  joinPartyUrl: string;
  onPlayerEnd: () => void;
};
// --- END: FIX ---

export function PlayerDesktopView({
  playerRef,
  onToggleFullscreen,
  isFullscreen,
  currentVideo,
  joinPartyUrl,
  onPlayerEnd,
}: Props) {
  return (
    <div className="hidden sm:block sm:w-full">
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
              key={currentVideo.id}
              video={currentVideo}
              joinPartyUrl={joinPartyUrl}
              isFullscreen={isFullscreen}
              onPlayerEnd={onPlayerEnd}
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
