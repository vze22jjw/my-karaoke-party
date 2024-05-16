"use client";

import { useState } from "react";
import { extractYouTubeVideoId } from "~/utils/url";

export function AddSongForm({ addFn }: { addFn: (videoId: string) => void }) {
  const [videoInputValue, setVideoInputValue] = useState("");

  const addVideo = () => {
    const videoId = extractYouTubeVideoId(videoInputValue);

    if (!videoId) {
      alert("Invalid YouTube Video URL/ID");
      return;
    }

    addFn(videoId);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        addVideo();
        setVideoInputValue("");
      }}
    >
      <div className="join join-vertical lg:join-horizontal w-full">
        <input
          type="text"
          name="video-url"
          placeholder="YouTube Video URL or ID"
          className="join-item input input-lg input-bordered w-full"
          value={videoInputValue}
          onChange={(e) => setVideoInputValue(e.target.value)}
          required
          minLength={11}
        />
        <button type="submit" className="join-item btn btn-lg btn-primary">
          Add
        </button>
      </div>
    </form>
  );
}
