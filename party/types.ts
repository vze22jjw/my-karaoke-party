import type { Video } from "@prisma/client";

export type VideoInPlaylist = Omit<Video, "duration"> & {
	singerName: string;
	playedAt: Date | null;
	duration: string | undefined;
};

export type KaraokeParty = {
	playlist: VideoInPlaylist[];
	settings: {
		orderByFairness: boolean;
	};
};

// Legacy message types (kept for compatibility)
export type Message =
	| { type: "add-video"; id: string; title: string; singerName: string; coverUrl: string; duration?: string }
	| { type: "remove-video"; id: string }
	| { type: "mark-as-played"; id: string }
	| { type: "horn" };
