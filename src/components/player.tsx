/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
"use client";

import { useRef, useState } from "react";
import YouTube, { type YouTubeProps, type YouTubePlayer } from "react-youtube";
import { QrCode } from "./qr-code";
import { type VideoInPlaylist } from "party";
import { decode } from "html-entities";
import { cn } from "~/lib/utils";
import { Button } from "./ui/ui/button";
import { MicVocal, Youtube } from "lucide-react";

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

  const [isPlaying, setIsPlaying] = useState(false);

  const opts: YouTubeProps["opts"] = {
    playerVars: {
      // https://developers.google.com/youtube/player_parameters
      start: 0,
      autoplay: 0,
      rel: 0,
      controls: 1,
    },
  };

  const onPlayerReady: YouTubeProps["onReady"] = (event) => {
    console.log("handleReady");
    // access to player in all event handlers via event.target
    playerRef.current = event.target;
  };

  const onPlayerPlay: YouTubeProps["onPlay"] = (_event) => {
    console.log("handlePlay");
    setIsPlaying(true);
  };

  const onPlayerPause: YouTubeProps["onPause"] = (_event) => {
    console.log("handlePause");
    setIsPlaying(false);
  };

  // const onPlayerEnd: YouTubeProps["onEnd"] = (_event) => {
  //   console.log("handleEnd");

  //   if (onPlayerEnd) {
  //     onPlayerEnd();
  //   }
  // };

  const [showOpenInYouTubeButton, setShowOpenInYouTubeButton] = useState(false);

  const onPlayerError: YouTubeProps["onError"] = (_event) => {
    // set showOpenInYouTubeButton state to true
    setShowOpenInYouTubeButton(true);
  };

  // const onSkipClick = () => {
  //   markAsPlayed();
  // };

  const openYouTubeTab = () => {
    window.open(
      `https://www.youtube.com/watch?v=${video.id}#mykaraokeparty`,
      "_blank",
      "fullscreen=yes",
    );

    if (onPlayerEnd) {
      onPlayerEnd();
    }
  };

  if (showOpenInYouTubeButton) {
    return (
      <div
        className={cn(
          "mx-auto flex h-full w-full flex-col items-center justify-between space-y-6 p-6 px-4 text-center",
          isFullscreen && "bg-gradient",
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

        <div>
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
            This video cannot be embedded. Click the button to open a new tab in
            YouTube.
          </h3>
          <Button
            type="button"
            className="w-fit self-center"
            onClick={() => openYouTubeTab()}
          >
            Play in YouTube
            <Youtube className="ml-2" />
          </Button>
        </div>

        <div className="flex w-full basis-1/4 flex-col items-center justify-between text-center sm:flex-row">
          <QrCode url={joinPartyUrl} className="w-fit self-end bg-white p-2" />
          <a
            href={joinPartyUrl}
            target="_blank"
            className="font-mono text-xl text-white sm:self-end"
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
        className="h-full w-full"
        iframeClassName="w-full h-full"
        // iframeClassName="p2 fixed bottom-0 right-0 h-auto min-h-full w-auto min-w-full"
        videoId={video.id}
        opts={opts}
        onPlay={onPlayerPlay}
        onReady={onPlayerReady}
        onPause={onPlayerPause}
        onError={onPlayerError}
        onEnd={() => {
          if (onPlayerEnd) {
            onPlayerEnd();
          }
        }}
      />
      <div
        className={cn(
          "absolute top-0 w-full text-center",
          isPlaying ? "hidden" : "block",
        )}
      >
        <div className="flex w-full flex-col items-center justify-center bg-black bg-opacity-80 p-4">
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
      </div>

      <div className="absolute bottom-12 left-8 z-10 flex w-full flex-row justify-between px-4">
        <QrCode url={joinPartyUrl} className="w-fit bg-white p-2" />
        {/* <div className="self-end bg-primary p-2 bg-opacity-90">
          <a
            href={joinPartyUrl}
            target="_blank"
            className="font-mono text-xl text-white"
          >
            {joinPartyUrl.split("//")[1]}
          </a>
        </div> */}
      </div>
    </div>
  );

  // return (
  //   <div className="flex h-full w-full flex-col items-center p-6">
  //     <div className="flex w-full basis-3/4 items-center justify-center">
  //       <YouTube
  //         key={currentVideo.id}
  //         loading="eager"
  //         className="h-full w-full"
  //         iframeClassName="w-full h-full"
  //         // iframeClassName="p2 fixed bottom-0 right-0 h-auto min-h-full w-auto min-w-full"
  //         videoId={currentVideo.id}
  //         opts={opts}
  //         onPlay={onPlayerPlay}
  //         onReady={onPlayerReady}
  //         onEnd={onPlayerEnd}
  //         onPause={onPlayerPause}
  //         onError={onPlayerError}
  //       />
  //     </div>
  //     <div className="flex w-full basis-1/4 flex-col items-center justify-between text-center sm:flex-row">
  //       <QrCode url={joinPartyUrl} className="w-fit self-end bg-white p-2" />
  //       <a
  //         href={joinPartyUrl}
  //         target="_blank"
  //         className="font-mono text-xl text-white sm:self-end"
  //       >
  //         {joinPartyUrl.split("//")[1]}
  //       </a>
  //     </div>
  //   </div>
  // );
}
