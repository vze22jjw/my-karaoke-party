"use client";

import { api } from "~/trpc/react";
import { FunStatsCarousel } from "./fun-stats-carousel";
import { ThemeSuggestionsCarousel } from "~/components/theme-suggestions-carousel";
import type { VideoInPlaylist } from "~/types/app-types";

// --- Types ---
type SpotifySong = {
  title: string;
  artist: string;
  coverUrl?: string;
};

type Participant = {
  name: string;
  role: string;
  avatar: string | null;
  applauseCount: number;
  joinedAt?: Date | string;
};

type TopSong = {
  id: string;
  title: string;
  coverUrl: string;
  count: number;
  artist: string | null;
};

type TopArtist = {
  name: string;
  count: number;
};

type StatsData = {
  topSongs?: TopSong[];
  rareGemSongs?: TopSong[];
  topArtists?: TopArtist[];
  rareGemArtists?: TopArtist[];
  topSingersBySongs: { name: string; count: number }[];
  topSingersByApplause: { name: string; applauseCount: number }[];
  topSongsByApplause: { title: string; applause: number; singer: string }[];
  globalStats: {
    totalSongs: number;
    totalApplause: number;
    bestDressed: { avatar: string | null; count: number } | null;
    oneHitWonder: { name: string; applauseCount: number } | null;
    marathonRunner: { name: string; totalDurationMs: number } | null;
  };
};

type Props = {
  themeSuggestions: string[];
  spotifyPlaylistId?: string | null;
  onSuggestionClick: (title: string, artist: string) => void;
  participants: Participant[];
  playlist: VideoInPlaylist[];
  playedPlaylist: VideoInPlaylist[];
};

export function TabHistory({
  themeSuggestions,
  spotifyPlaylistId,
  onSuggestionClick,
  participants: _participants,
  playlist: _playlist,
  playedPlaylist: _playedPlaylist,
}: Props) {
  const { data: stats, isLoading: isLoadingStats } = api.playlist.getGlobalStats.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });

  const { data: spotifyData } = api.spotify.getTopKaraokeSongs.useQuery(
    { playlistId: spotifyPlaylistId },
    { refetchOnWindowFocus: false, staleTime: 1000 * 60 * 60 }
  );

  const spotifySongs = (spotifyData ?? []) as SpotifySong[];

  return (
    <div className="space-y-4 pb-6">
      {/* 1. Unified Themed Suggestions Carousel (Party Themes, Spotify, Trending, Vocals, Holidays, Decades, Rock, Hip-Hop, Movies, International, Custom Vibe) */}
      <ThemeSuggestionsCarousel
        themeSuggestions={themeSuggestions}
        spotifySongs={spotifySongs}
        onSuggestionClick={onSuggestionClick}
      />

      {/* 2. Community & Fun Stats Carousel (Top Played Songs, Top Artists, Most Eager, Encore, Divas, Party Stats) */}
      <FunStatsCarousel
        stats={stats as StatsData | undefined}
        isLoading={isLoadingStats}
        onSuggestionClick={onSuggestionClick}
      />
    </div>
  );
}
