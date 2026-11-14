"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatusStripSep() {
  return (
    <span className="text-muted-foreground/40 shrink-0" aria-hidden>
      ·
    </span>
  );
}

interface DetailStatusStripProps {
  children: ReactNode;
  className?: string;
  /** Optional second row (avoid for org names — prefer inline scroll). */
  footer?: ReactNode;
  /** Accessible name for the scrollable metadata row. */
  ariaLabel?: string;
}

/**
 * One-line horizontal status strip: badges + meta, scrolls when long.
 * Used under detail headers (correspondence, DMS, cases, FOIA).
 */
export function DetailStatusStrip({
  children,
  className,
  footer,
  ariaLabel = "Details",
}: DetailStatusStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      setHasOverflow(el.scrollWidth - el.clientWidth > 1);
    };
    update();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div
      className={cn(
        "w-full min-w-0 px-4 md:px-6 py-1.5 bg-muted/20 border-b border-border/50",
        className,
      )}
    >
      <div
        ref={scrollRef}
        role="group"
        aria-label={ariaLabel}
        tabIndex={0}
        className={cn(
          "flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto scrollbar-none min-w-0 rounded-sm outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          // Fade the right edge so clipped metadata is visibly scrollable.
          hasOverflow && "[mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)]",
        )}
      >
        {children}
      </div>
      {footer}
    </div>
  );
}
