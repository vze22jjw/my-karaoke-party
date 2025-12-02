"use client";

import { useState, useCallback } from "react";
import { Lightbulb, Flame, Loader2, Music2, Plus, Mic2 } from "lucide-react";
import { api } from "~/trpc/react";
import { decode } from "html-entities";
import Image from "next/image";
import { Button } from "~/components/ui/ui/button";
import { cn } from "~/lib/utils";
import { useTranslations } from "next-intl";
import { FunStatsCarousel } from "./fun-stats-carousel";
import type { VideoInPlaylist } from "~/types/app-types";
import { formatCompactNumber } from "~/utils/number";

type SpotifySong = {
  title: string;
  artist: string;
  coverUrl: string;
};

type Participant = {
    name: string;
    role: string;
    avatar: string | null;
    applauseCount: number;
    joinedAt?: Date | string; 
};

type Props = {
  themeSuggestions: string[];
  spotifyPlaylistId?: string | null;
  onSuggestionClick: (title: string, artist: string) => void;
  participants: Participant[]; 
  playlist: VideoInPlaylist[]; 
  playedPlaylist: VideoInPlaylist[];
};

export function TabHistory({
  themeSuggestions,
  spotifyPlaylistId,
  onSuggestionClick,
  participants,
  playlist,
  playedPlaylist
}: Props) {
  const t = useTranslations('guest.history');
  const [topPlayedMode, setTopPlayedMode] = useState<"songs" | "artists">("songs");
  const [slide, setSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const { data: stats, isLoading: isLoadingStats } =
    api.playlist.getGlobalStats.useQuery(undefined, {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    });

  const { data: spotifyData } = api.spotify.getTopKaraokeSongs.useQuery(
    { playlistId: spotifyPlaylistId }, 
    { refetchOnWindowFocus: false, staleTime: 1000 * 60 * 60 }, 
  );

  const spotifySongs = (spotifyData ?? []) as SpotifySong[];
  const hasSpotify = spotifySongs.length > 0;
  const showCarousel = hasSpotify;

  const fullPlaylistHistory = [...playedPlaylist, ...playlist];

  // Fixed Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0]) {
        setTouchStart(e.touches[0].clientX);
    }
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
      if (touchStart === null || !e.changedTouches[0]) return;
      const touchEnd = e.changedTouches[0].clientX;
      const diff = touchStart - touchEnd;
      if (Math.abs(diff) > 50) {
          if (diff > 0) setSlide(1); 
          else setSlide(0); 
      }
      setTouchStart(null);
  };

  const SpotifySection = () => (
    <div className="bg-card rounded-lg p-4 border border-green-500/20 h-full">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-green-500">
        <Music2 className="h-5 w-5" />
        {t('hotSpotify')}
      </h2>
      <ul className="space-y-1">
        {spotifySongs.map((song, index) => (
          <li key={index} className="flex items-center gap-3 pr-2 rounded transition-colors">
            <button
              type="button"
              className="flex flex-1 items-center gap-3 p-2 min-w-0 text-left"
              onClick={() => onSuggestionClick(decode(song.title), song.artist)}
            >
              <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md">
                {song.coverUrl ? (
                  <Image src={song.coverUrl} alt={song.title} fill className="object-cover" sizes="40px" />
                ) : (
                  <div className="h-full w-full bg-muted flex items-center justify-center text-xs">{index + 1}</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{decode(song.title)}</p>
                <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
              </div>
            </button>
            <Button
              variant="default"
              size="icon"
              className="h-6 w-6 shadow-xl flex-shrink-0"
              aria-label={`Search for ${song.title}`}
              onClick={() => onSuggestionClick(decode(song.title), song.artist)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );

  const TopPlayedSection = () => (
    <div className="bg-card rounded-lg p-4 border h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          {t('topPlayed')}
        </h2>

        <div className="flex items-center bg-muted rounded-md p-1">
          <button
            onClick={() => setTopPlayedMode("songs")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-sm transition-all",
              topPlayedMode === "songs" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t('sortBySongs')}
          </button>
          <button
            onClick={() => setTopPlayedMode("artists")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-sm transition-all",
              topPlayedMode === "artists" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.has('sortByArtists') ? t('sortByArtists') : "Artists"}
          </button>
        </div>
      </div>

      {isLoadingStats ? (
        <div className="flex justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        topPlayedMode === "songs" ? (
          stats?.topSongs && stats.topSongs.length > 0 ? (
            <ul className="space-y-1">
              {stats.topSongs.map((song, index) => (
                <li key={song.id} className="flex items-center gap-3 pr-2 rounded transition-colors">
                  <button
                    type="button"
                    className="flex flex-1 items-center gap-3 p-2 min-w-0 text-left"
                    onClick={() => onSuggestionClick(decode(song.title), song.artist ?? "")}
                  >
                    <div className="relative h-8 w-8 rounded-md bg-orange-500 text-white flex items-center justify-center font-semibold text-sm overflow-hidden">
                      {song.coverUrl ? (
                        <Image src={song.coverUrl} alt={song.title} fill className="object-cover" sizes="32px" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{decode(song.title)}</p>
                      <p className="text-xs text-muted-foreground">Played {song.count} time{song.count !== 1 ? "s" : ""}</p>
                    </div>
                  </button>
                  <Button
                    variant="default"
                    size="icon"
                    className="h-6 w-6 shadow-xl flex-shrink-0"
                    aria-label={`Search for ${song.title}`}
                    onClick={() => onSuggestionClick(decode(song.title), song.artist ?? "")}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">{t('noSongs')}</p>
          )
        ) : (
          stats?.topArtists && stats.topArtists.length > 0 ? (
            <ul className="space-y-1">
              {stats.topArtists.map((artist) => (
                <li key={artist.name} className="flex items-center gap-3 pr-2 rounded transition-colors">
                  <button
                    type="button"
                    className="flex flex-1 items-center gap-3 p-2 min-w-0 text-left"
                    onClick={() => onSuggestionClick(artist.name, "")}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center font-semibold text-sm">
                      <Mic2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{decode(artist.name)}</p>
                      <p className="text-xs text-muted-foreground">{artist.count} plays</p>
                    </div>
                  </button>
                  <Button
                    variant="default"
                    size="icon"
                    className="h-6 w-6 shadow-xl flex-shrink-0"
                    aria-label={`Search for ${artist.name}`}
                    onClick={() => onSuggestionClick(artist.name, "")}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No artists played yet.</p>
          )
        )
      )}
    </div>
  );

  return (
    <div className="space-y-4 pb-6">
      {themeSuggestions && themeSuggestions.length > 0 && (
        <div className="bg-card rounded-lg p-4 border">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-foreground">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            {t('suggestions')}
          </h2>
          <ul className="space-y-2">
            {themeSuggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-3 p-2 rounded transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0 mt-1.5">
                  <p className="text-sm font-medium leading-relaxed">{suggestion}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showCarousel ? (
        // Added touch-pan-y and select-none to fix swipe and scrolling issues
        <div 
          className="w-full overflow-hidden touch-pan-y select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
           <div 
             className="flex transition-transform duration-300 ease-in-out"
             style={{ transform: `translateX(-${slide * 100}%)` }}
           >
              <div className="w-full flex-shrink-0">
                 <SpotifySection />
              </div>
              <div className="w-full flex-shrink-0">
                 <TopPlayedSection />
              </div>
           </div>
           
           <div className="flex justify-center gap-2 mt-3">
              <button 
                 onClick={() => setSlide(0)}
                 className={cn("h-2 w-2 rounded-full transition-all", slide === 0 ? "bg-primary w-4" : "bg-black/40 hover:bg-black/60")}
              />
              <button 
                 onClick={() => setSlide(1)}
                 className={cn("h-2 w-2 rounded-full transition-all", slide === 1 ? "bg-primary w-4" : "bg-black/40 hover:bg-black/60")}
              />
           </div>
        </div>
      ) : (
        <TopPlayedSection />
      )}

      <FunStatsCarousel 
         playlist={fullPlaylistHistory.map(v => ({ 
             singerName: v.singerName, 
             duration: v.duration, 
             playedAt: v.playedAt 
         }))}
         participants={participants.map(p => ({
             name: p.name,
             applauseCount: p.applauseCount,
             avatar: p.avatar,
             joinedAt: p.joinedAt ? new Date(p.joinedAt) : new Date() 
         }))} 
      />

    </div>
  );
}
