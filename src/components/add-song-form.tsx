"use client";

import { useState } from "react";

export function AddSongForm({ addFn }: { addFn: (videoId: string) => void }) {
  const [videoInputValue, setVideoInputValue] = useState("");

  const addVideo = () => {
    const videoId = videoInputValue.split("v=")[1];

    if (!videoId) {
      alert("Invalid YouTube URL");
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
          placeholder="Paste YouTube Video URL"
          className="join-item input input-lg input-bordered w-full"
          value={videoInputValue}
          onChange={(e) => setVideoInputValue(e.target.value)}
        />
        <button type="submit" className="join-item btn btn-lg btn-primary">
          Add
        </button>
      </div>
    </form>
  );
}
