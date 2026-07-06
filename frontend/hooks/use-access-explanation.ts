"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { PermissionCheckResult } from "@/hooks/use-permission-check";

export type AccessContext = "document_view" | "correspondence_view";

export function useAccessExplanation(context: AccessContext | null, enabled: boolean) {
  const [result, setResult] = useState<PermissionCheckResult | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !context) {
      setResult(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<PermissionCheckResult>(
        `/accounts/auth/permissions/explain-access/?context=${encodeURIComponent(context)}`,
      );
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [context, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { result, loading, refresh };
}
