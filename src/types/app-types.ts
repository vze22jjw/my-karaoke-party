/**
 * Represents a video item with its playlist status, 
 * typically built from a Prisma PlaylistItem.
 */
export type VideoInPlaylist = {
    id: string; // Corresponds to videoId
    title: string;
    artist: string;
    song: string;
    coverUrl: string;
    duration: string | undefined; // ISO 8601 duration
    singerName: string;
    playedAt: Date | null;
    spotifyId?: string | null;
    createdAt?: Date; // The addedAt field
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
        isManualSortActive?: boolean; // <-- This field is required
	};
};

/**
 * Defines the initial data object expected by client scenes.
 */
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
