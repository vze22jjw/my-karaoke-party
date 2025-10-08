/* eslint-disable */
"use client";

import type { Party } from "@prisma/client";
import type { KaraokeParty } from "party";
import { useEffect, useState } from "react";
import { readLocalStorageValue, useLocalStorage } from "@mantine/hooks";
import { SongSearch } from "~/components/song-search";
import { ListMusic, Megaphone } from "lucide-react";
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


  const [playlist, setPlaylist] = useState<KaraokeParty["playlist"]>(
    initialPlaylist?.playlist ?? [],
  );

  useEffect(() => {
    const value = readLocalStorageValue({ key: "name" });

    if (!value) {
      router.push(`/join/${party.hash}`);
    }
  }, [router, party.hash]);

  // Poll for playlist updates every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/playlist/${party.hash}`);
        if (response.ok) {
          const data = await response.json();
          setPlaylist(data.playlist);
        }
      } catch (error) {
        console.error("Error fetching playlist:", error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [party.hash]);

  const addSong = async (videoId: string, title: string, coverUrl: string) => {
    try {
      // Use REST API
      const response = await fetch("/api/playlist/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partyHash: party.hash,
          videoId,
          title,
          coverUrl,
          singerName: name,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add song");
      }

      // Reload playlist
      const playlistResponse = await fetch(`/api/playlist/${party.hash}`);
      const data = await playlistResponse.json();
      setPlaylist(data.playlist);
    } catch (error) {
      console.error("Error adding song:", error);
      alert("Erro ao adicionar música. Tente novamente.");
    }
  };

  // Horn feature disabled (PartyKit removed)
  // const sendHorn = async () => {
  //   console.log("Horn feature temporarily disabled");
  // }

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
      </div>

      {/* Horn button disabled - PartyKit removed */}
      {/* <div className="fixed bottom-16 left-1/2 transform -translate-x-1/2 z-[100]">
        <button
          type="button"
          className="rounded-full bg-yellow-200 p-2 text-black hover:text-white hover:bg-red-700 shadow-lg"
        >
          <Megaphone size={32} />
        </button>
      </div> */}

      <div className="fixed bottom-0 z-50 flex flex-col w-full items-center bg-primary p-2 text-primary-foreground text-white">
        <Accordion type="single" collapsible className="max-h-screen w-full">
          <AccordionItem value="item-1" className="border-0">
            <AccordionTrigger disabled={nextVideos.length < 2}>
              <div className="flex flex-row">
                <ListMusic className="mr-3" />
                {nextVideo ? nextVideo.title : "Playlist is empty"}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="divide-y divide-accent-foreground">
                {nextVideos.slice(1).map((video) => (
                  <li key={video.id} className="p-2 first:pt-0 last:pb-0">
                    {decode(video.title)}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </>
  );
}
