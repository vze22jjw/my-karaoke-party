"use client";

import { useState } from "react";
import { Button } from "~/components/ui/ui/button";
import { Alert, AlertDescription } from "~/components/ui/ui/alert";
import { Info, Copy, Check, ChevronDown, FileText, Music, Download } from "lucide-react";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { decode } from "html-entities";
import { removeBracketedContent } from "~/utils/string";
import type { VideoInPlaylist } from "~/types/app-types";
import { useTranslations } from "next-intl";

const IS_DEBUG = process.env.NEXT_PUBLIC_EVENT_DEBUG === "true";

type ExtendedVideo = VideoInPlaylist & { spotifyId?: string | null };

type Props = {
  partyName: string;
  playedPlaylist: ExtendedVideo[];
};

export function SettingsExport({ partyName: _partyName, playedPlaylist }: Props) {
  const t = useTranslations('host.settings.export');
  const tCommon = useTranslations('common');
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [exportFormat, setExportFormat] = useState<"text" | "spotify">("text");
  const [showExportInfo, setShowExportInfo] = useState(false);

  const getDataToCopy = () => {
    switch (exportFormat) {
      case "spotify":
        const uris = playedPlaylist
          .filter(s => s.spotifyId) 
          .map(s => `spotify:track:${s.spotifyId}`)
          .join("\n");
        
        if (!uris) return "No Spotify matches found.";
        return uris;
      case "text":
      default:
        return playedPlaylist.map((song) => {
          const artist = song.artist || "Unknown Artist";
          const title = song.song ? decode(song.song) : decode(removeBracketedContent(song.title));
          return `${artist} - ${title}`;
        }).join("\n");
    }
  };

  const handleCopy = async () => {
    if (playedPlaylist.length === 0) {
      toast.error("No songs to copy!");
      return;
    }
    try {
      const dataToCopy = getDataToCopy();
      const el = document.createElement('textarea');
      el.value = dataToCopy;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);

      toast.success(tCommon('success'));
      if (IS_DEBUG) console.log("[SettingsExport] Copied data to clipboard");
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      if (IS_DEBUG) console.error("[SettingsExport] Copy failed", err);
      toast.error(tCommon('error'));
    }
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Download className="h-5 w-5 text-purple-500" />
          {t('title')}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          onClick={() => setShowExportInfo((s) => !s)}
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>
      {showExportInfo && (
        <Alert className="mt-2">
          <AlertDescription>{t('info')}</AlertDescription>
        </Alert>
      )}
      <Button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        variant="secondary"
        className="flex w-full justify-between"
      >
        <span>
          {playedPlaylist.length}{" "}
          {playedPlaylist.length === 1 ? "Song" : "Songs"} Played
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 transition-transform",
            isExpanded ? "rotate-180" : "",
          )}
        />
      </Button>
      {isExpanded && (
        <div className="space-y-4 rounded-lg border bg-muted/50 p-4 animate-in fade-in">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={exportFormat === "text" ? "default" : "secondary"}
              onClick={() => setExportFormat("text")}
            >
              <FileText className="mr-2 h-4 w-4" /> {t('copyText')}
            </Button>
            <Button
              variant={exportFormat === "spotify" ? "default" : "secondary"}
              onClick={() => setExportFormat("spotify")}
              className="text-green-600 dark:text-green-400"
            >
              <Music className="mr-2 h-4 w-4" /> {t('copySpotify')}
            </Button>
          </div>
          <div className="max-h-40 w-full overflow-y-auto rounded-md border bg-background p-2">
            {playedPlaylist.length > 0 ? (
              <div className="text-xs font-mono p-1 space-y-1">
                {exportFormat === "text" ? playedPlaylist.map((song, index) => (
                  <div key={song.id + index} className="truncate">
                    {song.artist && song.song
                        ? `${decode(song.artist)} - ${decode(song.song)}`
                        : `${decode(removeBracketedContent(song.title))}`}
                  </div>
                )) : (
                  <pre className="whitespace-pre-wrap">
                    {getDataToCopy().slice(0, 500) + (getDataToCopy().length > 500 ? "..." : "")}
                  </pre>
                )}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                No songs have been played yet...
              </p>
            )}
          </div>
          <Button
            type="button"
            onClick={() => void handleCopy()}
            className="w-full"
            disabled={isCopied || playedPlaylist.length === 0}
          >
            {isCopied ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {isCopied ? tCommon('success') : exportFormat === "spotify" ? t('copySpotify') : t('copyText')}
          </Button>
        </div>
      )}
    </div>
  );
}
