/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import type { KaraokeParty, VideoInPlaylist } from "~/types/app-types"; // Added VideoInPlaylist import
import { SongSearch } from "~/components/song-search";
import { Music } from "lucide-react";
import { decode } from "html-entities";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/ui/alert";

type Props = {
  playlist: VideoInPlaylist[]; // Updated to match the array passed from parent
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
  hasReachedQueueLimit = false, // DESTRUCTURE AND DEFAULT
  maxQueuePerSinger, // USED
}: Props) {
  // --- NEW LOGIC: Sort My Songs (Playing Now first) ---

  // 1. Identify the playing song (it's at index 0 of the correctly structured playlist)
  const playingNow = playlist[0];
  const isMySongPlaying =
    !!playingNow && playingNow.singerName === name && !playingNow.playedAt;
  const myPlayingSong: VideoInPlaylist | null = isMySongPlaying
    ? playingNow
    : null;

  // 2. Filter the remaining songs in the queue that belong to the user.
  // Start filtering from index 1 (to exclude the playing song)
  const myUpcomingSongs = playlist
    .slice(myPlayingSong ? 1 : 0)
    .filter((v) => v.singerName === name && !v.playedAt);

  // 3. Construct the final array: [Playing Song (if mine), ...My Upcoming Songs]
  const mySongs: VideoInPlaylist[] = [];

  if (myPlayingSong) {
    mySongs.push(myPlayingSong);
  }

  mySongs.push(...myUpcomingSongs);

  // ---------------------------------------------------

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg p-4 border">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Music className="h-5 w-5" />
          Add Songs
        </h2>

        {/* --- ADD ALERT FOR MAX LIMIT --- */}
        {hasReachedQueueLimit && (
          <Alert
            variant="destructive"
            className="mb-4 bg-red-800/50 border-red-700 text-white"
          >
            <Music className="h-4 w-4 text-white" />
            <AlertTitle>Queue Full!</AlertTitle>
            <AlertDescription>
              Please sing one before adding more.
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
                  key={video.id + (video.playedAt?.toString() ?? "")}
                  className="flex items-start gap-3 p-2 rounded transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                    {/* FIX: Always display index + 1. If it's the playing song, index is 0, so it shows '1'. */}
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {decode(video.title)}
                    </p>
                    {/* Keep the green 'Playing Now' label for the first item if it's the user's playing song */}
                    {index === 0 && myPlayingSong && (
                      <p className="text-xs font-bold text-green-400">
                        (Playing Now)
                      </p>
                    )}
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
