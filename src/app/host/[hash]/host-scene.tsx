/* eslint-disable */
"use client";

import { useLocalStorage, useViewportSize } from "@mantine/hooks";
import type { Party, IdleMessage } from "@prisma/client";
import type { KaraokeParty, VideoInPlaylist } from "party";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { HostControlPanel } from "./components/host-control-panel"; 
import { usePartySocket } from "~/hooks/use-party-socket";
import { api } from "~/trpc/react";
import LoaderFull from "~/components/loader-full";
import { toast } from "sonner";
import { HostTourModal } from "./components/host-tour-modal";
import Confetti from "react-canvas-confetti";

type InitialPartyData = {
  currentSong: VideoInPlaylist | null;
  unplayed: VideoInPlaylist[];
  played: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
  currentSongStartedAt: Date | null;
  currentSongRemainingDuration: number | null;
  status: string;
  idleMessages: string[];
  themeSuggestions: string[]; // <-- ADDED
};

type Props = {
  party: Party;
  initialData: InitialPartyData;
};

const MAX_SEARCH_RESULTS_KEY = "karaoke-max-results";
const HOST_TOUR_KEY = "has_seen_host_tour_v1";

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

  const [hasSeenTour, setHasSeenTour] = useLocalStorage({
    key: HOST_TOUR_KEY,
    defaultValue: false,
  });
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // --- START: CONFETTI LOGIC ---
  const { width, height } = useViewportSize();
  const confettiRef = useRef<confetti.CreateTypes | null>(null);

  const onConfettiInit = useCallback((instance: confetti.CreateTypes | null) => {
    confettiRef.current = instance;
  }, []);

  const fireConfetti = useCallback(() => {
    if (confettiRef.current) {
      confettiRef.current({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 200,
      });
    }
  }, []);
  // --- END: CONFETTI LOGIC ---

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !hasSeenTour) {
      setIsTourOpen(true);
    }
  }, [isMounted, hasSeenTour]);

  const handleCloseTour = () => {
    setIsTourOpen(false);
    setHasSeenTour(true);
    setTimeout(() => {
      fireConfetti();
    }, 300);
  };

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
    idleMessages,
    themeSuggestions // <-- ADDED
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
      {/* --- ADD CONFETTI COMPONENT --- */}
      <Confetti
        refConfetti={onConfettiInit}
        width={width}
        height={height}
        style={{
          position: 'fixed',
          width: '100%',
          height: '100%',
          zIndex: 200,
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      />
      {/* --- END CONFETTI COMPONENT --- */}

      <div className="w-full sm:max-w-md">
        
        <HostTourModal isOpen={isTourOpen} onClose={handleCloseTour} />

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
          themeSuggestions={themeSuggestions} // <-- ADDED
          onUpdateThemeSuggestions={socketActions.updateThemeSuggestions} // <-- ADDED
        />
      </div>
    </div>
  );
}
