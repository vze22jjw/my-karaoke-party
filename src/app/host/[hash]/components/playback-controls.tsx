"use client";

import { type VideoInPlaylist } from "party";
import { Button } from "~/components/ui/ui/button";
import { Play, Pause, SkipForward } from "lucide-react";
import { decode } from "html-entities";
// --- THIS IS THE FIX (Part 1) ---
// Import Image and SongCountdownTimer
import { SongCountdownTimer } from "~/components/song-countdown-timer";
import { cn } from "~/lib/utils";
import Image from "next/image";
// --- END THE FIX ---

type Props = {
  currentSong: VideoInPlaylist | null;
  isPlaying: boolean;
  onPlay: (currentTime?: number) => void;
  onPause: () => void;
  onSkip: () => void;
  remainingTime: number;
};

export function PlaybackControls({
  currentSong,
  isPlaying,
  onPlay,
  onPause,
  onSkip,
  remainingTime,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-4 border-t bg-card p-4">
      
      {/* --- THIS IS THE FIX (Part 2) --- */}
      {/* Add the thumbnail image */}
      {currentSong ? (
        <div className="relative w-12 flex-shrink-0 aspect-video">
          <Image
            src={currentSong.coverUrl}
            fill={true}
            className="rounded-md object-cover"
            alt={currentSong.title}
            sizes="48px"
          />
        </div>
      ) : (
        // Placeholder so layout doesn't jump
        <div className="w-12 flex-shrink-0 aspect-video bg-muted/50 rounded-md border border-border" />
      )}
      {/* --- END THE FIX --- */}

      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">
          {currentSong ? decode(currentSong.title) : "No song playing"}
        </p>
        <div className="flex items-center gap-2">
          <p className="truncate text-xs text-muted-foreground">
            {currentSong ? currentSong.singerName : "..."}
          </p>
          {currentSong && (
            <SongCountdownTimer
              remainingTime={remainingTime}
              className={cn(isPlaying ? "text-primary" : "text-muted-foreground")}
            />
          )}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={isPlaying ? onPause : () => onPlay()}
          disabled={!currentSong}
          className="h-12 w-12"
        >
          {isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSkip}
          disabled={!currentSong}
          className="h-12 w-12"
        >
          <SkipForward className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
