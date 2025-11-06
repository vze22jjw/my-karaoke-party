"use client";

import { cn } from "~/lib/utils";

type Props = {
  remainingTime: number; // Time in seconds
  className?: string;
};

export function SongCountdownTimer({ remainingTime, className }: Props) {
  // Format the remaining seconds into a "M:SS" string
  const formatTime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return "0:00";
    const displayMinutes = Math.floor(totalSeconds / 60);
    const displaySeconds = totalSeconds % 60;
    return `${displayMinutes}:${displaySeconds < 10 ? '0' : ''}${displaySeconds}`;
  };

  // --- THIS IS THE FIX ---
  // Removed the parentheses from the return statement
  return (
    <span className={cn("font-mono text-xs", className)}>
      {formatTime(remainingTime)}
    </span>
  );
  // --- END THE FIX ---
}