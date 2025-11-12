"use client";

import type { KaraokeParty } from "party";
import { Lightbulb, Trophy, Flame, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { decode } from "html-entities";

type Props = {
  playlist: KaraokeParty["playlist"];
  themeSuggestions: string[];
};

export function TabHistory({ playlist, themeSuggestions }: Props) {
  // Fetch global stats
  const { data: stats, isLoading } = api.playlist.getGlobalStats.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    }
  );

  return (
    <div className="space-y-4">
      {/* --- Song Suggestions (Theme) --- */}
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
                className="flex items-start gap-3 p-2 rounded hover:bg-muted transition-colors"
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

      {/* --- Top Played (Global) --- */}
      <div className="bg-card rounded-lg p-4 border">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Top Played (All Time)
        </h2>
        
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : stats?.topSongs && stats.topSongs.length > 0 ? (
          <ul className="space-y-2">
            {stats.topSongs.map((song, index) => (
              <li
                key={song.id}
                className="flex items-center gap-3 p-2 rounded hover:bg-muted transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{decode(song.title)}</p>
                  <p className="text-xs text-muted-foreground">
                    Played {song.count} time{song.count !== 1 ? "s" : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No songs played yet.
          </p>
        )}
      </div>

      {/* --- Singer History (Global Top Singers) --- */}
      <div className="bg-card rounded-lg p-4 border">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Singers (All Time)
        </h2>

        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : stats?.topSingers && stats.topSingers.length > 0 ? (
          <ul className="space-y-2">
            {stats.topSingers.map((singer, index) => (
              <li
                key={singer.name}
                className="flex items-center gap-3 p-2 rounded hover:bg-muted transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500 text-black flex items-center justify-center font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{singer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {singer.count} song{singer.count !== 1 ? "s" : ""} sung
                  </p>
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
