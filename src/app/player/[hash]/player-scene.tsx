/* eslint-disable */
"use client";

import { useFullscreen } from "@mantine/hooks";
import type { Party } from "@prisma/client";
import type { KaraokeParty, VideoInPlaylist } from "party";
import { useState } from "react";
import { getUrl } from "~/utils/url";
import { useRouter } from "next/navigation";
import { Player } from "~/components/player";
import { EmptyPlayer } from "~/components/empty-player";
import { usePartySocket } from "~/hooks/use-party-socket";
import { Button } from "~/components/ui/ui/button";
import { Maximize, Minimize } from "lucide-react";
import type { RefCallback } from "react"; 

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
  
  // This state is to force the player to autoplay *only* when we skip
  const [forceAutoplay, setForceAutoplay] = useState(false);

  if (!party.hash) {
    return <div>Error: Party hash is missing.</div>;
  }

  const { 
    currentSong, 
    socketActions, 
    isPlaying
  } = usePartySocket(
    party.hash,
    initialData,
  );
  
  const { ref, toggle, fullscreen } = useFullscreen();

  // Called when a song ENDS NATURALLY
  const handlePlayerEnd = async () => {
    setForceAutoplay(false); // Do not autoplay the next song
    socketActions.markAsPlayed();
  };

  // Called when SKIP button is clicked
  const handleSkip = async () => {
    setForceAutoplay(true); // Autoplay the next song
    socketActions.markAsPlayed();
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

  return (
    // This is now the simple, full-screen player page
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
          {currentSong ? (
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
