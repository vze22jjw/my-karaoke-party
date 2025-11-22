"use client";

import { Button } from "~/components/ui/ui/button";
import { useRouter } from "next/navigation";
import { usePartySocket } from "~/hooks/use-party-socket";
import type { VideoInPlaylist } from "~/types/app-types";
import { MicVocal } from "lucide-react";
import useSound from "use-sound";
import { decode } from "html-entities";
import { useLocalStorage } from "@mantine/hooks";
import { env } from "~/env"; 
import { useEffect, useRef } from "react";

const APPLAUSE_EMOJI = "\ud83d\udc4f\ud83c\udffe"; 

// --- Sound Configuration ---
const getSoundUrls = () => {
    const envVar = env.NEXT_PUBLIC_APPLAUSE_SOUND_CDN_URL;
    if (envVar && envVar.trim().length > 0) {
        return envVar.split(',').map(url => url.trim()).filter(Boolean);
    }
    return ["/sounds/applause0.mp3", "/sounds/applause1.mp3"];
};

const SOUND_URLS = getSoundUrls();

const SoundAgent = ({ url, index, onRegister }: { url: string, index: number, onRegister: (i: number, play: () => void) => void }) => {
    const [play] = useSound(url, { volume: 0.5 });
    
    useEffect(() => {
        if (play) {
            onRegister(index, play);
        }
    }, [play, index, onRegister]);

    return null; 
};

type Props = {
  partyHash: string;
  initialCurrentSong: VideoInPlaylist | null;
  initialUnplayed: VideoInPlaylist[];
};

export default function ApplauseScene({ partyHash, initialCurrentSong, initialUnplayed }: Props) {
  const router = useRouter();
  const [name] = useLocalStorage<string>({ key: "name", defaultValue: "" });
  
  // Sound rotation logic
  const playFuncsRef = useRef<Array<() => void>>([]);
  const playIndexRef = useRef(0); 

  const registerSound = (index: number, playFn: () => void) => {
      playFuncsRef.current[index] = playFn;
  };

  // Hook handles real-time updates
  const { socketActions, currentSong, unplayedPlaylist } = usePartySocket(
    partyHash,
    {
      currentSong: initialCurrentSong,
      unplayed: initialUnplayed,
      played: [],
      settings: { orderByFairness: true },
      currentSongStartedAt: null,
      currentSongRemainingDuration: null,
      status: "STARTED",
      idleMessages: [],
      themeSuggestions: [],
    },
    name 
  );

  // Use currentSong if playing, otherwise fallback to the first up in queue
  const activeSong = currentSong ?? unplayedPlaylist[0];
  const currentSingerName = activeSong?.singerName;

  const handleApplause = () => {
    // 1. Play Sound
    const funcs = playFuncsRef.current;
    if (funcs.length > 0) {
        const idx = playIndexRef.current % funcs.length;
        const play = funcs[idx];
        if (play) play();
        playIndexRef.current = idx + 1; 
    }

    // 2. Send Score (if there is a singer)
    if (currentSingerName) {
      void socketActions.sendApplause(currentSingerName);
    }
  };

  const buttonText = `Applause for ${currentSingerName ? currentSingerName : "the Singer"}`;
  
  const mainContent = activeSong ? (
    <>
      <h1 className="text-outline text-xl font-extrabold tracking-tight text-white sm:text-2xl uppercase">
        {decode(activeSong.title)}
      </h1>
      <h2 className="text-outline text-lg font-bold tracking-tight text-primary sm:text-xl">
        <MicVocal className="mr-2 inline text-primary" size={20} />
        {currentSingerName}
      </h2>
    </>
  ) : (
    <h1 className="text-outline text-xl font-extrabold tracking-tight text-white">
      Waiting for Singers...
    </h1>
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient">
        {/* Pre-load sounds */}
        {SOUND_URLS.map((url, i) => (
            <SoundAgent key={url} url={url} index={i} onRegister={registerSound} />
        ))}

      <div className="w-full max-w-lg flex flex-col items-center space-y-6 text-center">
        
        {mainContent}

        <Button
          type="button"
          onClick={handleApplause}
          className="w-full text-[250px] p-0 border-none bg-transparent hover:bg-transparent text-white shadow-none transition-all duration-100 active:scale-[0.90] focus:ring-4 focus:ring-yellow-300"
          style={{ height: 'auto', minHeight: '300px', maxWidth: '300px' }}
          aria-label={buttonText}
        >
          {APPLAUSE_EMOJI}
        </Button>
        
        <p className="text-lg text-white/80 max-w-xs">
          Click repeatedly! Each clap is added to the singer&apos;s score.
        </p>

        <Button
          type="button"
          onClick={() => router.back()}
          variant="secondary"
          className="w-full max-w-xs h-10"
        >
          &larr; Back to Party
        </Button>
      </div>
    </main>
  );
}