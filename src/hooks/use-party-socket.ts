import { type KaraokeParty, type VideoInPlaylist } from "party";
import { useEffect, useState, useRef, useMemo } from "react";
import { io, type Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import { debugLog, formatPlaylistForLog } from "~/utils/debug-logger";
import { toast } from "sonner";

interface SocketActions {
  addSong: (videoId: string, title: string, coverUrl: string, singerName: string) => void;
  removeSong: (videoId: string) => void;
  markAsPlayed: () => void;
  toggleRules: (orderByFairness: boolean) => void;
  closeParty: () => void;
  sendHeartbeat: () => void;
  playbackPlay: () => void;
  playbackPause: () => void;
}

interface UsePartySocketReturn {
  currentSong: VideoInPlaylist | null;
  unplayedPlaylist: VideoInPlaylist[];
  playedPlaylist: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
  socketActions: SocketActions;
  isConnected: boolean;
  isPlaying: boolean;
  singers: string[];
}

type PartySocketData = {
  currentSong: VideoInPlaylist | null;
  unplayed: VideoInPlaylist[];
  played: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
};

const LOG_TAG = "[SocketClient]";

export function usePartySocket(
  partyHash: string,
  initialData: PartySocketData,
  singerName: string,
): UsePartySocketReturn {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const [currentSong, setCurrentSong] = useState<VideoInPlaylist | null>(
    initialData.currentSong,
  );
  const [unplayedPlaylist, setUnplayedPlaylist] = useState<VideoInPlaylist[]>(
    initialData.unplayed,
  );
  const [playedPlaylist, setPlayedPlaylist] = useState<VideoInPlaylist[]>(
    initialData.played,
  );
  const [settings, setSettings] = useState<KaraokeParty["settings"]>(
    initialData.settings,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [singers, setSingers] = useState<string[]>([]);

  useEffect(() => {
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
        debugLog(LOG_TAG, `Emitting 'join-party' for room ${partyHash} as ${singerName}`);
        newSocket.emit("join-party", { partyHash, singerName }); 
      });

      newSocket.on("disconnect", () => {
        debugLog(LOG_TAG, "Socket disconnected");
        setIsConnected(false);
      });

      // --- START: FIX for event listener ---
      newSocket.on("playlist-updated", (partyData: PartySocketData) => {
        debugLog(LOG_TAG, "Received 'playlist-updated'", {
          Settings: partyData.settings,
          CurrentSong: partyData.currentSong?.title ?? "None",
          Unplayed: formatPlaylistForLog(partyData.unplayed),
          Played: formatPlaylistForLog(partyData.played),
        });
        
        // Use functional update to safely compare with previous state
        setCurrentSong((prevCurrentSong) => {
          if (prevCurrentSong?.id !== partyData.currentSong?.id) {
            // Song has changed, so set playing to false
            setIsPlaying(false);
          }
          return partyData.currentSong;
        });
        
        setUnplayedPlaylist(partyData.unplayed);
        setPlayedPlaylist(partyData.played);
        setSettings(partyData.settings);
      });
      // --- END: FIX ---

      newSocket.on("playback-state-play", () => {
        debugLog(LOG_TAG, "Received 'playback-state-play'");
        setIsPlaying(true);
      });

      newSocket.on("playback-state-pause", () => {
        debugLog(LOG_TAG, "Received 'playback-state-pause'");
        setIsPlaying(false);
      });

      newSocket.on("singers-updated", (singerList: string[]) => {
        debugLog(LOG_TAG, "Received 'singers-updated'", singerList);
        setSingers(singerList);
      });

      newSocket.on("new-singer-joined", (name: string) => {
        debugLog(LOG_TAG, `New singer joined: ${name}`);
        if (name && name !== singerName) { // Don't toast for yourself
          toast.info(`${name} has joined the party!`);
        }
      });

      newSocket.on("party-closed", () => {
        debugLog(LOG_TAG, "Received 'party-closed'");
        alert("The party was ended by the host.");
        router.push("/");
      });
    };

    void socketInitializer();

    const heartbeatInterval = setInterval(() => {
      socketRef.current?.emit("heartbeat", { partyHash, singerName });
    }, 60000);

    return () => {
      if (socketRef.current) {
        debugLog(LOG_TAG, "Disconnecting socket");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      clearInterval(heartbeatInterval);
    };
  // --- START: FIX for dependency array ---
  // Removed `currentSong?.id` which was causing the disconnect/reconnect
  }, [partyHash, router, singerName]);
  // --- END: FIX ---

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
    markAsPlayed: () => {
      const data = { partyHash };
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
      const data = { partyHash, singerName };
      debugLog(LOG_TAG, "Emitting 'heartbeat'", data);
      socketRef.current?.emit("heartbeat", data);
    },
    playbackPlay: () => {
      const data = { partyHash };
      debugLog(LOG_TAG, "Emitting 'playback-play'", data);
      socketRef.current?.emit("playback-play", data);
    },
    playbackPause: () => {
      const data = { partyHash };
      debugLog(LOG_TAG, "Emitting 'playback-pause'", data);
      socketRef.current?.emit("playback-pause", data);
    },
  }), [partyHash, singerName]);

  return { currentSong, unplayedPlaylist, playedPlaylist, settings, socketActions, isConnected, isPlaying, singers };
}
