/* eslint-disable */
"use client";

import { useLocalStorage, useViewportSize } from "@mantine/hooks";
import type { Party, IdleMessage } from "@prisma/client";
import type { KaraokeParty, VideoInPlaylist, InitialPartyData } from "~/types/app-types";
import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { HostControlPanel } from "./components/host-control-panel"; 
import { usePartySocket } from "~/hooks/use-party-socket";
import LoaderFull from "~/components/loader-full";
import { toast } from "sonner";
import { api } from "~/trpc/react";


// 1. LAZY-LOAD THE MODAL (named export needs .then)
const LazyHostTourModal = lazy(() => 
  import("./components/host-tour-modal").then(module => ({ default: module.HostTourModal }))
);

// 2. LAZY-LOAD CONFETTI (default export is simpler)
const LazyConfetti = lazy(() => import("react-canvas-confetti"));


// FIX: Use InitialPartyData from ~/types/app-types.ts
// The definition below is redundant if imported, but kept for clarity based on original file's structure:
// type InitialPartyData = { ... };

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
  
  // Changed defaultValue from 10 to 12
  const [maxSearchResults, setMaxSearchResults] = useLocalStorage<number>({
    key: MAX_SEARCH_RESULTS_KEY,
    defaultValue: 12,
  });

  const [hasSeenTour, setHasSeenTour] = useLocalStorage({
    key: HOST_TOUR_KEY,
    defaultValue: false,
  });
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // --- START: CONFETTI LOGIC (Updated with 100ms Retry) ---
  const { width, height } = useViewportSize();
  const confettiRef = useRef<confetti.CreateTypes | null>(null);

  const onConfettiInit = useCallback((instance: confetti.CreateTypes | null) => {
    confettiRef.current = instance;
  }, []);

  const fireConfetti = useCallback(() => {
    // FIX: Increase MAX_RETRIES and delay for improved stability on lazy load
    const MAX_RETRIES = 10;
    let attempts = 0;

    const tryFire = () => {
      if (confettiRef.current) {
        confettiRef.current({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          zIndex: 200,
        });
        return true; // Success
      } else if (attempts < MAX_RETRIES) {
        attempts++;
        // Retry in 100ms (Max 1 second total delay)
        setTimeout(tryFire, 100); 
        return false; // Still trying
      }
      return false; // Failed after max retries
    };

    // Start the attempt sequence
    tryFire();
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
      // The retry logic within fireConfetti handles the race condition
      fireConfetti();
    }, 300);
  };

  // Function to re-open the tour
  const handleReplayTour = () => {
    setIsTourOpen(true);
  };
  
  if (!party.hash) {
    return <div>Error: Party hash is missing.</div>;
  }

  const { 
    currentSong, 
    unplayedPlaylist, 
    playedPlaylist, 
    settings, // <-- This object contains the spotifyPlaylistId
    socketActions, 
    isConnected,
    isSkipping,
    isPlaying, 
    remainingTime,
    participants,
    hostName,
    partyStatus,
    idleMessages,
    themeSuggestions
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
    <div className="flex min-h-screen w-full justify-center bg-gradient">
      {/* --- START OF FIX: WRAPPING MODAL AND CONFETTI IN SUSPENSE --- */}
      <Suspense fallback={null}>
        <LazyConfetti
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

        {/* 3. CONDITIONAL RENDER: Only include in DOM if the state is open */}
        {isTourOpen && (
          <LazyHostTourModal isOpen={isTourOpen} onClose={handleCloseTour} />
        )}
      </Suspense>
      {/* --- END OF FIX --- */}

      <div className="w-full sm:max-w-md">
        
        {/* The modal is no longer here */}

        <HostControlPanel
          party={party}
          partyName={party.name} 
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
          themeSuggestions={themeSuggestions}
          onUpdateThemeSuggestions={socketActions.updateThemeSuggestions}
          // --- PASS THE PROP ---
          spotifyPlaylistId={settings.spotifyPlaylistId ?? null}
          // --- THIS IS THE FIX ---
          onReplayTour={handleReplayTour}
          // --- END THE FIX ---
        />
      </div>
    </div>
  );
}
