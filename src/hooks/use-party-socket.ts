import { type KaraokeParty, type VideoInPlaylist } from "party";
import { useEffect, useState, useRef, useMemo } from "react";
// --- THIS IS THE FIX ---
import { io, type Socket } from "socket.io-client"; // Changed from "socket-io-client"
// --- END THE FIX ---
import { useRouter } from "next/navigation";
import { debugLog, formatPlaylistForLog } from "~/utils/debug-logger";

// Define the shape of actions we can emit to the server
interface SocketActions {
  addSong: (videoId: string, title: string, coverUrl: string, singerName: string) => void;
  removeSong: (videoId: string) => void;
  markAsPlayed: (videoId: string) => void;
  toggleRules: (orderByFairness: boolean) => void;
  closeParty: () => void;
  sendHeartbeat: () => void;
}

// Define the shape of the hook's return value
interface UsePartySocketReturn {
  unplayedPlaylist: VideoInPlaylist[];
  playedPlaylist: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
  socketActions: SocketActions;
  isConnected: boolean;
}

// --- Define the shape of the data from the server ---
type PartySocketData = {
  unplayed: VideoInPlaylist[];
  played: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
};

const LOG_TAG = "[SocketClient]";

export function usePartySocket(partyHash: string): UsePartySocketReturn {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unplayedPlaylist, setUnplayedPlaylist] = useState<VideoInPlaylist[]>([]);
  const [playedPlaylist, setPlayedPlaylist] = useState<VideoInPlaylist[]>([]);
  const [settings, setSettings] = useState<KaraokeParty["settings"]>({
    orderByFairness: true,
  });

  useEffect(() => {
    // Initialize the socket connection
    const socketInitializer = async () => {
      debugLog(LOG_TAG, "Initializing socket connection...");
      await fetch("/api/socket");

      const newSocket = io({
        path: "/api/socket",
        addTrailingSlash: false,
      });

      socketRef.current = newSocket;

      newSocket.on("connect", () => {
        debugLog(LOG_TAG, `Socket connected: ${newSocket.id}`);
        setIsConnected(true);
        debugLog(LOG_TAG, `Emitting 'join-party' for room ${partyHash}`);
        newSocket.emit("join-party", partyHash);
      });

      newSocket.on("disconnect", () => {
        debugLog(LOG_TAG, "Socket disconnected");
        setIsConnected(false);
      });

      newSocket.on("playlist-updated", (partyData: PartySocketData) => {
        debugLog(LOG_TAG, "Received 'playlist-updated'", {
          Settings: partyData.settings,
          Unplayed: formatPlaylistForLog(partyData.unplayed),
          Played: formatPlaylistForLog(partyData.played),
        });
        setUnplayedPlaylist(partyData.unplayed);
        setPlayedPlaylist(partyData.played);
        setSettings(partyData.settings);
      });

      newSocket.on("party-closed", () => {
        debugLog(LOG_TAG, "Received 'party-closed'");
        alert("The party was ended by the host.");
        router.push("/");
      });
    };

    void socketInitializer();

    // Send a heartbeat every 60 seconds
    const heartbeatInterval = setInterval(() => {
      socketRef.current?.emit("heartbeat", { partyHash });
    }, 60000);

    // Disconnect socket on component unmount
    return () => {
      if (socketRef.current) {
        debugLog(LOG_TAG, "Disconnecting socket");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      clearInterval(heartbeatInterval);
    };
  }, [partyHash, router]);

  // Define actions that components can call to emit events
  // We use useMemo to ensure this object has a stable identity
  const socketActions: SocketActions = useMemo(() => ({
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

  return { unplayedPlaylist, playedPlaylist, settings, socketActions, isConnected };
}
