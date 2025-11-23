"use client";

import { useState } from "react";
import { Button } from "~/components/ui/ui/button";
import { Input } from "~/components/ui/ui/input";
import { Alert, AlertDescription } from "~/components/ui/ui/alert";
import { Info, Plus, X, Check, Send } from "lucide-react";
import type { IdleMessage } from "@prisma/client";
import { toast } from "sonner";

const IS_DEBUG = process.env.NEXT_PUBLIC_EVENT_DEBUG === "true";

type Props = {
  hostName: string | null;
  hostIdleMessages: IdleMessage[];
  onAddIdleMessage: (vars: { hostName: string; message: string }) => void;
  onDeleteIdleMessage: (vars: { id: number }) => void;
  onSyncIdleMessages: (messages: string[]) => void;
};

export function SettingsIdleMessages({
  hostName,
  hostIdleMessages,
  onAddIdleMessage,
  onDeleteIdleMessage,
  onSyncIdleMessages,
}: Props) {
  const [newMessage, setNewMessage] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [showIdleInfo, setShowIdleInfo] = useState(false);
  
  const messagesRemaining = 20 - hostIdleMessages.length;

  const handleAddMessage = () => {
    if (!newMessage.trim() || !hostName) return;
    if (messagesRemaining <= 0) {
      toast.error("You have reached the 20 message limit.");
      return;
    }
    if (IS_DEBUG) console.log("[SettingsIdleMessages] Adding message");
    onAddIdleMessage({ hostName, message: newMessage });
    setNewMessage(""); 
  };

  const handleDeleteMessage = (id: number) => {
    if (confirm("Are you sure you want to delete this message?")) {
      if (IS_DEBUG) console.log("[SettingsIdleMessages] Deleting message ID:", id);
      onDeleteIdleMessage({ id });
    }
  };

  const handleSyncToParty = () => {
    setIsSyncing(true);
    const messagesToSync = hostIdleMessages.map((m) => m.message).slice(0, 10);
    if (IS_DEBUG) console.log("[SettingsIdleMessages] Syncing messages:", messagesToSync);
    
    onSyncIdleMessages(messagesToSync);
    toast.success(
      `Synced ${messagesToSync.length} messages to the player!`,
    );
    setTimeout(() => setIsSyncing(false), 1000);
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
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
  );
}
