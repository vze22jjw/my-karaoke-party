/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { useRef, useState } from "react";
import YouTube, { type YouTubeProps, type YouTubePlayer } from "react-youtube";
import { QrCode } from "./qr-code";
import { type VideoInPlaylist } from "party";
import { decode } from "html-entities";
import { cn } from "~/lib/utils";
import { Button } from "./ui/ui/button";
import { MicVocal, SkipForward, Youtube } from "lucide-react";
import { Spinner } from "./ui/ui/spinner";
import { getCodePenEmbedUrl } from "~/utils/youtube-embed";

type Props = {
  joinPartyUrl: string;
  video: VideoInPlaylist;
  isFullscreen: boolean;
  onPlayerEnd: () => void;
};

export function Player({
  joinPartyUrl,
  video,
  isFullscreen = false,
  onPlayerEnd,
}: Props) {
  const playerRef = useRef<YouTubePlayer>(null);

  const [isReady, setIsReady] = useState(false);
  const [showOpenInYouTubeButton, setShowOpenInYouTubeButton] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [useCodePenBypass, setUseCodePenBypass] = useState(false);

  const opts: YouTubeProps["opts"] = {
    playerVars: {
      // https://developers.google.com/youtube/player_parameters
      start: 0,
      autoplay: 1, // Enable autoplay
      rel: 0,
      controls: 1,
    },
  };

  const onPlayerReady: YouTubeProps["onReady"] = (event) => {
    console.log("Player ready", { event });
    // access to player in all event handlers via event.target
    playerRef.current = event.target;

    const playerState = event.target.getPlayerState();

    if (playerState !== -1) {
      setIsReady(true);
    }
  };

  const onPlayerPlay: YouTubeProps["onPlay"] = (_event) => {
    console.log("handlePlay");
    setIsPlaying(true);
  };

  const onPlayerPause: YouTubeProps["onPause"] = (_event) => {
    console.log("handlePause");
    setIsPlaying(false);
  };

  const onPlayerError: YouTubeProps["onError"] = (event) => {
    console.log("Player error, trying CodePen bypass", { event });
    // Primeiro tenta o bypass do CodePen
    if (!useCodePenBypass) {
      setUseCodePenBypass(true);
    } else {
      // Se o bypass também falhou, mostra botão do YouTube
      setShowOpenInYouTubeButton(true);
    }
  };

  const openYouTubeTab = () => {
    window.open(
      `https://www.youtube.com/watch?v=${video.id}#mykaraokeparty`,
      "_blank",
      "fullscreen=yes"
    );

    if (onPlayerEnd) {
      onPlayerEnd();
    }
  };

  // Se usar CodePen bypass, renderiza iframe customizado
  if (useCodePenBypass && !showOpenInYouTubeButton) {
    const codePenUrl = getCodePenEmbedUrl(video.id, {
      autoplay: 1,
      mute: 0,
      controls: 1,
      rel: 0,
    });

    // Timeout de 8 segundos - se não carregar, mostra botão YouTube
    setTimeout(() => {
      if (useCodePenBypass && !showOpenInYouTubeButton) {
        console.log("CodePen bypass timeout - showing YouTube button");
        setShowOpenInYouTubeButton(true);
      }
    }, 8000);

    return (
      <div className="relative z-0 h-full">
        <iframe
          src={codePenUrl}
          className="h-full w-full animate-in fade-in"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{ border: 0 }}
          title={decode(video.title)}
          onError={() => {
            console.log("CodePen iframe error - showing YouTube button");
            setShowOpenInYouTubeButton(true);
          }}
        />
        
        <div className="absolute top-0 left-0 right-0 z-20 bg-black/80 p-4 text-center">
          <p className="text-yellow-400 text-sm animate-pulse">
            Trying to play with bypass...
          </p>
          <p className="text-xs text-gray-400 mt-1">
            If it doesn't work in 8 seconds, it will open in YouTube
          </p>
        </div>

        <div className="absolute bottom-12 left-0 z-10 flex w-full flex-row justify-between px-4">
          <QrCode url={joinPartyUrl} />

          <div
            className={`self-end p-2 ${
              isPlaying && isFullscreen ? "hidden" : "block"
            }`}
          >
            <Button
              variant={"secondary"}
              type="button"
              onClick={() => {
                onPlayerEnd();
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
              🚫 Playback Blocked by Owner
            </h3>
            <p className="text-sm text-gray-300 mb-2">
              The owner of this video has disabled playback on other sites.
            </p>
            <p className="text-xs text-gray-400">
              We tried: YouTube embed directly ❌ | CodePen bypass ❌
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
                onPlayerEnd();
              }}
            >
              <SkipForward className="mr-2 h-5 w-5" />
              Skip Song
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            💡 Tip: Choose videos from official channels to avoid this issue
          </p>
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

  return (
    <div className="relative z-0 h-full">
      <YouTube
        key={video.id}
        loading="eager"
        // className={`h-full w-full`}
        className={`h-full w-full animate-in fade-in ${
          isReady ? "visible" : "invisible"
        }`}
        iframeClassName="w-full h-full"
        // iframeClassName="p2 fixed bottom-0 right-0 h-auto min-h-full w-auto min-w-full"
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
          isPlaying ? "hidden" : "block"
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
            isPlaying && isFullscreen ? "hidden" : "block"
          }`}
        >
          <Button
            // className="bg-yellow-300"
            variant={"secondary"}
            type="button"
            onClick={() => {
              onPlayerEnd();
            }}
          >
            <SkipForward className="mr-2 h-5 w-5" />
            Skip
          </Button>
          {/* <a
            href={joinPartyUrl}
            target="_blank"
            className="font-mono text-xl text-white"
          >
            {joinPartyUrl.split("//")[1]}
          </a> */}
        </div>
      </div>
    </div>
  );
}
