"use client";

import type { KaraokeParty } from "party";
import { decode } from "html-entities";
import { Lightbulb } from "lucide-react";

type Props = {
  playlist: KaraokeParty["playlist"];
  themeSuggestions: string[];
};

export function TabHistory({ playlist, themeSuggestions }: Props) {
  const playedVideos = playlist.filter((video) => video.playedAt);
  const partyHistory = [...playedVideos].reverse();

  // Calculate Top Played...
  const songCounts = playedVideos.reduce(
    (acc, video) => {
      const title = decode(video.title);
      acc[title] = (acc[title] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const topPlayed = Object.entries(songCounts)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      
      {/* --- UPDATED: Song Suggestions --- */}
      {themeSuggestions && themeSuggestions.length > 0 && (
        <div className="bg-card rounded-lg p-4 border">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Song Suggestions
          </h2>
          <ul className="space-y-2">
            {themeSuggestions.map((suggestion, index) => (
              <li
                key={index}
                className="flex items-start gap-3 p-2 rounded hover:bg-muted transition-colors"
              >
                {/* Updated circle to w-8 h-8 and primary color to match Top Played */}
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
      {/* --- END UPDATED SECTION --- */}

      {/* Top Played Section */}
      <div className="bg-card rounded-lg p-4 border">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          Top Played
        </h2>
        {topPlayed.length > 0 ? (
          <ul className="space-y-2">
            {topPlayed.map(([title, count], index) => (
              <li
                key={title}
                className="flex items-center gap-3 p-2 rounded hover:bg-muted transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{title}</p>
                  <p className="text-xs text-muted-foreground">
                    Played {count} time(s)
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No songs have been played yet.
          </p>
        )}
      </div>

      {/* Party History Section */}
      <div className="bg-card rounded-lg p-4 border">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          Party History
        </h2>
        {partyHistory.length > 0 ? (
          <ul className="space-y-2">
            {partyHistory.map((video) => (
              <li
                key={video.id + (video.playedAt?.toString() ?? "")}
                className="flex items-start gap-3 p-2 rounded hover:bg-muted transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate opacity-75">
                    {decode(video.title)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Sung by: {video.singerName}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No songs in history.
          </p>
        )}
      </div>
    </div>
  );
}
