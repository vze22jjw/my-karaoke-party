"use client";

import { useState } from "react";
import { Label } from "~/components/ui/ui/label";
import { Input } from "~/components/ui/ui/input";
import { QrCode } from "~/components/qr-code";
import { getUrl } from "~/utils/url";
import { Button } from "~/components/ui/ui/button";
import { Alert, AlertDescription } from "~/components/ui/ui/alert";
import { Info, Link as LinkIcon, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

const IS_DEBUG = process.env.NEXT_PUBLIC_EVENT_DEBUG === "true";

type Props = {
  partyHash: string;
  isPartyClosed?: boolean;
};

export function SettingsLinks({ partyHash, isPartyClosed }: Props) {
  if (IS_DEBUG) console.log("[SettingsLinks] Rendering for hash:", partyHash);
  
  const t = useTranslations('host.settings.links');
  const tCommon = useTranslations('common');

  const [isQrExpanded, setIsQrExpanded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const joinUrl = getUrl(`/join/${partyHash}`);
  const playerUrl = getUrl(`/player/${partyHash}`);

  const openLink = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <>
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-blue-500" />
            {/* FIX: Changed error to readOnly */}
            {t('title')} {isPartyClosed && <span className="text-sm text-muted-foreground font-normal">({tCommon('readOnly')})</span>}
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

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>{t('join')}</Label>
            <div className="flex items-center space-x-2">
              <Input
                readOnly
                disabled={isPartyClosed}
                value={joinUrl}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
              <Button 
                size="icon" 
                variant="outline" 
                onClick={() => openLink(joinUrl)}
                title="Open Join Page"
                disabled={isPartyClosed}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t('player')}</Label>
            <div className="flex items-center space-x-2">
              <Input
                readOnly
                disabled={isPartyClosed}
                value={playerUrl}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
              <Button 
                size="icon" 
                variant="outline" 
                onClick={() => openLink(playerUrl)}
                title="Open Player"
                disabled={isPartyClosed}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex justify-center">
            <button 
              type="button" 
              onClick={() => setIsQrExpanded(true)}
              className="transition-transform hover:scale-105 active:scale-95"
              title="Click to enlarge"
              disabled={isPartyClosed}
            >
              <div className={isPartyClosed ? "opacity-50 grayscale" : ""}>
                <QrCode url={joinUrl} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {isQrExpanded && !isPartyClosed && (
        <div 
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95 p-4 animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setIsQrExpanded(false)}
        >
           <div className="transform transition-transform hover:scale-105">
              <QrCode 
                url={joinUrl} 
                size={300} 
                className="rounded-xl shadow-2xl border-4 border-white" 
              />
           </div>
           <p className="mt-8 text-white text-lg font-medium opacity-80 animate-pulse">
             Tap anywhere to close
           </p>
        </div>
      )}
    </>
  );
}
