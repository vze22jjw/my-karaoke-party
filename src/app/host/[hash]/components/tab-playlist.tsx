"use client";

import type { KaraokeParty, VideoInPlaylist } from "~/types/app-types";
import { Button } from "~/components/ui/ui/button";
import { cn } from "~/lib/utils";
import { decode } from "html-entities";
import { X, GripVertical } from "lucide-react"; 
import Image from "next/image";
import { PlaybackControls } from "./playback-controls";
import { useState, useEffect } from "react";

// DND Kit
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
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
};

// -- Sortable Item Component --
function SortableItem({ 
    video, 
    index, 
    onRemove, 
    isSorting, 
}: { 
    video: VideoInPlaylist, 
    index: number, 
    onRemove: (id: string) => void, 
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
      disabled: !isSorting // Only disable DnD if sorting is OFF
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch justify-between gap-2 touch-none">
      <div className="flex-1 min-w-0 p-2 rounded-lg bg-muted/50 border border-border flex gap-2 items-center">
        
        {/* Drag Handle: Visible ONLY when sorting */}
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
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 flex w-10">
        <Button
          size="icon"
          className="h-full w-full p-2 rounded-lg bg-muted/50 border border-border text-red-500 hover:bg-gray-700"
          onClick={() => onRemove(video.id)}
          // Disable removal if we are currently sorting (to prevent index mismatches)
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
  isSkipping, 
  isPlaying, 
  remainingTime, 
  onPlay,
  onPause,
  isManualSortActive,
  onReorder,
}: Props) {
  // Sensors for DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), // 8px movement required to start drag
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Local state for optimistic reordering
  const [items, setItems] = useState(playlist);

  // Sync local state with prop when not sorting (or initially)
  useEffect(() => {
      // Only update if we are NOT actively dragging/sorting, or if server sent a hard update
      setItems(playlist);
  }, [playlist]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      
      // Removed the index 0 lock check here to allow full reordering

      const newOrder = arrayMove(items, oldIndex, newIndex);
      setItems(newOrder); // Optimistic UI update
      onReorder(newOrder); // Notify parent (HostScene) to hold this state for saving
    }
  };

  const nextVideos = items; // These are just the unplayed ones

  return (
    <div className="flex flex-col">
      {currentSong && (
        <div className="flex-shrink-0 mb-2">
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

      {/* Manual Sort Mode Indicator */}
      {isManualSortActive && (
          <div className="bg-orange-500/10 border border-orange-500 text-orange-500 p-2 rounded-md mb-2 text-center text-sm font-bold animate-pulse">
              Manual Sort Active - Drag to Reorder
          </div>
      )}

      <div className="space-y-2 pt-2">
        {/* The Dnd Context Wrapper */}
        <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragEnd={handleDragEnd}
        >
            <SortableContext 
                items={nextVideos.map(v => v.id)} 
                strategy={verticalListSortingStrategy}
                disabled={!isManualSortActive} // Disable DnD if manual sort is OFF
            >
                {nextVideos.map((video, index) => (
                    <SortableItem 
                        key={video.id} 
                        video={video} 
                        index={index + 1} 
                        onRemove={onRemoveSong}
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
