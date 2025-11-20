import { type KaraokeParty, type VideoInPlaylist, type InitialPartyData } from "~/types/app-types";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import { debugLog } from "~/utils/debug-logger";
import { toast } from "sonner";
import { parseISO8601Duration } from "~/utils/string";
import { useLocalStorage } from "@mantine/hooks";

interface SocketActions {
  addSong: (
    videoId: string,
    title: string,
    coverUrl: string,
    singerName: string,
  ) => void;
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
  updateIdleMessages: (messages: string[]) => void;
  updateThemeSuggestions: (suggestions: string[]) => void;
}

type Participant = {
  name: string;
  role: string;
  avatar: string | null;
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
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const [avatar] = useLocalStorage<string | null>({
    key: "avatar",
    defaultValue: "🎤",
  });

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
  const [partyStatus, setPartyStatus] = useState(initialData.status);
  const [idleMessages, setIdleMessages] = useState(initialData.idleMessages);
  const [themeSuggestions, setThemeSuggestions] = useState(
    initialData.themeSuggestions,
  );

  const [remainingTime, setRemainingTime] = useState(() => {
    if (initialData.currentSongStartedAt) {
      const elapsedMs =
        new Date().getTime() -
        new Date(initialData.currentSongStartedAt).getTime();
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      return Math.max(
        0,
        (initialData.currentSongRemainingDuration ?? 0) - elapsedSeconds,
      );
    }
    return (
      initialData.currentSongRemainingDuration ??
      Math.floor(
        (parseISO8601Duration(initialData.currentSong?.duration) ?? 0) / 1000,
      )
    );
  });

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevSongIdRef = useRef<string | null>(
    initialData.currentSong?.id ?? null,
  );

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

  const startSyncedCountdown = useCallback(
    (startedAt: string, remainingDuration: number) => {
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
      updateTimer();
      timerIntervalRef.current = setInterval(updateTimer, 1000);
    },
    [stopCountdown],
  );

  const resetCountdown = useCallback(
    (song: VideoInPlaylist | null) => {
      stopCountdown();
      const durationMs = parseISO8601Duration(song?.duration);
      const durationInSeconds = durationMs ? Math.floor(durationMs / 1000) : 0;
      debugLog(
        LOG_TAG,
        `Resetting countdown for ${song?.title ?? "No Song"}. Duration: ${
          song?.duration ?? "N/A"
        } (${durationInSeconds}s)`,
      );
      setRemainingTime(durationInSeconds);
    },
    [stopCountdown],
  );

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
        debugLog(
          LOG_TAG,
          `Emitting 'join-party' for room ${partyHash} as ${singerName}`,
        );
        newSocket.emit("join-party", { partyHash, singerName, avatar });
      });

      newSocket.on("disconnect", () => {
        debugLog(LOG_TAG, "Socket disconnected");
        setIsConnected(false);
        stopCountdown();
      });

      newSocket.on("playlist-updated", (partyData: PartySocketData) => {
        debugLog(LOG_TAG, "Received 'playlist-updated'", {
          /* ... */
        });

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
          startSyncedCountdown(
            partyData.currentSongStartedAt.toString(),
            partyData.currentSongRemainingDuration ?? 0,
          );
        } else {
          setIsPlaying(false);
          stopCountdown();
          setRemainingTime(
            partyData.currentSongRemainingDuration ??
              Math.floor(
                (parseISO8601Duration(partyData.currentSong?.duration) ?? 0) /
                  1000,
              ),
          );
        }
      });

      newSocket.on(
        "playback-started",
        (data: { startedAt: string; remainingDuration: number }) => {
          debugLog(LOG_TAG, "Received 'playback-started'", data);
          setIsPlaying(true);
          startSyncedCountdown(data.startedAt, data.remainingDuration);
        },
      );

      newSocket.on(
        "playback-paused",
        (data: { remainingDuration: number }) => {
          debugLog(LOG_TAG, "Received 'playback-paused'", data);
          setIsPlaying(false);
          stopCountdown();
          setRemainingTime(data.remainingDuration);
        },
      );

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
        debugLog(
          LOG_TAG,
          "Received 'skip-timer-started', disabling skip buttons.",
        );
        setIsSkipping(true);
      });

      newSocket.on("idle-messages-updated", (messages: string[]) => {
        debugLog(LOG_TAG, "Received 'idle-messages-updated'", messages);
        setIdleMessages(messages);
      });

      newSocket.on("theme-suggestions-updated", (suggestions: string[]) => {
        debugLog(LOG_TAG, "Received 'theme-suggestions-updated'", suggestions);
        setThemeSuggestions(suggestions);
      });
    };

    void socketInitializer();

    if (initialData.currentSongStartedAt) {
      setIsPlaying(true);
      startSyncedCountdown(
        initialData.currentSongStartedAt.toString(),
        initialData.currentSongRemainingDuration ?? 0,
      );
    }

    const heartbeatInterval = setInterval(() => {
      socketRef.current?.emit("heartbeat", { partyHash, singerName, avatar });
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
  }, [partyHash, singerName, router, startSyncedCountdown, resetCountdown, stopCountdown, avatar]);

  const socketActions: SocketActions = useMemo(
    () => ({
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
        const data = { partyHash, singerName, avatar };
        debugLog(LOG_TAG, "Emitting 'heartbeat'", data);
        socketRef.current?.emit("heartbeat", data);
      },
      playbackPlay: (currentTime?: number) => {
        const data = { partyHash, currentTime };
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
      startParty: () => {
        const data = { partyHash };
        debugLog(LOG_TAG, "Emitting 'start-party'", data);
        socketRef.current?.emit("start-party", data);
      },
      updateIdleMessages: (messages: string[]) => {
        const data = { partyHash, messages };
        debugLog(LOG_TAG, "Emitting 'update-idle-messages'");
        socketRef.current?.emit("update-idle-messages", data);
      },
      updateThemeSuggestions: (suggestions: string[]) => {
        const data = { partyHash, suggestions };
        debugLog(LOG_TAG, "Emitting 'update-theme-suggestions'");
        socketRef.current?.emit("update-theme-suggestions", data);
      },
    }),
    [partyHash, singerName, avatar], // <-- ADD AVATAR TO DEPENDENCY ARRAY
  );

  return {
    currentSong,
    unplayedPlaylist,
    playedPlaylist,
    settings,
    socketActions,
    isConnected,
    isPlaying,
    participants,
    hostName,
    isSkipping,
    remainingTime,
    partyStatus,
    idleMessages,
    themeSuggestions,
  };
}
