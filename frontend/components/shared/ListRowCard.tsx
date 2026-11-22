import Link from "next/link";
import React, { type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  correspondenceQueueInnerGapClass,
  correspondenceQueueShellClass,
  registryQueueRowInnerGapClass,
  registryQueueRowShellClass,
} from "@/components/shared/registry-queue-styles";

/** @deprecated Use registryQueueRowShellClass from registry-queue-styles */
export const listRowCardShellClass = registryQueueRowShellClass;

type ListRowCardProps = {
  leading: ReactNode;
  children: ReactNode;
  className?: string;
  href?: string;
  /** Select row without navigation (e.g. preview panel). Avoid wrapping the card in `<button>`. */
  onRowClick?: () => void;
  /** Right column (e.g. View); not part of the main link. Multiple actions sit side by side. */
  actions?: ReactNode;
  /** Full-width row below main content (e.g. sent-list actions). */
  footer?: ReactNode;
  /** Padding and spacing. Defaults to compact (p-3) for consistent queue views. */
  density?: "default" | "compact" | "dense";
  /** Marks a clickable row as the current selection (aria-current). */
  selected?: boolean;
};

/**
 * List row with optional full-row link, link + footer, or link + trailing actions.
 */
const ListRowCard_ = ({
  leading,
  children,
  href,
  onRowClick,
  actions,
  footer,
  className,
  density = "compact",
  selected = false,
}: ListRowCardProps) => {
  const shell =
    density === "dense"
      ? "rounded-lg border border-border/60 bg-card px-2.5 py-1.5 transition-colors hover:bg-muted/40"
      : density === "compact"
        ? correspondenceQueueShellClass
        : registryQueueRowShellClass;
  const rowGap =
    density === "compact"
      ? correspondenceQueueInnerGapClass
      : density === "dense"
        ? "gap-2"
        : registryQueueRowInnerGapClass;
  const footerDivider =
    density === "dense"
      ? "mt-1.5 border-t border-border/80 pt-1.5"
      : density === "compact"
        ? "mt-2 border-t border-border/80 pt-2"
        : "mt-3 border-t border-border pt-3";

  const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onRowClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick();
    }
  };

  const rowClickableProps = onRowClick
    ? {
        role: "button" as const,
        tabIndex: 0,
        className: "min-w-0 flex-1 cursor-pointer text-left",
        onClick: onRowClick,
        onKeyDown: handleRowKeyDown,
        "aria-current": selected ? ("true" as const) : undefined,
      }
    : { className: "min-w-0 flex-1" };

  if (href && !actions && !footer && !onRowClick) {
    return (
      <Link
        href={href}
        className={cn(shell, "block cursor-pointer", className)}
      >
        <div className={cn("flex items-start", rowGap)}>
          {leading}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </Link>
    );
  }

  if (href && footer && !actions) {
    return (
      <div className={cn(shell, className)}>
        <Link href={href} className="block cursor-pointer">
          <div className={cn("flex items-start", rowGap)}>
            {leading}
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </Link>
        <div className={footerDivider}>{footer}</div>
      </div>
    );
  }

  if (onRowClick && !href && !actions && !footer) {
    return (
      <div
        className={cn(shell, "cursor-pointer", className)}
        role="button"
        tabIndex={0}
        onClick={onRowClick}
        onKeyDown={handleRowKeyDown}
        aria-current={selected ? "true" : undefined}
      >
        <div className={cn("flex items-start", rowGap)}>
          {leading}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(shell, className)}>
      <div className={cn("flex items-start", rowGap)}>
        {leading}
        <div className={cn("flex min-w-0 flex-1 items-start", rowGap)}>
          {href ? (
            <Link href={href} className="min-w-0 flex-1 cursor-pointer">
              {children}
            </Link>
          ) : onRowClick ? (
            <div {...rowClickableProps}>{children}</div>
          ) : (
            <div className="min-w-0 flex-1">{children}</div>
          )}
          {actions ? (
            <div
              className={cn(
                "flex shrink-0 flex-row flex-wrap items-start self-start pt-0.5",
                density === "compact" || density === "dense" ? "gap-0.5" : "gap-2",
              )}
            >
              {actions}
            </div>
          ) : null}
        </div>
      </div>
      {footer ? <div className={footerDivider}>{footer}</div> : null}
    </div>
  );
}

export const ListRowCard = React.memo(ListRowCard_);
