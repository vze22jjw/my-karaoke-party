"use client";

import { QrCode } from "./qr-code";
import { cn } from "~/lib/utils";

type Props = {
  joinPartyUrl: string;
  className?: string;
};

export function PlayerQrCode({ joinPartyUrl, className }: Props) {
  return (
    <div 
      className={cn(
        "absolute bottom-28 left-8 z-20 flex items-end", 
        className
      )}
    >
      <QrCode url={joinPartyUrl} size={128} />
      <a
        href={joinPartyUrl}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-xl text-white pl-4 text-outline"
      >
        {joinPartyUrl.split("//")[1]}
      </a>
    </div>
  );
}
