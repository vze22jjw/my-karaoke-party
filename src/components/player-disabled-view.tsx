"use client";

import { type VideoInPlaylist } from "~/types/app-types";
import { Button } from "~/components/ui/ui/button";
import { MicVocal, SkipForward, Youtube } from "lucide-react"; 
import { decode } from "html-entities";
import { cn } from "~/lib/utils";
import { QrCode } from "./qr-code";
import { SongCountdownTimer } from "./song-countdown-timer";

type Props = {
  video: VideoInPlaylist;
  nextSong?: VideoInPlaylist; 
  joinPartyUrl: string;
  isFullscreen: boolean;
  onOpenYouTubeAndAutoSkip: () => void; 
  onSkip: () => void; 
  isSkipping: boolean; 
  remainingTime: number; 
};

export function PlayerDisabledView({
  video,
  nextSong, 
  joinPartyUrl,
  isFullscreen,
  onOpenYouTubeAndAutoSkip, 
  onSkip,
  isSkipping,
  remainingTime, 
}: Props) {

  return (
    <div
      className={cn(
        // --- THIS IS THE FIX ---
        // Changed p-4 to p-6 to match the EmptyPlayer padding
        "mx-auto flex h-full w-full flex-col items-center justify-between space-y-6 p-6 text-center overflow-hidden",
        // --- END THE FIX ---
        isFullscreen && "bg-gradient",
      )}
    >
      {/* Song Info */}
      <div>
        <h1 className="text-outline scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          {decode(video.title)}
        </h1>
        <h2 className="text-outline scroll-m-20 text-3xl font-bold tracking-tight lg:text-4xl">
          <MicVocal className="mr-2 inline text-primary" size={32} />
          {video.singerName}
          <MicVocal
            className="ml-2 inline scale-x-[-1] transform text-primary"
            size={32}
          />
        </h2>
      </div>
      
      {/* Playback Disabled Message */}
      <div className="space-y-4">
        <div className="rounded-lg border border-yellow-500/50 bg-yellow-900/30 p-4 mb-4">
          <h3 className="text-xl font-bold text-yellow-400 mb-2">
            🚫 Playback Disabled 🚫
          </h3>
          <p className="text-sm text-gray-300 mb-2">
            The host has disabled video playback in this window.
          </p>
        </div>
        
        {isSkipping ? (
          // If YES, show the "Next Singer" timer
          <div className="animate-in fade-in zoom-in rounded-lg border border-primary/50 bg-black/80 p-4 text-center shadow-lg">
            <h3 className="text-xl font-semibold text-white">
              {nextSong ? (
                <>
                  Next Singer: {nextSong.singerName} up in{" "}
                  <SongCountdownTimer
                    remainingTime={remainingTime}
                    className="text-white"
                  />
                </>
              ) : (
                "Queue is empty... go add a song!"
              )}
            </h3>
            {/* Also show the button here so it can be re-clicked */}
            <Button
              type="button"
              size="lg"
              className="w-fit self-center animate-in fade-in zoom-in bg-red-600 hover:bg-red-700 mt-4"
              onClick={onOpenYouTubeAndAutoSkip} 
            >
              <Youtube className="mr-2" size={24} />
              Re-open & Restart Timer
            </Button>
          </div>
        ) : (
          // If NO, show the "Open on YouTube" button
          <>
            <h3 className="text-2xl font-semibold tracking-tight animate-in fade-in zoom-in">
              Click the button to open on YouTube
            </h3>
            
            <Button
              type="button"
              size="lg"
              className="w-fit self-center animate-in fade-in zoom-in bg-red-600 hover:bg-red-700"
              onClick={onOpenYouTubeAndAutoSkip} 
            >
              <Youtube className="mr-2" size={24} />
              Open & Auto-Skip
            </Button>
          </>
        )}
        
        <div className="mt-4">
          <Button
            className="animate-in fade-in zoom-in"
            variant={"secondary"}
            type="button"
            onClick={onSkip} 
          >
            <SkipForward className="mr-2 h-5 w-5" />
            Skip Song
          </Button>
        </div>
      </div>

      {/* QR Code Footer */}
      <div className="relative flex w-full basis-1/4 items-end text-center">
        <QrCode url={joinPartyUrl} />
        <a
          href={joinPartyUrl}
          target="_blank"
          className="font-mono text-xl text-white pl-4 text-outline"
        >
          {joinPartyUrl.split("//")[1]}
        </a>
      </div>
    </div>
  );
}
