/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
"use client";

import { useIdle } from "@mantine/hooks";
import { type Party } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import QRCode from "react-qr-code";
import YouTube, { type YouTubeProps, type YouTubePlayer } from "react-youtube";
import { api } from "~/trpc/react";
import { ForwardIcon } from "@heroicons/react/24/solid";
import { QrCode } from "./qr-code";

export function Player({ party, videoId }: { party: Party; videoId: string }) {
  const playerRef = useRef<YouTubePlayer>(null);
  const idle = useIdle(5000);
  const router = useRouter();

  const opts: YouTubeProps["opts"] = {
    playerVars: {
      // https://developers.google.com/youtube/player_parameters
      start: 0,
      autoplay: 0,
      rel: 0,
      controls: 0,
    },
  };

  const markVideoAsPlayed = api.party.markVideoAsPlayed.useMutation({
    onSuccess: () => {
      console.log("Marked video as played");
      router.refresh();
    },
  });

  const onPlayerReady: YouTubeProps["onReady"] = (event) => {
    console.log("handleReady");
    // access to player in all event handlers via event.target
    playerRef.current = event.target;
  };

  const onPlayerPlay: YouTubeProps["onPlay"] = (event) => {
    console.log("handlePlay");

    // TODO: Mark video as played
  };

  const onPlayerPause: YouTubeProps["onPause"] = (event) => {
    console.log("handlePause");

    // TODO: Mark video as played
  };

  const onPlayerEnd: YouTubeProps["onEnd"] = (event) => {
    console.log("handleEnd");

    // TODO: Mark video as played
    markVideoAsPlayed.mutate({ partyId: party.id, videoId });
  };

  const skipToEnd = () => {
    if (playerRef.current) {
      const duration = playerRef.current.getDuration();
      playerRef.current.seekTo(duration - 1, true);
      playerRef.current.playVideo();
    }
  };

  const joinPartyUrl = `https://www.karaokeparty.com/join/${party.hash}`;

  return (
    <>
      <YouTube
        loading="eager"
        iframeClassName="p2 fixed bottom-0 right-0 h-auto min-h-full w-auto min-w-full -z-10"
        videoId={videoId}
        opts={opts}
        onPlay={onPlayerPlay}
        onReady={onPlayerReady}
        onEnd={onPlayerEnd}
        onPause={onPlayerPause}
      />
      <QrCode url={joinPartyUrl} />

      <button
        className="btn btn-secondary fixed bottom-1 right-1 h-24"
        onClick={skipToEnd}
      >
        <ForwardIcon className="h-24 w-24" />
      </button>
    </>
  );
}
