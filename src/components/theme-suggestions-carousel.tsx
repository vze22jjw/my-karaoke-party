"use client";

import { useState } from "react";
import {
  Disc,
  Radio,
  Zap,
  Mic2,
  Crown,
  Users,
  Flame,
  Sparkles,
  Snowflake,
  Plus,
  Wand2,
  X,
  Search,
} from "lucide-react";
import { api } from "~/trpc/react";
import { decode } from "html-entities";
import { Button } from "~/components/ui/ui/button";
import { Input } from "~/components/ui/ui/input";
import { Skeleton } from "~/components/ui/ui/skeleton";
import { cn } from "~/lib/utils";
import { useTranslations } from "next-intl";
import { THEME_PRESETS, type ThemePreset } from "~/config/theme-presets";

type Props = {
  onSuggestionClick: (title: string, artist: string) => void;
  className?: string;
};

const ICON_MAP: Record<string, React.ElementType> = {
  Disc,
  Radio,
  Zap,
  Mic2,
  Crown,
  Users,
  Flame,
  Sparkles,
  Snowflake,
};

export function ThemeSuggestionsCarousel({ onSuggestionClick, className }: Props) {
  const t = useTranslations("guest.history");
  const [selectedThemeId, setSelectedThemeId] = useState<string>("80s");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [activeCustomVibe, setActiveCustomVibe] = useState<string | null>(null);
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const { data: songs, isLoading, isFetching } = api.themeSuggestions.getThemedSongs.useQuery(
    {
      themeId: activeCustomVibe ? undefined : selectedThemeId,
      customPrompt: activeCustomVibe ?? undefined,
    },
    {
      staleTime: 1000 * 60 * 60 * 24, // 24 hours in client
      refetchOnWindowFocus: false,
    }
  );

  const handleSelectPreset = (preset: ThemePreset) => {
    setActiveCustomVibe(null);
    setSelectedThemeId(preset.id);
  };

  const handleApplyCustomVibe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    setActiveCustomVibe(customPrompt.trim());
    setSelectedThemeId("custom");
    setIsCustomOpen(false);
  };

  const getThemeLabel = (preset: ThemePreset) => {
    try {
      const translated = t(`themes.${preset.id}` as Parameters<typeof t>[0]);
      return translated && !translated.startsWith("guest.history") ? translated : preset.defaultLabel;
    } catch {
      return preset.defaultLabel;
    }
  };

  return (
    <div className={cn("space-y-3 rounded-lg border bg-card p-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
          <Sparkles className="h-5 w-5 text-purple-400" />
          {t("exploreThemes")}
        </h3>
        <Button
          variant={selectedThemeId === "custom" ? "default" : "outline"}
          size="sm"
          className="text-xs h-7 gap-1"
          onClick={() => setIsCustomOpen(!isCustomOpen)}
        >
          <Wand2 className="h-3.5 w-3.5 text-yellow-400" />
          {t("customVibe")}
        </Button>
      </div>

      {/* Custom Vibe Input Panel */}
      {isCustomOpen && (
        <form
          onSubmit={handleApplyCustomVibe}
          className="p-3 rounded-lg border bg-muted/40 space-y-2 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">{t("customVibeTitle")}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground"
              onClick={() => setIsCustomOpen(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("customVibeDesc")}</p>
          <div className="flex gap-2">
            <Input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={t("customVibePlaceholder")}
              className="h-8 text-xs bg-background"
              autoFocus
            />
            <Button type="submit" size="sm" className="h-8 text-xs shrink-0" disabled={!customPrompt.trim()}>
              <Search className="h-3.5 w-3.5 mr-1" />
              {t("generate")}
            </Button>
          </div>
        </form>
      )}

      {/* Horizontal Scrollable Theme Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar touch-pan-x">
        {THEME_PRESETS.map((preset) => {
          const Icon = ICON_MAP[preset.icon] ?? Sparkles;
          const isSelected = selectedThemeId === preset.id && !activeCustomVibe;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 border shrink-0",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-sm ring-1 ring-primary/50"
                  : "bg-muted/60 text-muted-foreground border-white/10 hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{getThemeLabel(preset)}</span>
            </button>
          );
        })}

        {/* Active Custom Vibe Pill if active */}
        {activeCustomVibe && (
          <button
            type="button"
            onClick={() => setIsCustomOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap bg-primary text-primary-foreground border-primary shadow-sm shrink-0"
          >
            <Wand2 className="h-3.5 w-3.5 text-yellow-300 shrink-0" />
            <span className="truncate max-w-[140px]">&quot;{activeCustomVibe}&quot;</span>
          </button>
        )}
      </div>

      {/* Song List Content */}
      <div className="space-y-1.5 pt-1">
        {isLoading || isFetching ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-11 w-full rounded-md" />
            <Skeleton className="h-11 w-full rounded-md" />
            <Skeleton className="h-11 w-full rounded-md" />
            <Skeleton className="h-11 w-full rounded-md" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        ) : songs && songs.length > 0 ? (
          <ul className="space-y-1.5">
            {songs.map((song, idx) => (
              <li
                key={`${song.title}-${song.artist}-${idx}`}
                className="flex items-center justify-between p-2 rounded-lg border bg-background hover:bg-muted/30 transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-muted-foreground shrink-0">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate text-foreground">{decode(song.title)}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                      <span className="truncate">{song.artist}</span>
                      {song.year && (
                        <span className="px-1.5 py-0.2 rounded bg-muted/80 text-[10px] shrink-0 font-mono">
                          {song.year}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="default"
                  className="h-8 w-8 shrink-0 shadow-sm"
                  aria-label={`Search and queue ${song.title}`}
                  onClick={() => onSuggestionClick(decode(song.title), song.artist)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-4">{t("noSongsFound")}</p>
        )}
      </div>
    </div>
  );
}
