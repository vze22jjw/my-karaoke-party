"use client";

import { cn } from "~/lib/utils";

type Props = {
  remainingTime: number; // Time in seconds
  className?: string;
  // --- THIS IS THE FIX (Req #1) ---
  message?: string;
  // --- END THE FIX ---
};

export function SongCountdownTimer({ remainingTime, className, message }: Props) {
  // Format the remaining seconds into a "M:SS" string
  const formatTime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return "0:00";
    const displayMinutes = Math.floor(totalSeconds / 60);
    const displaySeconds = totalSeconds % 60;
    return `${displayMinutes}:${displaySeconds < 10 ? '0' : ''}${displaySeconds}`;
  };

  return (
    // --- THIS IS THE FIX (Req #1) ---
    // The message is now prepended to the formatted time
    <span className={cn("font-mono text-xs", className)}>
      {message ? `${message} ${formatTime(remainingTime)}` : formatTime(remainingTime)}
    </span>
    // --- END THE FIX ---
  );
}
