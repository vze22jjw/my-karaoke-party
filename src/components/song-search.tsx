import { useState } from "react";
import { api } from "~/trpc/react";
import { Plus, Search, Check, Loader2 } from "lucide-react";
import { type KaraokeParty } from "party";
import { PreviewPlayer } from "./preview-player";
import { removeBracketedContent } from "~/utils/string";
import { decode } from "html-entities";
import { Input } from "./ui/ui/input";
import { Button } from "./ui/ui/button";

type Props = {
  onVideoAdded: (videoId: string, title: string, coverUrl: string) => void;
  playlist: KaraokeParty["playlist"];
};

export function SongSearch({ onVideoAdded, playlist }: Props) {
  const [videoInputValue, setVideoInputValue] = useState("");
  const [canFetch, setCanFetch] = useState(false);

  const { data, refetch, isLoading } = api.youtube.search.useQuery(
    {
      keyword: `${videoInputValue} karaoke`,
    },
    { refetchOnWindowFocus: false, enabled: false },
  );

  // const [canPlayVideos, setCanPlayVideos] = useState<string[]>([]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await refetch();
        setCanFetch(false);
      }}
    >
      <div className="flex w-full items-center space-x-2">
        <Input
          type="text"
          name="video-url"
          placeholder="Enter artist and/or song name..."
          className="w-full"
          value={videoInputValue}
          onChange={(e) => {
            setVideoInputValue(e.target.value);
            setCanFetch(e.target.value.length >= 3);
          }}
          required
          minLength={3}
          autoComplete="off"
        />
        <Button type="submit" disabled={isLoading || !canFetch}>
          {isLoading ? (
            <Loader2 className="mx-1 h-6 w-6 animate-spin" />
          ) : (
            <Search className="mx-1 h-6 w-6" />
          )}
        </Button>
      </div>

      {data && (
        <div className="my-5 flex flex-col space-y-5 overflow-hidden">
          {data.map((video) => {
            const alreadyAdded = !!playlist.find(
              (v) => v.id === video.id.videoId,
            );

            const title = decode(removeBracketedContent(video.snippet.title));

            return (
              <div
                key={video.id.videoId}
                className={`relative h-48 overflow-hidden rounded-lg`}
              >
                <PreviewPlayer
                  key={video.id.videoId}
                  videoId={video.id.videoId}
                  title={title}
                  thumbnail={video.snippet.thumbnails.high.url}
                />
                <div className="absolute inset-0 z-10 rounded-lg bg-black opacity-50"></div>

                <div className="absolute top-0 z-30 w-full rounded-lg opacity-100">
                  <p className="bg-black bg-opacity-70 p-3 text-2xl font-bold text-white">
                    {title}
                  </p>
                </div>

                <div className="absolute bottom-3 right-3 z-30 opacity-100">
                  <Button
                    type="button"
                    variant={"default"}
                    size="icon"
                    className="shadow-xl animate-in spin-in"
                    disabled={alreadyAdded}
                    onClick={() =>
                      onVideoAdded(
                        video.id.videoId,
                        removeBracketedContent(video.snippet.title),
                        video.snippet.thumbnails.high.url,
                      )
                    }
                  >
                    {alreadyAdded ? <Check stroke="pink" /> : <Plus />}
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
