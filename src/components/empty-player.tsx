import Image from "next/image";
import { QrCode } from "./qr-code";
import logo from "~/assets/my-karaoke-party-logo.png";
import { cn } from "~/lib/utils";
import { useEffect, useState } from "react";

type Props = {
  joinPartyUrl: string;
  className?: string;
  idleMessages: string[];
};

function IdleSlideshow({ messages }: { messages: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return; // No need to cycle

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 7000); // 7-second slide duration

    return () => clearInterval(interval);
  }, [messages.length]);

  if (messages.length === 0) return null;

  const currentMessage = messages[currentIndex] ?? "";
  const parts = currentMessage.split(" -- ");
  const quote = parts[0] ?? "";
  const author = parts[1] ?? "";

  return (
    <div
      key={currentIndex} // Key change triggers animation
      className="flex w-full flex-col items-center justify-center text-center animate-in fade-in-0 duration-1000"
    >
      <blockquote
        className="text-outline scroll-m-20 text-3xl font-extrabold tracking-tight text-white lg:text-4xl"
      >
        &ldquo;{quote}&rdquo;
      </blockquote>
      {author && (
        <cite
          className="text-outline mt-4 scroll-m-20 text-3xl font-extrabold tracking-tight text-white lg:text-4xl not-italic"
        >
          - {author}
        </cite>
      )}
    </div>
  );
}

export function EmptyPlayer({ joinPartyUrl, className, idleMessages }: Props) {
  const hasMessages = idleMessages.length > 0;

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center p-6 overflow-hidden",
        className,
      )}
    >
      <div className="absolute inset-0 top-1/4 flex h-1/2 w-full items-center justify-center opacity-50">
        <Image
          src={logo}
          alt="My Karaoke Party"
          priority
          className="mx-auto object-contain"
        />
      </div>

      <div className="z-10 flex h-full w-full flex-col">
        <div className="flex w-full basis-1/4 items-start justify-center min-h-0" />
        
        <div className="flex w-full basis-2/4 items-center justify-center px-4 min-h-0">
          {hasMessages ? (
            <IdleSlideshow messages={idleMessages} />
          ) : (
            <p className="text-outline text-3xl text-center text-white">
              Waiting for the host to start the party...
            </p>
          )}
        </div>
        
        <div className="relative flex w-full basis-1/4 items-end text-center min-h-0">
          <QrCode url={joinPartyUrl} />
          <a
            href={joinPartyUrl}
            target="_blank"
            className="font-mono text-xl text-white pl-4 text-outline"
          >
            {joinPartyUrl.split("//")[1]}
          </a>
        </div>
      </div>
    </div>
  );
}
