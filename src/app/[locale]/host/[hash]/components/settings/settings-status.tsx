"use client";

import { useState, useEffect } from "react";
import { Button } from "~/components/ui/ui/button";
import { Alert, AlertDescription } from "~/components/ui/ui/alert";
import { Play, Coffee, Activity, Info, Lock, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import type { VideoInPlaylist } from "~/types/app-types";
import { useTranslations } from "next-intl";

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

  const t = useTranslations('host.settings.status');
  const [showInfo, setShowInfo] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setIsPending(false);
  }, [partyStatus]);

  const isIntermission = partyStatus === "OPEN" && playedPlaylist.length > 0;
  const isFreshStart = partyStatus === "OPEN" && playedPlaylist.length === 0;

  let statusText = t('open');
  if (isPartyClosed) statusText = t('closed');
  else if (partyStatus === "STARTED") statusText = t('started');
  else if (isIntermission) statusText = t('intermission');

  const handleStart = () => {
    if (isPending || isPartyClosed) return;
    setIsPending(true);
    if (IS_DEBUG) console.log("[SettingsStatus] Starting party");
    onStartParty();
    setTimeout(() => setIsPending(false), 5000);
  };

  const handleToggle = () => {
    if (isPending || isPartyClosed) return;
    setIsPending(true);
    if (IS_DEBUG) console.log("[SettingsStatus] Toggling intermission");
    onToggleIntermission();
    setTimeout(() => setIsPending(false), 5000);
  };

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
          {statusText}
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
          <AlertDescription>{t('info')}</AlertDescription>
        </Alert>
      )}
      
      {isPartyClosed && (
        <Button disabled className="w-full cursor-not-allowed bg-muted text-muted-foreground">
          <Lock className="mr-2 h-4 w-4" />
          {t('closed')}
        </Button>
      )}

      {!isPartyClosed && isFreshStart && (
        <Button
          type="button"
          disabled={isPending}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleStart}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {t('start')}
        </Button>
      )}

      {!isPartyClosed && !isFreshStart && (
         <Button
           type="button"
           variant="default"
           disabled={isPending}
           className={cn(
             "w-full disabled:opacity-50 disabled:cursor-not-allowed",
             partyStatus === "OPEN" && "bg-green-600 hover:bg-green-700",
             partyStatus === "STARTED" && "hover:bg-primary"
           )}
           onClick={handleToggle}
         >
           {isPending ? (
             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
           ) : partyStatus === "STARTED" ? (
             <Coffee className="mr-2 h-4 w-4" />
           ) : (
             <Play className="mr-2 h-4 w-4" />
           )}
           {partyStatus === "STARTED" ? t('pause') : t('resume')}
         </Button>
      )}
    </div>
  );
}
