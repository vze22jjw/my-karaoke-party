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
      className={cn("flex h-full w-full flex-col items-center p-6", className)}
    >
      <div className="flex w-full basis-3/4 items-center justify-center">
        <Image
          src={logo}
          alt="My Karaoke Party"
          priority
          className="mx-auto duration-1000 animate-in zoom-in-150 spin-in-180"
        />
      </div>
      <div className="flex w-full basis-1/4 flex-col items-center justify-between text-center sm:flex-row">
        <QrCode url={joinPartyUrl} className="w-fit self-end bg-white p-2" />
        <a
          href={joinPartyUrl}
          target="_blank"
          className="font-mono text-xl text-white sm:self-end"
        >
          {joinPartyUrl.split("//")[1]}
        </a>
      </div>
    </div>
  );
}
