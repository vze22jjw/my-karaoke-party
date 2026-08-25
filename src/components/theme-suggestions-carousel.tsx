/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  TrendingUp,
  Users,
  Gift,
  Disc,
  Flame,
  Mic,
  Clapperboard,
  Globe,
  Wand2,
  Sparkles,
  Radio,
  Zap,
  Music,
  Crown,
  Snowflake,
  Ghost,
  Film,
  Theater,
  Sun,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Lightbulb,
  Mic2,
} from "lucide-react";
import { api } from "~/trpc/react";
import { decode } from "html-entities";
import Image from "next/image";
import { Button } from "~/components/ui/ui/button";
import { Input } from "~/components/ui/ui/input";
import { Skeleton } from "~/components/ui/ui/skeleton";
import { cn } from "~/lib/utils";
import { useTranslations } from "next-intl";
import { THEME_CATEGORIES, type SubThemePill } from "~/config/theme-presets";

type Props = {
  themeSuggestions?: string[];
  onSuggestionClick: (title: string, artist: string) => void;
  className?: string;
};

const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp,
  Users,
  Gift,
  Disc,
  Flame,
  Mic,
  Clapperboard,
  Globe,
  Wand2,
  Sparkles,
  Radio,
  Zap,
  Music,
  Crown,
  Snowflake,
  Ghost,
  Film,
  Theater,
  Sun,
  Mic2,
  Lightbulb,
};

type CategoryCard = {
  id: string;
  name: string;
  iconName: string;
  isHostThemes?: boolean;
  isCustom?: boolean;
  pills: SubThemePill[];
};

export function ThemeSuggestionsCarousel({
  themeSuggestions = [],
  onSuggestionClick,
  className,
}: Props) {
  const t = useTranslations("guest.history");

  // Check if host party themes are provided
  const hostThemeStrings = useMemo(
    () => (themeSuggestions ?? []).filter((s) => s.trim().length > 0),
    [themeSuggestions]
  );
  const hasHostThemes = hostThemeStrings.length > 0;

  // Build the list of category cards (Party Themes as Card #1)
  const allCategories: CategoryCard[] = useMemo(() => {
    const hostCategoryCard: CategoryCard = {
      id: "party-themes",
      name: "Party Themes",
      iconName: "Lightbulb",
      isHostThemes: true,
      pills: hostThemeStrings.map((themeStr, idx) => ({
        id: `host-theme-${idx}`,
        name: themeStr,
        promptGuide: themeStr,
        iconName: "Sparkles",
      })),
    };

    return [
      hostCategoryCard,
      ...THEME_CATEGORIES.map((c) => ({
        id: c.id,
        name: c.name,
        iconName: c.iconName,
        isCustom: c.isCustom,
        pills: c.pills,
      })),
    ];
  }, [hostThemeStrings]);

  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
  const [activePillId, setActivePillId] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [activeCustomPrompt, setActiveCustomPrompt] = useState<string | null>(null);

  const activeCategory = allCategories[activeCategoryIdx] ?? allCategories[0]!;

  // Default to first pill whenever category changes
  useEffect(() => {
    if (activeCategory.pills.length > 0) {
      const firstPill = activeCategory.pills[0];
      if (firstPill) {
        setActivePillId(firstPill.id);
      }
    } else {
      setActivePillId("");
    }
  }, [activeCategoryIdx, activeCategory]);

  // Touch Swipe handlers
  const touchStartRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      touchStartRef.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null || !e.changedTouches[0]) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStartRef.current - touchEnd;

    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        // Swipe left -> Next category
        setActiveCategoryIdx((prev) => (prev + 1) % allCategories.length);
      } else {
        // Swipe right -> Prev category
        setActiveCategoryIdx((prev) => (prev - 1 + allCategories.length) % allCategories.length);
      }
    }
    touchStartRef.current = null;
  };

  const nextCategory = () => {
    setActiveCategoryIdx((prev) => (prev + 1) % allCategories.length);
  };

  const prevCategory = () => {
    setActiveCategoryIdx((prev) => (prev - 1 + allCategories.length) % allCategories.length);
  };

  // Determine query parameters
  const isCustomCard = activeCategory.isCustom;
  const isHostThemesCard = activeCategory.isHostThemes;

  const currentHostPill = isHostThemesCard
    ? activeCategory.pills.find((p) => p.id === activePillId)
    : undefined;

  const { data: songs, isLoading, isFetching } = api.themeSuggestions.getThemedSongs.useQuery(
    {
      pillId: !isCustomCard && !isHostThemesCard ? activePillId : undefined,
      customPrompt: isCustomCard
        ? activeCustomPrompt ?? undefined
        : isHostThemesCard
        ? currentHostPill?.promptGuide
        : undefined,
    },
    {
      enabled:
        (!isCustomCard && !isHostThemesCard && !!activePillId) ||
        (isCustomCard && !!activeCustomPrompt) ||
        (isHostThemesCard && !!currentHostPill?.promptGuide),
      staleTime: 1000 * 60 * 60 * 24, // 24 hours
      refetchOnWindowFocus: false,
    }
  );

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPrompt.trim().length > 0) {
      setActiveCustomPrompt(customPrompt.trim());
    }
  };

  const CategoryIcon = ICON_MAP[activeCategory.iconName] ?? Sparkles;

  return (
    <div
      className={cn(
        "bg-card rounded-xl p-4 border border-border shadow-sm flex flex-col space-y-3 select-none touch-pan-y",
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. Category Header & Navigation */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <CategoryIcon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground truncate">{activeCategory.name}</h2>
              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                {activeCategoryIdx + 1}/{allCategories.length}
              </span>
            </div>
          </div>
        </div>

        {/* Carousel Prev / Next Arrows */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
            onClick={prevCategory}
            aria-label="Previous Category"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
            onClick={nextCategory}
            aria-label="Next Category"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 2. Sub-Theme Pills Row or Custom Input */}
      {isCustomCard ? (
        <form onSubmit={handleCustomSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. songs about hair, 80s movie hits..."
              className="pl-9 text-xs h-9 bg-background"
            />
          </div>
          <Button type="submit" size="sm" className="h-9 px-3 text-xs gap-1.5 shrink-0" disabled={isLoading || isFetching}>
            <Wand2 className="h-3.5 w-3.5" />
            {t("generate") ?? "Generate"}
          </Button>
        </form>
      ) : activeCategory.pills.length > 0 ? (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          {activeCategory.pills.map((pill) => {
            const PillIcon = (pill.iconName && ICON_MAP[pill.iconName]) || Sparkles;
            const isSelected = activePillId === pill.id;

            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setActivePillId(pill.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 border",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]"
                    : "bg-muted/50 text-muted-foreground border-border/40 hover:bg-muted hover:text-foreground"
                )}
              >
                <PillIcon className="h-3 w-3 shrink-0" />
                <span>{pill.name}</span>
              </button>
            );
          })}
        </div>
      ) : isHostThemesCard && !hasHostThemes ? (
        <div className="p-3 bg-muted/30 rounded-lg border border-dashed text-center">
          <p className="text-xs text-muted-foreground italic">
            Host has not set party themes yet. Set themes in Host Settings to generate custom party songs.
          </p>
        </div>
      ) : null}

      {/* 3. Songs List Container (Exactly 5 songs visible, remaining scrollable) */}
      <div className="h-[295px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
        {isLoading || isFetching ? (
          <div className="space-y-2 py-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg border bg-background/50">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <Skeleton className="w-10 h-10 rounded-md shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-2.5 w-1/2" />
                  </div>
                </div>
                <Skeleton className="w-8 h-8 rounded-md shrink-0 ml-2" />
              </div>
            ))}
          </div>
        ) : songs && songs.length > 0 ? (
          songs.map((song, idx) => (
            <div
              key={`${song.title}-${song.artist}-${idx}`}
              className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-background hover:bg-muted/40 transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                {/* Album Cover Art */}
                <div className="relative w-10 h-10 rounded-md overflow-hidden bg-muted/80 shrink-0 border border-border/40">
                  {song.coverUrl ? (
                    <Image
                      src={song.coverUrl}
                      alt={song.title}
                      fill
                      className="object-cover"
                      sizes="40px"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary">
                      <Music className="h-4 w-4 opacity-70" />
                    </div>
                  )}
                </div>

                {/* Song Details */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate text-foreground leading-tight">
                    {decode(song.title)}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate mt-0.5">
                    <span className="truncate">{song.artist}</span>
                    {song.year && (
                      <span className="px-1.5 py-0.2 rounded bg-muted text-[10px] shrink-0 font-mono">
                        {song.year}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 1-Click Search and Queue Button */}
              <Button
                size="icon"
                variant="default"
                className="h-8 w-8 shrink-0 shadow-sm transition-transform active:scale-95"
                aria-label={`Search and queue ${song.title}`}
                onClick={() => onSuggestionClick(decode(song.title), song.artist)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ))
        ) : isCustomCard && !activeCustomPrompt ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
            <Wand2 className="h-8 w-8 mb-2 opacity-40 text-primary" />
            <p className="text-sm font-medium">Create a custom vibe</p>
            <p className="text-xs text-muted-foreground/80 mt-1 max-w-[240px]">
              Type any prompt like &quot;songs about hair&quot; or &quot;beach party&quot; to generate 10 songs with album art.
            </p>
          </div>
        ) : isHostThemesCard && !hasHostThemes ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
            <Lightbulb className="h-8 w-8 mb-2 opacity-40 text-yellow-500" />
            <p className="text-sm font-medium">No Party Themes Configured</p>
            <p className="text-xs text-muted-foreground/80 mt-1 max-w-[240px]">
              The host can set custom themes in Party Settings to populate this card.
            </p>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
            <Music className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-xs">{t("noSongs") ?? "No suggestions available"}</p>
          </div>
        )}
      </div>

      {/* 4. Bottom Category Dots Navigation */}
      <div className="flex justify-center items-center gap-1.5 pt-1 border-t border-border/40">
        {allCategories.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveCategoryIdx(idx)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300 focus:outline-none",
              activeCategoryIdx === idx ? "bg-primary w-5" : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-1.5"
            )}
            aria-label={`Go to category ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
