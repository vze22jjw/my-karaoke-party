"use client";

import { type VideoInPlaylist } from "party";
import { Button } from "~/components/ui/ui/button";
import { Play, Pause, SkipForward } from "lucide-react";
import { decode } from "html-entities";

type Props = {
  currentSong: VideoInPlaylist | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSkip: () => void;
};

export function PlaybackControls({
  currentSong,
  isPlaying,
  onPlay,
  onPause,
  onSkip,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-4 border-t bg-card p-4">
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">
          {currentSong ? decode(currentSong.title) : "No song playing"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {currentSong ? currentSong.singerName : "..."}
        </p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={isPlaying ? onPause : onPlay}
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
