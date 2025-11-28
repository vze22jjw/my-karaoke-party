"use client";

import type { Party, IdleMessage } from "@prisma/client";
import { ListMusic, Settings, Users, Clock, Music, Info, KeyRound, Crown } from "lucide-react";
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
        setTimeOpen(`${diffDays}d`);
      } else if (diffHours > 0) {
        setTimeOpen(`${diffHours}h`);
      } else if (diffMins > 0) {
        setTimeOpen(`${diffMins}m`);
      } else {
        setTimeOpen("now");
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

  return (
    <div className="w-full overflow-hidden h-[100dvh]">
      <div className="flex flex-col h-full flex-1 overflow-hidden p-4">
        
        {/* 1. PARTY NAME */}
        <div className="flex-shrink-0 mb-2">
          <FitText className="text-outline scroll-m-20 text-3xl sm:text-xl font-extrabold tracking-tight w-full text-center uppercase">
            {party.name}
          </FitText>
        </div>
        
        {/* 2. INFO HEADER LAYOUT */}
        <div className="flex-shrink-0 rounded-lg border bg-card p-3 text-sm text-muted-foreground mb-2 shadow-sm">
          <div className="grid grid-cols-2 gap-y-1">
            
            {/* LEFT COLUMN */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 h-[24px]">
                <Crown className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                <span className="font-medium text-foreground text-base truncate max-w-[140px]">
                  {hostName ?? "..."}
                </span>
              </div>

              <div className="flex items-center gap-2 h-[32px]">
                <KeyRound className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-mono text-xl font-bold text-foreground tracking-wider leading-none mt-0.5">
                  {party.hash}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground ml-1"
                  onClick={onReplayTour}
                  title="Show Tour"
                >
                  <Info className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center justify-end gap-3 h-[24px]">
                <div className="flex items-center gap-1.5">
                   <Users className="h-5 w-5" />
                   <span className="font-bold text-foreground text-base">{singerCount}</span>
                </div>
                <div className="h-3 w-[1px] bg-border" /> 
                <div className="flex items-center gap-1.5">
                   <Clock className="h-5 w-5" />
                   <span className="font-bold text-foreground text-base">{timeOpen}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1.5 h-[32px]">
                <Music className="h-5 w-5" />
                <span className="font-bold text-foreground text-base leading-none mt-0.5">
                  {unplayedSongCount} <span className="opacity-50 text-sm">({playedSongCount})</span>
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* 3. TABS */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden mt-2 min-h-0" 
        >
          <TabsList className="grid w-full grid-cols-2 mb-2 flex-shrink-0 h-auto p-1 bg-muted rounded-md">
            <TabsTrigger value="playlist" className="flex items-center gap-2">
              <ListMusic className="h-4 w-4" />
              <span className="inline">Playlist</span>
            </TabsTrigger>
            
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="playlist"
            className="flex-1 flex flex-col overflow-hidden mt-0 pb-0 min-h-0 h-full data-[state=inactive]:hidden"
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
              onToggleManualSort={onToggleManualSort}
              playedPlaylist={playedPlaylist}
            />
          </TabsContent>

          <TabsContent
            value="settings"
            className="flex-1 overflow-y-auto mt-0 pb-6 min-h-0 h-full data-[state=inactive]:hidden"
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
