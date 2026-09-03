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
  Music2,
  X,
  ShieldAlert,
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

const STORAGE_KEY_PROMPT = "mk_custom_vibe_prompt";

type SpotifySong = {
  title: string;
  artist: string;
  coverUrl?: string;
};

type Props = {
  themeSuggestions?: string[];
  spotifySongs?: SpotifySong[];
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
  Music2,
  Lightbulb,
};

type CategoryCard = {
  id: string;
  name: string;
  iconName: string;
  isHostThemes?: boolean;
  isSpotify?: boolean;
  isCustom?: boolean;
  pills: SubThemePill[];
};

export function ThemeSuggestionsCarousel({
  themeSuggestions = [],
  spotifySongs = [],
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
  const hasSpotify = spotifySongs && spotifySongs.length > 0;

  // Build the list of category cards (Party Themes as Card #1, Spotify as Card #2 if present)
  const allCategories: CategoryCard[] = useMemo(() => {
    const cards: CategoryCard[] = [];

    // 1. Party Themes
    cards.push({
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
    });

    // 2. Spotify Hot Karaoke (if available)
    if (hasSpotify) {
      cards.push({
        id: "spotify-hot",
        name: "Hot Karaoke From Spotify",
        iconName: "Music2",
        isSpotify: true,
        pills: [],
      });
    }

    // 3. Preset Categories
    for (const c of THEME_CATEGORIES) {
      cards.push({
        id: c.id,
        name: c.name,
        iconName: c.iconName,
        isCustom: c.isCustom,
        pills: c.pills,
      });
    }

    return cards;
  }, [hostThemeStrings, hasSpotify]);

  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
  const [activePillId, setActivePillId] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [activeCustomPrompt, setActiveCustomPrompt] = useState<string | null>(null);

  // 1. Preload ALL 24 preset pill songs in ONE request (30-day cache)
  const { data: allPresetSongs, isLoading: isLoadingPresets } = api.themeSuggestions.getAllPresetSongs.useQuery(
    undefined,
    {
      staleTime: 1000 * 60 * 60 * 24 * 30, // 30 days
      refetchOnWindowFocus: false,
    }
  );

  // Check if Gemini token is configured and available
  const { data: availabilityData } = api.themeSuggestions.isAvailable.useQuery(undefined, {
    staleTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
  });
  const isGeminiAvailable = availabilityData?.isAvailable ?? false;

  // Restore custom vibe query from client storage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY_PROMPT);
      if (stored && stored.trim().length > 0) {
        setCustomPrompt(stored);
        setActiveCustomPrompt(stored);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

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
        setActiveCategoryIdx((prev) => (prev + 1) % allCategories.length);
      } else {
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
  const isSpotifyCard = activeCategory.isSpotify;
  const isPresetCard = !isCustomCard && !isHostThemesCard && !isSpotifyCard;

  const currentHostPill = isHostThemesCard
    ? activeCategory.pills.find((p) => p.id === activePillId)
    : undefined;

  // On-demand query for Custom Vibe and Host Themes only
  const { data: dynamicResult, isLoading: isLoadingDynamic } = api.themeSuggestions.getThemedSongs.useQuery(
    {
      customPrompt: isCustomCard
        ? activeCustomPrompt ?? undefined
        : isHostThemesCard
        ? currentHostPill?.promptGuide
        : undefined,
    },
    {
      enabled:
        (isCustomCard && !!activeCustomPrompt) ||
        (isHostThemesCard && !!currentHostPill?.promptGuide),
      staleTime: 1000 * 60 * 60 * 24 * 30, // 30 days
      refetchOnWindowFocus: false,
    }
  );

  const isBlockedBySafety = dynamicResult?.isBlockedBySafety;
  const dynamicAiSongs = dynamicResult?.songs ?? [];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPrompt.trim().length > 0) {
      const cleanPrompt = customPrompt.trim();
      setActiveCustomPrompt(cleanPrompt);
      try {
        sessionStorage.setItem(STORAGE_KEY_PROMPT, cleanPrompt);
      } catch {
        // Ignore storage errors
      }
    }
  };

  const handleClearCustomPrompt = () => {
    setActiveCustomPrompt(null);
    setCustomPrompt("");
    try {
      sessionStorage.removeItem(STORAGE_KEY_PROMPT);
    } catch {
      // Ignore storage errors
    }
  };

  const CategoryIcon = ICON_MAP[activeCategory.iconName] ?? Sparkles;

  // Select songs to display:
  // - Spotify: from props (up to 10)
  // - Preset Cards: instantly from preloaded allPresetSongs dictionary (0ms latency!)
  // - Custom / Host: from dynamicAiSongs
  const displaySongs = isSpotifyCard
    ? spotifySongs.slice(0, 10)
    : isPresetCard
    ? allPresetSongs?.[activePillId] ?? []
    : dynamicAiSongs;

  const isCardLoading = isPresetCard
    ? isLoadingPresets && !allPresetSongs
    : !isSpotifyCard && isLoadingDynamic;

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
        activeCustomPrompt ? (
          /* Active Custom Vibe Search Tag with Clear button */
          <div className="flex items-center justify-between gap-2 p-1.5 px-2.5 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 min-w-0">
              <Wand2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <p className="text-xs font-semibold text-foreground truncate">
                &ldquo;{activeCustomPrompt}&rdquo;
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearCustomPrompt}
              className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground hover:bg-background/80 shrink-0"
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          </div>
        ) : (
          /* Input Field when no search is active */
          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. songs with a womans name, 80s rock..."
                className="pl-9 text-xs h-9 bg-background"
                autoFocus={isCustomCard}
              />
            </div>
            <Button type="submit" size="sm" className="h-9 px-3 text-xs gap-1.5 shrink-0" disabled={isLoadingDynamic}>
              <Wand2 className="h-3.5 w-3.5" />
              {t("generate") ?? "Generate"}
            </Button>
          </form>
        )
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
            Host has not set party themes yet. Set themes in Host Settings to populate this card.
          </p>
        </div>
      ) : null}

      {/* 3. Songs List Container (Exactly 5 songs visible, remaining scrollable) */}
      <div className="h-[295px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
        {isCardLoading ? (
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
        ) : isCustomCard && isBlockedBySafety ? (
          /* Custom Vibe Safety Block Message */
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="w-10 h-10 rounded-full bg-rose-500/15 text-rose-500 flex items-center justify-center mb-2">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-rose-500">
              {t("safetyBlockedTitle") ?? "Prompt Restricted"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[260px] leading-relaxed">
              {t("safetyBlockedDesc") ?? "This prompt could not be processed due to content safety policies. Please try a different theme, genre, or mood."}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearCustomPrompt}
              className="mt-3 text-xs h-7 px-3 border-rose-500/30 hover:bg-rose-500/10 text-rose-400"
            >
              {t("tryAnother") ?? "Try Another Vibe"}
            </Button>
          </div>
        ) : displaySongs && displaySongs.length > 0 ? (
          displaySongs.map((song, idx) => (
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
                    {"year" in song && Boolean(song.year) && (
                      <span className="px-1.5 py-0.2 rounded bg-muted text-[10px] shrink-0 font-mono">
                        {String(song.year)}
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
            <p className="text-sm font-medium">
              {!isGeminiAvailable
                ? (t("noTokenCachedSongs") ?? "No Token Provided, Cached Songs")
                : (t("noSuggestions") ?? "No Song Suggestions Yet")}
            </p>
            <p className="text-xs text-muted-foreground/80 mt-1 max-w-[240px]">
              {!isGeminiAvailable
                ? "Browse curated preset themes or configure GEMINI_API_KEY for dynamic AI generation."
                : 'Type any prompt like "songs with a womans name" or "beach party" to generate 10 songs with album art.'}
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
            <p className="text-xs">
              {!isGeminiAvailable
                ? (t("noTokenCachedSongs") ?? "No Token Provided, Cached Songs")
                : (t("noSuggestions") ?? "No Song Suggestions Yet")}
            </p>
          </div>
        )}
      </div>

      {/* 4. Bottom Category Dots Navigation */}
      <div className="flex justify-center items-center gap-1.5 pt-1 border-t border-border/40">
        {allCategories.map((_, idx) => (
          <button
            key={idx}
            type="button"
            data-testid={`history-dot-${idx}`}
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
