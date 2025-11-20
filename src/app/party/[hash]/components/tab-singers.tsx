"use client";

import type { VideoInPlaylist } from "~/types/app-types";
// --- THIS IS THE FIX (Req #1) ---
import { useState, useMemo } from "react";
// --- END THE FIX ---
// --- THIS IS THE FIX ---
// Added Music and Info icons
import {
  Users,
  MicVocal,
  ChevronDown,
  LogOut,
  Crown,
  Music,
  Info,
} from "lucide-react";
// --- END THE FIX ---
import { Button } from "~/components/ui/ui/button";
import { cn } from "~/lib/utils";
import { decode } from "html-entities";
import { SongCountdownTimer } from "~/components/song-countdown-timer";

// --- UPDATE PARTICIPANT TYPE ---
type Participant = {
  name: string;
  role: string;
  avatar: string | null;
};
// --- END UPDATE ---

type Props = {
  currentSong: VideoInPlaylist | null;
  unplayedPlaylist: VideoInPlaylist[];
  playedPlaylist: VideoInPlaylist[];
  participants: Participant[];
  name: string;
  onLeaveParty: () => void;
  isPlaying: boolean;
  remainingTime: number; // <-- ADD THIS PROP
  onReplayTour: () => void; // <-- THIS IS THE FIX
};

// --- THIS IS THE FIX (Req #1) ---
const nextSingerMessages = [
  "Serve In",
  "Turn Up",
  "Sing In",
  "Mic In",
  "Set In",
  "Next In",
];
// --- END THE FIX ---

export function TabSingers({
  currentSong,
  unplayedPlaylist,
  playedPlaylist,
  participants,
  name,
  onLeaveParty,
  isPlaying,
  remainingTime, // <-- GET THIS PROP
  onReplayTour, // <-- THIS IS THE FIX
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

  // --- THIS IS THE FIX (Req #1) ---
  // This hook selects a random message and only changes it when the next singer changes.
  const nextSingerMessage = useMemo(() => {
    if (!nextSingerName) return "";
    return nextSingerMessages[
      Math.floor(Math.random() * nextSingerMessages.length)
    ];
  }, [nextSingerName]);
  // --- END THE FIX ---

  return (
    <div className="bg-card rounded-lg p-4 border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Singers ({participants.length})
          {/* --- THIS IS THE FIX --- */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={onReplayTour}
          >
            <Info className="h-4 w-4" />
          </Button>
          {/* --- END THE FIX --- */}
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
            const playedSongs = playedPlaylist.filter(
              (v) => v.singerName === participant.name,
            );
            const nextSongs = unplayedPlaylist.filter(
              (v) => v.singerName === participant.name,
            );
            const currentSongForSinger =
              currentSong?.singerName === participant.name ? currentSong : null;
            const totalSongs =
              playedSongs.length +
              nextSongs.length +
              (currentSongForSinger ? 1 : 0);

            const showPlayed = !!showPlayedMap[participant.name];
            const isYou = participant.name === name;
            const isHost = participant.role === "Host";

            const isCurrentSinger = participant.name === currentSingerName;
            const isNextSinger = participant.name === nextSingerName;

            return (
              <div
                key={participant.name}
                // --- THIS IS THE FIX ---
                // Reduced padding from p-4 to p-3
                className="p-3 rounded-lg border bg-muted/50"
                // --- END THE FIX ---
              >
                <div
                  // --- THIS IS THE FIX ---
                  // Reduced margin-bottom from mb-2 to mb-1
                  className="flex items-center justify-between mb-1"
                  // --- END THE FIX ---
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* --- THIS IS THE FIX --- */}
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center",
                        isCurrentSinger && "animate-pulse",
                      )}
                    >
                      {participant.avatar ? (
                        <span className="text-2xl">{participant.avatar}</span>
                      ) : isHost ? (
                        <span className="text-2xl">👑</span>
                      ) : (
                        <MicVocal className="h-5 w-5" />
                      )}
                    </div>
                    {/* --- END THE FIX --- */}
                    {/* --- THIS IS THE FIX --- */}
                    {/* This div now contains all text and handles layout */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">
                          {participant.name}
                        </p>
                        {/* --- THIS IS THE FIX: Moved "You" badge here --- */}
                        {isYou && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded flex-shrink-0">
                            You
                          </span>
                        )}
                        {isNextSinger && currentSong && (
                          <SongCountdownTimer
                            remainingTime={remainingTime}
                            className={cn(
                              isPlaying
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                            message={nextSingerMessage}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Music className="h-3 w-3" />
                          <span>{totalSongs}</span>
                        </div>
                        {/* This text now appears here when collapsed */}
                        {!showPlayed && (
                          <div className="flex items-center gap-1 truncate">
                            <span className="opacity-50">•</span>
                            <span className="truncate">
                              {(!!currentSongForSinger || nextSongs.length > 0) &&
                                `${
                                  nextSongs.length + (currentSongForSinger ? 1 : 0)
                                } next`}
                              {(!!currentSongForSinger || nextSongs.length > 0) &&
                                playedSongs.length > 0 &&
                                " • "}
                              {playedSongs.length > 0 &&
                                `${playedSongs.length} sang`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* --- END THE FIX --- */}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* --- "You" badge was moved from here --- */}
                    {(playedSongs.length > 0 ||
                      nextSongs.length > 0 ||
                      !!currentSongForSinger) && (
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

                {/* --- THIS IS THE FIX --- */}
                {/* The logic for the "closed" state text was removed from here */}
                {showPlayed && (
                  <div className="mt-2 space-y-3">
                    {(!!currentSongForSinger || nextSongs.length > 0) && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          In Line:{" "}
                          {currentSongForSinger
                            ? nextSongs.length + 1
                            : nextSongs.length}
                        </p>
                        <ul className="space-y-1">
                          {currentSongForSinger && (
                            <li
                              key={currentSongForSinger.id}
                              className="text-xs truncate pl-2 font-bold text-primary"
                            >
                              • {decode(currentSongForSinger.title)} (Playing
                              Now)
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
                )}
                {/* --- END THE FIX --- */}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
