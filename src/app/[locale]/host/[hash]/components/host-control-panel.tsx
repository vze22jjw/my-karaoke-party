"use client";

import type { Party, IdleMessage } from "@prisma/client";
import { ListMusic, Settings, Users, Clock, Music, Info, KeyRound, Crown, LogOut } from "lucide-react";
import type { KaraokeParty, VideoInPlaylist } from "~/types/app-types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TabPlaylist } from "./tab-playlist";
import { TabSettings } from "./tab-settings";
import { useState, useEffect } from "react"; 
import { Button } from "~/components/ui/ui/button";
import { FitText } from "~/components/fit-text";
import { useRouter } from "~/navigation"; 
import { toast } from "sonner";
import { useTranslations } from "next-intl"; 

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
  spotifyLink?: string | null;
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
  spotifyLink,
  onReplayTour,
}: Props) {
  const router = useRouter();
  const timeOpen = useTimeOpen(party.createdAt);
  
  const tHost = useTranslations('host');
  const tCommon = useTranslations('common');
  
  const isPartyClosed = partyStatus === "CLOSED";
  
  if (!party.hash) return null;

  const handleHostLogout = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
      await fetch(`${baseUrl}/api/auth/logout`, { method: "POST" });

      if (typeof window !== "undefined") {
        Object.keys(window.localStorage).forEach((key) => {
          if (key.startsWith(`host-${party.hash}-`)) {
            window.localStorage.removeItem(key);
          }
        });
      }
      
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error(tCommon('error'));
    }
  };

  return (
    <div className="w-full overflow-hidden h-[100dvh]">
      <div className="flex flex-col h-full flex-1 overflow-hidden p-4">
        
        <div className="flex-shrink-0 mb-2">
          <FitText className="text-outline scroll-m-20 text-3xl sm:text-xl font-extrabold tracking-tight w-full text-center uppercase">
            {party.name}
          </FitText>
        </div>
        
        <div className="flex-shrink-0 rounded-lg border bg-card p-3 text-sm text-muted-foreground mb-2 shadow-sm flex flex-col gap-2">
          
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                <Crown className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                <span className="font-medium text-foreground text-base truncate">
                  {hostName ?? "..."}
                </span>
             </div>

             <div className="flex items-center gap-3 flex-shrink-0">
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
          </div>

          <div className="flex items-center justify-between h-[32px] gap-2">
             
             <div className="flex items-center gap-1 flex-shrink-0">
                <KeyRound className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="flex items-start relative">
                    <span className="font-mono text-xl font-bold text-foreground tracking-wider leading-none">
                      {party.hash}
                    </span>
                    <button
                        className="text-muted-foreground hover:text-foreground ml-0.5 -mt-2 p-1"
                        onClick={onReplayTour}
                        title={tCommon('viewHistory')}
                    >
                        <Info className="h-3 w-3" />
                    </button>
                </div>
             </div>

             <div className="flex-1 flex items-center justify-center min-w-0 px-1">
                 <div className="flex items-center gap-1.5 opacity-80 max-w-full justify-center">
                    <Music className="h-5 w-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0 flex justify-center w-full">
                         <FitText className="font-bold text-foreground text-base leading-none whitespace-nowrap">
                            {unplayedSongCount} <span className="opacity-60 text-[0.9em]">({playedSongCount})</span>
                         </FitText>
                    </div>
                 </div>
             </div>

             <div className="flex-shrink-0">
                <Button 
                    variant="ghost" 
                    onClick={handleHostLogout} 
                    className="h-8 px-2 hover:bg-transparent hover:text-foreground/80 -mr-2" 
                    aria-label="Leave party"
                >
                    <span className="text-sm font-semibold text-white mr-1">{tCommon('leave')}</span>
                    <LogOut className="h-4 w-4" />
                </Button>
             </div>
          </div>

        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden mt-2 min-h-0" 
        >
          <TabsList className="grid w-full grid-cols-2 mb-2 flex-shrink-0 h-auto p-1 bg-muted rounded-md">
            <TabsTrigger value="playlist" className="flex items-center gap-2">
              <ListMusic className="h-4 w-4" />
              <span className="inline">{tHost('tabs.playlist')}</span>
            </TabsTrigger>
            
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="inline">{tHost('tabs.settings')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="playlist"
            className="flex-1 flex flex-col overflow-hidden mt-0 pb-0 min-h-0 h-full data-[state=inactive]:hidden"
          >
            <TabPlaylist
              currentSong={currentSong ?? {
                  id: "empty",
                  title: tHost('playback.noSong'),
                  singerName: "Idle",
                  coverUrl: "/my-karaoke-party-logo.png",
                  artist: "",
                  song: "",
                  duration: "0",
                  isPriority: false,
                  isManual: false,
                  playedAt: null,
                  spotifyId: null,
                  applauseCount: 0
              }}
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
              isPartyClosed={isPartyClosed}
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
              spotifyLink={spotifyLink} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
