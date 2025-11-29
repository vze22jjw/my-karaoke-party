"use client";

import { useState } from "react";
import { Button } from "~/components/ui/ui/button";
import { Label } from "~/components/ui/ui/label";
import { Input } from "~/components/ui/ui/input";
import { Alert, AlertDescription } from "~/components/ui/ui/alert";
import { Info, Music, Loader2, ExternalLink, X } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "sonner";

const IS_DEBUG = process.env.NEXT_PUBLIC_EVENT_DEBUG === "true";

type Props = {
  partyHash: string;
  spotifyPlaylistId: string | null;
  spotifyLink?: string | null;
  isPartyClosed?: boolean;
};

export function SettingsSpotify({ partyHash, spotifyPlaylistId, spotifyLink, isPartyClosed }: Props) {
  const [spotifyIdInput, setSpotifyIdInput] = useState(spotifyPlaylistId ?? "");
  const [spotifyLinkInput, setSpotifyLinkInput] = useState(spotifyLink ?? "");
  
  const [isSaving, setIsSaving] = useState(false);
  const [showSpotifyInfo, setShowSpotifyInfo] = useState(false);

  const [activeLink, setActiveLink] = useState<string | null>(spotifyLink ?? null);

  const updateSpotify = api.party.updateSpotifyPlaylist.useMutation({
    onSuccess: (data) => {
      setIsSaving(false);
      setSpotifyIdInput(data.newId ?? "");
      setSpotifyLinkInput(data.newLink ?? "");
      setActiveLink(data.newLink ?? null);
      
      toast.success("Spotify settings updated!");
      if (IS_DEBUG) console.log("[SettingsSpotify] Updated.", data);
    },
    onError: (error) => {
      setIsSaving(false);
      toast.error("Failed to update settings.");
      if (IS_DEBUG) console.error("[SettingsSpotify] Update failed:", error);
    }
  });

  const handleSave = () => {
    if (isPartyClosed) return;
    setIsSaving(true);
    updateSpotify.mutate({ 
        hash: partyHash, 
        playlistId: spotifyIdInput,
        externalLink: spotifyLinkInput
    });
  };

  const handleClearLink = () => {
      if (isPartyClosed) return;
      setSpotifyLinkInput("");
      setActiveLink(null);
      setIsSaving(true);
      updateSpotify.mutate({ 
        hash: partyHash, 
        playlistId: spotifyIdInput, 
        externalLink: "" 
    });
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Music className="h-5 w-5 text-green-500" />
          Spotify Integration {isPartyClosed && <span className="text-sm text-muted-foreground font-normal">(Read-Only)</span>}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          onClick={() => setShowSpotifyInfo((s) => !s)}
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>
      
      {showSpotifyInfo && (
        <Alert className="mt-2">
          <AlertDescription>
             <strong>Trending ID:</strong> Shows songs in the &quot;Suggestions&quot; tab (e.g. Top 50).<br/>
             <strong>Party Link:</strong> Adds a direct link to your playlist in the Guest Player header.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="spotify-id">Trending Playlist ID (Suggestions Tab)</Label>
        <Input
            id="spotify-id"
            value={spotifyIdInput}
            onChange={(e) => setSpotifyIdInput(e.target.value)}
            placeholder="e.g. 37i9dQZF1DXbITwg1ZjkYt (optional)"
            disabled={isPartyClosed}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="spotify-link">Party Playlist Link (Guest Header)</Label>
        
        {activeLink ? (
            <div className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                <a 
                    href={activeLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center gap-2 text-green-500 hover:underline truncate font-medium text-sm"
                >
                    <ExternalLink className="h-4 w-4" />
                    Open Spotify Playlist
                </a>
                <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={handleClearLink}
                    title="Clear Link"
                    disabled={isPartyClosed}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        ) : (
            <Input
                id="spotify-link"
                value={spotifyLinkInput}
                onChange={(e) => setSpotifyLinkInput(e.target.value)}
                placeholder="https://open.spotify.com/playlist/..."
                disabled={isPartyClosed}
            />
        )}
      </div>

      <Button 
        onClick={handleSave}
        disabled={isSaving || isPartyClosed}
        className="w-full"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Settings"}
      </Button>
    </div>
  );
}
