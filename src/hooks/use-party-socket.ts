import { type KaraokeParty, type VideoInPlaylist } from "party";
import { useEffect, useState, useRef, useMemo } from "react";
import { io, type Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
// --- THIS IS THE FIX (Compile Warning) ---
// Removed 'formatPlaylistForLog' as it's not used in this file
import { debugLog } from "~/utils/debug-logger";
// --- END THE FIX ---
import { toast } from "sonner";
import { parseISO8601Duration } from "~/utils/string";

interface SocketActions {
  addSong: (videoId: string, title: string, coverUrl: string, singerName: string) => void;
  removeSong: (videoId: string) => void;
  markAsPlayed: () => void;
  toggleRules: (orderByFairness: boolean) => void;
  togglePlayback: (disablePlayback: boolean) => void; 
  closeParty: () => void;
  sendHeartbeat: () => void;
  playbackPlay: () => void;
  playbackPause: () => void;
  startSkipTimer: () => void; 
}

type Participant = {
  name: string;
  role: string;
};

interface UsePartySocketReturn {
  currentSong: VideoInPlaylist | null;
  unplayedPlaylist: VideoInPlaylist[];
  playedPlaylist: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
  socketActions: SocketActions;
  isConnected: boolean;
  isPlaying: boolean;
  participants: Participant[]; 
  isSkipping: boolean; 
  remainingTime: number; 
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
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isSkipping, setIsSkipping] = useState(false);

  const [remainingTime, setRemainingTime] = useState(0); 
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevSongIdRef = useRef<string | null>(initialData.currentSong?.id ?? null);
  
  const stopCountdown = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const startCountdown = () => {
    stopCountdown(); 
    timerIntervalRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          stopCountdown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  const resetCountdown = (song: VideoInPlaylist | null) => {
    stopCountdown();
    const durationMs = parseISO8601Duration(song?.duration);
    const durationInSeconds = durationMs ? Math.floor(durationMs / 1000) : 0;
    
    debugLog(LOG_TAG, `Resetting countdown for ${song?.title ?? 'No Song'}. Duration: ${song?.duration ?? 'N/A'} (${durationInSeconds}s)`);
    
    setRemainingTime(durationInSeconds);
  };

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
        stopCountdown(); 
      });

      newSocket.on("playlist-updated", (partyData: PartySocketData) => {
        debugLog(LOG_TAG, "Received 'playlist-updated'", { /* ... */ });
        
        if (prevSongIdRef.current !== partyData.currentSong?.id) {
          setIsSkipping(false);
          resetCountdown(partyData.currentSong); 
        }
        prevSongIdRef.current = partyData.currentSong?.id ?? null;

        setCurrentSong(partyData.currentSong);
        setUnplayedPlaylist(partyData.unplayed);
        setPlayedPlaylist(partyData.played);
        setSettings(partyData.settings);
      });

      newSocket.on("playback-state-play", () => {
        debugLog(LOG_TAG, "Received 'playback-state-play'");
        setIsPlaying(true);
        startCountdown(); 
      });

      newSocket.on("playback-state-pause", () => {
        debugLog(LOG_TAG, "Received 'playback-state-pause'");
        setIsPlaying(false);
        stopCountdown(); 
      });

      newSocket.on("singers-updated", (participantList: Participant[]) => {
        debugLog(LOG_TAG, "Received 'singers-updated'", participantList);
        setParticipants(participantList);
      });

      newSocket.on("new-singer-joined", (name: string) => {
        debugLog(LOG_TAG, `New singer joined: ${name}`);
        if (name && name !== singerName) { 
          toast.info(`${name} has joined the party!`);
        }
      });

      newSocket.on("party-closed", () => {
        debugLog(LOG_TAG, "Received 'party-closed'");
        stopCountdown(); 
        alert("The party was ended by the host.");
        router.push("/");
      });

      newSocket.on("skip-timer-started", () => {
        debugLog(LOG_TAG, "Received 'skip-timer-started', disabling skip buttons.");
        setIsSkipping(true);
      });

    };

    void socketInitializer();
    resetCountdown(initialData.currentSong); 

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
      stopCountdown(); 
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyHash, singerName, router]); 

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
    togglePlayback: (disablePlayback) => {
      const data = { partyHash, disablePlayback };
      debugLog(LOG_TAG, "Emitting 'toggle-playback'", data);
      socketRef.current?.emit("toggle-playback", data);
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
    startSkipTimer: () => {
      const data = { partyHash };
      debugLog(LOG_TAG, "Emitting 'start-skip-timer'", data);
      setIsSkipping(true); 
      socketRef.current?.emit("start-skip-timer", data); 
    },
  }), [partyHash, singerName]);

  return { 
    currentSong, 
    unplayedPlaylist, 
    playedPlaylist, 
    settings, 
    socketActions, 
    isConnected, 
    isPlaying, 
    participants, 
    isSkipping,
    remainingTime 
  };
}
