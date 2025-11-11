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
  FileJson,
  ListTree,
  Play,
  Send,
  Plus,
  X,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/ui/alert";
import { cn } from "~/lib/utils";
import { type VideoInPlaylist } from "party";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { decode } from "html-entities";
import { Textarea } from "~/components/ui/ui/textarea"; // <-- This import is now used
import { type IdleMessage } from "@prisma/client";

type Props = {
  partyHash: string;
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
  playedPlaylist: VideoInPlaylist[];
  partyStatus: string;
  onStartParty: () => void;
  hostName: string | null;
  hostIdleMessages: IdleMessage[];
  onAddIdleMessage: (vars: { hostName: string; message: string }) => void;
  onDeleteIdleMessage: (vars: { id: number }) => void;
  onSyncIdleMessages: (messages: string[]) => void;
};

const ToggleButton = ({
  id,
  checked,
  onCheckedChange,
  label,
  description,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: () => void;
  label: string;
  description: string;
}) => (
  <div className="flex items-center justify-between rounded-lg border p-4">
    <div className="flex-1 space-y-0.5 pr-4">
      <Label htmlFor={id} className="text-base">
        {label}
      </Label>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
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
}: Props) {
  const joinUrl = getUrl(`/join/${partyHash}`);
  const playerUrl = getUrl(`/player/${partyHash}`);
  const playerUrlWithLabel = `${playerUrl}`;

  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [exportFormat, setExportFormat] = useState<"text" | "csv" | "json">(
    "text",
  );

  const [newMessage, setNewMessage] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const messagesRemaining = 20 - hostIdleMessages.length;

  useEffect(() => {
    // This syncs the text area if the messages are updated
    // (e.g. loading for the first time)
  }, [hostIdleMessages]);

  const handleAddMessage = () => {
    if (!newMessage.trim() || !hostName) return;
    if (messagesRemaining <= 0) {
      toast.error("You have reached the 20 message limit.");
      return;
    }
    onAddIdleMessage({ hostName, message: newMessage });
    setNewMessage(""); // Clear input
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

  const parseSongInfo = (title: string, singer: string) => {
    if (!title) {
      return { title: "Untitled", singer };
    }
    let cleanTitle = decode(title);
    const pipeParts = cleanTitle.split("|");
    cleanTitle = (pipeParts[0] ?? "").trim();
    return {
      title: cleanTitle || "Untitled",
      singer: singer,
    };
  };

  const processedList = useMemo(() => {
    return playedPlaylist.map((song) =>
      parseSongInfo(song.title, song.singerName),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playedPlaylist]);

  const getDataToCopy = () => {
    switch (exportFormat) {
      case "json":
        const jsonList = processedList.map((s) => ({
          Title: s.title,
        }));
        return JSON.stringify(jsonList, null, 2);
      case "csv":
        const header = "Title\n";
        const rows = processedList
          .map((s) => `"${s.title.replace(/"/g, '""')}"`)
          .join("\n");
        return header + rows;
      case "text":
      default:
        return processedList.map((s) => s.title).join("\n");
    }
  };

  const handleCopy = async () => {
    if (processedList.length === 0) {
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
    <div className="space-y-6">
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
      
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-lg font-medium">Your Reusable Idle Messages</h3>
        <p className="text-sm text-muted-foreground">
          Messages are tied to your host name ({hostName ?? "..."}) and saved
          in the database. (Max 20)
        </p>

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

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-lg font-medium">Party Rules</h3>
        <ToggleButton
          id="queue-rules"
          checked={useQueueRules}
          onCheckedChange={onToggleRules}
          label="Queue Ordering"
          description={
            useQueueRules ? "ON (Fairness)" : "OFF (First Come, First Served)"
          }
        />
        <ToggleButton
          id="disable-playback"
          checked={!disablePlayback}
          onCheckedChange={onTogglePlayback}
          label="Play Videos in iFrame"
          description={
            !disablePlayback
              ? "Most Videos Play in App"
              : "Click Link to Open Videos"
          }
        />
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-lg font-medium">Search Settings</h3>
        <div className="space-y-2 rounded-lg border p-4">
          <div className="flex justify-between">
            <Label htmlFor="max-results" className="text-base">
              Max Search Results
            </Label>
            <span className="text-base font-bold">{maxSearchResults}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Limit the number of results from YouTube.
          </p>
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
        <h3 className="text-lg font-medium">Export Played Songs</h3>
        <p className="text-sm text-muted-foreground">
          Copy the list of played songs to create a playlist.
        </p>
        <Button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          variant="secondary"
          className="flex w-full justify-between"
        >
          <span>
            {processedList.length}{" "}
            {processedList.length === 1 ? "Song" : "Songs"} Played
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
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={exportFormat === "text" ? "default" : "secondary"}
                onClick={() => setExportFormat("text")}
              >
                <FileText className="mr-2 h-4 w-4" /> Text
              </Button>
              <Button
                variant={exportFormat === "csv" ? "default" : "secondary"}
                onClick={() => setExportFormat("csv")}
              >
                <ListTree className="mr-2 h-4 w-4" /> CSV
              </Button>
              <Button
                variant={exportFormat === "json" ? "default" : "secondary"}
                onClick={() => setExportFormat("json")}
              >
                <FileJson className="mr-2 h-4 w-4" /> JSON
              </Button>
            </div>
            <div className="max-h-40 w-full overflow-y-auto rounded-md border bg-background p-2">
              {processedList.length > 0 ? (
                <ul className="space-y-1">
                  {processedList.map((song, index) => (
                    <li
                      key={index}
                      className="flex justify-between text-sm"
                    >
                      <span className="truncate font-medium">
                        {song.title}
                      </span>
                      <span className="ml-2 flex-shrink-0 text-muted-foreground">
                        ({song.singer})
                      </span>
                    </li>
                  ))}
                </ul>
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
              disabled={isCopied || processedList.length === 0}
            >
              {isCopied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {isCopied
                ? "Copied!"
                : `Copy as ${exportFormat.toUpperCase()}`}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
        <div className="space-y-4 rounded-lg border border-destructive/50 p-4">
          <div>
            <Label className="text-base">End Party</Label>
            <p className="text-sm text-muted-foreground">
              This will close the party, delete all songs, and disconnect
              everyone. This can&apos;t be undone.
            </p>
          </div>
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
