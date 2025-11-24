"use client";

import Image from "next/image";
import { PlayerQrCode } from "./player-qr-code"; // Import the new component
import logo from "~/assets/my-karaoke-party-logo.png";
import { cn } from "~/lib/utils";
import { useEffect, useState } from "react";

type Props = {
  joinPartyUrl: string;
  className?: string;
  messages: string[]; 
};

function Slideshow({ messages }: { messages: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 7000); 

    return () => clearInterval(interval);
  }, [messages.length]);

  if (messages.length === 0) return null;

  const currentMessage = messages[currentIndex] ?? "";
  
  // CHANGED: Use "@" as separator instead of " -- "
  const parts = currentMessage.includes("@") ? currentMessage.split("@") : [currentMessage, ""];
  
  // Added trim() to clean up any surrounding spaces user might have typed
  const quote = parts[0]?.trim() ?? "";
  const author = parts[1]?.trim() ?? "";

  return (
    <div className="flex w-full flex-col items-center justify-center text-center animate-in fade-in-0 duration-1000">
      <div key={currentIndex} className="animate-in fade-in slide-in-from-bottom-8 duration-700">
        <blockquote
          className="text-outline scroll-m-20 text-4xl font-extrabold tracking-tight text-white lg:text-6xl italic leading-tight drop-shadow-xl max-w-4xl"
        >
          &ldquo;{quote}&rdquo;
        </blockquote>
        {author && (
          <cite
            className="text-outline mt-8 block text-xl font-semibold tracking-widest text-primary lg:text-3xl not-italic uppercase"
          >
            — {author}
          </cite>
        )}
      </div>
    </div>
  );
}

export function EmptyPlayer({ joinPartyUrl, className, messages }: Props) {
  const showSlideshow = messages.length > 0;

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center p-6 overflow-hidden transition-colors duration-1000 bg-gradient",
        className,
      )}
    >
      {/* Background Logo */}
      <div className="absolute inset-0 flex h-full w-full items-center justify-center opacity-20 pointer-events-none select-none">
        <Image
          src={logo}
          alt="My Karaoke Party"
          priority
          className="w-[60%] object-contain opacity-50 blur-sm"
        />
      </div>

      {/* Main Center Content */}
      <div className="z-10 flex h-full w-full flex-col items-center justify-center pb-20">
          {showSlideshow ? (
            <Slideshow messages={messages} /> 
          ) : (
            <p className="text-outline text-4xl font-bold text-center text-white">
              Waiting for the host to start the party...
            </p>
          )}
      </div>
      
      {/* Bottom Left QR Code Section - Uses the new common component */}
      <PlayerQrCode joinPartyUrl={joinPartyUrl} className="bottom-20" />
    </div>
  );
}
