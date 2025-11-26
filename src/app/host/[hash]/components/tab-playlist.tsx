"use client";

import type { KaraokeParty, VideoInPlaylist } from "~/types/app-types";
import { Button } from "~/components/ui/ui/button";
import { cn } from "~/lib/utils";
import { decode } from "html-entities";
import { X, GripVertical, Star } from "lucide-react"; 
import Image from "next/image";
import { PlaybackControls } from "./playback-controls";
import { useState, useEffect } from "react";

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
  onRemoveSong: (videoId: string) => void;
  onSkip: () => void;
  isSkipping: boolean; 
  isPlaying: boolean; 
  remainingTime: number; 
  onPlay: (currentTime?: number) => void;
  onPause: () => void;
  isManualSortActive: boolean; 
  onReorder: (newPlaylist: VideoInPlaylist[]) => void; 
  onTogglePriority: (videoId: string) => void;
};

function SortableItem({ 
    video, 
    index, 
    onRemove, 
    onTogglePriority,
    isSorting, 
}: { 
    video: VideoInPlaylist, 
    index: number, 
    onRemove: (id: string) => void, 
    onTogglePriority: (id: string) => void,
    isSorting: boolean,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
      id: video.id, 
      disabled: !isSorting 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch justify-between gap-2 touch-none">
      <div className="flex-1 min-w-0 p-2 rounded-lg bg-muted/50 border border-border flex gap-2 items-center">
        
        {isSorting && (
            <div {...attributes} {...listeners} className="cursor-grab p-1 text-muted-foreground hover:text-foreground">
                <GripVertical className="h-5 w-5" />
            </div>
        )}

        <div className="relative w-16 aspect-video flex-shrink-0">
          <Image
            src={video.coverUrl}
            fill={true}
            className="rounded-md object-cover"
            alt={video.title}
            sizes="64px"
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center gap-1 mb-1">
            <span className="font-mono text-xs text-muted-foreground">#{index + 1}</span>
            <p className="font-medium text-xs truncate">{decode(video.title)}</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground truncate">{video.singerName}</p>
            {video.isPriority && (
                <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded uppercase tracking-wide">VIP</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center gap-1">
        {!isSorting && (
            <Button
                size="icon"
                variant={video.isPriority ? "default" : "ghost"}
                disabled={video.isPriority} 
                className={cn(
                    "h-10 w-10 p-2 rounded-lg border border-border transition-all",
                    video.isPriority 
                        ? "bg-yellow-500 text-white border-yellow-600 opacity-100 hover:bg-yellow-500 cursor-default" 
                        : "bg-muted/50 text-muted-foreground"
                )}
                onClick={() => onTogglePriority(video.id)}
            >
                <Star className={cn("h-4 w-4", video.isPriority && "fill-current")} />
            </Button>
        )}

        <Button
          size="icon"
          className="h-10 w-10 p-2 rounded-lg bg-muted/50 border border-border text-red-500 hover:bg-gray-700"
          onClick={() => onRemove(video.id)}
          disabled={isSorting} 
        >
          <span className="sr-only">Remove song</span>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function TabPlaylist({
  currentSong,
  playlist,
  onRemoveSong,
  onSkip,
  isSkipping: _isSkipping, 
  isPlaying, 
  remainingTime, 
  onPlay,
  onPause,
  isManualSortActive,
  onReorder,
  onTogglePriority,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [items, setItems] = useState(playlist);

  useEffect(() => {
      setItems(playlist);
  }, [playlist]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      
      const newOrder = arrayMove(items, oldIndex, newIndex);
      setItems(newOrder);
      onReorder(newOrder);
    }
  };

  const nextVideos = items;

  return (
    <div className="flex flex-col flex-1 w-full min-h-0">
      {/* Pinned Header Section */}
      <div className="flex-shrink-0 bg-background pb-2 z-10">
        {currentSong && (
          <div className="mb-2">
            <PlaybackControls
              currentSong={currentSong}
              isPlaying={isPlaying}
              onPlay={onPlay}
              onPause={onPause}
              onSkip={onSkip}
              remainingTime={remainingTime}
            />
          </div>
        )}

        {isManualSortActive && (
            <div className="bg-orange-500/10 border border-orange-500 text-orange-500 p-2 rounded-md mb-2 text-center text-sm font-bold animate-pulse">
                Manual Sort Active - Drag to Reorder
            </div>
        )}
      </div>

      {/* Scrolling List Section */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pb-32">
        <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragEnd={handleDragEnd}
        >
            <SortableContext 
                items={nextVideos.map(v => v.id)} 
                strategy={verticalListSortingStrategy}
                disabled={!isManualSortActive} 
            >
                {nextVideos.map((video, index) => (
                    <SortableItem 
                        key={video.id} 
                        video={video} 
                        index={index + 1} 
                        onRemove={onRemoveSong}
                        onTogglePriority={onTogglePriority}
                        isSorting={isManualSortActive}
                    />
                ))}
            </SortableContext>
        </DndContext>

        {!currentSong && nextVideos.length === 0 && (
            <p className="text-muted-foreground text-sm p-4 text-center">
                No songs in queue.
            </p>
        )}
      </div>
    </div>
  );
}
