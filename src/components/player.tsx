/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
"use client";

import { useRef, useState } from "react";
import usePartySocket from "partysocket/react";
import YouTube, { type YouTubeProps, type YouTubePlayer } from "react-youtube";
import { ForwardIcon } from "@heroicons/react/24/solid";
import { QrCode } from "./qr-code";
import { env } from "~/env";
import { type Party } from "@prisma/client";
import { type KaraokeParty } from "party";
import { AddSongForm } from "./add-song-form";
import { getUrl } from "~/utils/url";

export function Player({
  party,
  initialPlaylist,
}: {
  party: Party;
  initialPlaylist?: KaraokeParty;
}) {
  const playerRef = useRef<YouTubePlayer>(null);

  const [playlist, setPlaylist] = useState<KaraokeParty["videos"]>(
    initialPlaylist?.videos ?? [],
  );

  const socket = usePartySocket({
    host: env.NEXT_PUBLIC_PARTYKIT_URL,
    room: party.hash!,
    onMessage(event) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const message = JSON.parse(event.data) as KaraokeParty;
      if (message.videos) {
        setPlaylist(message.videos);
      }
    },
  });

  const currentVideo = playlist.find((video) => !video.playedAt);

  const addSong = async (videoId: string, title: string) => {
    socket.send(JSON.stringify({ type: "add-video", id: videoId, title }));
  };

  const markAsPlayed = () => {
    if (currentVideo) {
      socket.send(
        JSON.stringify({ type: "mark-as-played", id: currentVideo.id }),
      );
    }
  };

  const opts: YouTubeProps["opts"] = {
    playerVars: {
      // https://developers.google.com/youtube/player_parameters
      start: 0,
      autoplay: 0,
      rel: 0,
      controls: 0,
    },
  };

  const onPlayerReady: YouTubeProps["onReady"] = (event) => {
    console.log("handleReady");
    // access to player in all event handlers via event.target
    playerRef.current = event.target;
  };

  const onPlayerPlay: YouTubeProps["onPlay"] = (_event) => {
    console.log("handlePlay");
  };

  const onPlayerPause: YouTubeProps["onPause"] = (_event) => {
    console.log("handlePause");
  };

  const onPlayerEnd: YouTubeProps["onEnd"] = (_event) => {
    console.log("handleEnd");

    markAsPlayed();
  };

  const onSkipClick = () => {
    markAsPlayed();
  };

  const joinPartyUrl = getUrl(`/join/${party.hash}`);

  if (!currentVideo) {
    return (
      <div className="hero bg-base-200 min-h-screen">
        <div className="hero-content text-center">
          <div className="max-w-xl">
            <h1 className="text-5xl font-bold">Playlist is empty 😞</h1>
            <h2 className="py-6 text-2xl">
              Add more songs and keep the Karaoke Party going!
            </h2>
            <AddSongForm addFn={addSong} playlist={playlist} />

            <QrCode url={joinPartyUrl} />
            <a
              href={joinPartyUrl}
              target="_blank"
              className="fixed bottom-1 right-1 p-3 font-mono text-xl text-white"
            >
              {joinPartyUrl.split("//")[1]}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <YouTube
        loading="eager"
        iframeClassName="p2 fixed bottom-0 right-0 h-auto min-h-full w-auto min-w-full -z-10"
        videoId={currentVideo.id}
        opts={opts}
        onPlay={onPlayerPlay}
        onReady={onPlayerReady}
        onEnd={onPlayerEnd}
        onPause={onPlayerPause}
      />
      <QrCode url={joinPartyUrl} />

      <button
        name="skipBtn"
        className="btn btn-accent fixed bottom-1 right-1 h-24"
        onClick={onSkipClick}
      >
        <ForwardIcon className="h-24 w-24" />
      </button>
    </>
  );
}
