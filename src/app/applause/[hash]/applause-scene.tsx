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

const DEFAULT_SOUND_URL = "/sounds/applause.mp3";
const APPLAUSE_SOUND_URL = env.NEXT_PUBLIC_APPLAUSE_SOUND_CDN_URL ?? DEFAULT_SOUND_URL; 
const APPLAUSE_EMOJI = "\ud83d\udc4f\ud83c\udffe"; 

type Props = {
  partyHash: string;
  currentSong: VideoInPlaylist | null;
};

export default function ApplauseScene({ partyHash, currentSong }: Props) {
  const router = useRouter();
  const [name] = useLocalStorage<string>({ key: "name", defaultValue: "" });
  const [playApplause] = useSound(APPLAUSE_SOUND_URL, { volume: 0.5 });
  
  const { socketActions } = usePartySocket(
    partyHash,
    {
      currentSong: currentSong,
      unplayed: [],
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

  const currentSingerName = currentSong?.singerName;

  const handleApplause = () => {
    if (currentSingerName) {
      void socketActions.sendApplause(currentSingerName);
      playApplause();
    } else {
      playApplause();
    }
  };

  const buttonText = `Applause for ${currentSingerName ? currentSingerName : "the Singer"}`;
  
  const mainContent = currentSong ? (
    <>
      <h1 className="text-outline text-xl font-extrabold tracking-tight text-white sm:text-2xl uppercase">
        {decode(currentSong.title)}
      </h1>
      <h2 className="text-outline text-lg font-bold tracking-tight text-primary sm:text-xl">
        <MicVocal className="mr-2 inline text-primary" size={20} />
        {currentSingerName}
      </h2>
    </>
  ) : (
    <h1 className="text-outline text-xl font-extrabold tracking-tight text-white">
      No Song Playing
    </h1>
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient">
      <div className="w-full max-w-lg flex flex-col items-center space-y-6 text-center">
        {mainContent}
        <Button
          type="button"
          onClick={handleApplause}
          disabled={!currentSong}
          className="w-full text-[250px] p-0 border-none bg-transparent hover:bg-transparent text-white shadow-none transition-all duration-100 active:scale-[0.90] focus:ring-4 focus:ring-yellow-300"
          style={{ height: 'auto', minHeight: '300px', maxWidth: '300px' }}
          aria-label={buttonText}
        >
          {APPLAUSE_EMOJI}
        </Button>
        <p className="text-lg text-white/80 max-w-xs">
          Click repeatedly! Each clap is added to the singer&apos;s score.
        </p>
        <Button type="button" onClick={() => router.back()} variant="secondary" className="w-full max-w-xs h-10">
          &larr; Back to Party
        </Button>
      </div>
    </main>
  );
}
