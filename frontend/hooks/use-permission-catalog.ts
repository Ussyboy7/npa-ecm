"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { PermissionPreset, RolePermission, RolePermissionCategory } from "@/lib/role-permissions";

export type CatalogPermission = {
  id: string;
  label: string;
  description?: string;
  category?: RolePermissionCategory;
};

type CatalogResponse = {
  permissions: CatalogPermission[];
  presets?: PermissionPreset[];
};

const toRolePermissions = (items: CatalogPermission[]): RolePermission[] =>
  items.map((item) => ({
    id: item.id,
    label: item.label,
    description: item.description ?? item.label,
    category: item.category ?? (item.id.startsWith("sidebar_") ? "sidebar" : "administration"),
  }));

export function usePermissionCatalog() {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [presets, setPresets] = useState<PermissionPreset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await apiFetch<CatalogResponse>(
          "/accounts/auth/permissions/catalog/",
        );
        if (!cancelled && Array.isArray(response.permissions) && response.permissions.length > 0) {
          setPermissions(toRolePermissions(response.permissions));
          setPresets(Array.isArray(response.presets) ? response.presets : []);
        }
      } catch {
        // Leave empty; role admin will show no catalog until backend is reachable.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { permissions, presets, loading };
}
