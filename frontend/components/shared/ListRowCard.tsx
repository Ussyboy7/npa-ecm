import Link from "next/link";
import type { KeyboardEvent, ReactNode } from "react";
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
  /** Right column (e.g. View); not part of the main link. */
  actions?: ReactNode;
  /** Full-width row below main content (e.g. outbox actions). */
  footer?: ReactNode;
  /** Tighter padding and gaps (office correspondence lists). */
  density?: "default" | "compact";
};

/**
 * List row with optional full-row link, link + footer, or link + trailing actions.
 */
export function ListRowCard({
  leading,
  children,
  href,
  onRowClick,
  actions,
  footer,
  className,
  density = "default",
}: ListRowCardProps) {
  const shell =
    density === "compact"
      ? correspondenceQueueShellClass
      : registryQueueRowShellClass;
  const rowGap =
    density === "compact"
      ? correspondenceQueueInnerGapClass
      : registryQueueRowInnerGapClass;
  const footerDivider =
    density === "compact"
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
                "flex shrink-0 flex-col self-start pt-0.5",
                density === "compact" ? "gap-0.5" : "gap-2",
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
