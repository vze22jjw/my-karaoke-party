"use client";

import { type VideoInPlaylist } from "party";
import { Button } from "~/components/ui/ui/button";
import { MicVocal, SkipForward, Youtube } from "lucide-react";
import { decode } from "html-entities";
import { cn } from "~/lib/utils";
import { QrCode } from "./qr-code";

type Props = {
  video: VideoInPlaylist;
  joinPartyUrl: string;
  isFullscreen: boolean;
  onSkip: () => void;
};

export function PlayerDisabledView({
  video,
  joinPartyUrl,
  isFullscreen,
  onSkip,
}: Props) {
  const openYouTubeTab = () => {
    window.open(
      `https://www.youtube.com/watch?v=${video.id}#mykaraokeparty`,
      "_blank",
      "fullscreen=yes",
    );
    // Also skip the song in the party
    onSkip();
  };

  return (
    <div
      className={cn(
        "mx-auto flex h-full w-full flex-col items-center justify-between space-y-6 p-4 pb-1 text-center",
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
        
        <h3 className="text-2xl font-semibold tracking-tight animate-in fade-in zoom-in">
          Click the button to open on YouTube
        </h3>
        
        <Button
          type="button"
          size="lg"
          className="w-fit self-center animate-in fade-in zoom-in bg-red-600 hover:bg-red-700"
          onClick={openYouTubeTab}
        >
          <Youtube className="mr-2" size={24} />
          Open on YouTube
        </Button>
        
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
          className="font-mono text-xl text-white pl-4"
        >
          {joinPartyUrl.split("//")[1]}
        </a>
      </div>
    </div>
  );
}
