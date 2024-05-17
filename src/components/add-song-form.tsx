"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { extractYouTubeVideoId } from "~/utils/url";
import { decode } from "html-entities";
import { removeBracketedContent } from "~/utils/string";

export function AddSongForm({
  addFn,
}: {
  addFn: (videoId: string, title: string) => void;
}) {
  const [videoInputValue, setVideoInputValue] = useState("");

  const { data, error, refetch } = api.youtube.search.useQuery(
    {
      keyword: `${videoInputValue} karaoke`,
    },
    { refetchOnWindowFocus: false, enabled: false },
  );

  const addVideo = (video: { videoId: string; title: string }) => {
    // const videoId = extractYouTubeVideoId(videoInputValue);

    // if (!videoId) {
    //   alert("Invalid YouTube Video URL/ID");
    //   return;
    // }

    console.log(video);
    addFn(video.videoId, video.title);
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await refetch();
        /*addVideo();
        setVideoInputValue("");*/
      }}
    >
      <div className="join join-vertical lg:join-horizontal w-full">
        <input
          type="text"
          name="video-url"
          placeholder="Enter artist and/or song name..."
          className="join-item input input-lg input-bordered w-full"
          value={videoInputValue}
          onChange={(e) => setVideoInputValue(e.target.value)}
          required
          minLength={3}
        />
        <button type="submit" className="join-item btn btn-lg btn-primary">
          Search
        </button>
      </div>

      <div className="mt-5 w-full">
        {data?.map((video) => (
          <div
            key={video.id.videoId}
            className="card card-compact bg-primary my-5 w-96 shadow-xl"
          >
            <figure>
              <img
                src={video.snippet.thumbnails.medium.url}
                alt={video.snippet.title}
              />
            </figure>
            <div className="card-body">
              <h2 className="card-title">
                {removeBracketedContent(decode(video.snippet.title))}
              </h2>
              <p>{video.snippet.channelTitle}</p>
              <div className="card-actions justify-end">
                <button
                  type="button"
                  className="btn btn-accent"
                  onClick={() =>
                    addVideo({
                      videoId: video.id.videoId,
                      title: video.snippet.title,
                    })
                  }
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </form>
  );
}
