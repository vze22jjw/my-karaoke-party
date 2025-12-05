"use client";

import { useState, useRef } from "react";
import { Lightbulb, Flame, Loader2, Music2, Plus, Mic2, Star } from "lucide-react";
import { api } from "~/trpc/react";
import { decode } from "html-entities";
import Image from "next/image";
import { Button } from "~/components/ui/ui/button";
import { cn } from "~/lib/utils";
import { useTranslations } from "next-intl";
import { FunStatsCarousel } from "./fun-stats-carousel";
import type { VideoInPlaylist } from "~/types/app-types";

// --- Types ---
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

type TopSong = {
    id: string;
    title: string;
    coverUrl: string;
    count: number;
    artist: string | null;
};

type TopArtist = {
    name: string;
    count: number;
};

type StatsData = {
    topSongs: TopSong[];
    rareGemSongs?: TopSong[];
    topArtists: TopArtist[];
    rareGemArtists?: TopArtist[];
    topSingersBySongs: { name: string; count: number }[];
    topSingersByApplause: { name: string; applauseCount: number }[];
    topSongsByApplause: { title: string; applause: number; singer: string }[];
    globalStats: {
        totalSongs: number;
        totalApplause: number;
        bestDressed: { avatar: string | null; count: number } | null;
        oneHitWonder: { name: string; applauseCount: number } | null;
        marathonRunner: { name: string; totalDurationMs: number } | null;
    };
};

type Props = {
  themeSuggestions: string[];
  spotifyPlaylistId?: string | null;
  onSuggestionClick: (title: string, artist: string) => void;
  // Prefix unused props with underscore to fix linter warning
  participants: Participant[]; 
  playlist: VideoInPlaylist[]; 
  playedPlaylist: VideoInPlaylist[];
};

// --- SUB-COMPONENTS ---

function SpotifySection({ 
  songs, 
  onSuggestionClick 
}: { 
  songs: SpotifySong[], 
  onSuggestionClick: (t: string, a: string) => void 
}) {
  const t = useTranslations('guest.history');
  
  return (
    <div className="bg-card rounded-lg p-4 border border-green-500/20 h-full">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-green-500">
        <Music2 className="h-5 w-5" />
        {t('hotSpotify')}
      </h2>
      <ul className="space-y-1">
        {songs.map((song, index) => (
          <li key={index} className="flex items-center gap-3 pr-0 rounded transition-colors group">
            {/* Reduced tap area: Left side is text only */}
            <div className="flex flex-1 items-center gap-3 p-2 min-w-0">
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
            </div>
            {/* Right side is the interactive button */}
            <Button
              variant="default"
              size="icon"
              className="h-8 w-8 shadow-sm flex-shrink-0"
              aria-label={`Add ${song.title}`}
              onClick={(e) => {
                  e.stopPropagation();
                  onSuggestionClick(decode(song.title), song.artist);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SongStatsCard({
    isLoading,
    songs,
    rareSongs,
    onSuggestionClick
}: {
    isLoading: boolean;
    songs: TopSong[];
    rareSongs?: TopSong[];
    onSuggestionClick: (t: string, a: string) => void;
}) {
    const t = useTranslations('guest.history');
    const [showRare, setShowRare] = useState(false);

    const listToDisplay = showRare ? (rareSongs ?? []) : songs;
    const title = showRare ? t('rareGems') : t('topPlayed');
    const iconColor = showRare ? "text-purple-500" : "text-orange-500";

    return (
        <div className="bg-card rounded-lg p-4 border h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    {showRare ? <Star className={cn("h-5 w-5", iconColor)} /> : <Flame className={cn("h-5 w-5", iconColor)} />}
                    {title}
                </h2>
                
                {/* Toggle Switch */}
                <button
                    onClick={() => setShowRare(!showRare)}
                    className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-muted rounded hover:bg-muted/80 transition-colors"
                >
                    {showRare ? t('showTop') : t('showRare')}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : listToDisplay.length > 0 ? (
                    <ul className="space-y-1">
                        {listToDisplay.map((song, index) => (
                            <li key={`${song.id}-${index}`} className="flex items-center gap-3 pr-0 rounded transition-colors group">
                                <div className="flex flex-1 items-center gap-3 p-2 min-w-0">
                                    <div className={cn("relative h-8 w-8 rounded-md text-white flex items-center justify-center font-semibold text-sm overflow-hidden", showRare ? "bg-purple-500" : "bg-orange-500")}>
                                        {song.coverUrl ? (
                                            <Image src={song.coverUrl} alt={song.title} fill className="object-cover" sizes="32px" />
                                        ) : (
                                            <span>{index + 1}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{decode(song.title)}</p>
                                        <p className="text-xs text-muted-foreground">{t('playedTimes', { count: song.count })}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="default"
                                    size="icon"
                                    className="h-8 w-8 shadow-sm flex-shrink-0"
                                    aria-label={`Add ${song.title}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSuggestionClick(decode(song.title), song.artist ?? "");
                                    }}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">{t('noSongs')}</p>
                )}
            </div>
        </div>
    );
}

function ArtistStatsCard({
    isLoading,
    artists,
    rareArtists,
    onSuggestionClick
}: {
    isLoading: boolean;
    artists: TopArtist[];
    rareArtists?: TopArtist[];
    onSuggestionClick: (t: string, a: string) => void;
}) {
    const t = useTranslations('guest.history');
    const [showRare, setShowRare] = useState(false);

    const listToDisplay = showRare ? (rareArtists ?? []) : artists;
    const title = showRare ? t('rareArtists') : t('topArtists');
    const iconColor = showRare ? "text-purple-500" : "text-blue-500";

    return (
        <div className="bg-card rounded-lg p-4 border h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Mic2 className={cn("h-5 w-5", iconColor)} />
                    {title}
                </h2>
                
                <button
                    onClick={() => setShowRare(!showRare)}
                    className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-muted rounded hover:bg-muted/80 transition-colors"
                >
                     {showRare ? t('showTop') : t('showRare')}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : listToDisplay.length > 0 ? (
                    <ul className="space-y-1">
                        {listToDisplay.map((artist, idx) => (
                            <li key={`${artist.name}-${idx}`} className="flex items-center gap-3 pr-0 rounded transition-colors group">
                                <div className="flex flex-1 items-center gap-3 p-2 min-w-0">
                                    <div className={cn("flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm", showRare ? "bg-purple-500/20 text-purple-500" : "bg-blue-500/20 text-blue-500")}>
                                        <Mic2 className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{decode(artist.name)}</p>
                                        <p className="text-xs text-muted-foreground">{t('playedTimes', { count: artist.count })}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="default"
                                    size="icon"
                                    className="h-8 w-8 shadow-sm flex-shrink-0"
                                    aria-label={`Search for ${artist.name}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSuggestionClick(artist.name, "");
                                    }}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">{t('noArtists')}</p>
                )}
            </div>
        </div>
    );
}

// --- MAIN COMPONENT ---

export function TabHistory({
  themeSuggestions,
  spotifyPlaylistId,
  onSuggestionClick,
  participants: _participants,
  playlist: _playlist,
  playedPlaylist: _playedPlaylist
}: Props) {
  const t = useTranslations('guest.history');
  const [slide, setSlide] = useState(0);
  const touchStartRef = useRef<number | null>(null);

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

  // Determine slides based on content availability
  const slides = [];
  if (hasSpotify) slides.push("spotify");
  slides.push("songs");
  slides.push("artists");

  // Ensure index is valid when slides change
  if (slide >= slides.length && slides.length > 0) {
      setSlide(0);
  }

  // Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0]) {
        touchStartRef.current = e.touches[0].clientX;
    }
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
      if (touchStartRef.current === null || !e.changedTouches[0]) return;
      const touchEnd = e.changedTouches[0].clientX;
      const diff = touchStartRef.current - touchEnd;
      
      if (Math.abs(diff) > 50) {
          if (diff > 0) {
              // Next
              setSlide((prev) => (prev + 1) % slides.length);
          } else {
              // Prev
              setSlide((prev) => (prev - 1 + slides.length) % slides.length);
          }
      }
      touchStartRef.current = null;
  };

  return (
    <div className="space-y-4 pb-6">
      
      {/* Host Suggestions - Always Visible */}
      <div className="bg-card rounded-lg p-4 border">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-foreground">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          {t('suggestions')}
        </h2>
        {themeSuggestions && themeSuggestions.length > 0 ? (
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
        ) : (
            <p className="italic text-muted-foreground text-sm pl-2 py-1">{t('hostPlaceholder')}</p>
        )}
      </div>

      {/* Main Suggestions Carousel */}
      <div 
        className="w-full overflow-hidden touch-pan-y select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
           <div 
             className="flex transition-transform duration-300 ease-in-out w-full"
             style={{ transform: `translateX(-${slide * 100}%)` }}
           >
              {hasSpotify && (
                  <div className="w-full flex-shrink-0">
                    <SpotifySection 
                        songs={spotifySongs} 
                        onSuggestionClick={onSuggestionClick} 
                    />
                  </div>
              )}
              
              <div className="w-full flex-shrink-0">
                <SongStatsCard 
                    isLoading={isLoadingStats}
                    songs={stats?.topSongs ?? []}
                    rareSongs={stats?.rareGemSongs ?? []}
                    onSuggestionClick={onSuggestionClick}
                />
              </div>

              <div className="w-full flex-shrink-0">
                <ArtistStatsCard 
                    isLoading={isLoadingStats}
                    artists={stats?.topArtists ?? []}
                    rareArtists={stats?.rareGemArtists ?? []}
                    onSuggestionClick={onSuggestionClick}
                />
              </div>
           </div>
           
           <div className="flex justify-center gap-3 mt-3">
              {slides.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setSlide(idx)}
                    className={cn(
                        "h-2 rounded-full transition-all duration-300 p-2 focus:outline-none", 
                        slide === idx 
                            ? "bg-primary w-6" 
                            : "bg-black/40 hover:bg-black/60 w-2"
                    )}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
              ))}
           </div>
      </div>

      {/* Fun Stats Carousel (No changes to styles, width matches parent) */}
      <FunStatsCarousel stats={stats as StatsData | undefined} />

    </div>
  );
}
