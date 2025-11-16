"use client";

import type { Party, IdleMessage } from "@prisma/client";
// --- THIS IS THE FIX ---
// Import Info icon
import { ListMusic, Settings, Users, Clock, Music, Info } from "lucide-react";
// --- END THE FIX ---
import type { KaraokeParty, VideoInPlaylist } from "party";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TabPlaylist } from "./tab-playlist";
import { TabSettings } from "./tab-settings";
import { useState, useEffect } from "react"; 
// --- THIS IS THE FIX ---
// Import Button
import { Button } from "~/components/ui/ui/button";
// --- END THE FIX ---

type Props = {
  party: Party;
  partyName: string; // <-- ADDED THIS PROP
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
  hostIdleMessages: IdleMessage[];
  onAddIdleMessage: (vars: { hostName: string; message: string }) => void;
  onDeleteIdleMessage: (vars: { id: number }) => void;
  onSyncIdleMessages: (messages: string[]) => void;
  themeSuggestions: string[]; 
  onUpdateThemeSuggestions: (suggestions: string[]) => void;
  // --- ADD THIS PROP ---
  spotifyPlaylistId: string | null;
  onReplayTour: () => void; // <-- THIS IS THE FIX
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
  partyName, // <-- DESTRUCTURE THIS
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
  hostIdleMessages,
  onAddIdleMessage,
  onDeleteIdleMessage,
  onSyncIdleMessages,
  themeSuggestions, 
  onUpdateThemeSuggestions,
  // --- DESTRUCTURE THIS PROP ---
  spotifyPlaylistId,
  onReplayTour, // <-- THIS IS THE FIX
}: Props) {

  const timeOpen = useTimeOpen(party.createdAt);
  if (!party.hash) return null;
  const totalSongs = playedSongCount + unplayedSongCount;

  return (
    <div className="w-full overflow-hidden h-[100dvh]">
      <div className="flex flex-col h-full flex-1 overflow-hidden p-4">
        
        {/* Party Title & Info Panel */}
        {/* --- THIS IS THE FIX --- */}
        {/* Reduced mb-4 to mb-2 */}
        <div className="flex-shrink-0 mb-2">
          <h1 className="text-outline scroll-m-20 text-3xl sm:text-xl font-extrabold tracking-tight truncate w-full text-center uppercase">
            {party.name}
          </h1>
        </div>
        {/* Reduced p-3 to p-2, space-y-2 to space-y-1, mb-4 to mb-2 */}
        <div className="flex-shrink-0 rounded-lg border bg-card p-2 text-xs text-muted-foreground mb-2 space-y-1">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="font-mono text-lg font-bold text-foreground">
                CODE: {party.hash}
              </span>
              {/* Added flex items-center and Info button */}
              <div className="flex items-center gap-1">
                <span className="font-medium text-foreground">
                  Host: {hostName ?? "..."}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-muted-foreground"
                  onClick={onReplayTour}
                >
                  <Info className="h-4 w-4" />
                </Button>
              </div>
              {/* --- END THE FIX --- */}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{timeOpen}</span>
            </div>
          </div>
          {/* Reduced pt-2 to pt-1 */}
          <div className="flex justify-between items-center border-t pt-1">
            {/* --- END THE FIX --- */}
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
          // --- THIS IS THE FIX ---
          // Reduced mb-4 to mb-2
          className="flex-1 flex flex-col overflow-hidden mt-2" 
          // --- END THE FIX ---
        >
          {/* --- THIS IS THE FIX --- */}
          {/* Reduced mb-4 to mb-2 */}
          <TabsList className="grid w-full grid-cols-2 mb-2 flex-shrink-0">
          {/* --- END THE FIX --- */}
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
            />
          </TabsContent>

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
              hostName={hostName}
              hostIdleMessages={hostIdleMessages ?? []}
              onAddIdleMessage={onAddIdleMessage}
              onDeleteIdleMessage={onDeleteIdleMessage}
              onSyncIdleMessages={onSyncIdleMessages}
              themeSuggestions={themeSuggestions}
              onUpdateThemeSuggestions={onUpdateThemeSuggestions}
              // --- PASS THE PROP HERE (THIS FIXES THE ERROR) ---
              spotifyPlaylistId={spotifyPlaylistId}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
