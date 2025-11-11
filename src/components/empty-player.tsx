import Image from "next/image";
import { QrCode } from "./qr-code";
import logo from "~/assets/my-karaoke-party-logo.png";
import { cn } from "~/lib/utils";
import { useEffect, useState } from "react"; // <-- ADDED

type Props = {
  joinPartyUrl: string;
  className?: string;
  idleMessages: string[]; // <-- ADDED
};

// --- START: NEW SLIDESHOW COMPONENT ---
function IdleSlideshow({ messages }: { messages: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return; // No need to cycle if 1 or 0 messages

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 7000); // 7-second slide duration

    return () => clearInterval(interval);
  }, [messages.length]);

  if (messages.length === 0) return null;

  // Parse "Quote -- Author" format
  const currentMessage = messages[currentIndex] ?? "";
  const parts = currentMessage.split(" -- ");
  const quote = parts[0] ?? "";
  const author = parts[1] ?? "";

  return (
    <div
      key={currentIndex} // Key change triggers animation
      className="flex w-full flex-col items-center justify-center text-center animate-in fade-in-0 duration-1000"
    >
      <blockquote className="text-outline scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
        &ldquo;{quote}&rdquo;
      </blockquote>
      {author && (
        <cite className="text-outline mt-4 text-2xl lg:text-3xl not-italic">
          - {author}
        </cite>
      )}
    </div>
  );
}
// --- END: NEW SLIDESHOW COMPONENT ---

export function EmptyPlayer({ joinPartyUrl, className, idleMessages }: Props) {
  const hasMessages = idleMessages.length > 0;

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center p-6",
        className,
      )}
    >
      {/* --- START: UPDATED LOGIC --- */}
      <div className="flex w-full basis-1/4 items-start justify-center">
        <Image
          src={logo}
          alt="My Karaoke Party"
          priority
          className="mx-auto object-contain max-h-[15vh] w-auto" // Smaller logo at top
        />
      </div>
      <div className="flex w-full basis-2/4 items-center justify-center px-4">
        {hasMessages ? (
          <IdleSlideshow messages={idleMessages} />
        ) : (
          <p className="text-outline text-3xl text-center">
            Waiting for the host to start the party...
          </p>
        )}
      </div>
      {/* --- END: UPDATED LOGIC --- */}
      
      <div className="relative flex w-full basis-1/4 items-end text-center">
        <QrCode url={joinPartyUrl} />
        <a
          href={joinPartyUrl}
          target="_blank"
          className="font-mono text-xl text-white pl-4"
        >
          {joinPartyUrl.split("//")[1]}
        </a>
      </div>
    </div>
  );
}
