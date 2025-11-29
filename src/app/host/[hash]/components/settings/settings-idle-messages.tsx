"use client";

import { useState } from "react";
import { Button } from "~/components/ui/ui/button";
import { Input } from "~/components/ui/ui/input";
import { Alert, AlertDescription } from "~/components/ui/ui/alert";
import { Info, Plus, X, Check, Send, Globe, Square, CheckSquare } from "lucide-react";
import type { IdleMessage } from "@prisma/client";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { useLocalStorage } from "@mantine/hooks";

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
  
  // State for selected messages - Persisted to LocalStorage
  const [selectedIds, setSelectedIds] = useLocalStorage<number[]>({
    key: "mkp-idle-selected-ids",
    defaultValue: [],
  });

  // Filter messages authored by current host to enforce the creation limit (20)
  const myMessagesCount = hostIdleMessages.filter(m => m.hostName === hostName).length;
  const creationLimitRemaining = 20 - myMessagesCount;

  // Selection Limit (20 max active on player)
  const selectionCount = selectedIds.length;

  const toggleSelection = (id: number) => {
    if (isPartyClosed) return;
    
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(i => i !== id));
    } else {
      if (selectionCount >= 20) {
        toast.error("Max 20 messages selected for sync.");
        return;
      }
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleAddMessage = () => {
    if (isPartyClosed) return;
    if (!newMessage.trim() || !hostName) return;
    if (creationLimitRemaining <= 0) {
      toast.error("You have reached your 20 message creation limit.");
      return;
    }
    
    const messageToAdd = newMessage.trim();
    if (IS_DEBUG) console.log("[SettingsIdleMessages] Adding message:", messageToAdd);
    
    onAddIdleMessage({ hostName, message: messageToAdd });
    setNewMessage("");
    toast.success("Message added to library. Check it to sync.");
  };

  const handleDeleteMessage = (id: number) => {
    if (isPartyClosed) return;
    if (confirm("Are you sure you want to delete this message?")) {
      if (IS_DEBUG) console.log("[SettingsIdleMessages] Deleting message ID:", id);
      onDeleteIdleMessage({ id });
      setSelectedIds(prev => prev.filter(i => i !== id)); // Remove from selection if deleted
    }
  };

  const handleSyncToParty = () => {
    if (isPartyClosed) return;
    
    const messagesToSync = hostIdleMessages
      .filter(m => selectedIds.includes(m.id))
      .map(m => m.message);

    if (messagesToSync.length === 0) {
        if(!confirm("Sync empty list? This will clear messages on the player.")) return;
    }

    setIsSyncing(true);
    if (IS_DEBUG) console.log("[SettingsIdleMessages] Syncing selected messages:", messagesToSync);
    
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
            Select messages to display on the TV. You can select up to 20.
            Adding is limited to 20 per host, but you can use messages from others.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex w-full items-center space-x-2">
        <Input
          type="text"
          placeholder={isPartyClosed ? "Messaging disabled" : "New message (e.g. Lyric @ Artist)"}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={creationLimitRemaining <= 0 || isPartyClosed}
          className="bg-background"
          onKeyDown={(e) => e.key === 'Enter' && handleAddMessage()}
        />
        <Button
          type="button"
          onClick={handleAddMessage}
          disabled={creationLimitRemaining <= 0 || !newMessage.trim() || isPartyClosed}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>Your creations: {myMessagesCount}/20</span>
          <span className={cn(selectionCount >= 20 ? "text-red-500 font-bold" : "")}>
            Selected to sync: {selectionCount}/20
          </span>
      </div>

      <div className="max-h-60 w-full overflow-y-auto rounded-md border bg-muted/50 p-2 space-y-2">
        {hostIdleMessages.length > 0 ? (
          hostIdleMessages.map((msg) => {
            const isMine = msg.hostName === hostName;
            const isSelected = selectedIds.includes(msg.id);
            
            return (
              <div
                key={msg.id}
                className={cn(
                    "flex items-center gap-3 rounded p-2 border transition-colors",
                    isSelected ? "bg-primary/10 border-primary/30" : "bg-background border-transparent hover:border-border"
                )}
              >
                <button 
                    onClick={() => toggleSelection(msg.id)}
                    className="flex-shrink-0 text-primary hover:opacity-80 focus:outline-none"
                    disabled={isPartyClosed}
                >
                    {isSelected ? (
                        <CheckSquare className="h-5 w-5" />
                    ) : (
                        <Square className="h-5 w-5 text-muted-foreground" />
                    )}
                </button>

                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => !isPartyClosed && toggleSelection(msg.id)}>
                   <p className={cn("text-sm truncate", isSelected && "font-medium")}>{msg.message}</p>
                   <p className="text-[10px] text-muted-foreground truncate">
                     {isMine ? "You" : msg.hostName}
                   </p>
                </div>
                
                {isMine && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-red-500"
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
        disabled={isSyncing || isPartyClosed}
        className="w-full"
      >
        {isSyncing ? (
          <Check className="mr-2 h-4 w-4" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
        {isSyncing
          ? "Synced!"
          : `Sync ${selectionCount} Messages to Player`}
      </Button>
    </div>
  );
}
