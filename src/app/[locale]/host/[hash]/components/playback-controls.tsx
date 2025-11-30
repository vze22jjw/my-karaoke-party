"use client";

import type { VideoInPlaylist } from "~/types/app-types";
import { Button } from "~/components/ui/ui/button";
import { Play, Pause, SkipForward, ChevronDown } from "lucide-react"; 
import { SongCountdownTimer } from "~/components/song-countdown-timer";
import { cn } from "~/lib/utils"; 
import { decode } from "html-entities";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

type Props = {
  currentSong: VideoInPlaylist;
  isPlaying: boolean;
  remainingTime: number;
  onPlay: (currentTime?: number) => void;
  onPause: () => void;
  onSkip: () => void;
  isHistoryOpen: boolean;
  onToggleHistory: () => void;
};

export function PlaybackControls({
  currentSong,
  isPlaying,
  remainingTime,
  onPlay,
  onPause,
  onSkip,
  isHistoryOpen,
  onToggleHistory,
}: Props) {
  const tCommon = useTranslations('common');
  const [isMarqueeActive, setIsMarqueeActive] = useState(false);

  useEffect(() => {
    setIsMarqueeActive(false);
    const timer = setTimeout(() => setIsMarqueeActive(true), 50);
    return () => clearTimeout(timer);
  }, [currentSong.id]);


  const handlePlayPause = () => {
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  };

  return (
    <div className="w-full relative flex items-center gap-3 p-3 pb-6 rounded-2xl bg-card border border-border/50 shadow-sm transition-all overflow-hidden"> 
      
      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md shadow-sm border border-white/10">
        <Image
          src={currentSong.coverUrl}
          alt={currentSong.title}
          fill
          className="object-cover"
        />
        {isPlaying && (
            <div className="absolute inset-0 bg-black/30 flex items-end justify-center gap-[2px] pb-1">
                <div className="w-1 bg-primary/80 h-3 animate-[bounce_1s_infinite]" />
                <div className="w-1 bg-primary/80 h-5 animate-[bounce_1.2s_infinite]" />
                <div className="w-1 bg-primary/80 h-4 animate-[bounce_0.8s_infinite]" />
            </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 overflow-hidden">
        
        <div className="w-full overflow-hidden relative h-5">
            <div className={cn(
                "whitespace-nowrap absolute pr-8",
                isMarqueeActive && "animate-[marquee_10s_linear_infinite] hover:animate-none"
            )}>
                <p className="text-sm font-bold leading-tight">
                    {decode(currentSong.title)}
                </p>
            </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <p className="truncate max-w-[120px] text-primary font-medium">{currentSong.singerName}</p>
          <span className="text-border/60">•</span>
          <SongCountdownTimer
            remainingTime={remainingTime}
            className={cn("font-mono", remainingTime < 30 && "text-red-500 font-bold animate-pulse")}
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 pl-2">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full bg-background border-border shadow-sm hover:bg-accent"
          onClick={handlePlayPause}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : (
            <Play className="h-4 w-4 pl-0.5 fill-current" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
          onClick={onSkip}
        >
          <SkipForward className="h-5 w-5" />
        </Button>
      </div>
      <div className="absolute bottom-0 left-0 w-full flex justify-center">
          <button
            onClick={onToggleHistory}
            className="w-12 h-5 flex items-center justify-center bg-muted/20 hover:bg-muted/40 rounded-t-lg transition-colors focus:outline-none"
            title={tCommon('viewHistory')}
          >
            <ChevronDown 
                className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-300",
                    isHistoryOpen && "rotate-180"
                )} 
            />
          </button>
      </div>
    </div>
  );
}
