"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

export type PermissionCheckResult = {
  permission: string;
  label: string;
  allowed: boolean;
  role_name: string;
  reason: string;
  suggestion?: string | null;
};

export function usePermissionCheck(permission: string, enabled = true) {
  const [result, setResult] = useState<PermissionCheckResult | null>(null);
  const [loading, setLoading] = useState(enabled);

  const refresh = useCallback(async () => {
    if (!enabled || !permission) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<PermissionCheckResult>(
        `/accounts/auth/permissions/check/?permission=${encodeURIComponent(permission)}`
      );
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, permission]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { result, loading, refresh };
}
