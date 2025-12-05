"use client";

import type { VideoInPlaylist } from "~/types/app-types";
import { useState, useMemo } from "react";
import { Users, MicVocal, ChevronDown, LogOut, Music, Info } from "lucide-react";
import { Button } from "~/components/ui/ui/button";
import { cn } from "~/lib/utils";
import { decode } from "html-entities";
import { SongCountdownTimer } from "~/components/song-countdown-timer";
import { Link, useRouter } from "~/navigation"; 
import { formatCompactNumber } from "~/utils/number";
import { useTranslations } from "next-intl";

type Participant = {
  name: string;
  role: string;
  avatar: string | null;
  applauseCount: number;
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
  onReplayTour: () => void;
};

export function TabSingers({
  currentSong, unplayedPlaylist, playedPlaylist, participants, name, onLeaveParty: _propLeaveParty, isPlaying, remainingTime, onReplayTour
}: Props) {
  const t = useTranslations('guest.singers');
  const router = useRouter();
  const [showPlayedMap, setShowPlayedMap] = useState<Record<string, boolean>>({});
  const togglePlayed = (singer: string) => setShowPlayedMap((prev) => ({ ...prev, [singer]: !prev[singer] }));

  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.name === name) return -1;
    if (b.name === name) return 1;
    return a.name.localeCompare(b.name);
  });

  const currentSingerName = currentSong?.singerName;
  const nextSingerName = unplayedPlaylist[0]?.singerName;
  
  const nextSingerMessage = useMemo(() => {
    if (!nextSingerName) return "";
    const messages = [
        t('countdown.serve'),
        t('countdown.turnUp'),
        t('countdown.singIn'),
        t('countdown.micIn')
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }, [nextSingerName, t]);

  const [currentPartyHash, setCurrentPartyHash] = useState('');
  if (typeof window !== 'undefined' && currentPartyHash === '') {
    const parts = window.location.pathname.split('/');
    const hash = parts[3];
    if (hash) setCurrentPartyHash(hash);
  }

  const handleGuestLeave = () => {
    if (typeof window !== "undefined") {
      Object.keys(window.localStorage).forEach((key) => {
        if (key.startsWith(`guest-${currentPartyHash}-`)) {
          window.localStorage.removeItem(key);
        }
      });
    }
    router.push("/");
  };

  return (
    <div className="bg-card rounded-lg border h-full flex flex-col overflow-hidden relative">
      
      <div className="flex-shrink-0 p-4 border-b border-border/10 bg-card z-10">
        <div className="flex items-center justify-between h-12 gap-1">
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="whitespace-nowrap">{t('title')} ({participants.length})</span>
            </h2>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-muted-foreground hover:bg-transparent hover:text-muted-foreground" 
              onClick={onReplayTour}
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex-1 flex justify-center items-center px-2 min-w-0">
            {currentPartyHash && (
               <Link href={`/applause/${currentPartyHash}`} passHref legacyBehavior>
                  <Button 
                      asChild 
                      variant="ghost" 
                      size="icon" 
                      className="text-white h-14 w-14 text-4xl font-bold flex-shrink-0 hover:bg-transparent" 
                      aria-label="Send applause"
                  >
                      <a className="w-full h-full flex items-center justify-center pb-1">👏</a>
                  </Button>
              </Link>
            )}
          </div>

          <div className="flex items-center flex-shrink-0">
            <Button 
              variant="ghost" 
              onClick={handleGuestLeave} 
              className="text-foreground/80 px-2 hover:bg-transparent hover:text-foreground/80" 
              aria-label="Leave party"
            >
              <span className="text-lg font-semibold text-white mr-1">{t('leaveParty')}</span>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-4">
        {participants.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No singers yet</p>
        ) : (
          <div className="space-y-3 pt-4">
            {sortedParticipants.map((participant) => {
              const playedSongs = playedPlaylist.filter((v) => v.singerName === participant.name);
              const nextSongs = unplayedPlaylist.filter((v) => v.singerName === participant.name);
              const currentSongForSinger = currentSong?.singerName === participant.name ? currentSong : null;
              const totalSongs = playedSongs.length + nextSongs.length + (currentSongForSinger ? 1 : 0);
              const showPlayed = !!showPlayedMap[participant.name];
              const isYou = participant.name === name;
              const isHost = participant.role === "Host";
              const isCurrentSinger = participant.name === currentSingerName;
              const isNextSinger = participant.name === nextSingerName;

              return (
                <div 
                  key={participant.name} 
                  className={cn(
                    "p-3 rounded-xl border transition-all shadow-sm",
                    isYou 
                      ? "bg-primary/10 border-primary/40 shadow-primary/5"
                      : "bg-white/5 border-white/10"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn("w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0", isCurrentSinger && "animate-pulse")}>
                        {participant.avatar ? <span className="text-2xl">{participant.avatar}</span> : isHost ? <span className="text-2xl">👑</span> : <MicVocal className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold leading-tight break-words">{participant.name}</p>
                          {isYou && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded flex-shrink-0">{t('you')}</span>}
                        </div>
                        
                        <div className="flex items-center justify-between mt-1 pr-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Music className="h-3 w-3" />
                              <span>{totalSongs}</span>
                            </div>
                          </div>
                          
                          {isNextSinger && currentSong && (
                            <div className="text-xs font-mono">
                              <SongCountdownTimer 
                                remainingTime={remainingTime} 
                                className={cn("font-bold", isPlaying ? "text-primary" : "text-muted-foreground")} 
                                message={nextSingerMessage} 
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 self-start pt-1">
                      {(playedSongs.length > 0 || nextSongs.length > 0 || !!currentSongForSinger) && (
                        <Button type="button" onClick={() => togglePlayed(participant.name)} variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-transparent">
                          <ChevronDown className={cn("h-5 w-5 transition-transform", showPlayed ? "rotate-180" : "")} />
                        </Button>
                      )}
                    </div>
                  </div>
                  {showPlayed && (
                    <div className="mt-2 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      <p className="text-xs font-medium text-muted-foreground">
                          {t('claps')} {formatCompactNumber(participant.applauseCount)} 👏
                          <span className="mx-2">•</span>
                          <span>{playedSongs.length} {t('sang')}</span>
                          <span className="mx-2">•</span>
                          <span>{nextSongs.length + (currentSongForSinger ? 1 : 0)} {t('next')}</span>
                      </p>
                      {(!!currentSongForSinger || nextSongs.length > 0) && (
                        <div className="pt-2 border-t border-white/10">
                          <p className="text-xs font-medium text-muted-foreground mb-1">{t('inLine')}</p>
                          <ul className="space-y-1">
                            {currentSongForSinger && <li className="text-xs truncate pl-2 font-bold text-primary">• {decode(currentSongForSinger.title)} (Playing Now)</li>}
                            {nextSongs.map((song) => <li key={song.id} className="text-xs truncate pl-2">• {decode(song.title)}</li>)}
                          </ul>
                        </div>
                      )}
                      {playedSongs.length > 0 && (
                        <div className="pt-2 border-t border-white/10">
                          <p className="text-xs font-medium text-muted-foreground mb-1">{t('history')}</p>
                          <ul className="space-y-1">
                            {playedSongs.map((song) => <li key={song.id + (song.playedAt?.toString() ?? "")} className="text-xs truncate pl-2 text-muted-foreground">• {decode(song.title)}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
