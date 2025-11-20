/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { useState, useEffect } from "react";
import { api, type RouterOutputs } from "~/trpc/react";
import { Plus, Search, Check, Loader2, Frown, X } from "lucide-react";
import type { KaraokeParty } from "~/types/app-types";
import { PreviewPlayer } from "./preview-player";
import { removeBracketedContent } from "~/utils/string";
import { decode } from "html-entities";
import { Input } from "./ui/ui/input";
import { Button } from "./ui/ui/button";
import { Skeleton } from "./ui/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "./ui/ui/alert";
import { useLocalStorage } from "@mantine/hooks";
import { cn } from "~/lib/utils";

type Props = {
  onVideoAdded: (videoId: string, title: string, coverUrl: string) => void;
  playlist: KaraokeParty["playlist"];
  name: string;
  initialSearchQuery?: string;
  onSearchQueryConsumed?: () => void;
};

type YoutubeSearchItem = RouterOutputs["youtube"]["search"][number];

const MAX_SEARCH_RESULTS_KEY = "karaoke-max-results";

export function SongSearch({
  onVideoAdded,
  playlist,
  name,
  initialSearchQuery,
  onSearchQueryConsumed,
}: Props) {

  const [videoInputValue, setVideoInputValue] = useState(initialSearchQuery ?? "");
  const [canFetch, setCanFetch] = useState((initialSearchQuery ?? "").length >= 3);

  const [recentlyAddedVideoIds, setRecentlyAddedVideoIds] = useState<string[]>(
    [],
  );
  const [fadingOutVideoIds, setFadingOutVideoIds] = useState<string[]>([]);

  const [maxSearchResults] = useLocalStorage<number>({
    key: MAX_SEARCH_RESULTS_KEY,
    defaultValue: 12,
  });

  const {
    data: rawData,
    isError,
    refetch,
    isLoading,
    isFetched,
  } = api.youtube.search.useQuery(
    {
      keyword: `${videoInputValue} karaoke`,
      maxResults: maxSearchResults,
    },
    { refetchOnWindowFocus: false, enabled: false, retry: false },
  );

  const data = rawData as YoutubeSearchItem[] | undefined;

  useEffect(() => {
    if (initialSearchQuery) {
      setVideoInputValue(initialSearchQuery);
      setCanFetch(true);
      const timer = setTimeout(() => {
        void (async () => {
          setRecentlyAddedVideoIds([]);
          setFadingOutVideoIds([]);
          await refetch();
          setCanFetch(false);
          onSearchQueryConsumed?.();
        })();
      }, 100); // Small 100ms delay

      return () => clearTimeout(timer);
    }
  }, [initialSearchQuery, refetch, onSearchQueryConsumed]); 

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        onSearchQueryConsumed?.();
        setRecentlyAddedVideoIds([]);
        setFadingOutVideoIds([]);
        await refetch();
        setCanFetch(false);
      }}
    >
      <div className="flex w-full items-center space-x-2">
        <div className="relative flex-1">
          <Input
            type="text"
            name="video-url"
            placeholder="Enter artist and/or song name..."
            className="w-full pr-10"
            value={videoInputValue}
            onChange={(e) => {
              onSearchQueryConsumed?.();
              setVideoInputValue(e.target.value);
              setCanFetch(e.target.value.length >= 3);
            }}
            required
            minLength={3}
            autoComplete="off"
          />

          {videoInputValue.length > 0 && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                onSearchQueryConsumed?.();
                setVideoInputValue("");
                setCanFetch(false);
              }}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Button type="submit" disabled={isLoading || !canFetch}>
          {isLoading ? (
            <Loader2 className="mx-1 h-6 w-6 animate-spin" />
          ) : (
            <Search className="mx-1 h-6 w-6" />
          )}
        </Button>
      </div>

      {isError && (
        <Alert variant={"destructive"} className="mt-4 bg-red-500 text-white">
          <Frown className="h-4 w-4" color="white" />
          <AlertTitle>Error!</AlertTitle>
          <AlertDescription>
            There was an unexpected error while searching for karaoke videos.
            Try again later.
          </AlertDescription>
        </Alert>
      )}

      {isFetched && !isError && !data?.length && (
        <Alert className="mt-4">
          <Frown className="h-4 w-4" />
          <AlertTitle>Nothing found!</AlertTitle>
          <AlertDescription>
            No karaoke videos found for {videoInputValue}
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="my-5 flex flex-col space-y-5 overflow-hidden">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      )}

      {data && (
        <div className="my-5 flex flex-col space-y-5 overflow-hidden">
          {data
            .filter((video) => {
              const isRecentlyAdded = recentlyAddedVideoIds.includes(
                video.id.videoId,
              );
              return !isRecentlyAdded;
            })
            .map((video) => {
              const alreadyInQueue = !!playlist.find(
                (v) =>
                  v.id === video.id.videoId &&
                  !v.playedAt &&
                  v.singerName === name,
              );

              const isFadingOut = fadingOutVideoIds.includes(video.id.videoId);

              const title = decode(removeBracketedContent(video.snippet.title));

              return (
                <div
                  key={video.id.videoId}
                  className={cn(
                    "relative h-48 overflow-hidden rounded-lg animate-in fade-in border border-white/50",
                    isFadingOut && "animate-fade-out-slow",
                  )}
                >
                  <PreviewPlayer
                    key={video.id.videoId}
                    videoId={video.id.videoId}
                    title={title}
                    thumbnail={video.snippet.thumbnails.high.url}
                  />
                  <div className="absolute inset-0 z-10 rounded-lg bg-black opacity-50" />

                  <div className="absolute top-0 z-30 w-full rounded-lg opacity-100">
                    <p className="bg-black bg-opacity-70 p-3 text-xl font-bold text-white">
                      {title}
                    </p>
                  </div>

                  <div className="absolute bottom-3 right-3 z-30 opacity-100 w-full flex justify-between">
                    <div>
                      <p className="bg-black bg-opacity-70 p-2 pl-5 text-sm text-white">
                        {video.snippet.channelTitle}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={"default"}
                      size="icon"
                      className="shadow-xl animate-in spin-in"
                      disabled={alreadyInQueue || isFadingOut}
                      onClick={() => {
                        onVideoAdded(
                          video.id.videoId,
                          removeBracketedContent(video.snippet.title),
                          video.snippet.thumbnails.high.url,
                        );

                        setFadingOutVideoIds((prev) => [
                          ...prev,
                          video.id.videoId,
                        ]);

                        setTimeout(() => {
                          setRecentlyAddedVideoIds((prev) => [
                            ...prev,
                            video.id.videoId,
                          ]);
                        }, 500);
                      }}
                    >
                      {alreadyInQueue || isFadingOut ? (
                        <Check stroke="pink" />
                      ) : (
                        <Plus />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </form>
  );
}
