/* eslint-disable */
"use client";

import { useLocalStorage } from "@mantine/hooks";
import type { Party, IdleMessage } from "@prisma/client";
import type { KaraokeParty, VideoInPlaylist } from "party";
import { useState, useRef, useEffect } from "react"; // <-- IMPORT useEffect
import { useRouter } from "next/navigation";
import { HostControlPanel } from "./components/host-control-panel"; 
import { usePartySocket } from "~/hooks/use-party-socket";
import { api } from "~/trpc/react";
import LoaderFull from "~/components/loader-full";
import { toast } from "sonner";
import { HostTourModal } from "./components/host-tour-modal"; // <-- IMPORT NEW COMPONENT

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
const HOST_TOUR_KEY = "has_seen_host_tour_v1"; // <-- Key for tour persistence

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

  // --- START: NEW TOUR LOGIC ---
  const [hasSeenTour, setHasSeenTour] = useLocalStorage({
    key: HOST_TOUR_KEY,
    defaultValue: false,
  });
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Check on mount if we should show the tour
  useEffect(() => {
    if (!hasSeenTour) {
      setIsTourOpen(true);
    }
  }, [hasSeenTour]);

  const handleCloseTour = () => {
    setIsTourOpen(false);
    setHasSeenTour(true); // Persist that the tour has been seen
  };
  // --- END: NEW TOUR LOGIC ---

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
    idleMessages
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
    { enabled: !!hostName }
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
  
  // ... (all other handle... functions remain the same) ...
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
    socketActions.playbackPause();
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
        
        {/* --- START: RENDER THE TOUR MODAL --- */}
        <HostTourModal isOpen={isTourOpen} onClose={handleCloseTour} />
        {/* --- END: RENDER THE TOUR MODAL --- */}

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
