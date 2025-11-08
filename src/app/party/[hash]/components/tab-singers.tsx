"use client";

import type { VideoInPlaylist } from "party";
import { useState } from "react";
import { Users, MicVocal, ChevronDown, LogOut, Crown } from "lucide-react";
import { Button } from "~/components/ui/ui/button";
import { cn } from "~/lib/utils";
import { decode } from "html-entities";
import { SongCountdownTimer } from "~/components/song-countdown-timer"; 

type Participant = {
  name: string;
  role: string;
};

type Props = {
  currentSong: VideoInPlaylist | null;
  unplayedPlaylist: VideoInPlaylist[];
  playedPlaylist: VideoInPlaylist[];
  participants: Participant[];
  name: string; 
  onLeaveParty: () => void;
  isPlaying: boolean; 
  remainingTime: number; 
};

export function TabSingers({
  currentSong,
  unplayedPlaylist,
  playedPlaylist,
  participants,
  name,
  onLeaveParty,
  isPlaying, 
  remainingTime, 
}: Props) {
  const [showPlayedMap, setShowPlayedMap] = useState<Record<string, boolean>>(
    {},
  );

  const togglePlayed = (singer: string) => {
    setShowPlayedMap((prev) => ({ ...prev, [singer]: !prev[singer] }));
  };

  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.name === name) return -1;
    if (b.name === name) return 1;
    return a.name.localeCompare(b.name);
  });

  const currentSingerName = currentSong?.singerName;
  const nextSingerName = unplayedPlaylist[0]?.singerName;

  return (
    <div className="bg-card rounded-lg p-4 border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Singers ({participants.length})
        </h2>
        <Button
          variant="ghost"
          onClick={onLeaveParty}
          className="text-foreground/80 sm:hover:text-red-500 sm:hover:bg-red-500/10"
          aria-label="Leave party"
        >
          <span className="text-lg font-semibold text-white mr-1.5">Leave</span>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      {participants.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No singers yet
        </p>
      ) : (
        <div className="space-y-3">
          {sortedParticipants.map((participant) => {
            const playedSongs = playedPlaylist.filter((v) => v.singerName === participant.name);
            const nextSongs = unplayedPlaylist.filter((v) => v.singerName === participant.name);
            const currentSongForSinger = (currentSong?.singerName === participant.name) ? currentSong : null;
            const totalSongs = playedSongs.length + nextSongs.length + (currentSongForSinger ? 1 : 0);
            
            const showPlayed = !!showPlayedMap[participant.name];
            const isYou = participant.name === name; 
            const isHost = participant.role === "Host";

            const isCurrentSinger = participant.name === currentSingerName;
            const isNextSinger = participant.name === nextSingerName;

            return (
              <div
                key={participant.name} 
                className="p-4 rounded-lg border bg-muted/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      {/* --- THIS IS THE FIX (Req #4) --- */}
                      {/* Icon now animates if it's the current singer, regardless of play state */}
                      {isHost ? (
                        <Crown className={cn("h-5 w-5", isCurrentSinger && "animate-pulse")} />
                      ) : (
                        <MicVocal className={cn("h-5 w-5", isCurrentSinger && "animate-pulse")} />
                      )}
                      {/* --- END THE FIX (Req #4) --- */}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{participant.name}</p>
                        {/* --- THIS IS REQ #5 (Already correct) --- */}
                        {/* Show timer if this is the NEXT singer and a song is playing/paused */}
                        {isNextSinger && currentSong && (
                          <SongCountdownTimer
                            remainingTime={remainingTime}
                            className={cn(isPlaying ? "text-primary" : "text-muted-foreground")}
                          />
                        )}
                        {/* --- END REQ #5 --- */}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {totalSongs} song(s)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isYou && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                        You
                      </span>
                    )}

                    {(playedSongs.length > 0 || nextSongs.length > 0 || !!currentSongForSinger) && (
                      <Button
                        type="button"
                        onClick={() => togglePlayed(participant.name)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white"
                      >
                        <span className="sr-only">
                          {showPlayed
                            ? "Hide Songs"
                            : `Show All Songs (${totalSongs})`}
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

                {showPlayed ? (
                  <div className="mt-2 space-y-3">
                    {(!!currentSongForSinger || nextSongs.length > 0) && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          In Line: {currentSongForSinger ? nextSongs.length + 1 : nextSongs.length}
                        </p>
                        <ul className="space-y-1">
                          {currentSongForSinger && (
                            <li
                              key={currentSongForSinger.id}
                              className="text-xs truncate pl-2 font-bold text-primary"
                            >
                              • {decode(currentSongForSinger.title)} (Playing Now)
                            </li>
                          )}
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
                          {playedSongs.map((song) => (
                            <li
                              key={song.id + (song.playedAt?.toString() ?? "")} 
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
                  <div className="text-xs text-muted-foreground">
                    {(!!currentSongForSinger || nextSongs.length > 0) &&
                      `${nextSongs.length + (currentSongForSinger ? 1 : 0)} in line`}
                    {(!!currentSongForSinger || nextSongs.length > 0) && playedSongs.length > 0 && " • "}
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
