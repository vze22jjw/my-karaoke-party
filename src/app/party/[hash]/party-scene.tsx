"use client";

import { type Party } from "@prisma/client";
import { type Message, type KaraokeParty } from "party";
import usePartySocket from "partysocket/react";
import { useEffect, useState } from "react";
import { env } from "~/env";
import { readLocalStorageValue, useLocalStorage } from "@mantine/hooks";
import { SongSearch } from "~/components/song-search";
import { ListMusic } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/ui/accordion";
import { decode } from "html-entities";
import { useRouter } from "next/navigation";

export function PartyScene({
  party,
  initialPlaylist,
}: {
  party: Party;
  initialPlaylist?: KaraokeParty;
}) {
  const [name] = useLocalStorage<string>({ key: "name" });
  const router = useRouter();

  const [playlist, setPlaylist] = useState<KaraokeParty["videos"]>(
    initialPlaylist?.videos ?? [],
  );

  useEffect(() => {
    const value = readLocalStorageValue({ key: "name" });

    if (!value) {
      router.push(`/join/${party.hash}`);
    }
  }, [router, party.hash, name]);

  const socket = usePartySocket({
    host: env.NEXT_PUBLIC_PARTYKIT_URL,
    room: party.hash!,
    // onOpen(_event) {
    //   if (name) {
    //     socket.send(
    //       JSON.stringify({
    //         type: "join",
    //         name,
    //       }),
    //     );
    //   }
    // },
    onMessage(event) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const message = JSON.parse(event.data) as KaraokeParty;
      if (message.videos) {
        setPlaylist(message.videos);
      }
    },
  });

  // if (!name) {
  //   return (
  //     <div className="container mx-auto max-w-md p-4 ">
  //       <label className="form-control w-full">
  //         <div className="label">
  //           <span className="label-text">What&apos;s your name?</span>
  //         </div>
  //         <input
  //           autoFocus
  //           type="text"
  //           placeholder="Enter your name..."
  //           className="input input-bordered w-full"
  //           required
  //           minLength={2}
  //           value={inputName}
  //           onChange={(e) => {
  //             setInputName(e.target.value);
  //           }}
  //         />
  //       </label>

  //       <button
  //         type="button"
  //         className="btn btn-primary btn-block mt-4 text-lg"
  //         onClick={() => {
  //           setName(inputName);
  //         }}
  //       >
  //         Join Party
  //       </button>
  //     </div>
  //   );
  // }

  const addSong = async (videoId: string, title: string, coverUrl: string) => {
    socket.send(
      JSON.stringify({
        type: "add-video",
        id: videoId,
        title,
        singerName: name,
        coverUrl,
      } satisfies Message),
    );
  };

  const nextVideos = playlist.filter((video) => !video.playedAt);
  const nextVideo = nextVideos[0] ?? null;

  return (
    <>
      <div className="container mx-auto p-6 pb-16 text-center">
        <div>
          <h1 className="text-outline scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
            {party.name}
          </h1>
        </div>

        <div className="mt-5">
          <SongSearch onVideoAdded={addSong} playlist={playlist} />
        </div>

        {/* <div className="divider"></div>

      <h2>Next videos</h2>
      <ul>
        {nextVideos.map((video) => (
          <li key={video.id}>{video.id}</li>
        ))}
      </ul> */}
      </div>

      <div className="text-primary-foreground fixed bottom-0 z-50 flex w-full items-center bg-primary p-2 text-white">
        <Accordion type="single" collapsible className="max-h-screen w-full">
          <AccordionItem value="item-1" className="border-0">
            <AccordionTrigger disabled={nextVideos.length < 2}>
              <div className="flex flex-row">
                <ListMusic className="mr-3" />
                {nextVideo ? nextVideo.title : "Playlist is empty"}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ul role="list" className="divide-accent-foreground divide-y">
                {nextVideos.slice(1).map((video) => (
                  <li key={video.id} className="p-2 first:pt-0 last:pb-0">
                    {decode(video.title)}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* <Drawer>
          <DrawerTrigger className="w-full">
            <div className="flex w-full flex-row flex-nowrap justify-between">
              <div>{nextVideo ? nextVideo.title : "Playlist is empty"}</div>
              <div>
                <ChevronUp />
              </div>
            </div>
          </DrawerTrigger>
          <DrawerContent className="bg-gray-50 text-primary-foreground">
            <DrawerHeader>
              <DrawerTitle>Playlist</DrawerTitle>
            </DrawerHeader>
            <div>
              <ul>
                {playlist.map((video) => (
                  <li key={video.id} className="p-4 first:bg-primary first:text-white first:font-bold border-slate-300 border-b last:border-0">{video.title}</li>
                ))}
              </ul>
            </div>
          </DrawerContent>
        </Drawer> */}
      </div>
    </>
  );
}
