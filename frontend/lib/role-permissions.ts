/**
 * Canonical permission types and helpers.
 * Permission keys, labels, and presets come from backend /accounts/auth/permissions/catalog/.
 */
export type RolePermissionCategory =
  | "correspondence"
  | "documents"
  | "administration"
  | "analytics"
  | "workflow"
  | "sidebar";

export interface RolePermission {
  id: string;
  label: string;
  description: string;
  category: RolePermissionCategory;
}

export interface PermissionPreset {
  name: string;
  description: string;
  permissions: Record<string, boolean>;
}

export function getPermissionsByCategory(permissions: RolePermission[]) {
  return permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<RolePermissionCategory, RolePermission[]>);
}

