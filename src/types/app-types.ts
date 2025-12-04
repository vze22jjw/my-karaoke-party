/**
 * Represents a video item with its playlist status, 
 * typically built from a Prisma PlaylistItem.
 */
export type VideoInPlaylist = {
    id: string; 
    title: string;
    artist: string;
    song: string;
    coverUrl: string;
    duration: string | undefined;
    singerName: string;
    playedAt: Date | null;
    spotifyId?: string | null;
    createdAt?: Date; 
    isPriority: boolean;
    isManual: boolean;
    applauseCount: number;
};

/**
 * The full data structure used to represent the karaoke party state.
 */
export type KaraokeParty = {
	playlist: VideoInPlaylist[];
	settings: {
		orderByFairness: boolean;
		disablePlayback?: boolean;
        spotifyPlaylistId?: string | null;
        spotifyLink?: string | null; // <-- NEW
        isManualSortActive?: boolean;
	};
};

export type InitialPartyData = {
    currentSong: VideoInPlaylist | null;
    unplayed: VideoInPlaylist[];
    played: VideoInPlaylist[];
    settings: KaraokeParty["settings"]; 
    currentSongStartedAt: Date | null;
    currentSongRemainingDuration: number | null;
    status: string;
    idleMessages: string[];
    themeSuggestions: string[];
};
