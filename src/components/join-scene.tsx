"use client";

import { type Party } from "@prisma/client";
import { type KaraokeParty } from "party";
import usePartySocket from "partysocket/react";
import { useState } from "react";
import { AddSongForm } from "./add-song-form";
import { env } from "~/env";

export function JoinScene({
  party,
  initialPlaylist,
}: {
  party: Party;
  initialPlaylist?: KaraokeParty;
}) {
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

  const addSong = async (videoId: string, title: string) => {
    socket.send(JSON.stringify({ type: "add-video", id: videoId, title }));
  };

  // const nextVideos = playlist.filter((video) => !video.playedAt);

  return (
    <div className="p-5">
      <AddSongForm addFn={addSong} playlist={playlist} />

      {/* <div className="divider"></div>

      <h2>Next videos</h2>
      <ul>
        {nextVideos.map((video) => (
          <li key={video.id}>{video.id}</li>
        ))}
      </ul> */}
    </div>
  );
}
