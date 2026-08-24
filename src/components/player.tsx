/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useRef, useState, useEffect, useCallback } from "react";
import YouTube, { type YouTubeProps, type YouTubePlayer } from "react-youtube";
import { type VideoInPlaylist } from "~/types/app-types";
import { decode } from "html-entities";
import { cn } from "~/lib/utils";
import { cleanPlayerTitle } from "~/utils/string";
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
  onPlay: (currentTime?: number, actualDuration?: number) => void;
  onPause: (currentTime?: number) => void;
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
  const [isSkipping, setIsSkipping] = useState(false);

  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const endCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasEndedRef = useRef(false);

  const triggerPlayerEnd = useCallback(() => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    onPlayerEnd();
  }, [onPlayerEnd]);

  const clearEndCheck = useCallback(() => {
    if (endCheckIntervalRef.current) {
      clearInterval(endCheckIntervalRef.current);
      endCheckIntervalRef.current = null;
    }
  }, []);

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
            console.log("Safety end check: currentTime near duration while playing", { currentTime, duration });
            triggerPlayerEnd();
          } else if (isPlaying) {
            console.log("Safety end check: currentTime near duration but player not playing", { state, currentTime, duration });
            triggerPlayerEnd();
          }
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
      }, 3000);
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
    setIsSkipping(false);
  }, [video.id, clearEndCheck]);

  const handleSkipClick = useCallback(() => {
    if (isSkipping) return;
    setIsSkipping(true);
    let currentTime = 0;
    try {
      currentTime = playerRef.current?.getCurrentTime?.() ?? 0;
      playerRef.current?.pauseVideo();
    } catch (error) {
      console.error("Failed to pause video on skip:", error);
    }
    setInternalIsPlaying(false);
    onPause(Math.floor(currentTime));
    onSkip();
  }, [isSkipping, onPause, onSkip]);

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
      controls: 0,
      cc_load_policy: 0,
      iv_load_policy: 3,
      origin: typeof window !== "undefined" ? window.location.origin : "",
    },
  };

  const handleTogglePlayPause = () => {
    if (!playerRef.current) return;
    try {
      let isCurrentlyPlaying = internalIsPlaying;
      try {
        const playerState = playerRef.current.getPlayerState?.();
        if (playerState === 1) isCurrentlyPlaying = true;
        else if (playerState === 2 || playerState === -1 || playerState === 0) isCurrentlyPlaying = false;
      } catch {}

      if (isCurrentlyPlaying) {
        playerRef.current.pauseVideo();
        setInternalIsPlaying(false);
        let currentTime = 0;
        try {
          currentTime = playerRef.current.getCurrentTime?.() ?? 0;
        } catch {}
        onPause(Math.floor(currentTime));
      } else {
        playerRef.current.playVideo();
        setInternalIsPlaying(true);
        let currentTime = 0;
        let actualDuration = 0;
        try {
          currentTime = playerRef.current.getCurrentTime?.() ?? 0;
          actualDuration = Math.round(playerRef.current.getDuration?.() ?? 0);
        } catch {
          currentTime = 0;
        }
        onPlay(Math.floor(currentTime), actualDuration);
      }
    } catch (error) {
      console.error("Failed to toggle play/pause:", error);
    }
  };

  const handleRestart = () => {
    if (!playerRef.current) return;
    try {
      playerRef.current.seekTo(0, true);
      playerRef.current.playVideo();
      setInternalIsPlaying(true);
      let actualDuration = 0;
      try {
        actualDuration = Math.round(playerRef.current.getDuration?.() ?? 0);
      } catch {
        actualDuration = 0;
      }
      onPlay(0, actualDuration);
    } catch (error) {
      console.error("Failed to restart video:", error);
    }
  };

  const onPlayerReady: YouTubeProps["onReady"] = (event) => {
    playerRef.current = event.target;
    try {
      (event.target as any).unloadModule?.("captions");
      (event.target as any).unloadModule?.("cc");
    } catch {
      // Ignore module unload errors if not present
    }
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
    try {
      (event.target as any).unloadModule?.("captions");
      (event.target as any).unloadModule?.("cc");
    } catch {
      // Ignore module unload errors if not present
    }
    if (!isPlaying) { 
      const currentTime = event.target.getCurrentTime() as number;
      const actualDuration = Math.round(event.target.getDuration() as number);
      onPlay(Math.floor(currentTime), actualDuration); 
    }
  };

  const onPlayerPause: YouTubeProps["onPause"] = (event) => {
    setInternalIsPlaying(false);
    let currentTime = 0;
    try {
      currentTime = (event.target as any).getCurrentTime?.() ?? 0;
    } catch {}
    if (isPlaying) onPause(Math.floor(currentTime));
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

  const cleanTitle = cleanPlayerTitle(decode(video.title));

  const getDynamicTitleClasses = (title: string) => {
    const len = title.length;
    if (len <= 25) return "text-2xl sm:text-3xl md:text-4xl";
    if (len <= 45) return "text-xl sm:text-2xl md:text-3xl";
    if (len <= 65) return "text-lg sm:text-xl md:text-2xl";
    return "text-base sm:text-lg md:text-xl";
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
        isSkipping={isSkipping}
        message={t('cantEmbed')}
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div 
        data-testid="player-aspect-video-container" 
        onClick={handleTogglePlayPause}
        className="relative w-full max-w-full max-h-full aspect-video z-0 bg-black cursor-pointer"
      >
        <YouTube
          key={video.id}
          loading="eager"
          className={`h-full w-full animate-in fade-in ${isReady ? "visible" : "invisible"}`}
          iframeClassName="w-full h-full pointer-events-none"
          videoId={video.id}
          opts={opts}
          onPlay={onPlayerPlay}
          onReady={onPlayerReady}
          onPause={onPlayerPause}
          onError={onPlayerError}
          onEnd={handlePlayerEnd}
        />
        
        {/* Transparent click overlay to capture clicks anywhere on the video area */}
        <div 
          data-testid="player-click-overlay" 
          className="absolute inset-0 z-10 cursor-pointer" 
          onClick={handleTogglePlayPause}
        />

        {/* Loading/Buffering State */}
        {!isReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10 transition-all duration-300">
            <Spinner size={"large"} className="text-primary mb-4" />
            <h2 className={cn("font-bold text-white text-center max-w-md px-4 truncate", getDynamicTitleClasses(cleanTitle))}>
              {cleanTitle}
            </h2>
            <div className="flex items-center gap-2 text-white/70 mt-2">
              <MicVocal className="h-5 w-5" />
              <span className="text-lg">{video.singerName}</span>
            </div>
          </div>
        )}

        {/* Big Play/Pause/Skip Overlay when Paused */}
        {!internalIsPlaying && isReady && (
          <div 
            data-testid="player-up-next-overlay" 
            className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] z-10 p-4 transition-all duration-300 pointer-events-none"
          >
            <div className="rounded-2xl border border-white/20 bg-black/85 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-md flex flex-col items-center gap-3 sm:gap-4 max-w-xl w-[90%] max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 pointer-events-auto">
              
              <h2 className={cn("font-extrabold text-white leading-snug drop-shadow-md line-clamp-3 break-words overflow-hidden text-ellipsis w-full", getDynamicTitleClasses(cleanTitle))}>
                {cleanTitle}
              </h2>
              
              <div className="flex items-center justify-center gap-2 text-white/80 text-base sm:text-lg md:text-xl font-medium shrink-0">
                <MicVocal className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span className="truncate max-w-[300px]">{video.singerName}</span>
              </div>

              {/* Tap to Play / Resume instruction cue */}
              <div className="flex items-center gap-1.5 text-white/50 text-xs sm:text-sm font-medium tracking-wide uppercase mt-0.5 shrink-0">
                <span>{t('tapToPlay')}</span>
              </div>

              {/* Countdown Timer (Shows Next Up if someone queued, or Current Song remaining if alone) */}
              <div className="w-2/3 h-[1px] bg-white/20 rounded-full my-1 shrink-0" />
              
              <div className="flex flex-col items-center gap-1 shrink-0">
                {nextSong ? (
                  <>
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-white">
                      {t('nextUp')} <span className="text-primary">{nextSong.singerName}</span>
                    </h3>
                    <div className="text-white/70 text-xs sm:text-sm md:text-base font-mono mt-0.5">
                      <SongCountdownTimer remainingTime={remainingTime} className="text-white font-bold text-base sm:text-lg md:text-xl" message={t('startingIn')} />
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-white/90">
                      {t('currentSong')}
                    </h3>
                    <div className="text-white/70 text-xs sm:text-sm md:text-base font-mono mt-0.5">
                      <SongCountdownTimer remainingTime={remainingTime} className="text-white font-bold text-base sm:text-lg md:text-xl" message={t('remaining')} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className={cn("transition-opacity duration-500", showControls ? "opacity-100" : "opacity-0")}>
           <div onClick={(e) => e.stopPropagation()}>
             <PlayerQrCode joinPartyUrl={joinPartyUrl} className="static bottom-auto left-auto animate-none absolute bottom-20 left-8" />
           </div>
           <div className="absolute bottom-20 right-24 z-20 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <Button
                data-testid="player-restart-btn"
                variant={"secondary"}
                size="default" 
                disabled={isSkipping}
                className="shadow-xl border border-white/10 gap-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white font-medium disabled:opacity-50"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRestart();
                }}
              >
                <span className="text-base font-bold">↺</span>
                {t('restart')}
              </Button>
              <Button
                data-testid="player-skip-btn"
                variant={"secondary"}
                size="default" 
                disabled={isSkipping}
                className="shadow-xl border border-white/10 gap-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white font-medium disabled:opacity-50"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkipClick();
                }}
              >
                {isSkipping ? (
                  <Spinner size="small" className="text-white" />
                ) : (
                  <SkipForward className="h-4 w-4" />
                )}
                {t('skip')}
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
}
