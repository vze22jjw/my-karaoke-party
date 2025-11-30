import { type KaraokeParty, type VideoInPlaylist } from "~/types/app-types";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { useRouter } from "~/navigation"; // Localized
import { toast } from "sonner";
import { parseISO8601Duration } from "~/utils/string";
import { useLocalStorage } from "@mantine/hooks";
import { useTranslations } from "next-intl"; // NEW

interface SocketActions {
  addSong: (videoId: string, title: string, coverUrl: string, singerName: string) => void;
  removeSong: (videoId: string) => void;
  markAsPlayed: () => void;
  toggleRules: (orderByFairness: boolean) => void;
  togglePlayback: (disablePlayback: boolean) => void;
  closeParty: () => void;
  sendHeartbeat: () => void;
  playbackPlay: (currentTime?: number) => void;
  playbackPause: () => void;
  startSkipTimer: () => void;
  startParty: () => void;
  refreshParty: () => void;
  updateIdleMessages: (messages: string[]) => void;
  updateThemeSuggestions: (suggestions: string[]) => void;
  sendApplause: (singerName: string) => Promise<void>; 
  songEnded: (id: string) => Promise<void>;
  toggleManualSort: (isActive: boolean) => void;
  saveQueueOrder: (newOrderIds: string[]) => void;
  togglePriority: (videoId: string) => void;
}

type Participant = {
  name: string;
  role: string;
  avatar: string | null;
  applauseCount: number; 
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
  hostName: string | null;
  isSkipping: boolean;
  remainingTime: number;
  partyStatus: string;
  idleMessages: string[];
  themeSuggestions: string[];
}

type PartySocketData = {
  currentSong: VideoInPlaylist | null;
  unplayed: VideoInPlaylist[];
  played: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
  currentSongStartedAt: Date | null;
  currentSongRemainingDuration: number | null;
  status: string;
  idleMessages: string[];
  themeSuggestions: string[];
};

const LOG_TAG = "[SocketClient]";

export function usePartySocket(
  partyHash: string,
  initialData: PartySocketData,
  singerName: string,
): UsePartySocketReturn {
  const router = useRouter();
  const tToasts = useTranslations('toasts.socket'); // NEW
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [avatar] = useLocalStorage<string | null>({ key: "avatar", defaultValue: "🎤" });

  const [currentSong, setCurrentSong] = useState<VideoInPlaylist | null>(initialData.currentSong);
  const [unplayedPlaylist, setUnplayedPlaylist] = useState<VideoInPlaylist[]>(initialData.unplayed);
  const [playedPlaylist, setPlayedPlaylist] = useState<VideoInPlaylist[]>(initialData.played);
  const [settings, setSettings] = useState<KaraokeParty["settings"]>(initialData.settings);
  const [isPlaying, setIsPlaying] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isSkipping, setIsSkipping] = useState(false);
  const [partyStatus, setPartyStatus] = useState(initialData.status);
  const [idleMessages, setIdleMessages] = useState(initialData.idleMessages);
  const [themeSuggestions, setThemeSuggestions] = useState(initialData.themeSuggestions);

  const [remainingTime, setRemainingTime] = useState(() => {
    if (initialData.currentSongStartedAt) {
      const elapsedMs = new Date().getTime() - new Date(initialData.currentSongStartedAt).getTime();
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      return Math.max(0, (initialData.currentSongRemainingDuration ?? 0) - elapsedSeconds);
    }
    return initialData.currentSongRemainingDuration ?? Math.floor((parseISO8601Duration(initialData.currentSong?.duration) ?? 0) / 1000);
  });

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevSongIdRef = useRef<string | null>(initialData.currentSong?.id ?? null);

  const hostName = useMemo(() => {
    const host = participants.find((p) => p.role === "Host");
    return host?.name ?? null;
  }, [participants]);

  const stopCountdown = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const startSyncedCountdown = useCallback((startedAt: string, remainingDuration: number) => {
    stopCountdown();
    const startTime = new Date(startedAt).getTime();
    const updateTimer = () => {
      const elapsedMs = new Date().getTime() - startTime;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const newRemainingTime = Math.max(0, remainingDuration - elapsedSeconds);
      setRemainingTime(newRemainingTime);
      if (newRemainingTime <= 0) stopCountdown();
    };
    updateTimer();
    timerIntervalRef.current = setInterval(updateTimer, 1000);
  }, [stopCountdown]);

  const resetCountdown = useCallback((song: VideoInPlaylist | null) => {
    stopCountdown();
    const durationMs = parseISO8601Duration(song?.duration);
    setRemainingTime(durationMs ? Math.floor(durationMs / 1000) : 0);
  }, [stopCountdown]);

  useEffect(() => {
    const socketInitializer = async () => {
      if (socketRef.current) return;
      try { await fetch("/api/socket"); } catch (e) { console.error(`${LOG_TAG} Failed initial fetch for socket server:`, e); }

      const newSocket = io({
        path: "/socket.io",
        addTrailingSlash: false,
        reconnectionAttempts: 5,
        transports: ["polling", "websocket"],
      });

      socketRef.current = newSocket;

      newSocket.on("connect", () => {
        setIsConnected(true);
        newSocket.emit("join-party", { partyHash, singerName, avatar });
      });

      newSocket.on("disconnect", (reason) => {
        console.warn(`${LOG_TAG} Disconnected: ${reason}`);
        setIsConnected(false);
        stopCountdown();
      });

      newSocket.on("playlist-updated", (partyData: PartySocketData) => {
        if (prevSongIdRef.current !== partyData.currentSong?.id) {
          setIsSkipping(false);
          resetCountdown(partyData.currentSong);
        }
        prevSongIdRef.current = partyData.currentSong?.id ?? null;

        setCurrentSong(partyData.currentSong);
        setUnplayedPlaylist(partyData.unplayed);
        setPlayedPlaylist(partyData.played);
        setSettings(partyData.settings);
        setPartyStatus(partyData.status);
        setIdleMessages(partyData.idleMessages);
        setThemeSuggestions(partyData.themeSuggestions);

        if (partyData.currentSongStartedAt) {
          setIsPlaying(true);
          startSyncedCountdown(partyData.currentSongStartedAt.toString(), partyData.currentSongRemainingDuration ?? 0);
        } else {
          setIsPlaying(false);
          stopCountdown();
          setRemainingTime(partyData.currentSongRemainingDuration ?? Math.floor((parseISO8601Duration(partyData.currentSong?.duration) ?? 0) / 1000));
        }
      });

      newSocket.on("playback-started", (data: { startedAt: string; remainingDuration: number }) => {
        setIsPlaying(true);
        startSyncedCountdown(data.startedAt, data.remainingDuration);
      });

      newSocket.on("playback-paused", (data: { remainingDuration: number }) => {
        setIsPlaying(false);
        stopCountdown();
        setRemainingTime(data.remainingDuration);
      });

      newSocket.on("singers-updated", (list: Participant[]) => setParticipants(list));
      
      newSocket.on("new-singer-joined", (name: string) => {
        if (name && name !== singerName) toast.info(tToasts('joined', { name }));
      });

      newSocket.on("party-closed", () => {
        stopCountdown();
        router.push("/");
      });
      
      newSocket.on("error", (data: { message: string }) => {
        // FIX: Handle the rate limit code specifically
        if (data.message === 'rateLimit') {
             toast.error(tToasts('rateLimit'));
             return;
        }

        if (data.message.toLowerCase().includes("video too long")) {
            alert(data.message);
        } else {
            toast.error(data.message);
        }
      });

      newSocket.on("skip-timer-started", () => setIsSkipping(true));
      newSocket.on("idle-messages-updated", (msgs: string[]) => setIdleMessages(msgs));
      newSocket.on("theme-suggestions-updated", (suggs: string[]) => setThemeSuggestions(suggs));
    };

    void socketInitializer();

    if (initialData.currentSongStartedAt) {
      setIsPlaying(true);
      startSyncedCountdown(initialData.currentSongStartedAt.toString(), initialData.currentSongRemainingDuration ?? 0);
    }

    const heartbeatInterval = setInterval(() => {
      if (socketRef.current?.connected) socketRef.current.emit("heartbeat", { partyHash, singerName, avatar });
      else socketRef.current?.emit("join-party", { partyHash, singerName, avatar });
    }, 300000); 

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      clearInterval(heartbeatInterval);
      stopCountdown();
    };
  }, [partyHash, singerName, router, startSyncedCountdown, resetCountdown, stopCountdown, avatar, initialData.currentSongStartedAt, initialData.currentSongRemainingDuration, tToasts]);

  const sendApplauseHttp = useCallback(async (singer: string) => {
    try {
      const response = await fetch("/api/applause", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partyHash, singerName: singer }),
      });
      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        const msg = errorData?.error ?? "Server error";
        toast.error(tToasts('applauseError'), { description: msg });
      }
    } catch (error) {
      toast.error(tToasts('networkError'));
    }
  }, [partyHash, tToasts]);

  const socketActions: SocketActions = useMemo(() => ({
    addSong: (videoId, title, coverUrl, singerName) => socketRef.current?.emit("add-song", { partyHash, videoId, title, coverUrl, singerName }),
    removeSong: (videoId) => socketRef.current?.emit("remove-song", { partyHash, videoId }),
    markAsPlayed: () => socketRef.current?.emit("mark-as-played", { partyHash }),
    toggleRules: (orderByFairness) => socketRef.current?.emit("toggle-rules", { partyHash, orderByFairness }),
    togglePlayback: (disablePlayback) => socketRef.current?.emit("toggle-playback", { partyHash, disablePlayback }),
    closeParty: () => socketRef.current?.emit("close-party", { partyHash }),
    sendHeartbeat: () => socketRef.current?.emit("heartbeat", { partyHash, singerName, avatar }),
    playbackPlay: (currentTime) => socketRef.current?.emit("playback-play", { partyHash, currentTime }),
    playbackPause: () => socketRef.current?.emit("playback-pause", { partyHash }),
    startSkipTimer: () => { setIsSkipping(true); socketRef.current?.emit("start-skip-timer", { partyHash }); },
    startParty: () => socketRef.current?.emit("start-party", { partyHash }),
    refreshParty: () => socketRef.current?.emit("refresh-party", { partyHash }), 
    updateIdleMessages: (messages) => socketRef.current?.emit("update-idle-messages", { partyHash, messages }),
    updateThemeSuggestions: (suggestions) => socketRef.current?.emit("update-theme-suggestions", { partyHash, suggestions }),
    sendApplause: sendApplauseHttp,
    songEnded: async (id: string) => { 
        console.log("Song ended: " + id); 
        socketRef.current?.emit("mark-as-played", { partyHash }); 
    },
    toggleManualSort: (isActive) => socketRef.current?.emit("toggle-manual-sort", { partyHash, isActive }),
    saveQueueOrder: (newOrderIds) => socketRef.current?.emit("save-queue-order", { partyHash, newOrderIds }),
    togglePriority: (videoId) => socketRef.current?.emit("toggle-priority", { partyHash, videoId }),
  }), [partyHash, singerName, avatar, sendApplauseHttp]);

  return {
    currentSong, unplayedPlaylist, playedPlaylist, settings, socketActions,
    isConnected, isPlaying, participants, hostName, isSkipping, remainingTime,
    partyStatus, idleMessages, themeSuggestions,
  };
}
