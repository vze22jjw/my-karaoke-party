/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { useRef, useState, useEffect } from "react";
import YouTube, { type YouTubeProps, type YouTubePlayer } from "react-youtube";
import { QrCode } from "./qr-code";
import { type VideoInPlaylist } from "party";
import { decode } from "html-entities";
import { cn } from "~/lib/utils";
import { Button } from "./ui/ui/button";
import { MicVocal, SkipForward, Youtube } from "lucide-react";
import { Spinner } from "./ui/ui/spinner";

// --- THIS IS THE FIX ---
// This Props type includes all the new properties
type Props = {
  joinPartyUrl: string;
  video: VideoInPlaylist;
  isFullscreen: boolean;
  onPlayerEnd: () => void; // For song end
  onSkip: () => void;      // For skip button
  forceAutoplay: boolean;
  onAutoplayed: () => void;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
};
// --- END THE FIX ---

export function Player({
  joinPartyUrl,
  video,
  isFullscreen = false,
  onPlayerEnd,
  onSkip,
  forceAutoplay,
  onAutoplayed,
  isPlaying,
  onPlay,
  onPause,
}: Props) {
  // This ref is also corrected to fix the ESLint error
  const playerRef = useRef<YouTubePlayer>(null);
  const [isReady, setIsReady] = useState(false);
  const [showOpenInYouTubeButton, setShowOpenInYouTubeButton] = useState(false);
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);

  useEffect(() => {
    setIsReady(false);
    setShowOpenInYouTubeButton(false);
  }, [video.id]);

  // Effect to control player from socket state
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
      autoplay: 0, // Manual control
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
      // Only autoplay if the forceAutoplay flag is true (i.e., user clicked Skip)
      if (forceAutoplay) {
        event.target.playVideo();
        onAutoplayed(); // Reset the flag in the parent
      }
    }
  };

  // Emit socket events when user interacts with YouTube controls
  const onPlayerPlay: YouTubeProps["onPlay"] = (_event) => {
    console.log("handlePlay (from player)");
    setInternalIsPlaying(true);
    if (!isPlaying) { // Only emit if state is different
      onPlay();
    }
  };

  const onPlayerPause: YouTubeProps["onPause"] = (_event) => {
    console.log("handlePause (from player)");
    setInternalIsPlaying(false);
    if (isPlaying) { // Only emit if state is different
      onPause();
    }
  };

  const onPlayerError: YouTubeProps["onError"] = (event) => {
    console.log("Player error, showing 'Open on YouTube' button", { event });
    setShowOpenInYouTubeButton(true);
  };

  const openYouTubeTab = () => {
    window.open(
      `https://www.youtube.com/watch?v=${video.id}#mykaraokeparty`,
      "_blank",
      "fullscreen=yes"
    );
    if (onSkip) {
      onSkip();
    }
  };

  if (showOpenInYouTubeButton) {
    return (
      <div
        className={cn(
          "mx-auto flex h-full w-full flex-col items-center justify-between space-y-6 p-4 pb-1 text-center",
          isFullscreen && "bg-gradient"
        )}
      >
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
        
        <div className="space-y-4">
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-4">
            <h3 className="text-xl font-bold text-red-400 mb-2">
              🚫 Video Playback Error
            </h3>
            <p className="text-sm text-gray-300 mb-2">
              This video can&apos;t be played here (it may be private or deleted).
            </p>
          </div>
          
          <h3 className="text-2xl font-semibold tracking-tight animate-in fade-in zoom-in">
            Click the button to open on YouTube
          </h3>
          
          <Button
            type="button"
            size="lg"
            className="w-fit self-center animate-in fade-in zoom-in bg-red-600 hover:bg-red-700"
            onClick={() => openYouTubeTab()}
          >
            <Youtube className="mr-2" size={24} />
            Open on YouTube
          </Button>
          
          <div className="mt-4">
            <Button
              className="animate-in fade-in zoom-in"
              variant={"secondary"}
              type="button"
              onClick={() => {
                onSkip();
              }}
            >
              <SkipForward className="mr-2 h-5 w-5" />
              Skip Song
            </Button>
          </div>
        </div>

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

  // Default player view
  return (
    <div className="relative z-0 h-full">
      <YouTube
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
      <div
        className={cn(
          "absolute top-0 w-full text-center animate-in fade-in zoom-in",
          isReady ? "hidden" : "block"
        )}
      >
        <div
          className={`flex w-full flex-col items-center justify-center bg-black p-4 ${
            isReady ? "bg-opacity-80" : "bg-opacity-0"
          }`}
        >
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

        {!isReady && (
          <div>
            <Spinner size={"large"} />
          </div>
        )}
      </div>

      <div className="absolute bottom-12 left-0 z-10 flex w-full flex-row justify-between px-4">
        <QrCode url={joinPartyUrl} />

        <div
          className={`self-end p-2 ${
            internalIsPlaying && isFullscreen ? "hidden" : "block"
          }`}
        >
          <Button
            variant={"secondary"}
            type="button"
            onClick={() => {
              onSkip();
            }}
          >
            <SkipForward className="mr-2 h-5 w-5" />
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
