/* eslint-disable */
"use client";

import { useLocalStorage } from "@mantine/hooks";
import type { Party, IdleMessage } from "@prisma/client";
import type { KaraokeParty, VideoInPlaylist } from "party";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { HostControlPanel } from "./components/host-control-panel"; 
import { usePartySocket } from "~/hooks/use-party-socket";
import { api } from "~/trpc/react";
import LoaderFull from "~/components/loader-full";
import { toast } from "sonner"; // <-- THIS IS THE FIX

type InitialPartyData = {
  currentSong: VideoInPlaylist | null;
  unplayed: VideoInPlaylist[];
  played: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
  currentSongStartedAt: Date | null;
  currentSongRemainingDuration: number | null;
  status: string;
  idleMessages: string[];
};

type Props = {
  party: Party;
  initialData: InitialPartyData;
};

const MAX_SEARCH_RESULTS_KEY = "karaoke-max-results";

export function HostScene({ party, initialData }: Props) {
  const router = useRouter();
  
  const [isConfirmingClose, setIsConfirmingClose] = useState(false); 

  const [activeTab, setActiveTab] = useLocalStorage({
    key: "karaoke-player-active-tab",
    defaultValue: "playlist",
  });
  
  const [maxSearchResults, setMaxSearchResults] = useLocalStorage<number>({
    key: MAX_SEARCH_RESULTS_KEY,
    defaultValue: 10,
  });

  if (!party.hash) {
    return <div>Error: Party hash is missing.</div>;
  }

  const { 
    currentSong, 
    unplayedPlaylist, 
    playedPlaylist,
    settings, 
    socketActions, 
    isConnected,
    isSkipping,
    isPlaying, 
    remainingTime,
    participants,
    hostName,
    partyStatus,
    idleMessages // This is the PARTY's current messages
  } = usePartySocket(
    party.hash,
    initialData, 
    "Host"
  );
  
  const { 
    data: hostIdleMessages, 
    isLoading: isLoadingMessages,
    refetch: refetchIdleMessages 
  } = api.idleMessage.getByHost.useQuery(
    { hostName: hostName ?? "" },
    { enabled: !!hostName } // Only fetch when we know the host name
  );

  const addIdleMessage = api.idleMessage.add.useMutation({
    onSuccess: () => {
      void refetchIdleMessages();
    },
    onError: (error) => {
      toast.error("Failed to add message", {
        description: error.message,
      });
    },
  });

  const deleteIdleMessage = api.idleMessage.delete.useMutation({
    onSuccess: () => {
      void refetchIdleMessages();
    },
    onError: (error) => {
      toast.error("Failed to delete message", {
        description: error.message,
      });
    },
  });
  
  const singerCount = participants.length;
  const playedSongCount = playedPlaylist.length;
  const unplayedSongCount = unplayedPlaylist.length + (currentSong ? 1 : 0);
  
  const useQueueRules = settings.orderByFairness;
  const disablePlayback = settings.disablePlayback ?? false; 
  
  const handleToggleRules = async () => {
    const newRulesState = !useQueueRules;
    socketActions.toggleRules(newRulesState);
  };

  const handleTogglePlayback = async () => { 
    const newPlaybackState = !disablePlayback;
    socketActions.togglePlayback(newPlaybackState);
  };

  const removeSong = async (videoId: string) => {
    socketActions.removeSong(videoId);
  };

  const handleSkip = async () => {
    if (isSkipping) return; 
    socketActions.startSkipTimer(); 
    socketActions.markAsPlayed();
    socketActions.playbackPause(); // Pause for next singer
  };
  
  const handleCloseParty = () => {
    setIsConfirmingClose(true);
  };

  const confirmCloseParty = async () => {
    socketActions.closeParty();
    setIsConfirmingClose(false);
  };

  const cancelCloseParty = () => {
    setIsConfirmingClose(false);
  };
  
  if (isLoadingMessages && activeTab === "settings") {
    return <LoaderFull />;
  }

  return (
    <div className="flex min-h-screen w-full justify-center">
      <div className="w-full sm:max-w-md"> 
        <HostControlPanel
          party={party}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentSong={currentSong}
          playlist={unplayedPlaylist}
          playedPlaylist={playedPlaylist}
          onRemoveSong={removeSong}
          onMarkAsPlayed={handleSkip} 
          useQueueRules={useQueueRules} 
          onToggleRules={handleToggleRules} 
          disablePlayback={disablePlayback} 
          onTogglePlayback={handleTogglePlayback} 
          maxSearchResults={maxSearchResults}
          onSetMaxResults={setMaxSearchResults}
          onCloseParty={handleCloseParty}
          isConfirmingClose={isConfirmingClose || isSkipping} 
          onConfirmClose={confirmCloseParty} 
          onCancelClose={cancelCloseParty}
          isSkipping={isSkipping}
          isPlaying={isPlaying} 
          remainingTime={remainingTime}
          onPlay={socketActions.playbackPlay}
          onPause={socketActions.playbackPause}
          hostName={hostName}
          singerCount={singerCount}
          playedSongCount={playedSongCount}
          unplayedSongCount={unplayedSongCount}
          partyStatus={partyStatus}
          onStartParty={socketActions.startParty}
          hostIdleMessages={hostIdleMessages ?? []}
          onAddIdleMessage={addIdleMessage.mutate}
          onDeleteIdleMessage={deleteIdleMessage.mutate}
          onSyncIdleMessages={socketActions.updateIdleMessages}
        />
      </div>
    </div>
  );
}
