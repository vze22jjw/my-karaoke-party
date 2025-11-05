"use client";

import type { KaraokeParty, VideoInPlaylist } from "party";
import { Button } from "~/components/ui/ui/button";
import { cn } from "~/lib/utils";
import { decode } from "html-entities";
import { SkipForward, X } from "lucide-react";
import Image from "next/image";

type Props = {
  currentSong: VideoInPlaylist | null;
  playlist: KaraokeParty["playlist"];
  onRemoveSong: (videoId: string) => void;
  onSkip: () => void; // <-- This is onMarkAsPlayed
};

export function TabPlaylist({
  currentSong,
  playlist,
  onRemoveSong,
  onSkip,
}: Props) {
  const nextVideos = [...(currentSong ? [currentSong] : []), ...playlist];

  if (nextVideos.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No songs in queue</p>
    );
  }

  return (
    <>
      {nextVideos.map((video, index) => {
        const isNowPlaying = index === 0;
        return (
          // --- THIS IS THE FIX ---
          // Main container: items-stretch to make children equal height
          <div
            key={video.id}
            className="flex items-stretch justify-between gap-2"
          >
            {/* Song Tile (takes up all available space) */}
            <div className="flex-1 min-w-0 p-2 rounded-lg bg-muted/50 border border-border flex gap-2 items-center">
              {/* Thumbnail */}
              <div className="relative w-16 aspect-video flex-shrink-0">
                <Image
                  src={video.coverUrl}
                  fill={true}
                  className="rounded-md object-cover"
                  alt={video.title}
                  sizes="64px"
                />
              </div>

              {/* Song Info */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-center gap-1 mb-1">
                  <span
                    className={cn(
                      "font-mono text-xs text-muted-foreground",
                      isNowPlaying && "font-bold text-primary",
                    )}
                  >
                    #{index + 1}
                  </span>
                  <p className="font-medium text-xs truncate">
                    {decode(video.title)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {video.singerName}
                </p>
              </div>
            </div>

            {/* Button Area: Fixed width and flex */}
            <div className="flex-shrink-0 flex w-10">
              {isNowPlaying ? (
                // Stacked buttons: Centered vertically
                <div className="flex flex-col gap-1 justify-center w-full">
                  <Button
                    size="icon"
                    className="h-8 w-full rounded-md bg-muted/50 border border-border text-yellow-300 hover:bg-gray-700"
                    onClick={() => onSkip()}
                  >
                    <span className="sr-only">Skip song</span>
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-8 w-full rounded-md bg-muted/50 border border-border text-red-500 hover:bg-gray-700"
                    onClick={() => onRemoveSong(video.id)}
                  >
                    <span className="sr-only">Remove song</span>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                // Single button: Stretches to full height
                <Button
                  size="icon"
                  className="h-full w-full p-2 rounded-lg bg-muted/50 border border-border text-red-500 hover:bg-gray-700"
                  onClick={() => onRemoveSong(video.id)}
                >
                  <span className="sr-only">Remove song</span>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {/* --- END THE FIX --- */}
          </div>
        );
      })}
    </>
  );
}
