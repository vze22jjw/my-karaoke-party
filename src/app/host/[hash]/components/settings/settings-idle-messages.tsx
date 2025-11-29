"use client";

import { useState } from "react";
import { Button } from "~/components/ui/ui/button";
import { Input } from "~/components/ui/ui/input";
import { Alert, AlertDescription } from "~/components/ui/ui/alert";
import { Info, Plus, X, Check, Send, Globe } from "lucide-react"; // Removed MessageSquareQuote
import type { IdleMessage } from "@prisma/client";
import { toast } from "sonner";

const IS_DEBUG = process.env.NEXT_PUBLIC_EVENT_DEBUG === "true";

type Props = {
  hostName: string | null;
  hostIdleMessages: IdleMessage[]; 
  onAddIdleMessage: (vars: { hostName: string; message: string }) => void;
  onDeleteIdleMessage: (vars: { id: number }) => void;
  onSyncIdleMessages: (messages: string[]) => void;
  isPartyClosed?: boolean;
};

export function SettingsIdleMessages({
  hostName,
  hostIdleMessages,
  onAddIdleMessage,
  onDeleteIdleMessage,
  onSyncIdleMessages,
  isPartyClosed
}: Props) {
  const [newMessage, setNewMessage] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [showIdleInfo, setShowIdleInfo] = useState(false);
  
  // Filter messages authored by current host to enforce the 20 limit
  const myMessagesCount = hostIdleMessages.filter(m => m.hostName === hostName).length;
  const messagesRemaining = 20 - myMessagesCount;

  const handleAddMessage = () => {
    if (isPartyClosed) return;
    if (!newMessage.trim() || !hostName) return;
    if (messagesRemaining <= 0) {
      toast.error("You have reached your 20 message limit.");
      return;
    }
    
    const messageToAdd = newMessage.trim();
    if (IS_DEBUG) console.log("[SettingsIdleMessages] Adding message:", messageToAdd);
    
    onAddIdleMessage({ hostName, message: messageToAdd });

    const messagesToSync = [messageToAdd, ...hostIdleMessages.map(m => m.message)].slice(0, 20);
    
    onSyncIdleMessages(messagesToSync);
    setNewMessage(""); 
  };

  const handleDeleteMessage = (id: number) => {
    if (isPartyClosed) return;
    if (confirm("Are you sure you want to delete this message?")) {
      if (IS_DEBUG) console.log("[SettingsIdleMessages] Deleting message ID:", id);
      onDeleteIdleMessage({ id });
      
      const updatedList = hostIdleMessages
        .filter(m => m.id !== id)
        .map(m => m.message)
        .slice(0, 20);
      onSyncIdleMessages(updatedList);
    }
  };

  const handleSyncToParty = () => {
    if (isPartyClosed) return;
    setIsSyncing(true);
    const messagesToSync = hostIdleMessages.map((m) => m.message).slice(0, 20);
    if (IS_DEBUG) console.log("[SettingsIdleMessages] Manual syncing messages:", messagesToSync);
    
    onSyncIdleMessages(messagesToSync);
    toast.success(
      `Synced ${messagesToSync.length} messages to the player!`,
    );
    setTimeout(() => setIsSyncing(false), 1000);
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Globe className="h-5 w-5 text-indigo-500" />
          Shared Message Library {isPartyClosed && <span className="text-sm text-muted-foreground font-normal">(Read-Only)</span>}
        </h3>
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
            This library is shared with <strong>all hosts</strong>. You can add up to 20 messages of your own.
            Syncing sends the top 20 messages from this list to the TV screen.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex w-full items-center space-x-2">
        <Input
          type="text"
          placeholder={isPartyClosed ? "Messaging disabled in closed party" : "Add a new message (e.g., Lyric @ Author)"}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={messagesRemaining <= 0 || isPartyClosed}
          className="bg-background"
        />
        <Button
          type="button"
          onClick={handleAddMessage}
          disabled={messagesRemaining <= 0 || !newMessage.trim() || isPartyClosed}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        You can add {messagesRemaining} more message{messagesRemaining !== 1 ? "s" : ""}.
      </p>

      <div className="max-h-60 w-full overflow-y-auto rounded-md border bg-muted/50 p-2 space-y-2">
        {hostIdleMessages.length > 0 ? (
          hostIdleMessages.map((msg) => {
            const isMine = msg.hostName === hostName;
            return (
              <div
                key={msg.id}
                className="flex items-center justify-between rounded bg-background p-2 gap-2"
              >
                <div className="flex-1 min-w-0">
                   <p className="text-sm truncate">{msg.message}</p>
                   <p className="text-[10px] text-muted-foreground truncate">
                     Added by: {isMine ? "You" : msg.hostName}
                   </p>
                </div>
                
                {isMine && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-100/50"
                    onClick={() => handleDeleteMessage(msg.id)}
                    title="Delete Message"
                    disabled={isPartyClosed}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-center text-sm text-muted-foreground p-4">
            The shared library is empty.
          </p>
        )}
      </div>

      <Button
        type="button"
        onClick={handleSyncToParty}
        disabled={isSyncing || hostIdleMessages.length === 0 || isPartyClosed}
        className="w-full"
      >
        {isSyncing ? (
          <Check className="mr-2 h-4 w-4" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
        {isSyncing
          ? "Synced!"
          : `Sync Top ${Math.min(hostIdleMessages.length, 20)} to Player`}
      </Button>
    </div>
  );
}
