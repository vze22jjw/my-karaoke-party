/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CheckIcon,
} from "@heroicons/react/24/solid";
import { type KaraokeParty } from "party";
import { PreviewPlayer } from "./preview-player";
import { removeBracketedContent } from "~/utils/string";
import { decode } from "html-entities";

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

  // const [canPlayVideos, setCanPlayVideos] = useState<string[]>([]);

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
      <div className="join join-horizontal w-full lg:w-3/4">
        <input
          type="text"
          name="video-url"
          placeholder="Enter artist and/or song name..."
          className="input input-lg join-item input-bordered w-full"
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
          className="btn btn-square btn-primary join-item btn-lg"
          disabled={isLoading || !canFetch}
        >
          {isLoading ? (
            <span className="loading loading-spinner"></span>
          ) : (
            <MagnifyingGlassIcon className="mx-1 h-8 w-8" />
          )}
        </button>
      </div>

      {data && (
        <div className="mt-5 grid grid-cols-1 gap-4 text-left md:grid-cols-2 xl:grid-cols-3">
          {data.map((video) => {
            const alreadyAdded = !!playlist.find(
              (v) => v.id === video.id.videoId,
            );

            const title = decode(removeBracketedContent(video.snippet.title));

            return (
              <div
                key={video.id.videoId}
                className={`relative aspect-video rounded-lg`}
              >
                <PreviewPlayer
                  key={video.id.videoId}
                  videoId={video.id.videoId}
                  title={title}
                  thumbnail={video.snippet.thumbnails.high.url}
                  // canPlay={(videoId) => {
                  //   setCanPlayVideos((prev) => [...prev, videoId]);
                  // }}
                />
                <div className="absolute inset-0 z-10 rounded-lg bg-black opacity-50"></div>

                <div className="absolute top-0 z-30 w-full rounded-lg opacity-100">
                  <p className="bg-black bg-opacity-70 p-3 text-2xl font-bold text-white">
                    {title}
                  </p>
                </div>

                <div className="absolute bottom-3 right-3 z-30 opacity-100">
                  <button
                    type="button"
                    className="btn btn-square btn-accent shadow-xl animate-in spin-in"
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

            // return (
            //   <div
            //     key={video.id.videoId}
            //     className="relative aspect-video rounded-lg"
            //   >
            //     <YouTube
            //       className="relative h-full w-full rounded-lg"
            //       iframeClassName="w-full h-full rounded-lg"
            //       loading="lazy"
            //       videoId={video.id.videoId}
            //       onReady={(e) => {
            //         const unavailable = e.target.getPlayerState() === -1;

            //         if (unavailable) {
            //           setUnavailableVideos((prev) => [
            //             ...prev,
            //             video.id.videoId,
            //           ]);
            //           console.log(
            //             `${video.id.videoId}: ${e.target.getPlayerState()}`,
            //           );
            //         }
            //       }}
            //     />
            //     <div className="absolute inset-0 z-10 bg-black opacity-25"></div>
            //     <div className="absolute bottom-3 right-3 z-30 opacity-100">
            //       <button
            //         type="button"
            //         className="btn btn-square btn-accent shadow-xl"
            //         disabled={alreadyAdded}
            //         onClick={() =>
            //           addVideo({
            //             videoId: video.id.videoId,
            //             title: video.snippet.title,
            //           })
            //         }
            //       >
            //         {alreadyAdded ? <CheckIcon stroke="pink" /> : <PlusIcon />}
            //       </button>
            //     </div>
            //   </div>
            // );
          })}
        </div>
      )}
    </form>
  );
}
