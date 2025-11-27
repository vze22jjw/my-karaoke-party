"use client";

import type { VideoInPlaylist } from "~/types/app-types";
import { Button } from "~/components/ui/ui/button";
import { Play, Pause, SkipForward } from "lucide-react"; 
import { SongCountdownTimer } from "~/components/song-countdown-timer";
import { cn } from "~/lib/utils"; 
import { decode } from "html-entities";
import Image from "next/image";
import { type ReactNode } from "react";

type Props = {
  currentSong: VideoInPlaylist;
  isPlaying: boolean;
  remainingTime: number;
  onPlay: (currentTime?: number) => void;
  onPause: () => void;
  onSkip: () => void;
  extraAction?: ReactNode; 
};

export function PlaybackControls({
  currentSong,
  isPlaying,
  remainingTime,
  onPlay,
  onPause,
  onSkip,
  extraAction,
}: Props) {
  const handlePlayPause = () => {
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  };

  return (
    // CHANGED: Completely transparent container with no borders or shadows
    <div className="relative flex items-center justify-between gap-3 p-1 pt-0 bg-transparent border-none shadow-none"> 
      
      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md shadow-sm">
        <Image
          src={currentSong.coverUrl}
          alt={currentSong.title}
          fill
          className="object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="mb-1 flex items-center gap-2">
            <p className="truncate text-sm font-bold leading-none">
            {decode(currentSong.title)}
            </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <p className="truncate max-w-[100px]">{currentSong.singerName}</p>
          <span>•</span>
          <SongCountdownTimer
            remainingTime={remainingTime}
            className={cn("font-mono", remainingTime < 30 && "text-red-500 font-bold animate-pulse")}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full bg-background border-border/50 shadow-sm"
          onClick={handlePlayPause}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 pl-0.5" />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full bg-background border-border/50 shadow-sm"
          onClick={onSkip}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {extraAction && (
          <div className="absolute bottom-1 right-0 translate-y-1/2 translate-x-1/4">
              {extraAction}
          </div>
      )}
    </div>
  );
}
