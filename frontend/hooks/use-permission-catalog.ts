"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { AVAILABLE_ROLE_PERMISSIONS, type RolePermission } from "@/lib/role-permissions";

export type CatalogPermission = {
  id: string;
  label: string;
};

const toRolePermissions = (items: CatalogPermission[]): RolePermission[] =>
  items.map((item) => {
    const known = AVAILABLE_ROLE_PERMISSIONS.find((p) => p.id === item.id);
    return (
      known ?? {
        id: item.id,
        label: item.label,
        description: item.label,
        category: item.id.startsWith("sidebar_") ? "sidebar" : "administration",
      }
    );
  });

export function usePermissionCatalog() {
  const [permissions, setPermissions] = useState<RolePermission[]>(AVAILABLE_ROLE_PERMISSIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await apiFetch<{ permissions: CatalogPermission[] }>(
          "/accounts/auth/permissions/catalog/",
        );
        if (!cancelled && Array.isArray(response.permissions) && response.permissions.length > 0) {
          setPermissions(toRolePermissions(response.permissions));
        }
      } catch {
        // Fall back to static catalog
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { permissions, loading };
}
