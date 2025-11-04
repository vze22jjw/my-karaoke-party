"use client";

import type { Party } from "@prisma/client";
import { ListMusic, Settings } from "lucide-react";
import type { KaraokeParty, VideoInPlaylist } from "party"; // <-- Added VideoInPlaylist
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TabPlaylist } from "./tab-playlist";
import { TabSettings } from "./tab-settings";

type Props = {
  party: Party;
  activeTab: string;
  setActiveTab: (value: string) => void;
  currentSong: VideoInPlaylist | null; // <-- ADDED
  playlist: KaraokeParty["playlist"]; // This is the upcoming queue
  onRemoveSong: (videoId: string) => void;
  onMarkAsPlayed: () => void;
  useQueueRules: boolean;
  onToggleRules: () => void;
  maxSearchResults: number;
  onSetMaxResults: (value: number) => void;
  onCloseParty: () => void;
  isConfirmingClose: boolean;
  onConfirmClose: () => void;
  onCancelClose: () => void;
};

export function PlayerMobilePanel({
  party,
  activeTab,
  setActiveTab,
  currentSong, // <-- ADDED
  playlist,
  onRemoveSong,
  onMarkAsPlayed,
  useQueueRules,
  onToggleRules,
  maxSearchResults,
  onSetMaxResults,
  onCloseParty,
  isConfirmingClose,
  onConfirmClose,
  onCancelClose,
}: Props) {
  if (!party.hash) return null; // Guard for hash

  return (
    <div className="w-full overflow-hidden border-r border-border sm:hidden">
      <div className="flex flex-col h-full p-4 pt-14">
        {/* ... h1 ... */}
        <div className="flex-shrink-0">
          <h1 className="text-outline scroll-m-20 text-3xl sm:text-xl font-extrabold tracking-tight mb-4 truncate w-full text-center uppercase">
            {party.name}
          </h1>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* ... TabsList ... */}
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

          {/* --- Tab 1: Playlist Content (Refactored) --- */}
          <TabsContent
            value="playlist"
            className="flex-1 overflow-y-auto mt-0 space-y-2"
          >
            <TabPlaylist
              currentSong={currentSong} // <-- PASSES currentSong
              playlist={playlist}
              onRemoveSong={onRemoveSong}
              onMarkAsPlayed={onMarkAsPlayed}
            />
          </TabsContent>

          {/* --- Tab 2: Settings Content (Refactored) --- */}
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
        {/* --- END: Tabs Component --- */}
      </div>
    </div>
  );
}
