"use client";

import { useState } from "react";
import { Button } from "~/components/ui/ui/button";
import { Label } from "~/components/ui/ui/label";
import { Input } from "~/components/ui/ui/input";
import { Alert, AlertDescription } from "~/components/ui/ui/alert";
import { Info, Music, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "sonner";

const IS_DEBUG = process.env.NEXT_PUBLIC_EVENT_DEBUG === "true";

type Props = {
  partyHash: string;
  spotifyPlaylistId: string | null;
};

export function SettingsSpotify({ partyHash, spotifyPlaylistId }: Props) {
  const [spotifyIdInput, setSpotifyIdInput] = useState(spotifyPlaylistId ?? "");
  const [isSavingSpotify, setIsSavingSpotify] = useState(false);
  const [showSpotifyInfo, setShowSpotifyInfo] = useState(false);

  const updateSpotify = api.party.updateSpotifyPlaylist.useMutation({
    onSuccess: (data) => {
      setIsSavingSpotify(false);
      setSpotifyIdInput(data.newId ?? "");
      toast.success("Spotify Playlist updated!");
      if (IS_DEBUG) console.log("[SettingsSpotify] Updated ID:", data.newId);
    },
    onError: (error) => {
      setIsSavingSpotify(false);
      toast.error("Failed to update playlist. Check the ID/URL.");
      if (IS_DEBUG) console.error("[SettingsSpotify] Update failed:", error);
    }
  });

  const handleSaveSpotifySettings = () => {
    setIsSavingSpotify(true);
    if (IS_DEBUG) console.log("[SettingsSpotify] Saving ID:", spotifyIdInput);
    updateSpotify.mutate({ hash: partyHash, playlistId: spotifyIdInput });
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Music className="h-5 w-5 text-green-500" />
          Spotify Integration
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
            Override the default &quot;Karaoke Classics&quot; by pasting a
            Spotify Playlist URL or ID. This will show songs from your playlist
            on the guest&apos;s &quot;Suggestions&quot; tab.
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="spotify-query">Trending Playlist ID</Label>
        <div className="flex gap-2">
          <Input
            id="spotify-query"
            value={spotifyIdInput}
            onChange={(e) => setSpotifyIdInput(e.target.value)}
            placeholder="Playlist URL or ID (leave blank for default)"
          />
          <Button 
            onClick={handleSaveSpotifySettings}
            disabled={isSavingSpotify || spotifyIdInput === (spotifyPlaylistId ?? "")}
          >
            {isSavingSpotify ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
