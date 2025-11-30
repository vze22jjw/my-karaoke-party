"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";

interface FitTextProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string; // NEW: Allows overriding origin
}

export function FitText({ children, className, contentClassName }: FitTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let frameId: number;

    const calculateScale = () => {
      const container = containerRef.current;
      const text = textRef.current;
      if (!container || !text) return;

      const containerWidth = container.offsetWidth;
      const textWidth = text.offsetWidth;

      if (textWidth > containerWidth && textWidth > 0) {
        // Add a tiny buffer (0.98) to prevent edge clipping
        setScale((containerWidth / textWidth) * 0.98);
      } else {
        setScale(1);
      }
    };

    const onResize = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(calculateScale);
    };

    // Initial calc
    onResize();

    const observer = new ResizeObserver(onResize);
    if (containerRef.current) observer.observe(containerRef.current);
    if (textRef.current) observer.observe(textRef.current);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [children]);

  return (
    <div
      ref={containerRef}
      className={cn("w-full flex justify-center items-center overflow-hidden", className)}
      aria-label={typeof children === "string" ? children : undefined}
    >
      <span
        ref={textRef}
        className={cn("whitespace-nowrap origin-center transition-transform duration-200 ease-out", contentClassName)}
        style={{ transform: `scale(${scale})`, display: 'inline-block' }}
      >
        {children}
      </span>
    </div>
  );
}
