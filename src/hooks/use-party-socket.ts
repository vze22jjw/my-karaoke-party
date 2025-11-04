import { type KaraokeParty, type VideoInPlaylist } from "party";
import { useEffect, useState, useRef, useMemo } from "react";
import { io, type Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import { debugLog, formatPlaylistForLog } from "~/utils/debug-logger";

/* ... SocketActions interface ... */
interface SocketActions {
  addSong: (videoId: string, title: string, coverUrl: string, singerName: string) => void;
  removeSong: (videoId: string) => void;
  markAsPlayed: (videoId: string) => void;
  toggleRules: (orderByFairness: boolean) => void;
  closeParty: () => void;
  sendHeartbeat: () => void;
}

// --- UPDATED: New return type ---
interface UsePartySocketReturn {
  currentSong: VideoInPlaylist | null;
  unplayedPlaylist: VideoInPlaylist[];
  playedPlaylist: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
  socketActions: SocketActions;
  isConnected: boolean;
}

// --- UPDATED: New data structure from server ---
type PartySocketData = {
  currentSong: VideoInPlaylist | null;
  unplayed: VideoInPlaylist[];
  played: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
};

const LOG_TAG = "[SocketClient]";

export function usePartySocket(partyHash: string): UsePartySocketReturn {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  // --- UPDATED: New state variables ---
  const [currentSong, setCurrentSong] = useState<VideoInPlaylist | null>(null);
  const [unplayedPlaylist, setUnplayedPlaylist] = useState<VideoInPlaylist[]>([]);
  const [playedPlaylist, setPlayedPlaylist] = useState<VideoInPlaylist[]>([]);
  const [settings, setSettings] = useState<KaraokeParty["settings"]>({
    orderByFairness: true,
  });

  useEffect(() => {
    const socketInitializer = async () => {
      /* ... socket init ... */
      await fetch("/api/socket");
      const newSocket = io({ path: "/api/socket", addTrailingSlash: false });
      socketRef.current = newSocket;

      newSocket.on("connect", () => {
        /* ... connect logic ... */
        newSocket.emit("join-party", partyHash);
      });
      newSocket.on("disconnect", () => {
        /* ... disconnect logic ... */
      });

      // --- UPDATED: Handle new data structure ---
      newSocket.on("playlist-updated", (partyData: PartySocketData) => {
        debugLog(LOG_TAG, "Received 'playlist-updated'", {
          Settings: partyData.settings,
          CurrentSong: partyData.currentSong?.title ?? "None",
          Unplayed: formatPlaylistForLog(partyData.unplayed),
          Played: formatPlaylistForLog(partyData.played),
        });
        setCurrentSong(partyData.currentSong);
        setUnplayedPlaylist(partyData.unplayed);
        setPlayedPlaylist(partyData.played);
        setSettings(partyData.settings);
      });

      newSocket.on("party-closed", () => {
        /* ... party closed logic ... */
      });
    };
    void socketInitializer();
    /* ... heartbeat interval ... */
    return () => {
      /* ... cleanup logic ... */
    };
  }, [partyHash, router]);

  const socketActions: SocketActions = useMemo(() => ({
    /* ... socket actions (no changes needed) ... */
    addSong: (videoId, title, coverUrl, singerName) => {
      const data = { partyHash, videoId, title, coverUrl, singerName };
      debugLog(LOG_TAG, "Emitting 'add-song'", data);
      socketRef.current?.emit("add-song", data);
    },
    removeSong: (videoId) => {
      const data = { partyHash, videoId };
      debugLog(LOG_TAG, "Emitting 'remove-song'", data);
      socketRef.current?.emit("remove-song", data);
    },
    markAsPlayed: (videoId) => {
      const data = { partyHash, videoId };
      debugLog(LOG_TAG, "Emitting 'mark-as-played' (Skip Song)", data);
      socketRef.current?.emit("mark-as-played", data);
    },
    toggleRules: (orderByFairness) => {
      const data = { partyHash, orderByFairness };
      debugLog(LOG_TAG, "Emitting 'toggle-rules'", data);
      socketRef.current?.emit("toggle-rules", data);
    },
    closeParty: () => {
      const data = { partyHash };
      debugLog(LOG_TAG, "Emitting 'close-party'", data);
      socketRef.current?.emit("close-party", data);
    },
    sendHeartbeat: () => {
      const data = { partyHash };
      debugLog(LOG_TAG, "Emitting 'heartbeat'", data);
      socketRef.current?.emit("heartbeat", data);
    },
  }), [partyHash]);

  // --- UPDATED: Return new state variables ---
  return { currentSong, unplayedPlaylist, playedPlaylist, settings, socketActions, isConnected };
}
