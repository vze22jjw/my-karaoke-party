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
import type { InitialPartyData, VideoInPlaylist } from "~/types/app-types";
import { useRouter } from "next/navigation";

const getScopedKey = (hash: string, key: string) => `host-${hash}-${key}`;

type Props = {
  party: Party;
  initialData: InitialPartyData;
  hostName: string;
};

export function HostScene({ party, initialData, hostName }: Props) {
  const router = useRouter();
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
    themeSuggestions,
  } = usePartySocket(party.hash!, initialData, hostName);

  const [isManualSortActive, setIsManualSortActive] = useLocalStorage({
    key: getScopedKey(party.hash!, "manual-sort"),
    defaultValue: false,
  });

  const [activeTab, setActiveTab] = useLocalStorage({
    key: getScopedKey(party.hash!, "active-tab"),
    defaultValue: "playlist",
  });

  const [hasSeenTour, setHasSeenTour] = useLocalStorage({
    key: getScopedKey(party.hash!, "tour-seen"),
    defaultValue: false,
  });

  const [maxSearchResults, setMaxSearchResults] = useLocalStorage<number>({
    key: "host-global-max-results",
    defaultValue: 9,
  });

  const [localUnplayed, setLocalUnplayed] = useState<VideoInPlaylist[]>(initialData.unplayed);
  const hasSyncedRef = useRef(false);

  useEffect(() => {
      if (!isManualSortActive) {
          setLocalUnplayed(unplayedPlaylist);
          hasSyncedRef.current = true;
      } else if (!hasSyncedRef.current && unplayedPlaylist.length > 0) {
          setLocalUnplayed(unplayedPlaylist);
          hasSyncedRef.current = true;
      }
  }, [unplayedPlaylist, isManualSortActive]);

  const { 
    data: sharedIdleMessages, 
    refetch: refetchIdleMessages 
  } = api.idleMessage.getAll.useQuery();

  const [isConfirmingClose, setIsConfirmingClose] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

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

  // CHANGED: Added logout logic to onSuccess
  const closePartyMutation = api.party.toggleStatus.useMutation({
    onSuccess: async () => {
      toast.success("Party closed successfully");
      
      // 1. Clear server-side cookies
      await fetch("/api/auth/logout", { method: "POST" });

      // 2. Clear client-side storage for this party
      if (typeof window !== "undefined") {
        Object.keys(window.localStorage).forEach((key) => {
          if (key.startsWith(`host-${party.hash}-`)) {
            window.localStorage.removeItem(key);
          }
        });
      }

      // 3. Force redirect to home
      router.push("/");
      router.refresh();
    },
    onError: () => {
      toast.error("Failed to close party. Please try again.");
    }
  });

  const statusMutation = api.party.toggleStatus.useMutation({
    onSuccess: (data, variables) => {
        if (variables.status === "OPEN") {
             socketActions.playbackPause();
             socketActions.refreshParty();
             toast.info("Intermission Started");
        } else {
             socketActions.startParty(); 
             toast.success("Party Resumed!");
        }
    },
    onError: () => toast.error("Failed to update status")
  });

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

  const handleToggleManualSort = () => {
      if (isManualSortActive) {
          const newOrderIds = localUnplayed.map(v => v.id);
          socketActions.saveQueueOrder(newOrderIds);
          setIsManualSortActive(false);
      } else {
          setLocalUnplayed(unplayedPlaylist);
          setIsManualSortActive(true);
      }
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
        playlist={isManualSortActive ? localUnplayed : unplayedPlaylist}
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
          socketActions.toggleRules(!settings.orderByFairness);
        }}
        disablePlayback={settings.disablePlayback ?? false}
        onTogglePlayback={() => {
          socketActions.togglePlayback(!settings.disablePlayback);
        }}
        isManualSortActive={isManualSortActive}
        onToggleManualSort={handleToggleManualSort}
        onPlaylistReorder={(newList) => setLocalUnplayed(newList)}
        onTogglePriority={socketActions.togglePriority} 

        maxSearchResults={maxSearchResults}
        onSetMaxResults={setMaxSearchResults}
        
        onCloseParty={() => setIsConfirmingClose(true)}
        isConfirmingClose={isConfirmingClose}
        onConfirmClose={() => {
          // Trigger the mutation which now handles logout/redirect
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
        
        hostIdleMessages={sharedIdleMessages ?? []} 
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
        spotifyLink={settings.spotifyLink ?? null}
        onReplayTour={() => setIsTourOpen(true)}
      />
    </>
  );
}
