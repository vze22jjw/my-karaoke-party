"use client";

import { useState } from "react";
import { Lightbulb, Trophy, Flame, Loader2, Music2, Music, Plus, Mic2 } from "lucide-react";
import { api } from "~/trpc/react";
import { decode } from "html-entities";
import Image from "next/image";
import { Button } from "~/components/ui/ui/button";
import { formatCompactNumber } from "~/utils/number";
import { cn } from "~/lib/utils";
import { useTranslations } from "next-intl";

type SpotifySong = {
  title: string;
  artist: string;
  coverUrl: string;
};

type TopSinger = {
  name: string;
  count: number;
  applauseCount: number;
}

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
  const t = useTranslations('guest.history');
  const [sortBy, setSortBy] = useState<"songs" | "applause">("songs");
  const [topPlayedMode, setTopPlayedMode] = useState<"songs" | "artists">("songs");
  const [slide, setSlide] = useState(0);

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

  const currentTopSingers = sortBy === "songs" 
    ? stats?.topSingersBySongs 
    : stats?.topSingersByApplause;

  // --- Components for Sections ---

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
    <div className="space-y-4">
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
        <div className="w-full overflow-hidden pb-4">
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
                 className={cn("h-2 w-2 rounded-full transition-all", slide === 0 ? "bg-primary w-4" : "bg-muted-foreground/30")}
              />
              <button 
                 onClick={() => setSlide(1)}
                 className={cn("h-2 w-2 rounded-full transition-all", slide === 1 ? "bg-primary w-4" : "bg-muted-foreground/30")}
              />
           </div>
        </div>
      ) : (
        <TopPlayedSection />
      )}

      <div className="bg-card rounded-lg p-4 border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            {t('topSingers')}
          </h2>
          
          <div className="flex items-center bg-muted rounded-md p-1">
            <button
              onClick={() => setSortBy("songs")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-sm transition-all",
                sortBy === "songs" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t('sortBySongs')}
            </button>
            <button
              onClick={() => setSortBy("applause")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-sm transition-all",
                sortBy === "applause" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t('sortByClaps')}
            </button>
          </div>
        </div>

        {isLoadingStats ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : currentTopSingers && currentTopSingers.length > 0 ? (
          <ul className="space-y-2">
            {(currentTopSingers as TopSinger[]).map((singer, index) => ( 
              <li
                key={singer.name}
                className="flex items-center justify-between p-3 rounded-lg transition-colors border border-white/5 bg-muted/30"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                    index === 0 ? "bg-yellow-500 text-black" : 
                    index === 1 ? "bg-slate-300 text-black" : 
                    index === 2 ? "bg-orange-700 text-white" : 
                    "bg-muted text-muted-foreground" 
                  )}>
                    {index + 1}
                  </div>
                  <p className="font-semibold text-base truncate text-white">{singer.name}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1.5 rounded-md border border-white/5">
                    <Music className={cn("h-3.5 w-3.5", sortBy === 'songs' ? "text-cyan-400" : "text-muted-foreground")} />
                    <span className={cn("text-xs font-mono font-medium", sortBy === 'songs' ? "text-white" : "text-muted-foreground")}>
                        {singer.count}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1.5 rounded-md border border-white/5">
                    <span className="text-sm">👏</span>
                    <span className={cn("text-xs font-mono font-medium", sortBy === 'applause' ? "text-pink-500" : "text-muted-foreground")}>
                        {formatCompactNumber(singer.applauseCount)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('noSingers')}
          </p>
        )}
      </div>
    </div>
  );
}
