/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { useRef, useState, useEffect, useCallback } from "react";
import YouTube, { type YouTubeProps, type YouTubePlayer } from "react-youtube";
import { type VideoInPlaylist } from "~/types/app-types";
import { decode } from "html-entities";
import { cn } from "~/lib/utils";
import { Button } from "./ui/ui/button";
import { MicVocal, SkipForward } from "lucide-react";
import { Spinner } from "./ui/ui/spinner";
import { SongCountdownTimer } from "./song-countdown-timer";
import { PlayerQrCode } from "./player-qr-code"; 
import { PlayerDisabledView } from "./player-disabled-view";
import { useTranslations } from "next-intl";

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
  onPlayerError?: (errorCode: string) => void;
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
  onPlayerError: onPlayerErrorProp,
}: Props) {
  const t = useTranslations('player');
  const playerRef = useRef<YouTubePlayer>(null);
  const [isReady, setIsReady] = useState(false);
  const [showOpenInYouTubeButton, setShowOpenInYouTubeButton] = useState(false);
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);

  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const endCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasEndedRef = useRef(false);
  const onPlayerEndRef = useRef(onPlayerEnd);

  useEffect(() => {
    onPlayerEndRef.current = onPlayerEnd;
  }, [onPlayerEnd]);

  const clearEndCheck = useCallback(() => {
    if (endCheckIntervalRef.current) {
      clearInterval(endCheckIntervalRef.current);
      endCheckIntervalRef.current = null;
    }
  }, []);

  const triggerPlayerEnd = useCallback(() => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    clearEndCheck();
    onPlayerEndRef.current();
  }, [clearEndCheck]);

  const startEndCheck = useCallback(() => {
    clearEndCheck();
    endCheckIntervalRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;

      try {
        const state = player.getPlayerState();
        const duration = player.getDuration() as number;
        const currentTime = player.getCurrentTime() as number;

        if (state === 0) {
          console.log("Safety end check: player reports ENDED state");
          triggerPlayerEnd();
          return;
        }

        const nearEnd = duration > 0 && currentTime > 0 && currentTime >= duration - 1.0;
        if (nearEnd) {
          if (state === 1) {
            // Actively playing and within the last second. Normal end.
            console.log("Safety end check: currentTime near duration while playing", { currentTime, duration });
            triggerPlayerEnd();
          } else if (isPlaying) {
            // The host/server still expects us to be playing, but the player has
            // stopped/buffered (likely YouTube end screen or autopause). Treat as ended.
            console.log("Safety end check: currentTime near duration but player not playing", { state, currentTime, duration });
            triggerPlayerEnd();
          }
          // If !isPlaying, the user/host explicitly paused, so do not auto-advance.
        }
      } catch (error) {
        console.error("Safety end check failed:", error);
      }
    }, 1000);
  }, [clearEndCheck, triggerPlayerEnd, isPlaying]);

  const interact = useCallback(() => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (internalIsPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000); // Hide after 3 seconds of inactivity
    }
  }, [internalIsPlaying]);

  useEffect(() => {
    const handleActivity = () => interact();
    
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);

    interact();

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [interact]);

  useEffect(() => {
    if (!internalIsPlaying) {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      interact();
    }
  }, [internalIsPlaying, interact]);

  useEffect(() => {
    hasEndedRef.current = false;
    clearEndCheck();
    setIsReady(false);
    setShowOpenInYouTubeButton(false);
    setInternalIsPlaying(false);
  }, [video.id, clearEndCheck]);

  useEffect(() => {
    return () => clearEndCheck();
  }, [clearEndCheck]);

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
    playerRef.current = event.target;
    const playerState = event.target.getPlayerState();
    if (playerState !== -1) {
      setIsReady(true);
      startEndCheck();
      if (forceAutoplay) {
        event.target.playVideo();
        onAutoplayed();
      } else {
        event.target.pauseVideo();
      }
    }
  };

  const onPlayerPlay: YouTubeProps["onPlay"] = (event) => {
    setInternalIsPlaying(true);
    if (!isPlaying) { 
      const currentTime = event.target.getCurrentTime() as number;
      onPlay(Math.floor(currentTime)); 
    }
  };

  const onPlayerPause: YouTubeProps["onPause"] = (_event) => {
    setInternalIsPlaying(false);
    if (isPlaying) onPause();
  };

  const onPlayerError: YouTubeProps["onError"] = (event) => {
    setShowOpenInYouTubeButton(true);
    const errorCode = (event as { data?: number }).data ?? 100;
    onPlayerErrorProp?.(String(errorCode));
  };

  const handlePlayerEnd: YouTubeProps["onEnd"] = (event) => {
    if (hasEndedRef.current) return;

    const player = event.target;
    const duration = player.getDuration() as number;
    const currentTime = player.getCurrentTime() as number;

    if (duration > 0 && (duration - currentTime > 5)) {
      console.log("Ignored false onEnd event from iOS suspension.");
      player.playVideo();
    } else {
      triggerPlayerEnd();
    }
  };

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
        isSkipping={false}
        message={t('cantEmbed')}
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div data-testid="player-aspect-video-container" className="relative w-full max-w-full max-h-full aspect-video z-0 bg-black">
        <YouTube
          key={video.id}
          loading="eager"
          className={`h-full w-full animate-in fade-in ${isReady ? "visible" : "invisible"}`}
          iframeClassName="w-full h-full"
          videoId={video.id}
          opts={opts}
          onPlay={onPlayerPlay}
          onReady={onPlayerReady}
          onPause={onPlayerPause}
          onError={onPlayerError}
          onEnd={handlePlayerEnd}
        />
        
        <div className={cn("absolute top-0 w-full text-center animate-in fade-in zoom-in pointer-events-none", isReady ? "hidden" : "block")}>
          <div className="flex w-full flex-col items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
            <h1 className="text-outline scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl text-white">
              {decode(video.title)}
            </h1>
            <h2 className="text-outline mt-2 scroll-m-20 text-3xl font-bold tracking-tight lg:text-4xl text-white flex items-center gap-3">
              <MicVocal className="text-primary" size={32} />
              {video.singerName}
            </h2>
          </div>
          {!isReady && <div className="mt-20"><Spinner size={"large"} /></div>}
        </div>

        {isReady && !isPlaying && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none w-[90%] max-w-lg">
            <div className="animate-in fade-in zoom-in rounded-xl border border-primary/50 bg-black/90 p-6 text-center shadow-2xl backdrop-blur-md flex flex-col items-center gap-4">
              
              {/* Current Song Info */}
              <div className="flex flex-col items-center gap-1 w-full">
                <p className="text-white/70 text-xs md:text-sm font-bold uppercase tracking-widest">
                  Now Playing
                </p>
                <h2 className="text-xl md:text-2xl font-extrabold text-white drop-shadow-md line-clamp-2">
                  {decode(video.title)}
                </h2>
                
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-white/70 text-xs md:text-sm font-bold uppercase tracking-widest">
                    Now Singing
                  </p>
                  <div className="text-xl md:text-2xl font-bold text-primary flex items-center gap-2">
                    <MicVocal className="h-5 w-5 md:h-6 md:w-6" />
                    {video.singerName}
                  </div>
                </div>
              </div>

              {/* Next Up Info (Only shows if someone is next in the queue) */}
              {nextSong && (
                <>
                  <div className="w-2/3 h-[1px] bg-white/20 rounded-full my-1" />
                  
                  <div className="flex flex-col items-center gap-1">
                    <h3 className="text-xl md:text-2xl font-bold text-white">
                      {t('nextUp')} <span className="text-primary">{nextSong.singerName}</span>
                    </h3>
                    <div className="text-white/70 text-sm md:text-base font-mono mt-1">
                      <SongCountdownTimer remainingTime={remainingTime} className="text-white font-bold text-lg md:text-xl" message={t('startingIn')} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className={cn("transition-opacity duration-500", showControls ? "opacity-100" : "opacity-0")}>
           <PlayerQrCode joinPartyUrl={joinPartyUrl} className="static bottom-auto left-auto animate-none absolute bottom-20 left-8" />
           <div className="absolute bottom-20 right-24 z-20">
              <Button
                variant={"secondary"}
                size="default" 
                className="shadow-xl border border-white/10 gap-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white"
                onClick={() => onSkip()}
              >
                <SkipForward className="h-4 w-4" />
                {t('skip')}
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
}
