"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedOption<T>[];
  ariaLabel: string;
  /** primary = main choice (blue pill); quiet = secondary choice (surface pill) */
  tone?: "primary" | "quiet";
  size?: "sm" | "md";
  className?: string;
}

/**
 * One-choice control in the style of the correspondence tab pills. Used for
 * choices that used to be dropdowns, so the options stay visible.
 */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  ariaLabel,
  tone = "primary",
  size = "md",
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("grid gap-1 rounded-full bg-muted/50 p-1", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap",
              "transition-[background-color,color,box-shadow] duration-150 motion-reduce:transition-none",
              "active:scale-[0.98] motion-reduce:active:scale-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              size === "sm" ? "h-7 px-2 text-[11px]" : "h-9 px-3 text-[13px]",
              active
                ? tone === "primary"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
