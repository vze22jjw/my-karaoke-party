/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
"use client";

import type { VideoInPlaylist } from "~/types/app-types";
import { SongSearch } from "~/components/song-search";
import { Music } from "lucide-react";
import { decode } from "html-entities";
import { useTranslations } from "next-intl";

type Props = {
  playlist: VideoInPlaylist[];
  name: string;
  onVideoAdded: (videoId: string, title: string, coverUrl: string) => void;
  initialSearchQuery: string;
  onSearchQueryConsumed: () => void;
  hasReachedQueueLimit: boolean;
  maxQueuePerSinger: number;
  isManualSortActive?: boolean;
};

export function TabAddSong({
  playlist,
  name,
  onVideoAdded,
  initialSearchQuery,
  onSearchQueryConsumed,
  hasReachedQueueLimit = false,
  maxQueuePerSinger: _maxQueuePerSinger,
  isManualSortActive = false,
}: Props) {
  const t = useTranslations('guest.addSong');

  const playingNow = playlist[0];
  const isMySongPlaying =
    !!playingNow && playingNow.singerName === name && !playingNow.playedAt;
  const myPlayingSong: VideoInPlaylist | null = isMySongPlaying
    ? playingNow
    : null;

  const myUpcomingSongs = playlist
    .slice(myPlayingSong ? 1 : 0)
    .filter((v) => v.singerName === name && !v.playedAt);

  const mySongs: VideoInPlaylist[] = [];

  if (myPlayingSong) {
    mySongs.push(myPlayingSong);
  }

  mySongs.push(...myUpcomingSongs);

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg border">
        
        <div className={isManualSortActive ? "opacity-50 pointer-events-none" : ""}>
            <SongSearch
              onVideoAdded={onVideoAdded}
              playlist={playlist}
              name={name}
              initialSearchQuery={initialSearchQuery}
              onSearchQueryConsumed={onSearchQueryConsumed}
              hasReachedQueueLimit={hasReachedQueueLimit || isManualSortActive}
            >
                <div>
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Music className="h-5 w-5" />
                        {t('title')}
                    </h2>

                    {isManualSortActive && (
                        <div className="mb-3 rounded-md bg-orange-900/50 border border-orange-500 p-3 text-center text-white font-bold animate-pulse">
                            {t('queueLocked')}
                        </div>
                    )}

                    {!isManualSortActive && hasReachedQueueLimit && (
                        <div className="mb-3 rounded-md bg-red-900/50 border border-red-700 p-2 text-center text-sm text-white font-medium">
                            {t('queueFull')}
                        </div>
                    )}
                </div>
            </SongSearch>
        </div>
      </div>

      {name && (
        <div className="bg-card rounded-lg p-4 border">
          <h3 className="text-md font-semibold mb-3">{t('myQueue')}</h3>
          {mySongs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('emptyHistory')}
            </p>
          ) : (
            <ul className="space-y-3">
              {mySongs.map((video, index) => (
                <li
                  key={video.id + (video.playedAt?.toString() ?? "")}
                  className="flex items-start gap-3 p-2 rounded transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {decode(video.title)}
                    </p>
                    {index === 0 && myPlayingSong && (
                      <p className="text-xs font-bold text-green-400">
                        {t('playingNow')}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
