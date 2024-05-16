"use client";

import { api } from "~/trpc/react";
import { Player } from "./player";
import { type Party } from "@prisma/client";

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

  return <div className="bg-white p4 center">No more videos, add more</div>;
}
