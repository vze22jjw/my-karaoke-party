"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "~/components/ui/ui/button";
import { Input } from "~/components/ui/ui/input";
import { 
  Plus, X, Check, Globe, Square, CheckSquare, Search, Library, ChevronLeft, ChevronRight 
} from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/ui/drawer";
import type { IdleMessage } from "@prisma/client";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { useLocalStorage } from "@mantine/hooks";
import { useTranslations } from "next-intl";

const IS_DEBUG = process.env.NEXT_PUBLIC_EVENT_DEBUG === "true";
const MESSAGES_PER_PAGE = 10;

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
  const t = useTranslations('host.settings.messages');
  const tCommon = useTranslations('common');
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  const [selectedIds, setSelectedIds] = useLocalStorage<number[]>({
    key: "mkp-idle-selected-ids",
    defaultValue: [],
  });

  const initialSelectedIdsRef = useRef<number[]>([]);

  const handleOpenChange = (open: boolean) => {
    setIsDrawerOpen(open);
    if (open) {
        initialSelectedIdsRef.current = [...selectedIds];
    } else {
        // On Close: Check if selection changed, then sync
        const hasChanged = 
            selectedIds.length !== initialSelectedIdsRef.current.length ||
            !selectedIds.every(id => initialSelectedIdsRef.current.includes(id));
        
        if (hasChanged && !isPartyClosed) {
            handleSyncToParty();
        }
    }
  };

  const myMessagesCount = hostIdleMessages.filter(m => m.hostName === hostName).length;
  const creationLimitRemaining = 20 - myMessagesCount;
  const selectionCount = selectedIds.length;
  const remainingSelections = 20 - selectionCount;

  const filteredMessages = hostIdleMessages.filter((msg) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
        msg.message.toLowerCase().includes(query) ||
        msg.hostName.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(filteredMessages.length / MESSAGES_PER_PAGE);
  const paginatedMessages = filteredMessages.slice(
    (currentPage - 1) * MESSAGES_PER_PAGE,
    currentPage * MESSAGES_PER_PAGE
  );

  const toggleSelection = (id: number) => {
    if (isPartyClosed) return;
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(i => i !== id));
    } else {
      if (selectionCount >= 20) {
        toast.error(tCommon('error'));
        return;
      }
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleAddMessage = () => {
    if (isPartyClosed) return;
    if (!newMessage.trim() || !hostName) return;
    if (creationLimitRemaining <= 0) {
      toast.error(t('limitError'));
      return;
    }
    onAddIdleMessage({ hostName, message: newMessage.trim() });
    setNewMessage("");
    toast.success(tCommon('success'));
  };

  const handleDeleteMessage = (id: number) => {
    if (isPartyClosed) return;
    if (confirm("Delete?")) {
      onDeleteIdleMessage({ id });
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleSyncToParty = () => {
    if (isPartyClosed) return;
    const messagesToSync = hostIdleMessages
      .filter(m => selectedIds.includes(m.id))
      .map(m => m.message);
    
    if (IS_DEBUG) console.log("[SettingsIdleMessages] Auto-syncing:", messagesToSync);
    onSyncIdleMessages(messagesToSync);
    toast.success(t('synced'));
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Globe className="h-5 w-5 text-indigo-500" />
          {t('title')} {isPartyClosed && <span className="text-sm text-muted-foreground">({tCommon('readOnly')})</span>}
        </h3>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
           {t('sync', { count: selectionCount })}
        </p>
        
        <Drawer open={isDrawerOpen} onOpenChange={handleOpenChange}>
            <DrawerTrigger asChild>
                <Button variant="outline" className="w-full gap-2 h-12">
                    <Library className="h-4 w-4" />
                    {t('manageLibrary')}
                    <span className="ml-auto text-xs bg-primary/10 px-2 py-0.5 rounded-full">
                        {hostIdleMessages.length}
                    </span>
                </Button>
            </DrawerTrigger>
            <DrawerContent className="h-[90vh] flex flex-col">
                <div className="mx-auto w-full max-w-2xl flex-1 flex flex-col overflow-hidden">
                    <DrawerHeader>
                        <DrawerTitle>{t('title')}</DrawerTitle>
                        <DrawerDescription>
                            {t('drawerDesc')}
                        </DrawerDescription>
                    </DrawerHeader>

                    {/* CREATION & SEARCH AREA */}
                    <div className="px-4 py-2 space-y-4 shrink-0">
                        <div className="flex gap-2">
                            <Input
                                placeholder={t('addPlaceholder')}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                disabled={(isPartyClosed ?? false) || creationLimitRemaining <= 0}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddMessage()}
                            />
                            <Button onClick={handleAddMessage} disabled={(isPartyClosed ?? false) || creationLimitRemaining <= 0}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 bg-muted/30"
                            />
                        </div>

                        <div className="flex justify-between text-xs text-muted-foreground font-medium">
                            <span className={creationLimitRemaining <= 0 ? "text-red-500" : ""}>
                                {t('creationsLeft', { count: creationLimitRemaining })}
                            </span>
                            <span className={remainingSelections <= 0 ? "text-red-500" : "text-primary"}>
                                {t('selectionsLeft', { count: remainingSelections })}
                            </span>
                        </div>
                    </div>

                    {/* SCROLLABLE LIST */}
                    <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
                        {paginatedMessages.length > 0 ? (
                            paginatedMessages.map((msg) => {
                                const isMine = msg.hostName === hostName;
                                const isSelected = selectedIds.includes(msg.id);
                                return (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg p-3 border transition-all",
                                            isSelected 
                                                ? "bg-primary/10 border-primary/40 shadow-sm" 
                                                : "bg-card border-border hover:border-primary/20"
                                        )}
                                        onClick={() => toggleSelection(msg.id)}
                                    >
                                        <button className="text-primary shrink-0">
                                            {isSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                                        </button>
                                        
                                        <div className="flex-1 min-w-0">
                                            <p className={cn("text-sm font-medium truncate", isSelected && "text-primary")}>
                                                {msg.message}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {isMine ? tCommon('you') : msg.hostName}
                                            </p>
                                        </div>

                                        {isMine && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteMessage(msg.id);
                                                }}
                                                disabled={isPartyClosed}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>{t('noMessages')}</p>
                            </div>
                        )}
                    </div>

                    {/* PAGINATION & FOOTER */}
                    <div className="p-4 border-t bg-background shrink-0 space-y-4">
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-4">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm font-medium">
                                    {t('pageCounter', { current: currentPage, total: totalPages })}
                                </span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        
                        <DrawerClose asChild>
                            <Button className="w-full h-12 text-lg font-bold shadow-md" variant="default">
                                <Check className="mr-2 h-5 w-5" />
                                {t('saveAndSync', { count: selectionCount })}
                            </Button>
                        </DrawerClose>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
