"use client";
import type { KaraokeParty, VideoInPlaylist } from "~/types/app-types";
import { useState } from "react";
import { PreviewPlayer } from "~/components/preview-player";
import { decode } from "html-entities";
import { Monitor, Music } from "lucide-react";

type Props = {
  currentSong: VideoInPlaylist | null; 
  playlist: KaraokeParty["playlist"];
  playedPlaylist: KaraokeParty["playlist"];
  spotifyLink?: string | null; // <-- NEW PROP
};

export function TabPlayer({ currentSong, playlist, playedPlaylist, spotifyLink }: Props) {
  const [showAllNextSongs, setShowAllNextSongs] = useState(false);
  const [showAllPlayedSongs, setShowAllPlayedSongs] = useState(false);

  const nextVideos = playlist; 
  const playedVideos = playedPlaylist; 
  const nextVideo = currentSong; 

  const songsToShowNext = showAllNextSongs
    ? nextVideos
    : nextVideos.slice(0, 5); 
  const songsToShowPlayed = showAllPlayedSongs
    ? playedVideos 
    : playedVideos.slice(0, 5); 

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg p-4 border">
        <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Playing Now
            </h2>
            {spotifyLink && (
                <a 
                    href={spotifyLink}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full hover:bg-green-500/20 transition-colors"
                >
                    Spotify
                    <Music className="h-3 w-3" /> 
                </a>
            )}
        </div>

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

      {nextVideos.length > 0 && ( 
        <div className="bg-card rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-semibold">
              Next in Line ({nextVideos.length})
            </h3>
            {nextVideos.length > 5 && ( 
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
                className="flex items-start gap-3 p-2 rounded transition-colors"
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
                key={video.id + (video.playedAt?.toString() ?? "")}
                className="text-sm text-muted-foreground truncate"
              >
                • {decode(video.title)}{" "}
                <span className="text-xs opacity-70">({video.singerName})</span>
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
