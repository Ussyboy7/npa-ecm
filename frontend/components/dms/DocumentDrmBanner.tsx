"use client";

import { DocumentDrmRights } from "@/lib/drm-api";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

/** One-line DRM notice for narrow detail rails / status strips. */
export function DocumentDrmBanner({
  rights,
  className,
}: {
  rights?: DocumentDrmRights | null;
  className?: string;
}) {
  if (!rights?.policy_name) return null;

  const hint = rights.expired
    ? "Access expired"
    : rights.view_only
      ? "View only"
      : "Restricted";

  return (
    <div
      className={cn(
        "flex items-center gap-2 min-w-0 rounded-full px-2.5 py-1 text-[11px]",
        "bg-amber-500/10 text-amber-900 dark:text-amber-200",
        className,
      )}
      role="status"
      aria-live="polite"
      title={
        rights.watermark_text
          ? `${rights.policy_name} · Watermark: ${rights.watermark_text}`
          : rights.policy_name
      }
    >
      <Shield className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
      <span className="truncate font-medium">
        DRM · {rights.policy_name}
        <span className="font-normal text-muted-foreground"> · {hint}</span>
      </span>
    </div>
  );
}
