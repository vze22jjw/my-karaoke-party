"use client";

import { useState } from "react";
import { Button } from "~/components/ui/ui/button";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/ui/alert";
import { Info, Copy, Check, ChevronDown, FileText, Music, Download } from "lucide-react";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { decode } from "html-entities";
import { removeBracketedContent } from "~/utils/string";
import type { VideoInPlaylist } from "~/types/app-types";

const IS_DEBUG = process.env.NEXT_PUBLIC_EVENT_DEBUG === "true";

type ExtendedVideo = VideoInPlaylist & { spotifyId?: string | null };

type Props = {
  partyName: string;
  playedPlaylist: ExtendedVideo[];
};

export function SettingsExport({ partyName, playedPlaylist }: Props) {
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
        
        if (!uris) return "No Spotify matches found for played songs.";
        return uris;
      case "text":
      default:
        // FIX: Prioritize 'artist' and 'song' fields if they exist (clean metadata)
        return playedPlaylist.map((song) => {
          const artist = song.artist || "Unknown Artist";
          // Use song.song (clean title) if available, otherwise fallback to raw/cleaned YouTube title
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
      // Using document.execCommand('copy') for better compatibility in iframe environments
      const el = document.createElement('textarea');
      el.value = dataToCopy;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);

      toast.success(`Copied ${exportFormat.toUpperCase()} list to clipboard!`);
      if (IS_DEBUG) console.log("[SettingsExport] Copied data to clipboard");
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      if (IS_DEBUG) console.error("[SettingsExport] Copy failed", err);
      toast.error("Failed to copy list.");
    }
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Download className="h-5 w-5 text-purple-500" />
          Export Played Songs
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
          <AlertDescription>
            This copies the list of played songs.
            The <strong>&quot;Copy for Spotify&quot;</strong> button formats this list as Spotify Track
            URIs. You can paste these URIs <strong>directly into a new
            playlist in the Spotify Desktop app</strong> (this won&rsquo;t work
            on mobile or web).
          </AlertDescription>
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
          <Alert>
            <Music className="h-4 w-4" />
            <AlertTitle>How to Create Your Playlist</AlertTitle>
            <AlertDescription className="mt-2 space-y-1">
              <p>
                1. Click the <strong>&quot;Copy for Spotify&quot;</strong> button below.
              </p>
              <p>
                2. Open the <strong>Spotify Desktop App</strong>.
              </p>
              <p>
                3. Create a new, empty playlist (try naming it:{" "}
                <strong>{partyName}</strong>).
              </p>
              <p>
                4. Click inside the empty playlist and press{" "}
                <strong>Ctrl+V</strong> (or <strong>Cmd+V</strong>) to paste all
                the songs.
              </p>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={exportFormat === "text" ? "default" : "secondary"}
              onClick={() => setExportFormat("text")}
            >
              <FileText className="mr-2 h-4 w-4" /> Text
            </Button>
            <Button
              variant={exportFormat === "spotify" ? "default" : "secondary"}
              onClick={() => setExportFormat("spotify")}
              className="text-green-600 dark:text-green-400"
            >
              <Music className="mr-2 h-4 w-4" /> Copy for Spotify
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
            {isCopied
              ? "Copied!"
              : exportFormat === "spotify"
                ? "Copy for Spotify"
                : "Copy as Text"}
          </Button>
        </div>
      )}
    </div>
  );
}
