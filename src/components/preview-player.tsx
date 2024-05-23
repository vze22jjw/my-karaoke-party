import "@vidstack/react/player/styles/base.css";

import { useEffect, useRef, useState } from "react";

import {
  isHLSProvider,
  MediaPlayer,
  MediaProvider,
  Poster,
  type MediaCanPlayDetail,
  type MediaCanPlayEvent,
  type MediaPlayerInstance,
  type MediaProviderAdapter,
  type MediaProviderChangeEvent,
} from "@vidstack/react";

export function PreviewPlayer({
  videoId,
  title,
  thumbnail,
}: {
  videoId: string;
  title: string;
  thumbnail: string;
}) {
  const player = useRef<MediaPlayerInstance>(null);

  useEffect(() => {
    // Subscribe to state updates.
    return player.current!.subscribe(({ paused, viewType }) => {
      // console.log('is paused?', '->', state.paused);
      // console.log('is audio view?', '->', state.viewType === 'audio');
    });
  }, []);

  function onProviderChange(
    provider: MediaProviderAdapter | null,
    nativeEvent: MediaProviderChangeEvent,
  ) {
    // We can configure provider's here.
    if (isHLSProvider(provider)) {
      provider.config = {};
    }
  }

  // We can listen for the `can-play` event to be notified when the player is ready.
  // function onCanPlay(
  //   detail: MediaCanPlayDetail,
  //   nativeEvent: MediaCanPlayEvent,
  // ) {
  //   console.log("Can play: " + videoId);
  //   canPlay(videoId);
  // }

  return (
    <MediaPlayer
      className="ring-media-focus w-full overflow-hidden rounded-md bg-slate-900 font-sans text-white data-[focus]:ring-4"
      title={title}
      src={`youtube/${videoId}`}
      crossOrigin
      playsInline
      onProviderChange={onProviderChange}
      ref={player}
      load="custom"
      posterLoad="eager"
    >
      <MediaProvider>
        <Poster
          className="absolute inset-0 block h-full w-full rounded-md object-cover opacity-0 transition-opacity data-[visible]:opacity-100"
          src={thumbnail}
          alt={title}
        />
      </MediaProvider>
    </MediaPlayer>
  );
}
