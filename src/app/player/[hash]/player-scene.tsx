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
  
  // Ref to hold the auto-skip timer
  const autoSkipTimerRef = useRef<NodeJS.Timeout | null>(null);

  if (!party.hash) {
    return <div>Error: Party hash is missing.</div>;
  }

  const { 
    currentSong, 
    socketActions, 
    isPlaying,
    settings,
    isSkipping // <-- Get global skipping state from hook
  } = usePartySocket(
    party.hash,
    initialData,
    "Player" 
  );
  
  const { ref, toggle, fullscreen } = useFullscreen();

  // This effect just cleans up the timer if the component unmounts
  useEffect(() => {
    return () => {
      if (autoSkipTimerRef.current) {
        clearTimeout(autoSkipTimerRef.current);
      }
    };
  }, []);

  // This is the core skip logic
  const doTheSkip = () => {
    // If an auto-skip timer is running, clear it (in case of manual skip).
    if (autoSkipTimerRef.current) {
      clearTimeout(autoSkipTimerRef.current);
      autoSkipTimerRef.current = null;
    }
    setForceAutoplay(true); 
    socketActions.markAsPlayed();
    socketActions.playbackPlay();
  };

  // Called when a song ENDS NATURALLY
  const handlePlayerEnd = async () => {
    setForceAutoplay(false); 
    socketActions.markAsPlayed();
    socketActions.playbackPlay(); // Tell others to update
  };

  // Called when MANUAL SKIP button is clicked
  const handleSkip = async () => {
    if (isSkipping) return; // Prevent double-clicks
    // Notify all clients to disable buttons
    socketActions.startSkipTimer(); 
    // Immediately skip
    doTheSkip(); 
  };
  
  // Called when "Open on YouTube" is clicked
  const handleOpenYouTubeAndAutoSkip = () => {
    if (isSkipping) return; // Prevent double-clicks

    // 1. Notify all clients to disable buttons
    socketActions.startSkipTimer(); 

    // 2. Open YouTube
    if (currentSong) {
      window.open(
        `https://www.youtube.com/watch?v=${currentSong.id}#mykaraokeparty`,
        "_blank",
        "fullscreen=yes",
      );
    }

    // 3. Start 10-second timer to call the core skip logic
    autoSkipTimerRef.current = setTimeout(() => {
      doTheSkip();
    }, 10000); // 10 seconds
  };
  
  // Called when PLAY button is clicked
  const handlePlay = () => {
    socketActions.playbackPlay();
  };
  
  // Called when PAUSE button is clicked
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
            // 1. Render Playback Disabled View
            <PlayerDisabledView
              video={currentSong}
              joinPartyUrl={joinPartyUrl}
              isFullscreen={fullscreen}
              // Pass the correct handlers
              onOpenYouTubeAndAutoSkip={handleOpenYouTubeAndAutoSkip}
              onSkip={handleSkip}
              isSkipping={isSkipping} // Pass global state
            />
          ) : currentSong ? ( 
            // 2. Render normal Player
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
            // 3. Render Empty Player
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
