/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import YouTube from "react-youtube";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CheckIcon,
} from "@heroicons/react/24/solid";
import { type KaraokeParty } from "party";

export function AddSongForm({
  addFn,
  playlist,
}: {
  addFn: (videoId: string, title: string) => void;
  playlist: KaraokeParty["videos"];
}) {
  const [videoInputValue, setVideoInputValue] = useState("");
  const [canFetch, setCanFetch] = useState(false);

  const { data, error, refetch, isLoading } = api.youtube.search.useQuery(
    {
      keyword: `${videoInputValue} karaoke`,
    },
    { refetchOnWindowFocus: false, enabled: false },
  );

  const [unavailableVideos, setUnavailableVideos] = useState<string[]>([]);

  const addVideo = (video: { videoId: string; title: string }) => {
    addFn(video.videoId, video.title);
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await refetch();
        setCanFetch(false);
      }}
    >
      <div className="join join-horizontal w-full">
        <input
          type="text"
          name="video-url"
          placeholder="Enter artist and/or song name..."
          className="join-item input input-lg input-bordered w-full"
          value={videoInputValue}
          onChange={(e) => {
            setVideoInputValue(e.target.value);
            setCanFetch(e.target.value.length >= 3);
          }}
          required
          minLength={3}
        />
        <button
          type="submit"
          className="join-item btn btn-lg btn-square btn-primary"
          disabled={isLoading || !canFetch}
        >
          {isLoading ? (
            <span className="loading loading-spinner"></span>
          ) : (
            <MagnifyingGlassIcon className="mx-1 h-8 w-8" />
          )}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data
          ?.filter((v) => !unavailableVideos.includes(v.id.videoId))
          .map((video) => {
            const alreadyAdded = !!playlist.find(
              (v) => v.id === video.id.videoId,
            );

            return (
              <div
                key={video.id.videoId}
                className="relative aspect-video rounded-lg"
              >
                <YouTube
                  className="relative h-full w-full rounded-lg"
                  iframeClassName="w-full h-full rounded-lg"
                  loading="lazy"
                  videoId={video.id.videoId}
                  onReady={(e) => {
                    const unavailable = e.target.getPlayerState() === -1;

                    if (unavailable) {
                      setUnavailableVideos((prev) => [
                        ...prev,
                        video.id.videoId,
                      ]);
                      console.log(
                        `${video.id.videoId}: ${e.target.getPlayerState()}`,
                      );
                    }
                  }}
                />
                <div className="absolute inset-0 z-10 bg-black opacity-25"></div>
                <div className="absolute bottom-3 right-3 z-30 opacity-100">
                  <button
                    type="button"
                    className="btn btn-square btn-accent shadow-xl"
                    disabled={alreadyAdded}
                    onClick={() =>
                      addVideo({
                        videoId: video.id.videoId,
                        title: video.snippet.title,
                      })
                    }
                  >
                    {alreadyAdded ? <CheckIcon stroke="pink" /> : <PlusIcon />}
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </form>
  );
}
