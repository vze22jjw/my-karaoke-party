"use client";

import { Button } from "~/components/ui/ui/button";
import { useRouter } from "~/navigation";
import { usePartySocket } from "~/hooks/use-party-socket";
import type { VideoInPlaylist } from "~/types/app-types";
import { MicVocal } from "lucide-react";
import useSound from "use-sound";
import { decode } from "html-entities";
import { useLocalStorage } from "@mantine/hooks";
import { env } from "~/env"; 
import { useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";

const APPLAUSE_EMOJI = "\ud83d\udc4f\ud83c\udffe"; 

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
  const t = useTranslations('applause');
  const [name] = useLocalStorage<string>({ key: "name", defaultValue: "" });
  
  const playFuncsRef = useRef<Array<() => void>>([]);
  const playIndexRef = useRef(0); 

  const registerSound = useCallback((index: number, playFn: () => void) => {
      playFuncsRef.current[index] = playFn;
  }, []);

  const { socketActions, currentSong, unplayedPlaylist } = usePartySocket(
    partyHash,
    {
      currentSong: initialCurrentSong,
      unplayed: initialUnplayed,
      played: [],
      settings: { 
        orderByFairness: true,
        disablePlayback: false,
        spotifyPlaylistId: null,
        spotifyLink: null,
        isManualSortActive: false
      },
      currentSongStartedAt: null,
      currentSongRemainingDuration: null,
      status: "STARTED",
      idleMessages: [],
      themeSuggestions: [],
    },
    name 
  );

  const activeSong = currentSong ?? unplayedPlaylist[0];
  const currentSingerName = activeSong?.singerName;

  const handleApplause = () => {
    const validFuncs = playFuncsRef.current.filter(fn => typeof fn === 'function');
    
    if (validFuncs.length > 0) {
        const idx = playIndexRef.current % validFuncs.length;
        const play = validFuncs[idx];
        if (play) play();
        playIndexRef.current = idx + 1; 
    }

    if (currentSingerName) {
      void socketActions.sendApplause(currentSingerName);
    }
  };

  const buttonText = `${t('title')} ${currentSingerName ? currentSingerName : "..."}`;
  
  const mainContent = activeSong ? (
    <>
      <h2 className="text-outline text-3xl font-bold tracking-tight text-primary sm:text-5xl flex items-center justify-center gap-3">
        <MicVocal className="text-primary" size={32} />
        {currentSingerName}
      </h2>
      
      <h1 className="text-outline text-xl font-extrabold tracking-tight text-white sm:text-3xl uppercase mt-1 line-clamp-2">
        {decode(activeSong.title)}
      </h1>
    </>
  ) : (
    <h1 className="text-outline text-xl font-extrabold tracking-tight text-white">
      {t('waiting')}
    </h1>
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 pb-20 bg-gradient">
        {SOUND_URLS.map((url, i) => (
            <SoundAgent key={url} url={url} index={i} onRegister={registerSound} />
        ))}

      <div className="w-full max-w-lg flex flex-col items-center space-y-2 text-center">
        
        {mainContent}

        <Button
          type="button"
          onClick={handleApplause}
          className="w-full text-[250px] p-0 border-none bg-transparent hover:bg-transparent text-white shadow-none transition-all duration-100 active:scale-[0.90] focus:ring-4 focus:ring-yellow-300 leading-[0.8] -my-10"
          style={{ height: 'auto', minHeight: '300px', maxWidth: '300px' }}
          aria-label={buttonText}
        >
          {APPLAUSE_EMOJI}
        </Button>
        
        <p className="text-lg text-white/80 max-w-xs relative z-10">
          {t('instruction')}
        </p>

        <Button
          type="button"
          onClick={() => router.back()}
          variant="secondary"
          className="w-full max-w-xs h-10 relative z-10"
        >
          &larr; {t('back')}
        </Button>
      </div>
    </main>
  );
}
