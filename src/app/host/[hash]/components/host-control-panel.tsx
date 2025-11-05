"use client";

import type { Party } from "@prisma/client";
import { ListMusic, Settings } from "lucide-react";
import type { KaraokeParty, VideoInPlaylist } from "party";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TabPlaylist } from "./tab-playlist";
import { TabSettings } from "./tab-settings";
import { PlaybackControls } from "./playback-controls"; 

type Props = {
  party: Party;
  activeTab: string;
  setActiveTab: (value: string) => void;
  currentSong: VideoInPlaylist | null; 
  playlist: KaraokeParty["playlist"]; 
  onRemoveSong: (videoId: string) => void;
  onMarkAsPlayed: () => void; // This is handleSkip
  useQueueRules: boolean;
  onToggleRules: () => void;
  maxSearchResults: number;
  onSetMaxResults: (value: number) => void;
  onCloseParty: () => void;
  isConfirmingClose: boolean;
  onConfirmClose: () => void;
  onCancelClose: () => void;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
};

// This component is the HOST'S mobile view
export function HostControlPanel({
  party,
  activeTab,
  setActiveTab,
  currentSong,
  playlist,
  onRemoveSong,
  onMarkAsPlayed, // This is handleSkip
  useQueueRules,
  onToggleRules,
  maxSearchResults,
  onSetMaxResults,
  onCloseParty,
  isConfirmingClose,
  onConfirmClose,
  onCancelClose,
  isPlaying,
  onPlay,
  onPause,
}: Props) {
  if (!party.hash) return null;

  return (
    // --- THIS IS THE FIX ---
    // This div now has `p-4` (like the party page) to add padding all around,
    // which should respect the iOS status bar safe area.
    <div className="w-full overflow-hidden border-r border-border sm:hidden h-screen flex flex-col p-4">
      {/* The inner div no longer needs complex padding */}
      <div className="flex flex-col h-full flex-1 overflow-hidden">
        <div className="flex-shrink-0">
          <h1 className="text-outline scroll-m-20 text-3xl sm:text-xl font-extrabold tracking-tight mb-4 truncate w-full text-center uppercase">
            {party.name}
          </h1>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          // Added `mt-4` to match the party page's tab spacing
          className="flex-1 flex flex-col overflow-hidden mt-4" 
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
              onSkip={onMarkAsPlayed} // Pass handleSkip to onSkip
            />
          </TabsContent>

          <TabsContent
            value="settings"
            className="flex-1 overflow-y-auto mt-0 space-y-6"
          >
            <TabSettings
              useQueueRules={useQueueRules}
              onToggleRules={onToggleRules}
              partyHash={party.hash}
              maxSearchResults={maxSearchResults}
              onSetMaxResults={onSetMaxResults}
              onCloseParty={onCloseParty}
              isConfirmingClose={isConfirmingClose}
              onConfirmClose={onConfirmClose}
              onCancelClose={onCancelClose}
            />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Playback Controls Bar */}
      <div className="flex-shrink-0">
        <PlaybackControls 
          currentSong={currentSong}
          isPlaying={isPlaying}
          onPlay={onPlay}
          onPause={onPause}
          onSkip={onMarkAsPlayed} // This is handleSkip
        />
      </div>
    </div>
  );
}
