"use client";

import { Button } from "~/components/ui/ui/button";
import { Play, Coffee } from "lucide-react";
import { cn } from "~/lib/utils";
import type { VideoInPlaylist } from "~/types/app-types";

const IS_DEBUG = process.env.NEXT_PUBLIC_EVENT_DEBUG === "true";

type ExtendedVideo = VideoInPlaylist & { spotifyId?: string | null };

type Props = {
  partyStatus: string;
  playedPlaylist: ExtendedVideo[];
  onStartParty: () => void;
  onToggleIntermission: () => void;
};

export function SettingsStatus({
  partyStatus,
  playedPlaylist,
  onStartParty,
  onToggleIntermission,
}: Props) {
  if (IS_DEBUG) console.log("[SettingsStatus] Status:", partyStatus, "Played Count:", playedPlaylist.length);

  // Logic to determine if this is an intermission or a fresh start
  const isIntermission = partyStatus === "OPEN" && playedPlaylist.length > 0;
  const isFreshStart = partyStatus === "OPEN" && playedPlaylist.length === 0;

  return (
    <div className={cn(
      "space-y-3 rounded-lg border-2 bg-card p-4 shadow-lg transition-all",
      partyStatus === "STARTED" ? "border-blue-500" : "border-green-500"
    )}>
      <h3 className={cn(
        "text-lg font-medium",
        partyStatus === "STARTED" ? "text-blue-400" : "text-green-400"
      )}>
        {partyStatus === "STARTED" ? "Party in Progress" : isIntermission ? "Intermission (Paused)" : "Party is OPEN"}
      </h3>
      
      {isFreshStart && (
        <p className="text-sm text-muted-foreground">
          Singers can add songs. When you&apos;re ready, start the party to load
          the first song.
        </p>
      )}

      {isIntermission && (
         <p className="text-sm text-muted-foreground">
           The player is showing the intermission slideshow. Click Resume to continue.
         </p>
      )}

      {partyStatus === "STARTED" && (
         <p className="text-sm text-muted-foreground">
           Need a break? Click Intermission to pause the party and show the lyrics slideshow.
         </p>
      )}

      {/* Fresh Start Button */}
      {isFreshStart && (
        <Button
          type="button"
          className="w-full bg-green-600 hover:bg-green-700"
          onClick={() => {
            if (IS_DEBUG) console.log("[SettingsStatus] Starting party");
            onStartParty();
          }}
        >
          <Play className="mr-2 h-4 w-4" />
          Start Party
        </Button>
      )}

      {/* Intermission Toggle Button */}
      {!isFreshStart && (
         <Button
           type="button"
           variant={partyStatus === "STARTED" ? "outline" : "default"}
           className={cn(
             "w-full",
             partyStatus === "OPEN" && "bg-green-600 hover:bg-green-700"
           )}
           onClick={() => {
             if (IS_DEBUG) console.log("[SettingsStatus] Toggling intermission");
             onToggleIntermission();
           }}
         >
           {partyStatus === "STARTED" ? (
             <>
               <Coffee className="mr-2 h-4 w-4" />
               Start Intermission (Pause)
             </>
           ) : (
             <>
               <Play className="mr-2 h-4 w-4" />
               Resume Party
             </>
           )}
         </Button>
      )}
    </div>
  );
}
