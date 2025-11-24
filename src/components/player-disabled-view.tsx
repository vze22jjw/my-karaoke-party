"use client";

import { type VideoInPlaylist } from "~/types/app-types";
import { decode } from "html-entities";
import { removeBracketedContent } from "~/utils/string";
import { ExternalLink, MicVocal, SkipForward } from "lucide-react";
import Image from "next/image";
import { PlayerQrCode } from "./player-qr-code"; 
import { Button } from "./ui/ui/button";
import logo from "~/assets/my-karaoke-party-logo.png";
import { SongCountdownTimer } from "./song-countdown-timer";

type Props = {
  video: VideoInPlaylist;
  nextSong: VideoInPlaylist | undefined;
  joinPartyUrl: string;
  isFullscreen: boolean;
  onOpenYouTubeAndAutoSkip: () => void;
  onSkip: () => void;
  isSkipping: boolean;
  remainingTime: number;
  message?: string;
};

export function PlayerDisabledView({
  video,
  nextSong,
  joinPartyUrl,
  onOpenYouTubeAndAutoSkip,
  onSkip,
  remainingTime,
  message = "Playback Is Disabled For This Party.",
}: Props) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-start bg-gradient text-white overflow-hidden p-6">
      
      <div className="absolute inset-0 flex h-full w-full items-center justify-center opacity-20 pointer-events-none select-none">
        <Image
          src={logo}
          alt="My Karaoke Party"
          priority
          className="w-[60%] object-contain opacity-50 blur-sm"
        />
      </div>

      {nextSong && (
        <div className="absolute top-8 right-8 z-20 animate-in fade-in slide-in-from-top-4 duration-700 pointer-events-none">
          <div className="rounded-xl bg-black/20 border border-white/10 p-4 backdrop-blur-md shadow-xl min-w-[200px]">
             <div className="text-right">
                <div className="text-xs font-bold text-white/90 mb-1">
                  <span className="text-primary mr-1">{nextSong.singerName}</span>
                  <span className="opacity-70 uppercase tracking-wider">Up Next In:</span>
                  <span className="ml-1 font-mono">
                    <SongCountdownTimer remainingTime={remainingTime} />
                  </span>
                </div>
                <p className="text-sm font-bold text-white leading-tight truncate max-w-[250px] ml-auto">
                  {decode(removeBracketedContent(nextSong.title))}
                </p>
             </div>
          </div>
        </div>
      )}

      <div className="z-10 flex flex-col items-center space-y-8 text-center animate-in fade-in zoom-in duration-500 max-w-5xl w-full mt-2">
        
        <div className="relative w-full max-w-[21rem] aspect-video rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
           <Image
             src={video.coverUrl}
             alt={video.title}
             fill
             className="object-cover"
           />
        </div>
        
        <div className="space-y-2 w-full">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-lg text-outline leading-tight">
            {decode(removeBracketedContent(video.title))}
          </h2>
          <div className="flex items-center justify-center gap-2 text-white/90 text-xl md:text-2xl font-medium text-shadow-sm">
            <MicVocal className="h-6 w-6" />
            <span>{video.singerName}</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 w-full">
          <p className="text-lg text-white/90 font-medium drop-shadow-md">
            {message}
          </p>

          <button
            onClick={onOpenYouTubeAndAutoSkip}
            className="group relative flex items-center gap-3 rounded-full bg-red-600 px-8 py-4 text-xl font-bold text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all hover:scale-105 hover:bg-red-700 hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] active:scale-95"
          >
            <ExternalLink className="h-6 w-6" />
            <span>Open on YouTube</span>
          </button>
        </div>
      </div>

      <PlayerQrCode joinPartyUrl={joinPartyUrl} className="bottom-20" />

      <div className="absolute bottom-20 right-24 z-30">
          <Button
            variant={"secondary"}
            size="default"
            className="shadow-xl border border-white/10 gap-2 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white"
            onClick={onSkip}
          >
            <SkipForward className="h-4 w-4" />
            Skip
          </Button>
      </div>
    </div>
  );
}
