"use client";

import { readLocalStorageValue, useFullscreen } from "@mantine/hooks";
import { type Party } from "@prisma/client";
import { ListPlus, Maximize, Minimize, SkipForward, X } from "lucide-react";
import Image from "next/image";
import { type Message, type KaraokeParty } from "party";
import usePartySocket from "partysocket/react";
import { useState } from "react";
import { EmptyPlayer } from "~/components/empty-player";
import { Player } from "~/components/player";
import { SongSearch } from "~/components/song-search";
import { Button } from "~/components/ui/ui/button";
import { env } from "~/env";
import { getUrl } from "~/utils/url";

type Props = {
  party: Party;
  initialPlaylist: KaraokeParty;
};

export default function PlayerScene({ party, initialPlaylist }: Props) {
  const [playlist, setPlaylist] = useState<KaraokeParty["playlist"]>(
    initialPlaylist.playlist ?? []
  );

  const socket = usePartySocket({
    host: env.NEXT_PUBLIC_PARTYKIT_URL,
    room: party.hash!,
    onMessage(event) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const playlist = JSON.parse(event.data) as KaraokeParty["playlist"];
      if (playlist) {
        setPlaylist(playlist);
      }
    },
  });

  const { ref, toggle, fullscreen } = useFullscreen();

  const currentVideo = playlist.find((video) => !video.playedAt);
  const nextVideos = playlist.filter((video) => !video.playedAt);

  const addSong = (videoId: string, title: string, coverUrl: string) => {
    const singerName = readLocalStorageValue({
      key: "name",
      defaultValue: "Host",
    });

    socket.send(
      JSON.stringify({
        type: "add-video",
        id: videoId,
        title,
        singerName,
        coverUrl,
      } satisfies Message)
    );
  };

  const removeSong = (videoId: string) => {
    socket.send(
      JSON.stringify({
        type: "remove-video",
        id: videoId,
      } satisfies Message)
    );
  };

  const markAsPlayed = () => {
    if (currentVideo) {
      // setShowOpenInYouTubeButton(false);

      socket.send(
        JSON.stringify({
          type: "mark-as-played",
          id: currentVideo.id,
        } satisfies Message)
      );
    }
  };

  const joinPartyUrl = getUrl(`/join/${party.hash}`);

  return (
    <div className="flex h-screen w-full flex-row flex-nowrap">
      <div className="grow-0 basis-1/3 overflow-y-auto border-r border-slate-500 px-4">
        <div className="py-4 text-center">
          <h1 className="text-outline scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
            {party.name}
          </h1>
        </div>
        <SongSearch
          key={party.hash}
          playlist={playlist}
          onVideoAdded={addSong}
        />
      </div>
      <div className="grow-0 basis-2/3 overflow-auto">
        <div className="flex h-full flex-col">
          <div className="relative h-5/6" ref={ref}>
            <Button
              onClick={toggle}
              variant="ghost"
              size="icon"
              className="absolute bottom-0 right-3 z-10"
            >
              {fullscreen ? <Minimize /> : <Maximize />}
            </Button>
            {currentVideo ? (
              <Player
                key={currentVideo.id}
                video={currentVideo}
                joinPartyUrl={joinPartyUrl}
                isFullscreen={fullscreen}
                onPlayerEnd={() => {
                  markAsPlayed();
                }}
              />
            ) : (
              <EmptyPlayer
                joinPartyUrl={joinPartyUrl}
                className={fullscreen ? "bg-gradient" : ""}
              />
            )}
          </div>
          <div className="h-1/6 min-h-[150px] border-t border-slate-500 p-4">
            {nextVideos.length > 0 ? (
              <>
                <div className="no-scrollbar flex h-full flex-row space-x-2 overflow-x-scroll">
                  {nextVideos.map((v, i) => (
                    <div
                      key={v.id}
                      className="relative flex aspect-[4/3] h-full items-center justify-center rounded-lg bg-slate-200 p-3 text-center text-primary-foreground animate-in slide-in-from-bottom first:border-2 first:border-amber-500"
                    >
                      <Image
                        src={v.coverUrl}
                        fill={true}
                        className="rounded-lg hover:opacity-50"
                        alt="Cover"
                      />

                      <Button
                        variant="link"
                        size="icon"
                        className="absolute right-0 top-0 z-10 hover:bg-gray-400"
                        onClick={() => {
                          removeSong(v.id);
                        }}
                      >
                        <X color="red" />
                      </Button>

                      {i === 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute bottom-0 right-0 z-10 rounded text-yellow-300 hover:bg-gray-400"
                          onClick={() => {
                            markAsPlayed();
                          }}
                        >
                          <SkipForward />
                        </Button>
                      )}

                      {/* <div>{decode(v.title)}</div> */}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex aspect-[4/3] h-full items-center justify-center rounded-lg border-2 border-dashed border-slate-500 bg-slate-200 p-3 text-center text-slate-500">
                <ListPlus
                  size={32}
                  strokeWidth={1.5}
                  className="animate-bounce"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
