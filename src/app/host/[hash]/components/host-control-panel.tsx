"use client";

import type { Party, IdleMessage } from "@prisma/client";
import { ListMusic, Settings, Users, Clock, Music, Info } from "lucide-react";
import type { KaraokeParty, VideoInPlaylist } from "~/types/app-types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TabPlaylist } from "./tab-playlist";
import { TabSettings } from "./tab-settings";
import { useState, useEffect } from "react"; 
import { Button } from "~/components/ui/ui/button";
import { FitText } from "~/components/fit-text";

type Props = {
  party: Party;
  partyName: string;
  activeTab: string;
  setActiveTab: (value: string) => void;
  currentSong: VideoInPlaylist | null; 
  playlist: KaraokeParty["playlist"]; 
  playedPlaylist: VideoInPlaylist[];
  onRemoveSong: (videoId: string) => void;
  onMarkAsPlayed: () => void;
  useQueueRules: boolean;
  onToggleRules: () => void;
  disablePlayback: boolean; 
  onTogglePlayback: () => void;
  isManualSortActive: boolean; 
  onToggleManualSort: () => void;
  onPlaylistReorder: (list: VideoInPlaylist[]) => void;
  onTogglePriority: (videoId: string) => void; 
  maxSearchResults: number;
  onSetMaxResults: (value: number) => void;
  onCloseParty: () => void;
  isConfirmingClose: boolean;
  onConfirmClose: () => void;
  onCancelClose: () => void;
  isSkipping: boolean;
  isPlaying: boolean; 
  remainingTime: number; 
  onPlay: (currentTime?: number) => void;
  onPause: () => void;
  hostName: string | null;
  singerCount: number;
  playedSongCount: number;
  unplayedSongCount: number;
  partyStatus: string;
  onStartParty: () => void;
  onToggleIntermission: () => void;
  hostIdleMessages: IdleMessage[];
  onAddIdleMessage: (vars: { hostName: string; message: string }) => void;
  onDeleteIdleMessage: (vars: { id: number }) => void;
  onSyncIdleMessages: (messages: string[]) => void;
  themeSuggestions: string[]; 
  onUpdateThemeSuggestions: (suggestions: string[]) => void;
  spotifyPlaylistId: string | null;
  onReplayTour: () => void;
};

function useTimeOpen(createdAt: Date) {
  const [timeOpen, setTimeOpen] = useState("");
  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const diffMs = now.getTime() - new Date(createdAt).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays > 0) {
        setTimeOpen(`Open for ${diffDays}d ${diffHours % 24}h`);
      } else if (diffHours > 0) {
        setTimeOpen(`Open for ${diffHours}h ${diffMins % 60}m`);
      } else if (diffMins > 0) {
        setTimeOpen(`Open for ${diffMins}m`);
      } else {
        setTimeOpen("Open just now");
      }
    };
    calculateTime();
    const interval = setInterval(calculateTime, 60000);
    return () => clearInterval(interval);
  }, [createdAt]);
  return timeOpen;
}

export function HostControlPanel({
  party,
  partyName,
  activeTab,
  setActiveTab,
  currentSong,
  playlist,
  playedPlaylist,
  onRemoveSong,
  onMarkAsPlayed,
  useQueueRules,
  onToggleRules,
  disablePlayback, 
  onTogglePlayback,
  isManualSortActive,
  onToggleManualSort,
  onPlaylistReorder, 
  onTogglePriority,
  maxSearchResults,
  onSetMaxResults,
  onCloseParty,
  isConfirmingClose,
  onConfirmClose,
  onCancelClose,
  isSkipping,
  isPlaying, 
  remainingTime, 
  onPlay,
  onPause,
  hostName,
  singerCount,
  playedSongCount,
  unplayedSongCount,
  partyStatus,
  onStartParty,
  onToggleIntermission,
  hostIdleMessages,
  onAddIdleMessage,
  onDeleteIdleMessage,
  onSyncIdleMessages,
  themeSuggestions, 
  onUpdateThemeSuggestions,
  spotifyPlaylistId,
  onReplayTour,
}: Props) {

  const timeOpen = useTimeOpen(party.createdAt);
  if (!party.hash) return null;
  const totalSongs = playedSongCount + unplayedSongCount;

  return (
    <div className="w-full overflow-hidden h-[100dvh]">
      <div className="flex flex-col h-full flex-1 overflow-hidden p-4">
        <div className="flex-shrink-0 mb-2">
          <FitText className="text-outline scroll-m-20 text-3xl sm:text-xl font-extrabold tracking-tight w-full text-center uppercase">
            {party.name}
          </FitText>
        </div>
        
        {/* INFO HEADER */}
        <div className="flex-shrink-0 rounded-lg border bg-card p-2 text-xs text-muted-foreground mb-2 space-y-1">
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-1">
              {/* CHANGED: Matching Font and Height */}
              <span className="font-mono text-sm font-bold text-foreground">
                CODE: {party.hash}
              </span>
              <div className="flex items-center gap-1">
                {/* CHANGED: Matching Font and Height */}
                <span className="font-mono text-sm font-bold text-foreground">
                  HOST: {hostName ?? "..."}
                </span>
                {/* REMOVED: Info Button from here */}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{timeOpen}</span>
            </div>
          </div>
          <div className="flex justify-between items-center border-t pt-1">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span className="font-medium text-foreground">{singerCount}</span>
              <span>{singerCount === 1 ? "Singer" : "Singers"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Music className="h-4 w-4" />
              <span className="font-medium text-foreground">{totalSongs}</span>
              <span>{totalSongs === 1 ? "Song" : "Songs"}</span>
              <span className="text-xs">
                ({unplayedSongCount} up, {playedSongCount} done)
              </span>
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden mt-2" 
        >
          <TabsList className="grid w-full grid-cols-2 mb-2 flex-shrink-0">
            <TabsTrigger value="playlist" className="flex items-center gap-2">
              <ListMusic className="h-4 w-4" />
              <span className="inline">Playlist</span>
            </TabsTrigger>
            
            {/* CHANGED: Added Info Icon to Settings Tab */}
            <TabsTrigger value="settings" className="flex items-center gap-2 group relative">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="inline">Settings</span>
              </div>
              <div
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReplayTour();
                }}
                className="absolute right-2 p-1 rounded-full hover:bg-muted text-muted-foreground/70 hover:text-foreground transition-colors"
                title="Replay Tour"
              >
                <Info className="h-4 w-4" />
              </div>
            </TabsTrigger>
          </TabsList>

          {/* CHANGED: Removed overflow-y-auto to allow internal pinning */}
          <TabsContent
            value="playlist"
            className="flex-1 overflow-y-auto mt-0 pb-6"
          >
            <TabPlaylist
              currentSong={currentSong}
              playlist={playlist}
              onRemoveSong={onRemoveSong}
              onSkip={onMarkAsPlayed} 
              isSkipping={isSkipping}
              isPlaying={isPlaying} 
              remainingTime={remainingTime} 
              onPlay={onPlay}
              onPause={onPause}
              isManualSortActive={isManualSortActive}
              onReorder={onPlaylistReorder}
              onTogglePriority={onTogglePriority}
            />
          </TabsContent>

          {/* Keep settings scrolling as usual */}
          <TabsContent
            value="settings"
            className="flex-1 overflow-y-auto mt-0 pb-6"
          >
            <TabSettings
              partyName={partyName} 
              useQueueRules={useQueueRules}
              onToggleRules={onToggleRules}
              disablePlayback={disablePlayback} 
              onTogglePlayback={onTogglePlayback}
              isManualSortActive={isManualSortActive}
              onToggleManualSort={onToggleManualSort}
              partyHash={party.hash}
              maxSearchResults={maxSearchResults}
              onSetMaxResults={onSetMaxResults}
              onCloseParty={onCloseParty}
              isConfirmingClose={isConfirmingClose}
              onConfirmClose={onConfirmClose}
              onCancelClose={onCancelClose}
              playedPlaylist={playedPlaylist}
              partyStatus={partyStatus}
              onStartParty={onStartParty}
              onToggleIntermission={onToggleIntermission}
              hostName={hostName}
              hostIdleMessages={hostIdleMessages ?? []}
              onAddIdleMessage={onAddIdleMessage}
              onDeleteIdleMessage={onDeleteIdleMessage}
              onSyncIdleMessages={onSyncIdleMessages}
              themeSuggestions={themeSuggestions}
              onUpdateThemeSuggestions={onUpdateThemeSuggestions}
              spotifyPlaylistId={spotifyPlaylistId}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
