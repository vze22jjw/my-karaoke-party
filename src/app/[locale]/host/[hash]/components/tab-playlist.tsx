"use client";

import type { KaraokeParty, VideoInPlaylist } from "~/types/app-types";
import { Button } from "~/components/ui/ui/button";
import { cn } from "~/lib/utils";
import { decode } from "html-entities";
import { X, GripVertical, Star, Save, MoreVertical, Trash2, ChevronDown, Lock } from "lucide-react"; 
import Image from "next/image";
import { PlaybackControls } from "./playback-controls";
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useTranslations } from "next-intl";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Props = {
  currentSong: VideoInPlaylist | null;
  playlist: KaraokeParty["playlist"];
  playedPlaylist: VideoInPlaylist[];
  onRemoveSong: (playlistItemId: number) => void;
  onSkip: () => void;
  isSkipping: boolean; 
  isPlaying: boolean; 
  remainingTime: number; 
  onPlay: (currentTime?: number) => void;
  onPause: () => void;
  isManualSortActive: boolean; 
  onReorder: (newPlaylist: VideoInPlaylist[]) => void; 
  onTogglePriority: (videoId: string) => void;
  onToggleManualSort: () => void;
  isPartyClosed?: boolean;
};

type ClientVideoInPlaylist = VideoInPlaylist & {
    _clientId: string;
};

function ReadOnlyItem({ video, index }: { video: VideoInPlaylist, index: number }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-black/30 border border-white/10 w-full overflow-hidden">
      <div className="relative w-12 h-12 flex-shrink-0">
        <Image
          src={video.coverUrl}
          fill={true}
          className="rounded-md object-cover"
          alt={video.title}
          sizes="48px"
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-white/70 shrink-0">#{index}</span>
            <p className="font-bold text-sm truncate text-white text-outline w-full">
                {decode(video.title)}
            </p>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-white/90 drop-shadow-md truncate font-medium">{video.singerName}</p>
        </div>
      </div>
    </div>
  );
}

function SortableItem({ 
    video, 
    index, 
    onRemove, 
    onTogglePriority,
    isSorting,
    isMenuOpen,
    onToggleMenu,
    uniqueId,
}: { 
    video: VideoInPlaylist, 
    index: number, 
    onRemove: (id: number) => void, 
    onTogglePriority: (id: string) => void,
    isSorting: boolean,
    isMenuOpen: boolean,
    onToggleMenu: () => void,
    uniqueId: string,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
      id: uniqueId, 
      disabled: !isSorting 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div 
        ref={setNodeRef} 
        style={style} 
        className="w-full mb-2 touch-manipulation relative overflow-hidden"
        data-testid={`playlist-item-${video.singerName}`}
    >
      <div className={cn(
          "flex items-center w-full p-2 rounded-lg border transition-colors bg-card border-border/50 shadow-sm"
      )}>
        
        <div className={cn(
            "flex items-center gap-3 flex-1 min-w-0 transition-all duration-300 ease-in-out",
            isMenuOpen ? "mr-[-40px]" : "mr-0"
        )}>
            <div className="relative w-12 h-12 flex-shrink-0">
                <Image
                    src={video.coverUrl}
                    fill={true}
                    className="rounded-md object-cover"
                    alt={video.title}
                    sizes="48px"
                />
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2">
                    {!isSorting && (
                        <span className="text-xs font-bold font-mono text-primary shrink-0">
                            #{index}
                        </span>
                    )}
                    <p className="font-bold text-sm truncate">{decode(video.title)}</p>
                </div>
                <div className="flex items-center gap-2 mt-0.5 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{video.singerName}</p>
                    {video.isPriority && (
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 shrink-0" />
                    )}
                </div>
            </div>
        </div>

        <div className="flex-shrink-0 flex items-center justify-end pl-2">
            {isSorting ? (
                <div {...attributes} {...listeners} className="p-3 text-muted-foreground hover:text-foreground touch-none cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-6 w-6" />
                </div>
            ) : (
                <div className="flex items-center">
                    <div className={cn(
                        "flex items-center gap-1 overflow-hidden transition-all duration-300 ease-in-out",
                        isMenuOpen ? "w-auto opacity-100 translate-x-0" : "w-0 opacity-0 translate-x-4"
                    )}>
                        <Button
                            size="icon"
                            variant={video.isPriority ? "default" : "ghost"}
                            className={cn(
                                "h-9 w-9 rounded-full shrink-0 z-10", 
                                video.isPriority 
                                    ? "bg-yellow-500 hover:bg-yellow-600 text-black" 
                                    : "bg-card border border-white/10 hover:bg-muted text-muted-foreground"
                            )}
                            onClick={(e) => { e.stopPropagation(); onTogglePriority(video.id); }}
                        >
                            <Star className={cn("h-4 w-4", video.isPriority && "fill-current")} />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 rounded-full shrink-0 text-red-500 bg-card border border-white/10 hover:bg-red-500/10 z-10"
                            data-testid="item-remove-btn"
                            onClick={(e) => { e.stopPropagation(); onRemove(video.playlistItemId); }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button
                        size="icon"
                        variant="ghost"
                        className={cn("h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground transition-transform", isMenuOpen && "rotate-90 text-primary")}
                        data-testid="item-menu-btn"
                        onClick={(e) => { e.stopPropagation(); onToggleMenu(); }}
                    >
                        {isMenuOpen ? <X className="h-5 w-5" /> : <MoreVertical className="h-5 w-5" />}
                    </Button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

export function TabPlaylist({
  currentSong,
  playlist,
  playedPlaylist,
  onRemoveSong,
  onSkip,
  isPlaying, 
  remainingTime, 
  onPlay,
  onPause,
  isManualSortActive,
  onReorder,
  onTogglePriority,
  onToggleManualSort,
  isPartyClosed
}: Props) {
  const tHost = useTranslations('host');
  const tPlayer = useTranslations('player');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [items, setItems] = useState<ClientVideoInPlaylist[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topOfQueueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      setItems(playlist.map((video, idx) => ({
          ...video,
          _clientId: `${video.id}_${video.createdAt?.toString() ?? ''}_${idx}_${Math.random().toString(36).substring(2, 9)}`
      })));
  }, [playlist]);

  useEffect(() => {
      setOpenMenuId(null);
  }, [isManualSortActive]);

  const handleToggleHistory = () => {
      setShowHistory((prev) => !prev);
  };

  useLayoutEffect(() => {
      if (showHistory && topOfQueueRef.current) {
          topOfQueueRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
  }, [showHistory]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item._clientId === active.id);
      const newIndex = items.findIndex((item) => item._clientId === over.id);
      
      const newOrder = arrayMove(items, oldIndex, newIndex);
      setItems(newOrder);
      onReorder(newOrder);
    }
  };

  const sortedHistory = [...playedPlaylist].sort((a,b) => 
    new Date(a.playedAt ?? 0).getTime() - new Date(b.playedAt ?? 0).getTime()
  );

  if (isPartyClosed) {
      return (
        <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pb-6 pt-2 px-1">
            <div className="flex items-center justify-center gap-2 p-4 mb-2 bg-muted/50 rounded-lg border border-border/50">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{tHost('playback.closedHistory')}</span>
            </div>

            {sortedHistory.length > 0 ? (
                sortedHistory.map((video, index) => (
                    <ReadOnlyItem 
                        key={`${video.id}_${index}_history_closed`} 
                        video={video} 
                        index={index + 1} 
                    />
                ))
            ) : (
                <p className="text-muted-foreground text-sm p-8 text-center">
                    {tHost('playback.noHistory')}
                </p>
            )}
        </div>
      );
  }
  const queueIndexStart = showHistory ? playedPlaylist.length + 1 : 1;

  return (
    <>
      <div className="flex-shrink-0 z-20 relative">
        {!isManualSortActive ? (
            currentSong && (
                <div>
                    <PlaybackControls
                        currentSong={currentSong}
                        isPlaying={isPlaying}
                        onPlay={onPlay}
                        onPause={onPause}
                        onSkip={onSkip}
                        remainingTime={remainingTime}
                        isHistoryOpen={showHistory}
                        onToggleHistory={handleToggleHistory}
                    />
                </div>
            )
        ) : (
            <div className="pb-2 animate-in fade-in slide-in-from-top-2">
                <Button
                    onClick={onToggleManualSort}
                    variant="outline"
                    className="w-full bg-orange-500/10 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white h-12 text-lg font-bold shadow-sm transition-all"
                >
                    <Save className="mr-2 h-5 w-5" />
                    {tHost('playback.saveOrder')}
                </Button>
            </div>
        )}
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto min-h-0 space-y-2 pb-6 pt-2 overscroll-y-contain w-full max-w-[100vw] px-1 rounded-3xl"
        onScroll={() => { if(openMenuId) setOpenMenuId(null); }}
      >
        {!isManualSortActive && showHistory && playedPlaylist.length > 0 && (
            <div className="space-y-2 mb-2">
                {sortedHistory.map((video, index) => (
                    <ReadOnlyItem 
                        key={`${video.id}_${index}_history`} 
                        video={video} 
                        index={index + 1} 
                    />
                ))}
                
                <div className="flex items-center gap-2 py-4 opacity-70">
                    <div className="h-[1px] bg-primary flex-1" />
                    <span className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1">
                        <ChevronDown className="h-3 w-3" /> {tPlayer('nextUp')}
                    </span>
                    <div className="h-[1px] bg-primary flex-1" />
                </div>
            </div>
        )}

        <div ref={topOfQueueRef} />

        <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragEnd={handleDragEnd}
        >
            <SortableContext 
                items={items.map(v => v._clientId)} 
                strategy={verticalListSortingStrategy}
                disabled={!isManualSortActive} 
            >
                {items.map((video, index) => (
                    <SortableItem 
                        key={video._clientId} 
                        uniqueId={video._clientId}
                        video={video} 
                        index={queueIndexStart + index} 
                        onRemove={onRemoveSong}
                        onTogglePriority={onTogglePriority}
                        isSorting={isManualSortActive}
                        isMenuOpen={openMenuId === video._clientId}
                        onToggleMenu={() => setOpenMenuId(openMenuId === video._clientId ? null : video._clientId)}
                    />
                ))}
            </SortableContext>
        </DndContext>

        {!currentSong && items.length === 0 && (
            <p className="text-muted-foreground text-sm p-4 text-center mt-8">
                {tHost('playback.emptyQueue')}
            </p>
        )}
      </div>
    </>
  );
}
