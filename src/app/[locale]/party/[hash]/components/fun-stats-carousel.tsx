/* eslint-disable @typescript-eslint/no-unnecessary-condition */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Trophy, ThumbsUp, Flower2, Heart, Flame, Star, Mic2, Plus, Loader2,
  type LucideIcon 
} from "lucide-react";
import { formatCompactNumber } from "~/utils/number";
import { cn } from "~/lib/utils";
import { useTranslations } from "next-intl";
import emojiMap from "~/config/emoji-map.json";
import { decode } from "html-entities";
import Image from "next/image";
import { Button } from "~/components/ui/ui/button";

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

type GlobalStatsData = {
  topSongs?: TopSong[];
  rareGemSongs?: TopSong[];
  topArtists?: TopArtist[];
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
  stats?: GlobalStatsData;
  isLoading?: boolean;
  onSuggestionClick?: (title: string, artist: string) => void;
};

interface ListItem {
  rank?: number;
  label: string;
  value: string;
  subValue?: string | null;
}

interface GridItem {
  label: string;
  value: string;
  sub?: string | null;
  icon: string | LucideIcon; 
}

interface BaseCard {
  id: string;
  title: string;
  icon: LucideIcon;
  color: string;
}

interface ListCard extends BaseCard {
  type: "list";
  data: ListItem[];
}

interface GridCard extends BaseCard {
  type: "grid";
  items: GridItem[];
}

interface CustomSongsCard extends BaseCard {
  type: "topSongs";
}

interface CustomArtistsCard extends BaseCard {
  type: "topArtists";
}

type CarouselCard = ListCard | GridCard | CustomSongsCard | CustomArtistsCard;

const CARD_DURATION = 10000; 

export function FunStatsCarousel({ stats, isLoading, onSuggestionClick }: Props) {
  const t = useTranslations("guest.funStats");
  const tHistory = useTranslations("guest.history");
  
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showRareSongs, setShowRareSongs] = useState(false);
  const [showRareArtists, setShowRareArtists] = useState(false);

  const touchStartRef = useRef<number | null>(null);
  const autoRotateRef = useRef<NodeJS.Timeout | null>(null);

  const topSongs = stats?.topSongs ?? [];
  const rareGemSongs = stats?.rareGemSongs ?? [];
  const topArtists = stats?.topArtists ?? [];
  const rareGemArtists = stats?.rareGemArtists ?? [];

  const topSingersBySongs = stats?.topSingersBySongs ?? [];
  const topSingersByApplause = stats?.topSingersByApplause ?? [];
  const topSongsByApplause = stats?.topSongsByApplause ?? [];
  
  const globalStats = stats?.globalStats ?? { 
    totalSongs: 0, 
    totalApplause: 0, 
    bestDressed: null, 
    oneHitWonder: null,
    marathonRunner: null
  };

  const rawGridItems: (GridItem | null)[] = [
    {
      label: t("loyalFans"),
      value: `${formatCompactNumber(globalStats.totalApplause)} ${emojiMap.variables.applause_emoji}`,
      sub: t("totalClaps"),
      icon: emojiMap.variables.applause_emoji
    },
    globalStats.marathonRunner ? {
      label: t("marathon"),
      value: `${Math.floor(globalStats.marathonRunner.totalDurationMs / 60000)}m`,
      sub: globalStats.marathonRunner.name,
      icon: emojiMap.variables.marathon_emoji
    } : null,
    globalStats.oneHitWonder ? {
      label: t("oneHitWonder"),
      value: `${formatCompactNumber(globalStats.oneHitWonder.applauseCount)} ${emojiMap.variables.applause_emoji}`,
      sub: globalStats.oneHitWonder.name,
      icon: emojiMap.variables.one_hit_emoji
    } : null,
    {
      label: t("totalPlayed"),
      value: formatCompactNumber(globalStats.totalSongs),
      sub: t("songsCount", { count: globalStats.totalSongs }).replace(/\d+\s/, ""),
      icon: emojiMap.variables.songs_emoji
    },
    globalStats.bestDressed ? {
      label: t("bestDressed"),
      value: `${formatCompactNumber(globalStats.bestDressed.count)}x`,
      sub: globalStats.bestDressed.avatar,
      icon: emojiMap.variables.best_dressed_emoji
    } : null,
  ];

  const gridItems: GridItem[] = rawGridItems.filter((item): item is GridItem => item !== null);

  const cards: CarouselCard[] = [
    // 1. Top Played Songs / Rare Gems
    {
      id: "top-songs",
      title: showRareSongs ? tHistory("rareGems") : tHistory("topPlayed"),
      icon: showRareSongs ? Star : Flame,
      color: showRareSongs ? "text-purple-500" : "text-orange-500",
      type: "topSongs",
    },
    // 2. Top Artists / Rare Artists
    {
      id: "top-artists",
      title: showRareArtists ? tHistory("rareArtists") : tHistory("topArtists"),
      icon: Mic2,
      color: showRareArtists ? "text-purple-500" : "text-blue-500",
      type: "topArtists",
    },
    // 3. Most Eager Singers
    {
      id: "eager",
      title: t("mostEager"),
      icon: Trophy,
      color: "text-yellow-500",
      type: "list",
      data: topSingersBySongs.map((p, i) => ({
        rank: i + 1,
        label: p.name,
        value: t("songsCount", { count: p.count }),
        subValue: null
      }))
    },
    // 4. Best Encore Songs
    {
      id: "encore",
      title: t("encore"),
      icon: ThumbsUp,
      color: "text-blue-400",
      type: "list",
      data: topSongsByApplause.map((s, i) => ({
        rank: i + 1,
        label: s.title,
        value: `${formatCompactNumber(s.applause)} ${emojiMap.variables.applause_emoji}`,
        subValue: s.singer 
      }))
    },
    // 5. Divas Leaderboard
    {
      id: "divas",
      title: t("divas"),
      icon: Flower2,
      color: "text-pink-500",
      type: "list",
      data: topSingersByApplause.map((p, i) => ({
        rank: i + 1,
        label: p.name,
        value: `${formatCompactNumber(p.applauseCount)} ${emojiMap.variables.applause_emoji}`,
        subValue: null
      }))
    },
    // 6. Party Stats Grid
    {
      id: "stats",
      title: t("partyStats"),
      icon: Heart,
      color: "text-red-500",
      type: "grid",
      items: gridItems
    }
  ];

  const activeStats = cards.filter((s) => {
    if (s.type === "topSongs") return true;
    if (s.type === "topArtists") return true;
    if (s.type === "list") return s.data.length > 0;
    if (s.type === "grid") return s.items.length > 0;
    return false;
  });

  const nextSlide = useCallback(() => {
    if (activeStats.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % activeStats.length);
  }, [activeStats.length]);

  const prevSlide = useCallback(() => {
    if (activeStats.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + activeStats.length) % activeStats.length);
  }, [activeStats.length]);

  useEffect(() => {
    if (activeStats.length <= 1 || !autoRotate) {
      if (autoRotateRef.current) clearInterval(autoRotateRef.current);
      return;
    }
    
    const resetTimer = () => {
      if (autoRotateRef.current) clearInterval(autoRotateRef.current);
      autoRotateRef.current = setInterval(nextSlide, CARD_DURATION);
    };
    resetTimer();
    return () => { if (autoRotateRef.current) clearInterval(autoRotateRef.current); };
  }, [nextSlide, activeStats.length, autoRotate]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0]) touchStartRef.current = e.touches[0].clientX;
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null || !e.changedTouches[0]) return;
    const diff = touchStartRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      setAutoRotate(false);
      if (diff > 0) nextSlide(); else prevSlide();
    }
    touchStartRef.current = null;
  };

  const handleDotClick = (index: number) => {
    setAutoRotate(false);
    setActiveIndex(index);
  };

  if (!stats && isLoading) {
    return (
      <div className="bg-card rounded-lg p-3 border text-center text-muted-foreground h-[300px] flex items-center justify-center">
        {t("loading")}
      </div>
    );
  }

  if (activeStats.length === 0) {
    return (
      <div className="bg-card rounded-lg p-3 border text-center text-muted-foreground h-[300px] flex items-center justify-center">
        {t("empty")}
      </div>
    );
  }

  const currentCard = activeStats[activeIndex] ?? activeStats[0]!;
  const Icon = currentCard.icon;

  const songsToDisplay = showRareSongs ? rareGemSongs : topSongs;
  const artistsToDisplay = showRareArtists ? rareGemArtists : topArtists;

  return (
    <div 
      className="w-full touch-pan-y select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="bg-card rounded-lg p-3 border h-[300px] flex flex-col relative overflow-hidden transition-all duration-300">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", currentCard.color)} />
            <h2 className="text-lg font-semibold">{currentCard.title}</h2>
          </div>

          {currentCard.type === "topSongs" && (
            <button
              onClick={() => {
                setAutoRotate(false);
                setShowRareSongs(!showRareSongs);
              }}
              className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-muted rounded hover:bg-muted/80 transition-colors"
              data-testid="toggle-stats-songs"
            >
              {showRareSongs ? tHistory("showTop") : tHistory("showRare")}
            </button>
          )}

          {currentCard.type === "topArtists" && (
            <button
              onClick={() => {
                setAutoRotate(false);
                setShowRareArtists(!showRareArtists);
              }}
              className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-muted rounded hover:bg-muted/80 transition-colors"
              data-testid="toggle-stats-artists"
            >
              {showRareArtists ? tHistory("showTop") : tHistory("showRare")}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {currentCard.type === "topSongs" ? (
            isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : songsToDisplay.length > 0 ? (
              <ul className="space-y-1">
                {songsToDisplay.map((song, index) => (
                  <li key={`${song.id}-${index}`} className="flex items-center gap-3 pr-0 rounded transition-colors group">
                    <div className="flex flex-1 items-center gap-3 p-2 min-w-0">
                      <div
                        className={cn(
                          "relative h-8 w-8 rounded-md text-white flex items-center justify-center font-semibold text-sm overflow-hidden shrink-0",
                          showRareSongs ? "bg-purple-500" : "bg-orange-500"
                        )}
                      >
                        {song.coverUrl ? (
                          <Image src={song.coverUrl} alt={song.title} fill className="object-cover" sizes="32px" />
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{decode(song.title)}</p>
                        <p className="text-xs text-muted-foreground">{tHistory("playedTimes", { count: song.count })}</p>
                      </div>
                    </div>
                    {onSuggestionClick && (
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
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">{tHistory("noSongs")}</p>
            )
          ) : currentCard.type === "topArtists" ? (
            isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : artistsToDisplay.length > 0 ? (
              <ul className="space-y-1">
                {artistsToDisplay.map((artist, idx) => (
                  <li key={`${artist.name}-${idx}`} className="flex items-center gap-3 pr-0 rounded transition-colors group">
                    <div className="flex flex-1 items-center gap-3 p-2 min-w-0">
                      <div
                        className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm",
                          showRareArtists ? "bg-purple-500/20 text-purple-500" : "bg-blue-500/20 text-blue-500"
                        )}
                      >
                        <Mic2 className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{decode(artist.name)}</p>
                        <p className="text-xs text-muted-foreground">{tHistory("playedTimes", { count: artist.count })}</p>
                      </div>
                    </div>
                    {onSuggestionClick && (
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
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">{tHistory("noArtists")}</p>
            )
          ) : currentCard.type === "list" ? (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-right-4 duration-300">
              {currentCard.data.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-white/5 h-[42px]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs",
                      item.rank === 1 ? "bg-yellow-500 text-black" : 
                      item.rank === 2 ? "bg-slate-300 text-black" : 
                      item.rank === 3 ? "bg-orange-700 text-white" : 
                      "bg-muted text-muted-foreground"
                    )}>
                      {item.rank}
                    </div>
                    <div className="min-w-0 flex flex-col justify-center">
                      <p className="font-medium truncate text-sm leading-tight">{item.label}</p>
                      {item.subValue && <p className="text-[10px] text-muted-foreground truncate leading-tight">{item.subValue}</p>}
                    </div>
                  </div>
                  <span className={cn("font-bold font-mono text-xs whitespace-nowrap ml-2", currentCard.color)}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 animate-in fade-in slide-in-from-right-4 duration-300">
              {currentCard.items.map((stat, idx) => (
                <div key={idx} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-2 rounded-lg bg-muted/20 border border-white/5 h-[42px]">
                  <span className="text-lg flex-shrink-0 w-6 text-center">
                    {typeof stat.icon === "string" ? stat.icon : <stat.icon className={cn("h-4 w-4", currentCard.color)} />}
                  </span>
                  
                  <div className="min-w-0 flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-0.5">{stat.label}</p>
                    <div className="flex items-center gap-1 min-w-0">
                      <p className="text-sm font-semibold leading-tight">{stat.sub}</p>
                      {stat.label === t("bestDressed") && <span className="text-base leading-none">{stat.sub}</span>}
                    </div>
                  </div>
                  
                  <span className="text-sm font-mono font-bold text-primary whitespace-nowrap ml-2">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-3 mt-3 shrink-0 h-5 items-center">
        {activeStats.map((_, idx) => (
          <button
            key={idx}
            onClick={() => handleDotClick(idx)}
            className={cn(
              "h-2 rounded-full transition-all duration-300 p-2 focus:outline-none", 
              activeIndex === idx ? "bg-primary w-6" : "bg-black/40 hover:bg-black/60 w-2"
            )}
            aria-label={`Slide ${idx + 1}`}
            data-testid={`fun-stats-dot-${idx}`}
          />
        ))}
      </div>
    </div>
  );
}
