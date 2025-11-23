"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";

interface FitTextProps {
  children: React.ReactNode;
  className?: string;
}

export function FitText({ children, className }: FitTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const calculateScale = () => {
      const container = containerRef.current;
      const text = textRef.current;
      if (!container || !text) return;

      const containerWidth = container.offsetWidth;
      // We reset scale to 1 temporarily or rely on offsetWidth being unscaled layout width?
      // offsetWidth usually reports layout width (ignoring transform).
      // However, to be safe and handle updates correctly:
      const textWidth = text.offsetWidth;

      if (textWidth > containerWidth && textWidth > 0) {
        // Add a tiny buffer (0.98) to prevent edge clipping
        setScale((containerWidth / textWidth) * 0.98);
      } else {
        setScale(1);
      }
    };

    // Initial calc
    requestAnimationFrame(calculateScale);

    const observer = new ResizeObserver(calculateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    if (textRef.current) observer.observe(textRef.current);

    return () => observer.disconnect();
  }, [children]);

  return (
    <div
      ref={containerRef}
      className={cn("w-full flex justify-center items-center overflow-hidden", className)}
      aria-label={typeof children === "string" ? children : undefined}
    >
      <span
        ref={textRef}
        className="whitespace-nowrap origin-center transition-transform duration-200 ease-out"
        style={{ transform: `scale(${scale})`, display: 'inline-block' }}
      >
        {children}
      </span>
    </div>
  );
}
