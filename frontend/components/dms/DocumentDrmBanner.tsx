"use client";

import { DocumentDrmRights } from "@/lib/drm-api";
import { Shield } from "lucide-react";

export function DocumentDrmBanner({ rights }: { rights?: DocumentDrmRights | null }) {
  if (!rights?.policy_name) return null;

  return (
    <div
      className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs space-y-1"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
        <Shield className="h-3.5 w-3.5" aria-hidden="true" />
        DRM: {rights.policy_name}
      </div>
      {rights.expired ? (
        <p className="text-muted-foreground">Access expired under policy.</p>
      ) : (
        <p className="text-muted-foreground">
          {rights.view_only ? "View only — download and print disabled." : "Restricted sharing may apply."}
          {rights.watermark_text ? ` Watermark: ${rights.watermark_text}` : ""}
        </p>
      )}
    </div>
  );
}
