"use client";

import { Button } from "~/components/ui/ui/button";
import { Label } from "~/components/ui/ui/label";
import { getUrl } from "~/utils/url";
import { QrCode } from "~/components/qr-code";
import { Input } from "~/components/ui/ui/input";
import {
  AlertCircle,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  FileText,
  // ListTree, // Removed
  // FileJson, // Removed
  Play,
  Send,
  Plus,
  X,
  Lightbulb,
  Music,
  Loader2,
  Info, // <-- THIS IS THE FIX
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/ui/alert";
import { cn } from "~/lib/utils";
import { type VideoInPlaylist } from "party";
// --- THIS IS THE FIX ---
// Import useState
import { useState, useMemo } from "react";
// --- END THE FIX ---
import { toast } from "sonner";
import { decode } from "html-entities";
import { removeBracketedContent } from "~/utils/string";
import { type IdleMessage } from "@prisma/client";
import { api } from "~/trpc/react";

// Extend the type locally to include spotifyId
type ExtendedVideo = VideoInPlaylist & { spotifyId?: string | null };

type Props = {
  partyHash: string;
  partyName: string; // <-- ADDED
  useQueueRules: boolean;
  onToggleRules: () => void;
  disablePlayback: boolean;
  onTogglePlayback: () => void;
  maxSearchResults: number;
  onSetMaxResults: (value: number) => void;
  onCloseParty: () => void;
  isConfirmingClose: boolean;
  onConfirmClose: () => void;
  onCancelClose: () => void;
  playedPlaylist: ExtendedVideo[];
  partyStatus: string;
  onStartParty: () => void;
  hostName: string | null;
  hostIdleMessages: IdleMessage[];
  onAddIdleMessage: (vars: { hostName: string; message: string }) => void;
  onDeleteIdleMessage: (vars: { id: number }) => void;
  onSyncIdleMessages: (messages: string[]) => void;
  themeSuggestions: string[];
  onUpdateThemeSuggestions: (suggestions: string[]) => void;
  spotifyPlaylistId: string | null;
};

// --- THIS IS THE FIX ---
// Removed description from ToggleButton props
const ToggleButton = ({
  id,
  checked,
  onCheckedChange,
  label,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: () => void;
  label: string;
}) => (
  // Reduced padding from p-4 to p-3
  <div className="flex items-center justify-between rounded-lg border p-3">
    {/* --- END THE FIX --- */}
    <div className="flex-1 space-y-0.5 pr-4">
      <Label htmlFor={id} className="text-base">
        {label}
      </Label>
      {/* Removed <p> tag */}
    </div>
    {/* --- END THE FIX --- */}
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onCheckedChange}
      className={cn(
        "relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        checked ? "bg-green-500" : "bg-red-500",
        "shadow-inner",
      )}
    >
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0",
          "border border-gray-200",
        )}
      />
    </button>
  </div>
);


export function TabSettings({
  partyHash,
  partyName, // <-- DESTRUCTURED
  useQueueRules,
  onToggleRules,
  disablePlayback,
  onTogglePlayback,
  maxSearchResults,
  onSetMaxResults,
  onCloseParty,
  isConfirmingClose,
  onConfirmClose,
  onCancelClose,
  playedPlaylist,
  partyStatus,
  onStartParty,
  hostName,
  hostIdleMessages,
  onAddIdleMessage,
  onDeleteIdleMessage,
  onSyncIdleMessages,
  themeSuggestions,
  onUpdateThemeSuggestions,
  spotifyPlaylistId,
}: Props) {
  const joinUrl = getUrl(`/join/${partyHash}`);
  const playerUrl = getUrl(`/player/${partyHash}`);
  const playerUrlWithLabel = `${playerUrl}`;

  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [exportFormat, setExportFormat] = useState<"text" | "spotify">("text");

  const [newMessage, setNewMessage] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const messagesRemaining = 20 - hostIdleMessages.length;

  const [newSuggestion, setNewSuggestion] = useState("");

  const [spotifyIdInput, setSpotifyIdInput] = useState(spotifyPlaylistId ?? "");
  const [isSavingSpotify, setIsSavingSpotify] = useState(false);

  // --- THIS IS THE FIX ---
  // Add state hooks for all info popups
  const [showSuggestionsInfo, setShowSuggestionsInfo] = useState(false);
  const [showIdleInfo, setShowIdleInfo] = useState(false);
  const [showRulesInfo, setShowRulesInfo] = useState(false);
  const [showSpotifyInfo, setShowSpotifyInfo] = useState(false);
  const [showSearchInfo, setShowSearchInfo] = useState(false);
  const [showExportInfo, setShowExportInfo] = useState(false);
  const [showDangerInfo, setShowDangerInfo] = useState(false);
  // --- END THE FIX ---

  const updateSpotify = api.party.updateSpotifyPlaylist.useMutation({
    onSuccess: (data) => {
      setIsSavingSpotify(false);
      setSpotifyIdInput(data.newId ?? ""); // Update input with cleaned ID from server
      toast.success("Spotify Playlist updated!");
    },
    onError: () => {
      setIsSavingSpotify(false);
      toast.error("Failed to update playlist. Check the ID/URL.");
    }
  });

  const handleSaveSpotifySettings = () => {
    setIsSavingSpotify(true);
    updateSpotify.mutate({ hash: partyHash, playlistId: spotifyIdInput });
  };

  const handleAddMessage = () => {
    if (!newMessage.trim() || !hostName) return;
    if (messagesRemaining <= 0) {
      toast.error("You have reached the 20 message limit.");
      return;
    }
    onAddIdleMessage({ hostName, message: newMessage });
    setNewMessage(""); 
  };

  const handleDeleteMessage = (id: number) => {
    if (confirm("Are you sure you want to delete this message?")) {
      onDeleteIdleMessage({ id });
    }
  };

  const handleSyncToParty = () => {
    setIsSyncing(true);
    const messagesToSync = hostIdleMessages.map((m) => m.message).slice(0, 10);
    onSyncIdleMessages(messagesToSync);
    toast.success(
      `Synced ${messagesToSync.length} messages to the player!`,
    );
    setTimeout(() => setIsSyncing(false), 1000);
  };

  const handleAddSuggestion = () => {
    if (!newSuggestion.trim()) return;
    const updated = [...themeSuggestions, newSuggestion.trim()];
    onUpdateThemeSuggestions(updated);
    setNewSuggestion("");
  };

  const handleDeleteSuggestion = (index: number) => {
    const updated = themeSuggestions.filter((_, i) => i !== index);
    onUpdateThemeSuggestions(updated);
  };

  // --- REMOVED parseSongInfo and processedList ---

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
        return playedPlaylist.map((song) => {
          const title = decode(removeBracketedContent(song.title));
          const artist = song.artist ? decode(song.artist) : "Unknown Artist";
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
      await navigator.clipboard.writeText(dataToCopy);
      toast.success(`Copied ${exportFormat.toUpperCase()} list to clipboard!`);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy list.");
    }
  };


  return (
    // --- THIS IS THE FIX ---
    // Reduced space-y-6 to space-y-4
    <div className="space-y-4">
    {/* --- END THE FIX --- */}
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-lg font-medium">Party Links</h3>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Join Link (for singers)</Label>
            <div className="flex items-center space-x-2">
              <Input
                readOnly
                value={joinUrl}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Player Link (for TV/projector)</Label>
            <div className="flex items-center space-x-2">
              <Input
                readOnly
                value={playerUrlWithLabel}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
            </div>
          </div>
          <div className="flex justify-center">
            <QrCode url={joinUrl} />
          </div>
        </div>
      </div>

      {partyStatus === "OPEN" && (
        <div className="space-y-3 rounded-lg border-2 border-green-500 bg-card p-4 shadow-lg">
          <h3 className="text-lg font-medium text-green-400">
            Party is OPEN
          </h3>
          <p className="text-sm text-muted-foreground">
            Singers can add songs. When you&apos;re ready, start the party to load
            the first song and enable the player controls.
          </p>
          <Button
            type="button"
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={onStartParty}
          >
            <Play className="mr-2 h-4 w-4" />
            Start Party
          </Button>
        </div>
      )}

      {/* --- Party Theme / Song Suggestions --- */}
      {/* --- THIS IS THE FIX --- */}
      {/* Reduced padding from p-4 to p-3 */}
      <div className="space-y-3 rounded-lg border bg-card p-3">
        {/* --- END THE FIX --- */}
        {/* --- THIS IS THE FIX --- */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Party Theme / Song Suggestions
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={() => setShowSuggestionsInfo((s) => !s)}
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
        {showSuggestionsInfo && (
          <Alert className="mt-2">
            <AlertDescription>
              Add numbered prompts to help your guests pick songs! These will
              appear at the top of the History tab.
            </AlertDescription>
          </Alert>
        )}
        {/* --- END THE FIX --- */}

        <div className="flex w-full items-center space-x-2">
          <Input
            type="text"
            placeholder="e.g. 'Songs featuring a color in the title'"
            value={newSuggestion}
            onChange={(e) => setNewSuggestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSuggestion()}
            className="bg-background"
          />
          <Button
            type="button"
            onClick={handleAddSuggestion}
            disabled={!newSuggestion.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-60 w-full overflow-y-auto rounded-md border bg-muted/50 p-2 space-y-2">
          {themeSuggestions.length > 0 ? (
            themeSuggestions.map((text, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded bg-background p-2"
              >
                <div className="flex gap-2 overflow-hidden">
                  <span className="font-bold text-primary min-w-[1.5rem]">{index + 1}.</span>
                  <p className="text-sm truncate">{text}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0 text-red-500"
                  onClick={() => handleDeleteSuggestion(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))
          ) : (
            <p className="text-center text-sm text-muted-foreground p-4">
              No suggestions added yet.
            </p>
          )}
        </div>
      </div>
      
      <div className="space-y-3 rounded-lg border bg-card p-4">
        {/* --- THIS IS THE FIX --- */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Your Reusable Idle Messages</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={() => setShowIdleInfo((s) => !s)}
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
        {showIdleInfo && (
          <Alert className="mt-2">
            <AlertDescription>
              Messages are tied to your host name ({hostName ?? "..."}) and
              saved in the database. (Max 20)
            </AlertDescription>
          </Alert>
        )}
        {/* --- END THE FIX --- */}

        <div className="flex w-full items-center space-x-2">
          <Input
            type="text"
            placeholder="Add a new message (e.g., Lyric -- Author)"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={messagesRemaining <= 0}
            className="bg-background"
          />
          <Button
            type="button"
            onClick={handleAddMessage}
            disabled={messagesRemaining <= 0 || !newMessage.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {messagesRemaining} slot{messagesRemaining !== 1 ? "s" : ""} remaining
        </p>

        <div className="max-h-40 w-full overflow-y-auto rounded-md border bg-muted/50 p-2 space-y-2">
          {hostIdleMessages.length > 0 ? (
            hostIdleMessages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-center justify-between rounded bg-background p-2"
              >
                <p className="text-sm truncate pr-2">{msg.message}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0 text-red-500"
                  onClick={() => handleDeleteMessage(msg.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))
          ) : (
            <p className="text-center text-sm text-muted-foreground p-4">
              Your message library is empty.
            </p>
          )}
        </div>

        <Button
          type="button"
          onClick={handleSyncToParty}
          disabled={isSyncing || hostIdleMessages.length === 0}
          className="w-full"
        >
          {isSyncing ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {isSyncing
            ? "Synced!"
            : `Sync ${Math.min(hostIdleMessages.length, 10)} Messages to Player`}
        </Button>
      </div>

      {/* --- THIS IS THE FIX --- */}
      {/* Reduced padding from p-4 to p-3 */}
      <div className="space-y-3 rounded-lg border bg-card p-3">
        {/* --- END THE FIX --- */}
        {/* --- THIS IS THE FIX --- */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Party Rules</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={() => setShowRulesInfo((s) => !s)}
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
        {showRulesInfo && (
          <Alert className="mt-2 space-y-2">
            <AlertDescription>
              <strong>Queue Ordering:</strong> &quot;ON (Fairness)&quot; ensures
              everyone gets a turn. &quot;OFF&quot; is first-come, first-served.
            </AlertDescription>
            <AlertDescription>
              <strong>Play Videos in iFrame:</strong> &quot;ON&quot; plays most
              videos inside the app. &quot;OFF&quot; requires clicking a link to
              open YouTube.
            </AlertDescription>
          </Alert>
        )}
        {/* --- END THE FIX --- */}
        <ToggleButton
          id="queue-rules"
          checked={useQueueRules}
          onCheckedChange={onToggleRules}
          label={
            useQueueRules ? "Queue: Fairness (ON)" : "Queue: FIFO (OFF)"
          }
        />
        <ToggleButton
          id="disable-playback"
          checked={!disablePlayback}
          onCheckedChange={onTogglePlayback}
          label={
            !disablePlayback
              ? "Playback: In-App (ON)"
              : "Playback: YouTube (OFF)"
          }
        />
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        {/* --- THIS IS THE FIX --- */}
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
        {/* --- END THE FIX --- */}
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


      {/* --- THIS IS THE FIX --- */}
      {/* Reduced padding from p-4 to p-3 */}
      <div className="space-y-3 rounded-lg border bg-card p-3">
        {/* --- END THE FIX --- */}
        {/* --- THIS IS THE FIX --- */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Search Settings</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={() => setShowSearchInfo((s) => !s)}
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
        {/* --- END THE FIX --- */}
        {/* --- THIS IS THE FIX --- */}
        {/* Reduced padding from p-4 to p-3 */}
        <div className="space-y-2 rounded-lg border p-3">
        {/* --- END THE FIX --- */}
          <div className="flex justify-between">
            <Label htmlFor="max-results" className="text-base">
              Max Search Results
            </Label>
            <span className="text-base font-bold">{maxSearchResults}</span>
          </div>
          {/* --- THIS IS THE FIX --- */}
          {showSearchInfo && (
            <Alert className="mt-2">
              <AlertDescription>
                Limit the number of results guests see when they search YouTube.
                Fewer results can speed up loading.
              </AlertDescription>
            </Alert>
          )}
          {/* --- END THE FIX --- */}
          <Input
            id="max-results"
            type="range"
            min={5}
            max={25}
            step={1}
            value={maxSearchResults}
            onChange={(e) => onSetMaxResults(Number(e.target.value) ?? 10)}
            className="w-full"
          />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        {/* --- THIS IS THE FIX --- */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Export Played Songs</h3>
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
        {/* --- END THE FIX --- */}
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
            {/* --- ADDED THIS INSTRUCTION BLOCK --- */}
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
            {/* --- END OF ADDED BLOCK --- */}

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
                  {/* --- MODIFIED THIS BLOCK TO RENDER THE NEW FORMAT --- */}
                  {exportFormat === "text" ? playedPlaylist.map((song) => (
                    <div key={song.id} className="truncate">
                      {song.artist ? `${decode(song.artist)} - ` : ""}{decode(removeBracketedContent(song.title))}
                    </div>
                  )) : (
                    <pre className="whitespace-pre-wrap">
                      {getDataToCopy().slice(0, 500) + (getDataToCopy().length > 500 ? "..." : "")}
                    </pre>
                  )}
                  {/* --- END MODIFICATION --- */}
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

      <div className="space-y-3 rounded-lg border bg-card p-4">
        {/* --- THIS IS THE FIX --- */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={() => setShowDangerInfo((s) => !s)}
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
        {/* --- END THE FIX --- */}
        <div className="space-y-4 rounded-lg border border-destructive/50 p-4">
          {/* --- THIS IS THE FIX --- */}
          {showDangerInfo && (
            <Alert className="mt-2" variant="destructive">
              <AlertDescription>
                This will close the party, delete all songs, and disconnect
                everyone. This can&apos;t be undone.
              </AlertDescription>
            </Alert>
          )}
          {/* --- END THE FIX --- */}
          {isConfirmingClose ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Are you sure?</AlertTitle>
              <AlertDescription>This action is permanent.</AlertDescription>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={onCancelClose}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={onConfirmClose}>
                  Yes, End Party
                </Button>
              </div>
            </Alert>
          ) : (
            <Button
              variant="destructive"
              className="w-full"
              onClick={onCloseParty}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Close Party
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
