"use client";

import type { KaraokeParty, VideoInPlaylist } from "party";
import { Button } from "~/components/ui/ui/button";
import { cn } from "~/lib/utils";
import { decode } from "html-entities";
import { X } from "lucide-react"; 
import Image from "next/image";
import { PlaybackControls } from "./playback-controls"; 

type Props = {
  currentSong: VideoInPlaylist | null;
  playlist: KaraokeParty["playlist"];
  onRemoveSong: (videoId: string) => void;
  onSkip: () => void;
  isSkipping: boolean; 
  isPlaying: boolean; 
  remainingTime: number; 
  onPlay: (currentTime?: number) => void;
  onPause: () => void;
};

export function TabPlaylist({
  currentSong,
  playlist,
  onRemoveSong,
  onSkip,
  isSkipping, 
  isPlaying, 
  remainingTime, 
  onPlay,
  onPause,
}: Props) {
  const nextVideos = [...(currentSong ? [currentSong] : []), ...playlist];

  if (!currentSong && nextVideos.length === 0) {
    return (
      <p className="text-muted-foreground text-sm p-4 text-center">
        No songs in queue.
      </p>
    );
  }

  // --- THIS IS THE FIX ---
  // Wrap the component in a full-height flex container
  return (
    <div className="flex flex-col h-full">
      {currentSong && (
        // Player controls are locked to the top (of this container)
        <div className="flex-shrink-0">
          <PlaybackControls
            currentSong={currentSong}
            isPlaying={isPlaying}
            onPlay={onPlay}
            onPause={onPause}
            onSkip={onSkip}
            remainingTime={remainingTime}
          />
        </div>
      )}

      {/* The list wrapper takes all remaining space and scrolls */}
      <div className="flex-1 overflow-y-auto space-y-2 pt-2">
        {nextVideos.map((video, index) => {
          
          // Only hide the first item if there is a currentSong playing
          const isNowPlaying = index === 0 && !!currentSong;

          return (
            <div
              key={video.id}
              className={cn(
                "flex items-stretch justify-between gap-2",
                isNowPlaying && "hidden" // Hide the first item (Now Playing)
              )}
            >
              <div className="flex-1 min-w-0 p-2 rounded-lg bg-muted/50 border border-border flex gap-2 items-center">
                <div className="relative w-16 aspect-video flex-shrink-0">
                  <Image
                    src={video.coverUrl}
                    fill={true}
                    className="rounded-md object-cover"
                    alt={video.title}
                    sizes="64px"
                  />
                </div>

                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-center gap-1 mb-1">
                    <span
                      className={cn(
                        "font-mono text-xs text-muted-foreground",
                      )}
                    >
                      #{index + 1}
                    </span>
                    <p className="font-medium text-xs truncate">
                      {decode(video.title)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground truncate">
                      {video.singerName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 flex w-10">
                <Button
                  size="icon"
                  className="h-full w-full p-2 rounded-lg bg-muted/50 border border-border text-red-500 hover:bg-gray-700"
                  onClick={() => onRemoveSong(video.id)}
                  disabled={isSkipping} 
                >
                  <span className="sr-only">Remove song</span>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
  // --- END THE FIX ---
}
