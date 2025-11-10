"use client";

import type { Party } from "@prisma/client";
import { ListMusic, Settings, Users, Clock, Music } from "lucide-react";
import type { KaraokeParty, VideoInPlaylist } from "party";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TabPlaylist } from "./tab-playlist";
import { TabSettings } from "./tab-settings";
import { useState, useEffect } from "react"; 

type Props = {
  party: Party;
  activeTab: string;
  setActiveTab: (value: string) => void;
  currentSong: VideoInPlaylist | null; 
  playlist: KaraokeParty["playlist"]; 
  playedPlaylist: VideoInPlaylist[];
  onRemoveSong: (videoId: string) => void;
  onMarkAsPlayed: () => void; // This is handleSkip
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
  // --- THIS IS THE FIX ---
  partyStatus: string; // <-- THIS WAS MISSING
  onStartParty: () => void; // <-- THIS WAS MISSING
  // --- END THE FIX ---
};

// A simple hook to calculate and update the time ago string
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

    calculateTime(); // Set initial time
    const interval = setInterval(calculateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [createdAt]);

  return timeOpen;
}

export function HostControlPanel({
  party,
  activeTab,
  setActiveTab,
  currentSong,
  playlist,
  playedPlaylist,
  onRemoveSong,
  onMarkAsPlayed, // This is handleSkip
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
  partyStatus, // <-- Prop is now correctly destructured
  onStartParty, // <-- Prop is now correctly destructured
}: Props) {

  // Hooks MUST be called at the top level, before any conditional returns.
  const timeOpen = useTimeOpen(party.createdAt);

  if (!party.hash) return null; // <-- Conditional return is now AFTER the hook

  const totalSongs = playedSongCount + unplayedSongCount;

  return (
    <div className="w-full overflow-hidden border-border h-screen flex flex-col p-4">
      <div className="flex flex-col h-full flex-1 overflow-hidden">
        
        {/* === Party Title === */}
        <div className="flex-shrink-0">
          <h1 className="text-outline scroll-m-20 text-3xl sm:text-xl font-extrabold tracking-tight mb-4 truncate w-full text-center uppercase">
            {party.name}
          </h1>
        </div>

        {/* === New Info Panel === */}
        <div className="flex-shrink-0 rounded-lg border bg-card p-3 text-xs text-muted-foreground mb-4 space-y-2">
          
          <div className="flex justify-between items-center">
            {/* Host & Code */}
            <div className="flex flex-col">
              <span className="font-mono text-lg font-bold text-foreground">
                CODE: {party.hash}
              </span>
              <span className="font-medium text-foreground">
                Host: {hostName ?? "..."}
              </span>
            </div>
            
            {/* Time Open */}
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{timeOpen}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center border-t pt-2">
            {/* Singers */}
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span className="font-medium text-foreground">{singerCount}</span>
              <span>{singerCount === 1 ? "Singer" : "Singers"}</span>
            </div>
            
            {/* Songs */}
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

        {/* === Tabs === */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden" 
        >
          <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0">
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
            className="flex-1 overflow-y-auto mt-0 space-y-2"
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
            className="flex-1 overflow-y-auto mt-0"
          >
            <TabSettings
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
              partyStatus={partyStatus} // <-- This prop is now valid
              onStartParty={onStartParty} // <-- This prop is now valid
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
