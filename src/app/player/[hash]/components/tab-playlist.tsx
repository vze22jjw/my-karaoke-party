"use client";

import type { KaraokeParty } from "party";
import { Button } from "~/components/ui/ui/button";
import { cn } from "~/lib/utils";
import { decode } from "html-entities";
import { SkipForward, X } from "lucide-react";
import Image from "next/image";

type Props = {
  playlist: KaraokeParty["playlist"];
  onRemoveSong: (videoId: string) => void;
  onMarkAsPlayed: () => void;
};

export function TabPlaylist({
  playlist,
  onRemoveSong,
  onMarkAsPlayed,
}: Props) {
  const nextVideos = playlist.filter((video) => !video.playedAt);

  if (nextVideos.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No songs in queue</p>
    );
  }

  return (
    <>
      {nextVideos.map((video, index) => {
        const isLocked = index === 0;
        return (
          <div
            key={video.id}
            className={
              "p-2 rounded-lg bg-muted/50 border border-border flex gap-2 items-center"
            }
          >
            {/* Thumbnail - reduced size */}
            <div className="relative w-16 aspect-video flex-shrink-0">
              <Image
                src={video.coverUrl}
                fill={true}
                className="rounded-md object-cover"
                alt={video.title}
                sizes="64px"
              />
            </div>

            {/* Song info and controls - improved truncation */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-center gap-1 mb-1">
                <span
                  className={cn(
                    "font-mono text-xs text-muted-foreground",
                    isLocked && "font-bold text-primary",
                  )}
                >
                  #{index + 1}
                </span>
                <p className="font-medium text-xs truncate">
                  {decode(video.title)}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground truncate">
                  {video.singerName}
                </p>
                <div className="flex gap-1 flex-shrink-0">
                  {index === 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-yellow-300 hover:bg-gray-400"
                      onClick={() => onMarkAsPlayed()}
                    >
                      <SkipForward className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:bg-gray-400"
                    onClick={() => onRemoveSong(video.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
