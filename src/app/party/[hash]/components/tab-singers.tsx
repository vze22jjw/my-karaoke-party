"use client";

import type { KaraokeParty } from "party";
import { useState } from "react";
import { Users, MicVocal, ChevronDown, DoorOpen } from "lucide-react";
import { Button } from "~/components/ui/ui/button";
import { cn } from "~/lib/utils";
import { decode } from "html-entities";

type Props = {
  playlist: KaraokeParty["playlist"];
  singers: string[];
  name: string;
  onLeaveParty: () => void;
};

export function TabSingers({ playlist, singers, name, onLeaveParty }: Props) {
  const [showPlayedMap, setShowPlayedMap] = useState<Record<string, boolean>>(
    {},
  );

  const togglePlayed = (singer: string) => {
    setShowPlayedMap((prev) => ({ ...prev, [singer]: !prev[singer] }));
  };

  return (
    <div className="bg-card rounded-lg p-4 border">
      {/* START: Updated header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Singers ({singers.length})
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onLeaveParty}
          className="text-foreground/80 hover:text-red-500 hover:bg-red-500/10"
          aria-label="Leave party"
        >
          <DoorOpen className="h-6 w-6" />
        </Button>
      </div>
      {/* END: Updated header */}

      {singers.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No singers yet
        </p>
      ) : (
        <div className="space-y-3">
          {singers.map((singer) => {
            const singerSongs = playlist.filter(
              (v) => v.singerName === singer,
            );
            const nextSongs = singerSongs.filter((v) => !v.playedAt);
            const playedSongs = singerSongs.filter((v) => v.playedAt);
            const showPlayed = !!showPlayedMap[singer];

            return (
              <div
                key={singer}
                className="p-4 rounded-lg border bg-muted/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <MicVocal className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{singer}</p>
                      <p className="text-xs text-muted-foreground">
                        {singerSongs.length} song(s)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {singer === name && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                        You
                      </span>
                    )}

                    {/* Toggle button for song history */}
                    {(playedSongs.length > 0 || nextSongs.length > 0) && (
                      <Button
                        type="button"
                        onClick={() => togglePlayed(singer)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white"
                      >
                        <span className="sr-only">
                          {showPlayed
                            ? "Hide Songs"
                            : `Show All Songs (${singerSongs.length})`}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 transition-transform",
                            showPlayed ? "rotate-180" : "",
                          )}
                        />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Show songs section */}
                {showPlayed ? (
                  // Show all songs when expanded
                  <div className="mt-2 space-y-3">
                    {nextSongs.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          In Line: {nextSongs.length}
                        </p>
                        <ul className="space-y-1">
                          {nextSongs.map((song) => (
                            <li
                              key={song.id}
                              className="text-xs truncate pl-2"
                            >
                              • {decode(song.title)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {playedSongs.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Already sang: {playedSongs.length}
                        </p>
                        <ul className="space-y-1">
                          {playedSongs.reverse().map((song) => (
                            <li
                              key={song.id}
                              className="text-xs truncate pl-2 text-muted-foreground"
                            >
                              • {decode(song.title)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  // Show summary when collapsed
                  <div className="text-xs text-muted-foreground">
                    {nextSongs.length > 0 && `${nextSongs.length} in line`}
                    {nextSongs.length > 0 && playedSongs.length > 0 && " • "}
                    {playedSongs.length > 0 && `${playedSongs.length} played`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
