"use client";

import { Button } from "~/components/ui/ui/button";
import { Play, Pause, SkipForward, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { SongCountdownTimer } from "./song-countdown-timer";

interface PlayerControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSkip: () => void;
  isSkipping: boolean;
  remainingTime: number;
  variant?: "default" | "minimal";
  className?: string;
}

export function PlayerControls({
  isPlaying,
  onPlay,
  onPause,
  onSkip,
  isSkipping,
  remainingTime,
  variant = "default",
  className,
}: PlayerControlsProps) {
  const showPlaybackControls = variant === "default";

  return (
    <div className={cn("flex w-full items-center justify-between gap-4", className)}>
      
      {/* Left Side: Timer */}
      <div className="flex items-center gap-4 min-w-[80px]">
        <SongCountdownTimer remainingTime={remainingTime} />
      </div>

      {/* Center: Playback Controls */}
      <div className="flex flex-1 items-center justify-center gap-4">
        {showPlaybackControls && (
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full border-2 bg-background/20 backdrop-blur-sm hover:bg-background/40"
            onClick={isPlaying ? onPause : onPlay}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 fill-current" />
            ) : (
              <Play className="h-6 w-6 fill-current ml-1" />
            )}
          </Button>
        )}
      </div>

      {/* Right Side: Skip Button */}
      <div className="flex items-center justify-end min-w-[80px]">
        <Button
          variant="secondary"
          size="default"
          onClick={onSkip}
          disabled={isSkipping}
          className={cn(
            "gap-2 transition-all font-semibold shadow-lg hover:scale-105 active:scale-95",
            isSkipping && "opacity-80 cursor-not-allowed"
          )}
        >
          {isSkipping ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Skipping...
            </>
          ) : (
            <>
              <SkipForward className="h-4 w-4" />
              Skip
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
