"use client";

import { api } from "~/trpc/react";
import { Player } from "./player";
import { type Party } from "@prisma/client";
import { QrCode } from "./qr-code";

export function NoMoreVideos({ party }: { party: Party }) {
  const { data: nextVideo, error } = api.party.fetchNextVideo.useQuery(
    {
      partyId: party.id,
    },
    { refetchInterval: 5000 },
  );

  if (error) {
    return <div>Error loading next video: {error.message}</div>;
  }

  if (nextVideo) {
    return <Player key={nextVideo.id} party={party} videoId={nextVideo.id} />;
  }

  return (
    <div className="hero bg-base-200 min-h-screen">
      <div className="hero-content text-center">
        <div className="max-w-lg">
          <h1 className="text-5xl font-bold">Playlist is empty 😞</h1>
          <h2 className="py-6 text-2xl">
            Add more songs and keep the Karaoke Party going!
          </h2>
          <button className="btn btn-lg btn-primary">Search Songs</button>
          <QrCode url={`https://www.karaokeparty.com/join/${party.hash}`} />
        </div>
      </div>
    </div>
  );
}
