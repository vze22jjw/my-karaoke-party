"use client";

import {
  Lightbulb,
  Trophy,
  Flame,
  Loader2,
  Music2,
  Music,
  Plus,
} from "lucide-react";
import { api } from "~/trpc/react";
import { decode } from "html-entities";
import Image from "next/image";
import { Button } from "~/components/ui/ui/button";

type SpotifySong = {
  title: string;
  artist: string;
  coverUrl: string;
};

type Props = {
  themeSuggestions: string[];
  spotifyPlaylistId?: string | null;
  onSuggestionClick: (title: string, artist: string) => void;
};

export function TabHistory({
  themeSuggestions,
  spotifyPlaylistId,
  onSuggestionClick,
}: Props) {
  const { data: stats, isLoading: isLoadingStats } =
    api.playlist.getGlobalStats.useQuery(undefined, {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    });

  const { data: spotifyData } = api.spotify.getTopKaraokeSongs.useQuery(
    { playlistId: spotifyPlaylistId }, // Pass the ID
    { refetchOnWindowFocus: false, staleTime: 1000 * 60 * 60 }, // Cache for 1 hour
  );

  const spotifySongs = (spotifyData ?? []) as SpotifySong[];

  return (
    <div className="space-y-4">
      {themeSuggestions && themeSuggestions.length > 0 && (
        <div className="bg-card rounded-lg p-4 border">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-foreground">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Song Suggestions
          </h2>
          <ul className="space-y-2">
            {themeSuggestions.map((suggestion, index) => (
              <li
                key={index}
                className="flex items-start gap-3 p-2 rounded transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0 mt-1.5">
                  <p className="text-sm font-medium leading-relaxed">
                    {suggestion}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {spotifySongs.length > 0 && (
        <div className="bg-card rounded-lg p-4 border border-green-500/20">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-green-500">
            <Music2 className="h-5 w-5" />
            Hot Karaoke From Spotify
          </h2>
          <ul className="space-y-1">
            {spotifySongs.map((song, index) => (
              <li
                key={index}
                className="flex items-center gap-3 pr-2 rounded transition-colors"
              >
                <button
                  type="button"
                  className="flex flex-1 items-center gap-3 p-2 min-w-0 text-left"
                  onClick={() => onSuggestionClick(decode(song.title), song.artist)}
                >
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md">
                    {song.coverUrl ? (
                      <Image
                        src={song.coverUrl}
                        alt={song.title}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <div className="h-full w-full bg-muted flex items-center justify-center text-xs">
                        {index + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{decode(song.title)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {song.artist}
                    </p>
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  aria-label={`Search for ${song.title}`}
                  onClick={() => onSuggestionClick(decode(song.title), song.artist)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-card rounded-lg p-4 border">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Top Played (All Time)
        </h2>

        {isLoadingStats ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : stats?.topSongs && stats.topSongs.length > 0 ? (
          <ul className="space-y-1">
            {stats.topSongs.map((song, index) => (
              <li
                key={song.id}
                className="flex items-center gap-3 pr-2 rounded transition-colors"
              >
                <button
                  type="button"
                  className="flex flex-1 items-center gap-3 p-2 min-w-0 text-left"
                  onClick={() =>
                    onSuggestionClick(decode(song.title), song.artist ?? "")
                  }
                >
                  <div className="relative h-8 w-8 rounded-md bg-orange-500 text-white flex items-center justify-center font-semibold text-sm overflow-hidden">
                    {song.coverUrl ? (
                      <Image
                        src={song.coverUrl}
                        alt={song.title}
                        fill
                        className="object-cover"
                        sizes="32px"
                      />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {decode(song.title)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Played {song.count} time{song.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  aria-label={`Search for ${song.title}`}
                  onClick={() =>
                    onSuggestionClick(decode(song.title), song.artist ?? "")
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No songs played yet.
          </p>
        )}
      </div>

      <div className="bg-card rounded-lg p-4 border">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Singers (All Time)
        </h2>

        {isLoadingStats ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : stats?.topSingers && stats.topSingers.length > 0 ? (
          <ul className="">
            {stats.topSingers.map((singer, index) => (
              <li
                key={singer.name}
                className="flex items-center gap-3 py-1.5 px-2 rounded transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500 text-black flex items-center justify-center font-semibold text-sm">
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                  <p className="font-medium text-sm truncate">{singer.name}</p>
                  <div className="flex flex-shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <Music className="h-3 w-3" />
                    <span>{singer.count}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No singers yet.
          </p>
        )}
      </div>
    </div>
  );
}
