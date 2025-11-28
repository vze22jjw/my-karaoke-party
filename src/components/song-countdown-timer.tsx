"use client";

import { cn } from "~/lib/utils";
import { memo } from "react";

type Props = {
  remainingTime: number;
  className?: string;
  message?: string;
};

export const SongCountdownTimer = memo(function SongCountdownTimer({ remainingTime, className, message }: Props) {
  const formatTime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return "0:00";
    const displayMinutes = Math.floor(totalSeconds / 60);
    const displaySeconds = totalSeconds % 60;
    return `${displayMinutes}:${displaySeconds < 10 ? '0' : ''}${displaySeconds}`;
  };

  return (
    <span className={cn("font-mono text-xs", className)}>
      {message ? `${message} ${formatTime(remainingTime)}` : formatTime(remainingTime)}
    </span>
  );
});
