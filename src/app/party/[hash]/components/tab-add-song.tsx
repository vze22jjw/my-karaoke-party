"use client";

import type { KaraokeParty } from "~/types/app-types";
import { SongSearch } from "~/components/song-search";
import { Music } from "lucide-react";
import { decode } from "html-entities";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/ui/alert";

type Props = {
  playlist: KaraokeParty["playlist"];
  name: string;
  onVideoAdded: (videoId: string, title: string, coverUrl: string) => void;
  initialSearchQuery: string;
  onSearchQueryConsumed: () => void;
  hasReachedQueueLimit: boolean; // ADDED
  maxQueuePerSinger: number; // ADDED
};

export function TabAddSong({
  playlist,
  name,
  onVideoAdded,
  initialSearchQuery,
  onSearchQueryConsumed,
  hasReachedQueueLimit, // USED
  maxQueuePerSinger, // USED
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
        
        {/* --- ADD ALERT FOR MAX LIMIT --- */}
        {hasReachedQueueLimit && (
            <Alert variant="destructive" className="mb-4 bg-red-800/50 border-red-700 text-white">
                <Music className="h-4 w-4 text-white" />
                <AlertTitle>Queue Full!</AlertTitle>
                <AlertDescription>
                    Please a sing one before adding more.
                </AlertDescription>
            </Alert>
        )}
        
        <SongSearch
          onVideoAdded={onVideoAdded}
          playlist={playlist}
          name={name}
          initialSearchQuery={initialSearchQuery}
          onSearchQueryConsumed={onSearchQueryConsumed}
          hasReachedQueueLimit={hasReachedQueueLimit} // PASSED DOWN
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
            <ul className="space-y-3">
              {mySongs.map((video, index) => (
                <li
                  key={video.id}
                  className="flex items-start gap-3 p-2 rounded transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {decode(video.title)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
