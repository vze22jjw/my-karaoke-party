/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { useRef, useState, useEffect } from "react";
import YouTube, { type YouTubeProps, type YouTubePlayer } from "react-youtube";
import { type VideoInPlaylist } from "~/types/app-types";
import { decode } from "html-entities";
import { cn } from "~/lib/utils";
import { Button } from "./ui/ui/button";
import { MicVocal, SkipForward } from "lucide-react";
import { Spinner } from "./ui/ui/spinner";
import { SongCountdownTimer } from "./song-countdown-timer";
import { PlayerQrCode } from "./player-qr-code"; 
import { PlayerDisabledView } from "./player-disabled-view"; // Import re-used view

type Props = {
  joinPartyUrl: string;
  video: VideoInPlaylist;
  nextSong?: VideoInPlaylist; 
  isFullscreen: boolean;
  onPlayerEnd: () => void; 
  onSkip: () => void;      
  forceAutoplay: boolean;
  onAutoplayed: () => void;
  isPlaying: boolean;
  onPlay: (currentTime?: number) => void;
  onPause: () => void;
  remainingTime: number; 
  onOpenYouTubeAndAutoSkip: () => void;
};

export function Player({
  joinPartyUrl,
  video,
  nextSong, 
  isFullscreen = false,
  onPlayerEnd,
  onSkip,
  forceAutoplay,
  onAutoplayed,
  isPlaying,
  onPlay,
  onPause,
  remainingTime, 
  onOpenYouTubeAndAutoSkip,
}: Props) {
  const playerRef = useRef<YouTubePlayer>(null);
  const [isReady, setIsReady] = useState(false);
  const [showOpenInYouTubeButton, setShowOpenInYouTubeButton] = useState(false);
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);

  useEffect(() => {
    setIsReady(false);
    setShowOpenInYouTubeButton(false);
  }, [video.id]);

  useEffect(() => {
    if (!playerRef.current || !isReady) return;
    
    try {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch (error) {
      console.error("Failed to control player:", error);
    }
  }, [isPlaying, isReady]);

  const opts: YouTubeProps["opts"] = {
    playerVars: {
      start: 0,
      autoplay: 0, 
      rel: 0,
      controls: 1,
      origin: typeof window !== "undefined" ? window.location.origin : "",
    },
  };

  const onPlayerReady: YouTubeProps["onReady"] = (event) => {
    console.log("Player ready", { event });
    playerRef.current = event.target;
    const playerState = event.target.getPlayerState();
    if (playerState !== -1) {
      setIsReady(true);
      if (forceAutoplay) {
        event.target.playVideo();
        onAutoplayed(); 
      } else {
        event.target.pauseVideo();
      }
    }
  };

  const onPlayerPlay: YouTubeProps["onPlay"] = (event) => {
    console.log("handlePlay (from player)");
    setInternalIsPlaying(true);
    if (!isPlaying) { 
      const currentTime = event.target.getCurrentTime() as number;
      onPlay(Math.floor(currentTime)); 
    }
  };

  const onPlayerPause: YouTubeProps["onPause"] = (_event) => {
    console.log("handlePause (from player)");
    setInternalIsPlaying(false);
    if (isPlaying) { 
      onPause();
    }
  };

  const onPlayerError: YouTubeProps["onError"] = (event) => {
    console.log("Player error, showing 'Open on YouTube' button", { event });
    setShowOpenInYouTubeButton(true);
  };

  // --- VIEW 1: PLAYBACK ERROR (Now reuses PlayerDisabledView) ---
  if (showOpenInYouTubeButton) {
    return (
      <PlayerDisabledView
        video={video}
        nextSong={nextSong}
        joinPartyUrl={joinPartyUrl}
        isFullscreen={isFullscreen}
        onOpenYouTubeAndAutoSkip={onOpenYouTubeAndAutoSkip}
        onSkip={onSkip}
        remainingTime={remainingTime}
        isSkipping={false} // 'Player' doesn't track skipping state locally for this view
        message="This video cannot be played inside the app."
      />
    );
  }

  // --- VIEW 2: ACTIVE PLAYER ---
  return (
    <div className="relative z-0 h-full bg-black">
      <YouTube
        key={video.id}
        loading="eager"
        className={`h-full w-full animate-in fade-in ${
          isReady ? "visible" : "invisible"
        }`}
        iframeClassName="w-full h-full"
        videoId={video.id}
        opts={opts}
        onPlay={onPlayerPlay}
        onReady={onPlayerReady}
        onPause={onPlayerPause}
        onError={onPlayerError}
        onEnd={() => {
          onPlayerEnd();
        }}
      />
      
      {/* Overlay: Song Info (Only shows when NOT ready/buffering) */}
      <div
        className={cn(
          "absolute top-0 w-full text-center animate-in fade-in zoom-in pointer-events-none",
          isReady ? "hidden" : "block"
        )}
      >
        <div className="flex w-full flex-col items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <h1 className="text-outline scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl text-white">
            {decode(video.title)}
          </h1>
          <h2 className="text-outline mt-2 scroll-m-20 text-3xl font-bold tracking-tight lg:text-4xl text-white flex items-center gap-3">
            <MicVocal className="text-primary" size={32} />
            {video.singerName}
          </h2>
        </div>

        {!isReady && (
          <div className="mt-20">
            <Spinner size={"large"} />
          </div>
        )}
      </div>

      {/* Overlay: Next Singer */}
      {isReady && !isPlaying && nextSong && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <div className="animate-in fade-in zoom-in rounded-xl border border-primary/50 bg-black/90 p-6 text-center shadow-2xl backdrop-blur-md">
            <h3 className="text-2xl font-bold text-white mb-2">
              Next Up: <span className="text-primary">{nextSong.singerName}</span>
            </h3>
            <div className="text-white/70 text-sm font-mono">
               Starting in <SongCountdownTimer remainingTime={remainingTime} className="text-white font-bold text-lg" />
            </div>
          </div>
        </div>
      )}

      {/* Overlay: Controls */}
      <div className={cn(
         "transition-opacity duration-500",
         internalIsPlaying && isFullscreen ? "opacity-0 hover:opacity-100" : "opacity-100"
      )}>
         <PlayerQrCode joinPartyUrl={joinPartyUrl} className="static bottom-auto left-auto animate-none absolute bottom-20 left-8" />

         {/* Skip Button */}
         <div className="absolute bottom-20 right-24 z-20">
            <Button
              variant={"secondary"}
              size="default" 
              className="shadow-xl border border-white/10 gap-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white"
              onClick={() => onSkip()}
            >
              <SkipForward className="h-4 w-4" />
              Skip
            </Button>
         </div>
      </div>
    </div>
  );
}
