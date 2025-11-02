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

  const [useQueueRules, setUseQueueRules] = useLocalStorage({
    key: "karaoke-queue-rules",
    defaultValue: true, // Default to ON (Fairness)
  });

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

  // Reusable function to send heartbeat
  const sendHeartbeat = async () => {
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
  // Revert back to simple assignment as local reordering logic is removed
  const processAndSetPlaylist = (data: { playlist: VideoInPlaylist[] }) => {
    setPlaylist(data.playlist);
  };

  // Poll for playlist updates every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Pass useQueueRules as a query parameter
        const response = await fetch(
          `/api/playlist/${party.hash}?rules=${useQueueRules ? "true" : "false"}`,
        );
        if (response.ok) {
          const data = await response.json();
          processAndSetPlaylist(data);
        }
      } catch (error) {
        console.error("Error fetching playlist:", error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [party.hash, useQueueRules]); // useQueueRules is in dependency array for persistence

  // Poll for singers updates every 3 seconds
  useEffect(() => {
    const fetchSingers = async () => {
      try {
        const response = await fetch(`/api/party/participants/${party.hash}`);
        if (response.ok) {
          const data = await response.json();
          const newSingers = data.singers as string[];

          // Detectar novos participantes
          const previousSingers = singers;
          const addedSingers = newSingers.filter(
            (p) => !previousSingers.includes(p),
          );

          // Mostrar toast para cada novo participante
          addedSingers.forEach((singer) => {
            // REMOVED: toast.success(`🎤 ${singer} joined the party!`, { duration: 3000 });
          });

          setSingers(newSingers);
        }
      } catch (error) {
        console.error("Error fetching singers:", error);
      }
    };

    // Buscar imediatamente
    fetchSingers();

    // E depois a cada 3 segundos
    const interval = setInterval(fetchSingers, 3000);
    return () => clearInterval(interval);
  }, [party.hash, singers]);

  // Send heartbeat every 60 seconds to keep party alive
  useEffect(() => {
    const heartbeatInterval = setInterval(sendHeartbeat, 60000); // 60 seconds

    return () => clearInterval(heartbeatInterval);
  }, [party.hash]);

  const { ref, toggle, fullscreen } = useFullscreen();

  const currentVideo = playlist.find((video) => !video.playedAt);

  // Handler for the toggle button that sends an immediate heartbeat and manages order
  const handleToggleRules = async () => {
    const newRulesState = !useQueueRules;
    setUseQueueRules(newRulesState); // useLocalStorage automatically saves to browser

    void sendHeartbeat();

    // Fetch the server's list immediately to reset the client list to the new sorting mode
    try {
      const response = await fetch(
        `/api/playlist/${party.hash}?rules=${newRulesState ? "true" : "false"}`,
      );
      if (response.ok) {
        const data = await response.json();
        setPlaylist(data.playlist);
      }
    } catch (error) {
      console.error("Error fetching playlist on toggle:", error);
    }
  };

  const addSong = async (videoId: string, title: string, coverUrl: string) => {
    const singerName = readLocalStorageValue({
      key: "name",
      defaultValue: "Host",
    });

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

      // Reload playlist, passing the rules state
      const playlistResponse = await fetch(
        `/api/playlist/${party.hash}?rules=${useQueueRules ? "true" : "false"}`,
      );
      const data = await playlistResponse.json();
      setPlaylist(data.playlist);
    } catch (error) {
      console.error("Error adding song:", error);
    }
  };

  const removeSong = async (videoId: string) => {
    try {
      // Use REST API
      const response = await fetch("/api/playlist/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partyHash: party.hash,
          videoId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove song");
      }

      // Reload playlist, passing the rules state
      const playlistResponse = await fetch(
        `/api/playlist/${party.hash}?rules=${useQueueRules ? "true" : "false"}`,
      );
      const data = await playlistResponse.json();
      setPlaylist(data.playlist);
    } catch (error) {
      console.error("Error removing song:", error);
    }
  };

  const markAsPlayed = async () => {
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

        // Reload playlist, passing the rules state
        const playlistResponse = await fetch(
          `/api/playlist/${party.hash}?rules=${useQueueRules ? "true" : "false"}`,
        );
        const data = await playlistResponse.json();
        setPlaylist(data.playlist);
      } catch (error) {
        console.error("Error marking as played:", error);
      }
    }
  };

  // --- START: Modified handleCloseParty ---
  const handleCloseParty = async () => {
    // This now just opens the confirmation
    setIsConfirmingClose(true);
  };
  // --- END: Modified handleCloseParty ---

  // --- START: New Handlers ---
  const confirmCloseParty = async () => {
    try {
      const response = await fetch("/api/party/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hash: party.hash,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete party");
      }

      // Redirect to home page
      router.push("/");
    } catch (error) {
      console.error("Error closing party:", error);
      alert("Error closing the party. Please try again.");
    }
  };

  const cancelCloseParty = () => {
    setIsConfirmingClose(false);
  };
  // --- END: New Handlers ---

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
        useQueueRules={useQueueRules}
        onToggleRules={handleToggleRules}
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
