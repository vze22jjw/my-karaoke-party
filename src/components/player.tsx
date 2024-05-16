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
      controls: 1,
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
        iframeClassName="p2 fixed bottom-0 right-0 h-auto min-h-full w-auto min-w-full -z-10"
        videoId={videoId}
        opts={opts}
        onPlay={onPlayerPlay}
        onReady={onPlayerReady}
        onEnd={onPlayerEnd}
        onPause={onPlayerPause}
      />
      <div className="fixed bottom-1 left-1 bg-white p-4">
        <QRCode
          size={128}
          // style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          value={joinPartyUrl} // Create ID
          // viewBox={`0 0 256 256`}
        />
        {/* <a href={joinPartyUrl} target="_blank" rel="noreferrer">
          {joinPartyUrl}
        </a> */}
      </div>
      <button
        className="fixed bottom-1 right-1 h-[5%] w-[10%] z-10 bg-white"
        onClick={skipToEnd}
      >
        Next &gt;&gt;
      </button>
    </>
  );
}
