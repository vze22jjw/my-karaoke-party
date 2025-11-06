"use client";

import type { KaraokeParty, VideoInPlaylist } from "party";
import { Button } from "~/components/ui/ui/button";
import { cn } from "~/lib/utils";
import { decode } from "html-entities";
import { SkipForward, X, Loader2 } from "lucide-react"; 
import Image from "next/image";
import { SongCountdownTimer } from "~/components/song-countdown-timer"; // <-- Import timer

type Props = {
  currentSong: VideoInPlaylist | null;
  playlist: KaraokeParty["playlist"];
  onRemoveSong: (videoId: string) => void;
  onSkip: () => void;
  isSkipping: boolean; 
  isPlaying: boolean; 
  remainingTime: number; 
};

export function TabPlaylist({
  currentSong,
  playlist,
  onRemoveSong,
  onSkip,
  isSkipping, 
  isPlaying, 
  remainingTime, 
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
          <div
            key={video.id}
            className="flex items-stretch justify-between gap-2"
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
                      isNowPlaying && "font-bold text-primary",
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
                  {/* --- THIS IS THE FIX (Req #3) --- */}
                  {isNowPlaying && (
                    <SongCountdownTimer
                      remainingTime={remainingTime}
                      className={cn(isPlaying ? "text-primary" : "text-muted-foreground")}
                    />
                  )}
                  {/* --- END THE FIX (Req #3) --- */}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 flex w-10">
              {isNowPlaying ? (
                <div className="flex flex-col gap-1 justify-center w-full">
                  <Button
                    size="icon"
                    className="h-8 w-full rounded-md bg-muted/50 border border-border text-yellow-300 hover:bg-gray-700"
                    onClick={() => onSkip()}
                    disabled={isSkipping} 
                  >
                    <span className="sr-only">Skip song</span>
                    {isSkipping ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <SkipForward className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    className="h-8 w-full rounded-md bg-muted/50 border border-border text-red-500 hover:bg-gray-700"
                    onClick={() => onRemoveSong(video.id)}
                    disabled={isSkipping} 
                  >
                    <span className="sr-only">Remove song</span>
                    {isSkipping ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  size="icon"
                  className="h-full w-full p-2 rounded-lg bg-muted/50 border border-border text-red-500 hover:bg-gray-700"
                  onClick={() => onRemoveSong(video.id)}
                  disabled={isSkipping} 
                >
                  <span className="sr-only">Remove song</span>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
