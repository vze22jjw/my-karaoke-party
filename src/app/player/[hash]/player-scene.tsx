/* eslint-disable */
"use client";

import { useFullscreen } from "@mantine/hooks";
import type { Party } from "@prisma/client";
import type { KaraokeParty, VideoInPlaylist } from "party";
import { useState, useEffect, useRef } from "react"; 
import { getUrl } from "~/utils/url";
import { useRouter } from "next/navigation";
import { Player } from "~/components/player";
import { EmptyPlayer } from "~/components/empty-player";
import { usePartySocket } from "~/hooks/use-party-socket";
import { Button } from "~/components/ui/ui/button";
import { Maximize, Minimize } from "lucide-react";
import type { RefCallback } from "react"; 
import { PlayerDisabledView } from "~/components/player-disabled-view"; 

// --- ADDED: Helper function to parse ISO 8601 duration ---
/**
 * Parses an ISO 8601 duration string (e.g., "PT4M13S") into milliseconds.
 */
function parseISO8601Duration(durationString: string | undefined | null): number | null {
  if (!durationString) return null;

  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = durationString.match(regex);

  if (!matches) return null;

  const hours = parseInt(matches[1] || '0');
  const minutes = parseInt(matches[2] || '0');
  const seconds = parseInt(matches[3] || '0');

  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}
// --- END HELPER ---

type InitialPartyData = {
  currentSong: VideoInPlaylist | null;
  unplayed: VideoInPlaylist[];
  played: VideoInPlaylist[];
  settings: KaraokeParty["settings"];
};

type Props = {
  party: Party;
  initialData: InitialPartyData;
};

export default function PlayerScene({ party, initialData }: Props) {
  const router = useRouter();
  const [forceAutoplay, setForceAutoplay] = useState(false);
  
  const autoSkipTimerRef = useRef<NodeJS.Timeout | null>(null);

  if (!party.hash) {
    return <div>Error: Party hash is missing.</div>;
  }

  const { 
    currentSong, 
    socketActions, 
    isPlaying,
    settings,
    isSkipping 
  } = usePartySocket(
    party.hash,
    initialData,
    "Player" 
  );
  
  const { ref, toggle, fullscreen } = useFullscreen();

  useEffect(() => {
    return () => {
      if (autoSkipTimerRef.current) {
        clearTimeout(autoSkipTimerRef.current);
      }
    };
  }, []);

  const doTheSkip = () => {
    if (autoSkipTimerRef.current) {
      clearTimeout(autoSkipTimerRef.current);
      autoSkipTimerRef.current = null;
    }
    setForceAutoplay(false); 
    socketActions.markAsPlayed();
    socketActions.playbackPause(); // Pause for the next singer
  };

  const handlePlayerEnd = async () => {
    setForceAutoplay(false); 
    socketActions.markAsPlayed();
    socketActions.playbackPause(); 
  };

  const handleSkip = async () => {
    if (isSkipping) return; 
    socketActions.startSkipTimer(); 
    doTheSkip(); 
  };
  
  // --- THIS IS THE FIX ---
  const handleOpenYouTubeAndAutoSkip = () => {
    if (isSkipping) return; 

    socketActions.startSkipTimer(); 

    if (currentSong) {
      window.open(
        `https://www.youtube.com/watch?v=${currentSong.id}#mykaraokeparty`,
        "_blank",
        "fullscreen=yes",
      );
    }

    // Use the song's actual duration for the timer
    const durationMs = parseISO8601Duration(currentSong?.duration) ?? 10000; // Default 10s
    
    // Add a 5-second buffer to the timer
    const timerWithBuffer = durationMs + 5000; 

    console.log(`Starting auto-skip timer for ${timerWithBuffer}ms`);

    autoSkipTimerRef.current = setTimeout(() => {
      doTheSkip();
    }, timerWithBuffer); // Use duration + 5s
  };
  // --- END THE FIX ---
  
  const handlePlay = () => {
    socketActions.playbackPlay();
  };
  
  const handlePause = () => {
    socketActions.playbackPause();
  };

  const joinPartyUrl = getUrl(`/join/${party.hash}`);
  
  const isPlaybackDisabled = settings.disablePlayback ?? false;

  return (
    <div className="w-full h-screen"> 
      <div className="flex h-full flex-col">
        <div className="relative h-full" ref={ref as RefCallback<HTMLDivElement>}>
          <Button
            onClick={toggle}
            variant="ghost"
            size="icon"
            className="absolute bottom-0 right-3 z-10"
          >
            {fullscreen ? <Minimize /> : <Maximize />}
          </Button>
          
          {isPlaybackDisabled && currentSong ? ( 
            <PlayerDisabledView
              video={currentSong}
              joinPartyUrl={joinPartyUrl}
              isFullscreen={fullscreen}
              onOpenYouTubeAndAutoSkip={handleOpenYouTubeAndAutoSkip}
              onSkip={handleSkip} 
              isSkipping={isSkipping} 
            />
          ) : currentSong ? ( 
            <Player
              video={currentSong}
              joinPartyUrl={joinPartyUrl}
              isFullscreen={fullscreen}
              onPlayerEnd={handlePlayerEnd}
              onSkip={handleSkip} 
              forceAutoplay={forceAutoplay} 
              onAutoplayed={() => setForceAutoplay(false)}
              isPlaying={isPlaying}
              onPlay={handlePlay}
              onPause={handlePause}
            />
          ) : (
            <EmptyPlayer
              joinPartyUrl={joinPartyUrl}
              className={fullscreen ? "bg-gradient" : ""}
            />
          )}
          
        </div>
      </div>
    </div>
  );
}
