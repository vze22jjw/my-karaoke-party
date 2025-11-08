import { type KaraokeParty, type VideoInPlaylist } from "party";
import { useEffect, useState, useRef, useMemo, useCallback } from "react"; // <-- Import useCallback
import { io, type Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import { debugLog } from "~/utils/debug-logger";
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

// --- THIS IS THE FIX (Part 1) ---
// Update the data type to include the new server fields
type PartySocketData = {
  currentSong: VideoInPlaylist | null;
  unplayed: VideoInPlaylist[];
  played: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
  currentSongStartedAt: Date | null;
  currentSongRemainingDuration: number | null;
};
// --- END THE FIX ---

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

  // --- THIS IS THE FIX (Part 2) ---
  // remainingTime is now set from initialData and server events
  const [remainingTime, setRemainingTime] = useState(() => {
    // On load, set the correct initial time
    if (initialData.currentSongStartedAt) {
      // If it's playing, calculate time elapsed since start
      const elapsedMs = new Date().getTime() - new Date(initialData.currentSongStartedAt).getTime();
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      return Math.max(0, (initialData.currentSongRemainingDuration ?? 0) - elapsedSeconds);
    }
    // If paused or stopped, use the stored remaining duration or full duration
    return initialData.currentSongRemainingDuration ?? 
           Math.floor((parseISO8601Duration(initialData.currentSong?.duration) ?? 0) / 1000);
  });
  // --- END THE FIX ---

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevSongIdRef = useRef<string | null>(initialData.currentSong?.id ?? null);
  
  const stopCountdown = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // --- THIS IS THE FIX (Part 3) ---
  // This function now calculates the *true* remaining time based on the server's timestamp
  const startSyncedCountdown = useCallback((startedAt: string, remainingDuration: number) => {
    stopCountdown();

    const startTime = new Date(startedAt).getTime();

    const updateTimer = () => {
      const elapsedMs = new Date().getTime() - startTime;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const newRemainingTime = Math.max(0, remainingDuration - elapsedSeconds);

      setRemainingTime(newRemainingTime);

      if (newRemainingTime <= 0) {
        stopCountdown();
      }
    };
    
    updateTimer(); // Run immediately to sync
    timerIntervalRef.current = setInterval(updateTimer, 1000); // Check every second
  }, [stopCountdown]);

  // This function resets the timer to a song's full duration (when paused or skipped)
  const resetCountdown = useCallback((song: VideoInPlaylist | null) => {
    stopCountdown();
    const durationMs = parseISO8601Duration(song?.duration);
    const durationInSeconds = durationMs ? Math.floor(durationMs / 1000) : 0;
    
    debugLog(LOG_TAG, `Resetting countdown for ${song?.title ?? 'No Song'}. Duration: ${song?.duration ?? 'N/A'} (${durationInSeconds}s)`);
    
    setRemainingTime(durationInSeconds);
  }, [stopCountdown]);
  // --- END THE FIX ---

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

      // --- THIS IS THE FIX (Part 4) ---
      // Update how the client handles playlist updates
      newSocket.on("playlist-updated", (partyData: PartySocketData) => {
        debugLog(LOG_TAG, "Received 'playlist-updated'", { /* ... */ });
        
        // This logic handles a song skip/end
        if (prevSongIdRef.current !== partyData.currentSong?.id) {
          setIsSkipping(false);
          // Reset the timer to the *full* duration of the *new* song
          resetCountdown(partyData.currentSong); 
        }
        prevSongIdRef.current = partyData.currentSong?.id ?? null;

        setCurrentSong(partyData.currentSong);
        setUnplayedPlaylist(partyData.unplayed);
        setPlayedPlaylist(partyData.played);
        setSettings(partyData.settings);

        // This logic handles a page load *while* a song is playing
        if (partyData.currentSongStartedAt) {
          setIsPlaying(true);
          startSyncedCountdown(partyData.currentSongStartedAt.toString(), partyData.currentSongRemainingDuration ?? 0);
        } else {
          // Song is paused or stopped
          setIsPlaying(false);
          stopCountdown();
          // Set timer to the stored remaining duration
          setRemainingTime(partyData.currentSongRemainingDuration ?? 
                          Math.floor((parseISO8601Duration(partyData.currentSong?.duration) ?? 0) / 1000));
        }
      });

      // Update to use the new server-driven events
      newSocket.on("playback-started", (data: { startedAt: string; remainingDuration: number }) => {
        debugLog(LOG_TAG, "Received 'playback-started'", data);
        setIsPlaying(true);
        startSyncedCountdown(data.startedAt, data.remainingDuration);
      });

      newSocket.on("playback-paused", (data: { remainingDuration: number }) => {
        debugLog(LOG_TAG, "Received 'playback-paused'", data);
        setIsPlaying(false);
        stopCountdown();
        setRemainingTime(data.remainingDuration);
      });
      // --- END THE FIX ---

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
    
    // --- THIS IS THE FIX (Part 5) ---
    // On initial page load, check if the song is already playing
    if (initialData.currentSongStartedAt) {
      setIsPlaying(true);
      startSyncedCountdown(
        initialData.currentSongStartedAt.toString(),
        initialData.currentSongRemainingDuration ?? 0
      );
    }
    // --- END THE FIX ---

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
  }, [partyHash, singerName, router, startSyncedCountdown, resetCountdown, stopCountdown]); 
  // --- END THE FIX ---

  // The socket actions (play, pause, skip) are now just simple broadcasts.
  // The server handles all the logic.
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
