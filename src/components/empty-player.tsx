import Image from "next/image";
import { QrCode } from "./qr-code";

import logo from "~/assets/my-karaoke-party-logo.png";
import { cn } from "~/lib/utils";

type Props = {
  joinPartyUrl: string;
  className?: string;
};

export function EmptyPlayer({ joinPartyUrl, className }: Props) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center p-6 pb-1",
        className,
      )}
    >
      <div className="flex w-full basis-3/4 items-center justify-center">
        <Image
          src={logo}
          alt="My Karaoke Party"
          priority
          className="mx-auto object-contain duration-1000 animate-in zoom-in-150 spin-in-180"
        />
      </div>
      <div className="relative flex w-full basis-1/4 items-end justify-center text-center">
        <QrCode url={joinPartyUrl} className="absolute bottom-4 left-0" />
        <a
          href={joinPartyUrl}
          target="_blank"
          className="font-mono text-xl text-white"
        >
          {joinPartyUrl.split("//")[1]}
        </a>
      </div>
    </div>
  );
}
