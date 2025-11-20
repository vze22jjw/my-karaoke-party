"use client";

import type { KaraokeParty } from "~/types/app-types";
import { SongSearch } from "~/components/song-search";
import { Music } from "lucide-react";
import { decode } from "html-entities";

type Props = {
  playlist: KaraokeParty["playlist"];
  name: string;
  onVideoAdded: (videoId: string, title: string, coverUrl: string) => void;
  initialSearchQuery: string;
  onSearchQueryConsumed: () => void;
};

export function TabAddSong({
  playlist,
  name,
  onVideoAdded,
  initialSearchQuery,
  onSearchQueryConsumed,
}: Props) {
  const nextVideos = playlist.filter((video) => !video.playedAt);
  const mySongs = nextVideos.filter((v) => v.singerName === name);

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg p-4 border">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Music className="h-5 w-5" />
          Add Songs
        </h2>
        <SongSearch
          onVideoAdded={onVideoAdded}
          playlist={playlist}
          name={name}
          initialSearchQuery={initialSearchQuery}
          onSearchQueryConsumed={onSearchQueryConsumed}
        />
      </div>

      {name && (
        <div className="bg-card rounded-lg p-4 border">
          <h3 className="text-md font-semibold mb-3">My Queued Songs</h3>
          {mySongs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You haven&apos;t added any songs yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {mySongs.map((video) => (
                <li key={video.id} className="p-2 rounded bg-muted text-sm">
                  {decode(video.title)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
