/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePartySocket } from "~/hooks/use-party-socket";
import { HostControlPanel } from "./components/host-control-panel";
import LoaderFull from "~/components/loader-full";
import { HostTourModal } from "./components/host-tour-modal";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { useLocalStorage, useViewportSize } from "@mantine/hooks";
import Confetti from "react-canvas-confetti";
import type { Party } from "@prisma/client";
import type { InitialPartyData } from "~/types/app-types";

const MAX_SEARCH_RESULTS_KEY = "karaoke-max-results";
const HOST_TOUR_KEY = "has_seen_host_tour_v1";

type Props = {
  party: Party;
  initialData: InitialPartyData;
};

export function HostScene({ party, initialData }: Props) {
  // Removed unused router

  const {
    currentSong,
    unplayedPlaylist,
    playedPlaylist,
    partyStatus,
    participants,
    socketActions,
    isPlaying,
    remainingTime,
    settings,
    // Removed unused idleMessages
    themeSuggestions,
  } = usePartySocket(party.hash!, initialData, "Host");

  const { 
    data: hostIdleMessages, 
    // Removed unused isLoadingMessages
    refetch: refetchIdleMessages 
  } = api.idleMessage.getByHost.useQuery(
    { hostName: participants.find(p => p.role === "Host")?.name ?? "Host" },
    { enabled: !!participants.length }
  );

  const [activeTab, setActiveTab] = useLocalStorage({
    key: "karaoke-player-active-tab",
    defaultValue: "playlist",
  });
  
  const [maxSearchResults, setMaxSearchResults] = useLocalStorage<number>({
    key: MAX_SEARCH_RESULTS_KEY,
    defaultValue: 12,
  });

  const [isConfirmingClose, setIsConfirmingClose] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useLocalStorage({
    key: HOST_TOUR_KEY,
    defaultValue: false,
  });

  const { width, height } = useViewportSize();
  const confettiRef = useRef<any>(null);

  const onConfettiInit = useCallback((instance: any) => {
    confettiRef.current = instance;
  }, []);

  const fireConfetti = useCallback(() => {
    if (confettiRef.current) {
      confettiRef.current({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 9999,
      });
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !hasSeenTour) {
      setIsTourOpen(true);
    }
  }, [isMounted, hasSeenTour]);

  const closePartyMutation = api.party.toggleStatus.useMutation({
    onSuccess: () => {
      toast.success("Party closed successfully");
    },
  });

  const statusMutation = api.party.toggleStatus.useMutation({
    onSuccess: (data, variables) => {
        if (variables.status === "OPEN") {
             socketActions.playbackPause(); // Good to stop any playback
             socketActions.refreshParty(); // <-- NEW: Force refresh to broadcast status change
             toast.info("Intermission Started");
        } else {
             // socketActions.startParty() sets status to STARTED internally, but we already did that via API.
             // Calling it again is fine as it just re-confirms and broadcasts.
             // Alternatively, we can just use refreshParty().
             socketActions.startParty(); 
             toast.success("Party Resumed!");
        }
    },
    onError: () => toast.error("Failed to update status")
  });

  const settingsMutation = api.party.settings.useMutation();
  const idleMessageMutation = api.idleMessage.add.useMutation({
    onSuccess: () => { void refetchIdleMessages(); }
  });
  const deleteIdleMessageMutation = api.idleMessage.delete.useMutation({
    onSuccess: () => { void refetchIdleMessages(); }
  });

  const handleCloseTour = () => {
    setIsTourOpen(false);
    setHasSeenTour(true);
    setTimeout(fireConfetti, 300);
  };

  const handleToggleIntermission = () => {
    const statusToSend = partyStatus === "OPEN" ? "STARTED" : "OPEN";
    statusMutation.mutate({ hash: party.hash!, status: statusToSend });
  };

  if (!isMounted) return <LoaderFull />;

  return (
    <>
      <Confetti
        refConfetti={onConfettiInit}
        width={width}
        height={height}
        style={{ position: 'fixed', width: '100%', height: '100%', zIndex: 9999, pointerEvents: 'none' }}
      />
      
      <HostTourModal isOpen={isTourOpen} onClose={handleCloseTour} onFireConfetti={fireConfetti} />
      
      <HostControlPanel
        party={party}
        partyName={party.name}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentSong={currentSong}
        playlist={unplayedPlaylist}
        playedPlaylist={playedPlaylist}
        onRemoveSong={socketActions.removeSong}
        onMarkAsPlayed={async () => {
          if (!currentSong) return;
          setIsSkipping(true);
          try {
            socketActions.markAsPlayed();
          } finally {
            setIsSkipping(false);
          }
        }}
        useQueueRules={settings.orderByFairness}
        onToggleRules={() => {
          settingsMutation.mutate({
            hash: party.hash!,
            useQueueRules: !settings.orderByFairness,
          });
        }}
        disablePlayback={settings.disablePlayback ?? false}
        onTogglePlayback={() => {
          settingsMutation.mutate({
            hash: party.hash!,
            disablePlayback: !settings.disablePlayback,
          });
        }}
        maxSearchResults={maxSearchResults}
        onSetMaxResults={setMaxSearchResults}
        onCloseParty={() => setIsConfirmingClose(true)}
        isConfirmingClose={isConfirmingClose}
        onConfirmClose={() => {
          closePartyMutation.mutate({ hash: party.hash!, status: "CLOSED" });
          setIsConfirmingClose(false);
        }}
        onCancelClose={() => setIsConfirmingClose(false)}
        isSkipping={isSkipping}
        isPlaying={isPlaying}
        remainingTime={remainingTime}
        onPlay={(t) => socketActions.playbackPlay(t)}
        onPause={() => socketActions.playbackPause()}
        hostName={participants.find((p) => p.role === "Host")?.name ?? "Host"}
        singerCount={participants.filter((p) => p.role === "Guest").length}
        playedSongCount={playedPlaylist.length}
        unplayedSongCount={unplayedPlaylist.length}
        partyStatus={partyStatus}
        onStartParty={socketActions.startParty}
        onToggleIntermission={handleToggleIntermission}
        
        hostIdleMessages={hostIdleMessages ?? []}
        onAddIdleMessage={(vars) => {
          idleMessageMutation.mutate({ ...vars, hostName: vars.hostName });
        }}
        onDeleteIdleMessage={(vars) => {
          deleteIdleMessageMutation.mutate(vars);
        }}
        onSyncIdleMessages={socketActions.updateIdleMessages}
        themeSuggestions={themeSuggestions}
        onUpdateThemeSuggestions={socketActions.updateThemeSuggestions}
        spotifyPlaylistId={settings.spotifyPlaylistId ?? null}
        onReplayTour={() => setIsTourOpen(true)}
      />
    </>
  );
}
