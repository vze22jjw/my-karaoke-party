"use client";

import { useState } from "react";
import { Button } from "~/components/ui/ui/button";
import { Alert, AlertDescription } from "~/components/ui/ui/alert";
import { Play, Coffee, Activity, Info, Lock } from "lucide-react";
import { cn } from "~/lib/utils";
import type { VideoInPlaylist } from "~/types/app-types";

const IS_DEBUG = process.env.NEXT_PUBLIC_EVENT_DEBUG === "true";

type ExtendedVideo = VideoInPlaylist & { spotifyId?: string | null };

type Props = {
  partyStatus: string;
  playedPlaylist: ExtendedVideo[];
  onStartParty: () => void;
  onToggleIntermission: () => void;
  isPartyClosed?: boolean;
};

export function SettingsStatus({
  partyStatus,
  playedPlaylist,
  onStartParty,
  onToggleIntermission,
  isPartyClosed,
}: Props) {
  if (IS_DEBUG) console.log("[SettingsStatus] Status:", partyStatus, "Played Count:", playedPlaylist.length);

  const [showInfo, setShowInfo] = useState(false);

  const isIntermission = partyStatus === "OPEN" && playedPlaylist.length > 0;
  const isFreshStart = partyStatus === "OPEN" && playedPlaylist.length === 0;

  return (
    <div className={cn(
      "space-y-3 rounded-lg border-2 bg-card p-4 shadow-lg transition-all",
      isPartyClosed ? "border-gray-300 opacity-70" : partyStatus === "STARTED" ? "border-blue-500" : "border-green-500"
    )}>
      <div className="flex items-center justify-between">
        <h3 className={cn(
          "text-lg font-medium flex items-center gap-2",
          isPartyClosed ? "text-gray-500" : partyStatus === "STARTED" ? "text-blue-400" : "text-green-400"
        )}>
          {isPartyClosed ? <Lock className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
          {isPartyClosed ? "Party Closed" : partyStatus === "STARTED" ? "Party in Progress" : isIntermission ? "Intermission (Paused)" : "Party is OPEN"}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          onClick={() => setShowInfo(!showInfo)}
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>

      {showInfo && (
        <Alert className="mt-2">
          <AlertDescription>
            Use this to manage the flow of your event. <strong>Start</strong> to begin playing music. 
            Use <strong>Intermission</strong> to pause the queue and show a slideshow of your idle messages 
            while guests take a break.
          </AlertDescription>
        </Alert>
      )}
      
      {!isPartyClosed && isFreshStart && (
        <p className="text-sm text-muted-foreground">
          Singers can add songs. When you&apos;re ready, start the party to load
          the first song.
        </p>
      )}

      {!isPartyClosed && isIntermission && (
         <p className="text-sm text-muted-foreground">
           The player is showing the intermission slideshow. Click Resume to continue.
         </p>
      )}

      {!isPartyClosed && partyStatus === "STARTED" && (
         <p className="text-sm text-muted-foreground">
           Need a break? Click Intermission to pause the party and show the lyrics slideshow.
         </p>
      )}

      {isPartyClosed && (
         <p className="text-sm text-muted-foreground">
            This party is now closed. Settings are read-only. You can still view the playlist and export data.
         </p>
      )}

      {isPartyClosed && (
        <Button disabled className="w-full cursor-not-allowed bg-muted text-muted-foreground">
          <Lock className="mr-2 h-4 w-4" />
          Party is Closed
        </Button>
      )}

      {!isPartyClosed && isFreshStart && (
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

      {!isPartyClosed && !isFreshStart && (
         <Button
           type="button"
           variant="default"
           className={cn(
             "w-full",
             partyStatus === "OPEN" && "bg-green-600 hover:bg-green-700",
             partyStatus === "STARTED" && "hover:bg-primary"
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
