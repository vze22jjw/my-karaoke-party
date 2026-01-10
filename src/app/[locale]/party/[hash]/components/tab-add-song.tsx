/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
"use client";

import { type VideoInPlaylist } from "~/types/app-types";
import { SongSearch } from "~/components/song-search";
import { Music, AlertCircle, GripVertical, Trash2, Save, X } from "lucide-react";
import { decode } from "html-entities";
import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/ui/button";
import { useState, useEffect } from "react";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { debugLog } from "~/utils/debug-logger";

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

const LOG_TAG = "[TabAddSong]";

type SocketActions = {
    deleteMySong: (partyHash: string, videoId: string, singerName: string) => void;
    reorderMyQueue: (partyHash: string, singerName: string, newOrderIds: string[]) => void;
};

type Props = {
  partyHash: string;
  socketActions: SocketActions;
  partyStatus: string;
  playlist: VideoInPlaylist[];
  name: string;
  onVideoAdded: (videoId: string, title: string, coverUrl: string) => boolean;
  initialSearchQuery: string;
  onSearchQueryConsumed: () => void;
  hasReachedQueueLimit: boolean;
  maxQueuePerSinger: number;
  isManualSortActive?: boolean;
  searchPlaceholder: string; // <-- Translated prop
};

type SortableItemData = VideoInPlaylist & { _sortId: string };

function SortableItem({ video, index, onDelete }: { video: SortableItemData, index: number, onDelete: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: video._sortId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style} className="touch-manipulation mb-2">
      <div className="flex items-center gap-2 p-2 rounded-lg border bg-card border-white/10">
        <div {...attributes} {...listeners} className="text-muted-foreground cursor-grab active:cursor-grabbing p-1">
           <GripVertical className="h-5 w-5" />
        </div>
        
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">
           {index}
        </div>

        <div className="flex-1 min-w-0">
           <p className="font-medium text-sm truncate">{decode(video.title)}</p>
        </div>

        <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-red-400 hover:bg-red-900/20 hover:text-red-300"
            onClick={() => onDelete(video.id)}
        >
            <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function TabAddSong({
  partyHash,
  socketActions,
  partyStatus,
  playlist,
  name,
  onVideoAdded,
  initialSearchQuery,
  onSearchQueryConsumed,
  hasReachedQueueLimit = false,
  maxQueuePerSinger: _maxQueuePerSinger,
  isManualSortActive = false,
  searchPlaceholder,
}: Props) {
  const t = useTranslations('guest.addSong');
  const tCommon = useTranslations('common');
  const [isEditing, setIsEditing] = useState(false);
  const [items, setItems] = useState<SortableItemData[]>([]);
  
  const playingNow = playlist[0];
  const isMySongPlaying = !!playingNow && playingNow.singerName === name && !playingNow.playedAt;
  const myPlayingSong: VideoInPlaylist | null = isMySongPlaying ? playingNow : null;

  const myUpcomingSongs = playlist
    .slice(myPlayingSong ? 1 : 0)
    .filter((v) => v.singerName === name && !v.playedAt);

  useEffect(() => {
      if (!isEditing) {
          setItems(myUpcomingSongs.map(v => ({ ...v, _sortId: v.id })));
      }
  }, [myUpcomingSongs, isEditing]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item._sortId === active.id);
      const newIndex = items.findIndex((item) => item._sortId === over.id);
      setItems((items) => arrayMove(items, oldIndex, newIndex));
    }
  };

  const nextInLine = playlist[1]; 
  const isUpNext = nextInLine?.singerName === name;
  const isPartyStarted = partyStatus === "STARTED";

  const isRestricted = isPartyStarted && (isMySongPlaying || isUpNext);

  const handleToggleEdit = () => {
      if (isRestricted) {
          toast.error(t('cannotEdit'), { description: t('waitTurn') });
          return;
      }
      if (isEditing) {
          setItems(myUpcomingSongs.map(v => ({ ...v, _sortId: v.id })));
      }
      setIsEditing(!isEditing);
  };

  const handleSaveOrder = () => {
      if (isRestricted) {
          toast.error(t('cannotEdit'));
          setIsEditing(false);
          return;
      }
      const newOrderIds = items.map(i => i.id);
      debugLog(LOG_TAG, `Saving new order for ${name}`, newOrderIds);
      socketActions.reorderMyQueue(partyHash, name, newOrderIds);
      setIsEditing(false);
      toast.success(tCommon('save'));
  };

  const handleDelete = (videoId: string) => {
      if (confirm(t('confirmDelete'))) {
          debugLog(LOG_TAG, `Deleting song ${videoId} for ${name}`);
          socketActions.deleteMySong(partyHash, videoId, name);
          setItems(prev => prev.filter(i => i.id !== videoId));
      }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg border">
        
        <div className={(isManualSortActive || isEditing) ? "opacity-50 pointer-events-none" : ""}>
            <SongSearch
              onVideoAdded={onVideoAdded}
              playlist={playlist}
              name={name}
              initialSearchQuery={initialSearchQuery}
              onSearchQueryConsumed={onSearchQueryConsumed}
              hasReachedQueueLimit={hasReachedQueueLimit || isManualSortActive}
              searchPlaceholder={searchPlaceholder}
            >
                <div>
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Music className="h-5 w-5" />
                        {t('title')}
                    </h2>

                    {isManualSortActive && (
                        <div className="mb-3 rounded-md bg-orange-900/50 border border-orange-500 p-3 text-center text-white font-bold animate-pulse">
                            {t('queueLocked')}
                        </div>
                    )}

                    {!isManualSortActive && hasReachedQueueLimit && (
                        <div className="mb-3 rounded-md bg-red-900/50 border border-red-700 p-2 text-center text-sm text-white font-medium">
                            {t('queueFull')}
                        </div>
                    )}
                </div>
            </SongSearch>
        </div>
      </div>

      {name && (
        <div className="bg-card rounded-lg p-4 border relative">
          <div className="flex items-center justify-between mb-3">
             <h3 className="text-md font-semibold">{t('myQueue')}</h3>
             {myUpcomingSongs.length > 0 && (
                 <Button 
                    size="sm" 
                    variant={isEditing ? "secondary" : "ghost"}
                    onClick={handleToggleEdit}
                    className={cn("h-8 text-xs gap-1", isRestricted && "opacity-50")}
                 >
                    {isEditing ? <X className="h-3 w-3" /> : <GripVertical className="h-3 w-3" />}
                    {isEditing ? tCommon('cancel') : t('manage')}
                 </Button>
             )}
          </div>

          {isRestricted && (
              <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {t('restrictedMessage')}
              </div>
          )}

          {myPlayingSong && (
             <div className="mb-4 p-2 rounded-lg bg-green-900/20 border border-green-500/30">
                 <p className="text-xs font-bold text-green-400 mb-1 uppercase tracking-wider">{t('playingNow')}</p>
                 <p className="font-medium text-sm truncate">{decode(myPlayingSong.title)}</p>
             </div>
          )}

          {items.length === 0 && !myPlayingSong ? (
            <p className="text-sm text-muted-foreground">
              {t('emptyHistory')}
            </p>
          ) : isEditing ? (
             <div className="space-y-3">
                <DndContext 
                    sensors={sensors} 
                    collisionDetection={closestCenter} 
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext 
                        items={items.map(i => i._sortId)} 
                        strategy={verticalListSortingStrategy}
                    >
                        {items.map((video, index) => (
                            <SortableItem 
                                key={video._sortId} 
                                video={video} 
                                index={index + 1} 
                                onDelete={handleDelete}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
                <Button className="w-full" onClick={handleSaveOrder}>
                    <Save className="mr-2 h-4 w-4" />
                    {t('saveOrder')}
                </Button>
             </div>
          ) : (
            <ul className="space-y-3">
              {myUpcomingSongs.map((video, index) => (
                <li
                  key={video.id + (video.playedAt?.toString() ?? "")}
                  className="flex items-start gap-3 p-2 rounded transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {decode(video.title)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
