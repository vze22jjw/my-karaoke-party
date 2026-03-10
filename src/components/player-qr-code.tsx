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
        // Add "w-fit" so the div wraps tightly around the QR code and text
        "absolute bottom-28 left-8 z-20 flex items-end w-fit pointer-events-none", 
        className
      )}
    >
      <QrCode url={joinPartyUrl} size={128} />
      <a
        href={joinPartyUrl}
        target="_blank"
        rel="noreferrer"
        // Add "pointer-events-auto" so the link remains clickable
        className="font-mono text-xl text-white pl-4 text-outline pointer-events-auto"
      >
        {joinPartyUrl.split("//")[1]}
      </a>
    </div>
  );
}
