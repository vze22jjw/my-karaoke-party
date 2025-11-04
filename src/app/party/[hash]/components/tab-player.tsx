"use client";

import type { KaraokeParty, VideoInPlaylist } from "party"; // <-- Added VideoInPlaylist
import { useState } from "react";
import { PreviewPlayer } from "~/components/preview-player";
import { decode } from "html-entities";
import { Monitor } from "lucide-react";

type Props = {
  currentSong: VideoInPlaylist | null; // <-- ADDED
  playlist: KaraokeParty["playlist"]; // This is the upcoming queue
  playedPlaylist: KaraokeParty["playlist"]; // <-- ADDED
};

export function TabPlayer({ currentSong, playlist, playedPlaylist }: Props) {
  const [showAllNextSongs, setShowAllNextSongs] = useState(false);
  const [showAllPlayedSongs, setShowAllPlayedSongs] = useState(false);

  // --- UPDATED: Use new props directly ---
  const nextVideos = playlist; // This is now just the upcoming queue
  const playedVideos = playedPlaylist; // This is the played list
  const nextVideo = currentSong; // This is the "now playing" song
  // --- END UPDATE ---

  // Determine which subset of songs to show
  const songsToShowNext = showAllNextSongs
    ? nextVideos // Show all upcoming
    : nextVideos.slice(0, 5); // Show first 5 upcoming
  const songsToShowPlayed = showAllPlayedSongs
    ? playedVideos // Already sorted by most recent
    : playedVideos.slice(0, 5); // Show first 5 played

  return (
    <div className="space-y-4">
      {/* Preview do que está tocando */}
      <div className="bg-card rounded-lg p-4 border">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Playing Now
        </h2>
        {nextVideo ? (
          <>
            <PreviewPlayer
              videoId={nextVideo.id}
              title={nextVideo.title}
              thumbnail={nextVideo.coverUrl}
            />
            <div className="mt-3">
              <p className="font-medium">{decode(nextVideo.title)}</p>
              <p className="text-sm text-muted-foreground">
                Singing: {nextVideo.singerName}
              </p>
            </div>
          </>
        ) : (
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">No songs queued</p>
          </div>
        )}
      </div>

      {/* Próximas músicas */}
      {nextVideos.length > 0 && ( // <-- UPDATED
        <div className="bg-card rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-semibold">
              Next in Line ({nextVideos.length})
            </h3>
            {nextVideos.length > 5 && ( // <-- UPDATED
              <button
                type="button"
                onClick={() => setShowAllNextSongs((prev) => !prev)}
                className="text-xs px-2 py-1 border rounded hover:bg-muted transition-colors text-white"
              >
                {showAllNextSongs
                  ? "Hide Queue"
                  : `Show All (${nextVideos.length})`}
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {songsToShowNext.map((video, index) => (
              <li
                key={video.id}
                className="flex items-start gap-3 p-2 rounded hover:bg-muted transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                  {index + 2} {/* +2 because +1 is playing */}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {decode(video.title)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {video.singerName}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {!showAllNextSongs && nextVideos.length > 5 && (
            <p className="text-sm text-muted-foreground mt-3 text-center">
              And {nextVideos.length - 5} more song(s)...
            </p>
          )}
        </div>
      )}

      {/* Músicas já tocadas */}
      {playedVideos.length > 0 && (
        <div className="bg-card rounded-lg p-4 border opacity-75">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-semibold">
              Already Played ({playedVideos.length})
            </h3>
            {playedVideos.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllPlayedSongs((prev) => !prev)}
                className="text-xs px-2 py-1 border rounded hover:bg-muted transition-colors text-white"
              >
                {showAllPlayedSongs
                  ? "Hide History"
                  : `Show All (${playedVideos.length})`}
              </button>
            )}
          </div>
          <ul className="space-y-1">
            {songsToShowPlayed.map((video) => (
              <li
                key={video.id}
                className="text-sm text-muted-foreground truncate"
              >
                • {decode(video.title)}
              </li>
            ))}
          </ul>
          {!showAllPlayedSongs && playedVideos.length > 5 && (
            <p className="text-sm text-muted-foreground mt-3 text-center">
              And {playedVideos.length - 5} more song(s) in history...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
