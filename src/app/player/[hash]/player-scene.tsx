/* eslint-disable */
"use client";

import {
  readLocalStorageValue,
  useFullscreen,
  useLocalStorage,
} from "@mantine/hooks";
import type { Party } from "@prisma/client";
import type { KaraokeParty, VideoInPlaylist } from "party";
import { useState, useRef, useEffect } from "react";
import useSound from "use-sound";
import { getUrl } from "~/utils/url";
import { useRouter } from "next/navigation";

// --- Import new child components ---
import { PlayerMobilePanel } from "./components/player-mobile-panel";
import { PlayerDesktopView } from "./components/player-desktop-view";
import { api } from "~/trpc/react"; // <-- Import tRPC client

type Props = {
  party: Party;
  initialPlaylist: KaraokeParty;
};

const MAX_SEARCH_RESULTS_KEY = "karaoke-max-results";

export default function PlayerScene({ party, initialPlaylist }: Props) {
  const router = useRouter();
  const [playlist, setPlaylist] = useState<KaraokeParty["playlist"]>(
    initialPlaylist.playlist ?? [],
  );
  const [singers, setSingers] = useState<string[]>([]);
  const [isConfirmingClose, setIsConfirmingClose] = useState(false); // <-- Add state

  // State for the new tabs
  const [activeTab, setActiveTab] = useLocalStorage({
    key: "karaoke-player-active-tab",
    defaultValue: "playlist",
  });

  // --- REMOVE useLocalStorage ---
  // const [useQueueRules, setUseQueueRules] = useLocalStorage({
  //   key: "karaoke-queue-rules",
  //   defaultValue: true, // Default to ON (Fairness)
  // });
  
  // --- USE React.useState INSTEAD ---
  const [useQueueRules, setUseQueueRules] = useState(
    initialPlaylist.settings.orderByFairness ?? true,
  );

  const [maxSearchResults, setMaxSearchResults] = useLocalStorage<number>({
    key: MAX_SEARCH_RESULTS_KEY,
    defaultValue: 10,
  });

  const [playHorn] = useSound("/sounds/buzzer.mp3");
  const lastHornTimeRef = useRef<number>(0);

  // --- START: Compile Error Fix ---
  // This guard ensures that party.hash is treated as a string below.
  if (!party.hash) {
    // This should technically never be hit if the page loads,
    // but it satisfies TypeScript's type-checking.
    return <div>Error: Party hash is missing.</div>;
  }
  // --- END: Compile Error Fix ---

  // --- ADD THE TRPC MUTATION ---
  const updateSortOrder = api.party.updateSortOrder.useMutation({
    onError: (err) => {
      console.error("Failed to update sort order", err);
      alert("Failed to update sort order. Please try again.");
      // Revert optimistic update on error
      setUseQueueRules((prev) => !prev);
    },
  });

  // Reusable function to send heartbeat
  const sendHeartbeat = async () => {
    // --- Add guard ---
    if (!party.hash) return;
    try {
      await fetch("/api/party/heartbeat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hash: party.hash }),
      });
    } catch (error) {
      console.error("Error sending heartbeat:", error);
    }
  };

  // Function to process and set the new playlist from the server
  // --- UPDATE processAndSetPlaylist ---
  const processAndSetPlaylist = (data: {
    playlist: VideoInPlaylist[];
    settings: { orderByFairness: boolean }; // <-- Expect settings from API
  }) => {
    setPlaylist(data.playlist);
    setUseQueueRules(data.settings.orderByFairness); // <-- Update state from API
  };

// Poll for playlist updates every 3 seconds
  // --- UPDATE POLLING EFFECT ---
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // --- START: FIX ---
        // Add { cache: 'no-store' } to prevent stale data
        const response = await fetch(
          `/api/playlist/${party.hash}`, // <-- Simpler URL
          { cache: 'no-store' } 
        );
        // --- END: FIX ---

        if (response.ok) {
          const data = await response.json();
          processAndSetPlaylist(data); // <-- Will now update playlist AND rules
        }
      } catch (error) {
        console.error("Error fetching playlist:", error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [party.hash]); // <-- REMOVED useQueueRules from dependency array

  // Poll for singers updates every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/party/participants/${party.hash}`);
        if (response.ok) {
          const data = await response.json();
          setSingers(data.singers);
        }
      } catch (error) {
        console.error("Error fetching singers:", error);
      }
    }, 3000); // 3 seconds

    return () => clearInterval(interval);
  }, [party.hash, singers]);

  // Send heartbeat every 60 seconds to keep party alive
  useEffect(() => {
    const heartbeatInterval = setInterval(async () => {
      void sendHeartbeat();
    }, 60000); // 60 seconds

    return () => clearInterval(heartbeatInterval);
  }, [party.hash]);

  const { ref, toggle, fullscreen } = useFullscreen();

  const currentVideo = playlist.find((video) => !video.playedAt);

  // Handler for the toggle button that sends an immediate heartbeat and manages order
  // --- UPDATE handleToggleRules ---
  const handleToggleRules = async () => {
    // --- START: FIX ---
    // Add explicit guard here to satisfy TypeScript inside the closure
    if (!party.hash) {
      console.error("Cannot toggle rules: party hash is missing.");
      return;
    }
    // --- END: FIX ---

    const newRulesState = !useQueueRules;
    setUseQueueRules(newRulesState); // Optimistic update

    // --- CALL THE TRPC MUTATION ---
    updateSortOrder.mutate({
      partyHash: party.hash, // This is now guaranteed to be a string
      orderByFairness: newRulesState,
    });

    // --- REMOVE ALL THE MANUAL FETCHING ---
  };

  const addSong = async (videoId: string, title: string, coverUrl: string) => {
    const singerName = readLocalStorageValue({
      key: "name",
      defaultValue: "Host",
    });

    // --- Add guard ---
    if (!party.hash) return;

    try {
      // Use REST API
      const response = await fetch("/api/playlist/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partyHash: party.hash,
          videoId,
          title,
          coverUrl,
          singerName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add song");
      }

      // Reload playlist
      // --- UPDATE PLAYLIST FETCH ---
      const playlistResponse = await fetch(
        `/api/playlist/${party.hash}`, // <-- Remove ?rules=
      );
      const data = await playlistResponse.json();
      processAndSetPlaylist(data); // <-- Use new function
    } catch (error) {
      console.error("Error adding song:", error);
    }
  };

  const removeSong = async (videoId: string) => {
    // --- Add guard ---
    if (!party.hash) return;

    try {
      // Use REST API
      const response = await fetch("/api/playlist/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ partyHash: party.hash, videoId }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove song");
      }

      // Reload playlist
      // --- UPDATE PLAYLIST FETCH ---
      const playlistResponse = await fetch(
        `/api/playlist/${party.hash}`, // <-- Remove ?rules=
      );
      const data = await playlistResponse.json();
      processAndSetPlaylist(data); // <-- Use new function
    } catch (error) {
      console.error("Error removing song:", error);
    }
  };

  const markAsPlayed = async () => {
    // --- Add guard ---
    if (!party.hash) return;

    if (currentVideo) {
      try {
        // Use REST API
        const response = await fetch("/api/playlist/played", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            partyHash: party.hash,
            videoId: currentVideo.id,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to mark as played");
        }

        // Reload playlist
        // --- UPDATE PLAYLIST FETCH ---
        const playlistResponse = await fetch(
          `/api/playlist/${party.hash}`, // <-- Remove ?rules=
        );
        const data = await playlistResponse.json();
        processAndSetPlaylist(data); // <-- Use new function
      } catch (error) {
        console.error("Error marking as played:", error);
      }
    }
  };

  const handleCloseParty = () => {
    setIsConfirmingClose(true); // Show confirmation
  };

  const confirmCloseParty = async () => {
    // --- Add guard ---
    if (!party.hash) return;

    try {
      const response = await fetch("/api/party/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash: party.hash }),
      });
      if (response.ok) {
        router.push("/");
      } else {
        alert("Failed to close party. Please try again.");
      }
    } catch (error) {
      alert("Error closing party. Please try again.");
    }
    setIsConfirmingClose(false);
  };

  const cancelCloseParty = () => {
    setIsConfirmingClose(false); // Hide confirmation
  };

  const joinPartyUrl = getUrl(`/join/${party.hash}`);

  return (
    <div className="flex h-screen w-full flex-col sm:flex-row sm:flex-nowrap">
      {/* Left panel with queue list - Mobile Only */}
      <PlayerMobilePanel
        party={party}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        playlist={playlist}
        onRemoveSong={removeSong}
        onMarkAsPlayed={markAsPlayed}
        useQueueRules={useQueueRules} // <-- Pass the state
        onToggleRules={handleToggleRules} // <-- Pass the new handler
        maxSearchResults={maxSearchResults}
        onSetMaxResults={setMaxSearchResults}
        onCloseParty={handleCloseParty}
        isConfirmingClose={isConfirmingClose} // <-- Pass state
        onConfirmClose={confirmCloseParty} // <-- Pass handler
        onCancelClose={cancelCloseParty} // <-- Pass handler
      />

      {/* Right panel with player - Desktop Only */}
      <PlayerDesktopView
        playerRef={ref}
        onToggleFullscreen={toggle}
        isFullscreen={fullscreen}
        currentVideo={currentVideo}
        joinPartyUrl={joinPartyUrl}
        onPlayerEnd={markAsPlayed}
      />
    </div>
  );
}
