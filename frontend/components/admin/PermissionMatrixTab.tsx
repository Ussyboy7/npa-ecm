"use client";

import { useMemo, useState } from "react";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePermissionCatalog } from "@/hooks/use-permission-catalog";
import { getPermissionsByCategory } from "@/lib/role-permissions";
import { getPermissionProfile } from "@/lib/permissions";
import { PermissionDeniedCard } from "@/components/shared/PermissionDeniedCard";
import { toast } from "@/components/ui/sonner";
import { Grid3X3, Loader2, Search } from "lucide-react";

const MATRIX_CATEGORIES = [
  "correspondence",
  "documents",
  "workflow",
  "administration",
  "analytics",
] as const;

export function PermissionMatrixTab() {
  const { roles, updateRole, refreshOrganizationData } = useOrganization();
  const { currentUser } = useCurrentUser();
  const { permissions, loading: catalogLoading } = usePermissionCatalog();
  const [searchQuery, setSearchQuery] = useState("");
  const [savingCell, setSavingCell] = useState<string | null>(null);

  const profile = getPermissionProfile(currentUser ?? undefined);
  const canEdit = profile.canManageRoles || currentUser?.isSuperuser;

  const matrixPermissions = useMemo(() => {
    const byCategory = getPermissionsByCategory(
      permissions.filter((p) => MATRIX_CATEGORIES.includes(p.category as (typeof MATRIX_CATEGORIES)[number])),
    );
    const flat = MATRIX_CATEGORIES.flatMap((category) => byCategory[category] ?? []);
    if (!searchQuery.trim()) return flat;
    const q = searchQuery.toLowerCase();
    return flat.filter(
      (p) => p.label.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
    );
  }, [permissions, searchQuery]);

  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => a.name.localeCompare(b.name)),
    [roles],
  );

  const togglePermission = async (roleId: string, permissionId: string, enabled: boolean) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role || !canEdit) return;

    const cellKey = `${roleId}:${permissionId}`;
    setSavingCell(cellKey);
    try {
      const nextPermissions = {
        ...(role.permissions ?? {}),
        [permissionId]: enabled,
      };
      await updateRole(roleId, { permissions: nextPermissions });
      await refreshOrganizationData();
      toast.success("Permission updated", {
        description: `${role.name}: ${enabled ? "granted" : "revoked"} ${permissionId.replace(/_/g, " ")}`,
      });
    } catch (error) {
      toast.error("Update failed", {
        description: error instanceof Error ? error.message : "Could not update role permission",
      });
    } finally {
      setSavingCell(null);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canEdit && !profile.canManageUsers) {
    return (
      <PermissionDeniedCard
        title="Role Management Required"
        check={null}
        fallbackMessage="The permission matrix is available to users who can manage roles."
      />
    );
  }

  return (
    <ClientErrorBoundary>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Grid3X3 className="h-4 w-4" />
                Permission Matrix
              </CardTitle>
              <CardDescription className="mt-1">
                Cross-role view of action permissions (sidebar keys are edited per role in the role form).
              </CardDescription>
            </div>
            {!canEdit ? (
              <Badge variant="secondary">Read-only</Badge>
            ) : (
              <Badge variant="outline">Click cells to toggle</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter permissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          {catalogLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading permission catalog…
            </div>
          ) : (
            <ScrollArea className="w-full whitespace-nowrap rounded-md border">
              <div className="min-w-max">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="sticky left-0 z-10 bg-muted/95 px-3 py-2 text-left font-medium min-w-[220px]">
                        Permission
                      </th>
                      {sortedRoles.map((role) => (
                        <th
                          key={role.id}
                          className="px-2 py-2 text-center font-medium min-w-[100px] max-w-[120px]"
                          title={role.description ?? role.name}
                        >
                          <span className="line-clamp-2">{role.name}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixPermissions.map((permission) => (
                      <tr key={permission.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="sticky left-0 z-10 bg-background px-3 py-2 align-top">
                          <div className="font-medium">{permission.label}</div>
                          <div className="text-[10px] text-muted-foreground capitalize">
                            {permission.category}
                          </div>
                        </td>
                        {sortedRoles.map((role) => {
                          const enabled = Boolean(role.permissions?.[permission.id]);
                          const cellKey = `${role.id}:${permission.id}`;
                          const busy = savingCell === cellKey;
                          return (
                            <td key={role.id} className="px-2 py-2 text-center">
                              {canEdit ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  disabled={busy}
                                  onClick={() => void togglePermission(role.id, permission.id, !enabled)}
                                  aria-label={`${enabled ? "Revoke" : "Grant"} ${permission.label} for ${role.name}`}
                                >
                                  {busy ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Checkbox checked={enabled} className="pointer-events-none" />
                                  )}
                                </Button>
                              ) : (
                                <Checkbox checked={enabled} disabled className="mx-auto" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </ClientErrorBoundary>
  );
}
