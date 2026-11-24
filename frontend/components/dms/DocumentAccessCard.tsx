"use client";

import { useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useOrganizationCatalogs } from "@/hooks/use-organization-catalogs";
import { useUserLookup } from "@/hooks/use-user-lookup";
import { apiFetch } from "@/lib/api/dms";
import { logError } from "@/lib/client-logger";
import { toast } from "@/components/ui/sonner";
import { Building2, Circle, Loader2, Plus, Trash2, Users } from "lucide-react";
import type { DocumentPermission, DocumentRecord, PermissionAccess } from "@/lib/api/dms";
import type { User } from "@/lib/npa-structure";

interface DocumentAccessCardProps {
  document: DocumentRecord;
  /** False hides the level and revoke controls. */
  canManage?: boolean;
  onAddPeople?: () => void;
  /** Re-fetch the document after an access change so every view stays in sync. */
  onChanged?: () => unknown;
}

const ACCESS_LEVELS: { value: PermissionAccess; label: string }[] = [
  { value: "read", label: "Read" },
  { value: "write", label: "Write" },
  { value: "admin", label: "Admin" },
];

function initialsForName(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

interface GrantLookups {
  users: Map<string, User>;
  officeNames: Map<string, string>;
  divisionNames: Map<string, string>;
  departmentNames: Map<string, string>;
  directorateNames: Map<string, string>;
}

/** What a grant covers, in the reader's words rather than the model's. */
function describeGrant(
  permission: DocumentPermission,
  lookups: GrantLookups,
): { title: string; subtitle?: string; isGroup: boolean } {
  const people = permission.userIds.map((id) => lookups.users.get(id));
  const groups = [
    ...(permission.officeIds ?? []).map(
      (id) => `Everyone in ${lookups.officeNames.get(id) ?? "an office"}`,
    ),
    ...permission.divisionIds.map(
      (id) => `Everyone in ${lookups.divisionNames.get(id) ?? "a division"}`,
    ),
    ...permission.departmentIds.map(
      (id) => `Everyone in ${lookups.departmentNames.get(id) ?? "a department"}`,
    ),
    ...permission.directorateIds.map(
      (id) => `Everyone in ${lookups.directorateNames.get(id) ?? "a directorate"}`,
    ),
    ...permission.gradeLevels.map((grade) => `Everyone on grade ${grade}`),
  ];

  if (groups.length > 0) {
    return {
      title: groups[0],
      subtitle: groups.length > 1 ? `+${groups.length - 1} more group(s)` : undefined,
      isGroup: true,
    };
  }

  const names = people.map((user, index) => user?.name ?? `Person ${index + 1}`);
  if (names.length === 1) {
    return { title: names[0], subtitle: people[0]?.email, isGroup: false };
  }
  return {
    title: `${names[0]} +${names.length - 1}`,
    subtitle: names.join(", "),
    isGroup: false,
  };
}

/**
 * Who can open this document, and at what level. Lives in the Details rail so
 * access is visible without opening the Share dialog, which only adds people.
 */
export function DocumentAccessCard({
  document,
  canManage = false,
  onAddPeople,
  onChanged,
}: DocumentAccessCardProps) {
  const { offices, divisions, departments, directorates } = useOrganizationCatalogs('offices', 'directorates', 'divisions', 'departments');
  const accessUserIds = useMemo(
    () => [
      ...(document.permissions ?? []).flatMap((permission) => permission.userIds),
      ...(document.activeEditors ?? [])
        .filter((editor) => !editor.userName)
        .map((editor) => editor.userId),
    ],
    [document.permissions, document.activeEditors],
  );
  const userLookup = useUserLookup(accessUserIds);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [permissionToRemove, setPermissionToRemove] = useState<DocumentPermission | null>(null);

  const lookups = useMemo<GrantLookups>(
    () => ({
      users: userLookup,
      officeNames: new Map(offices.map((office) => [office.id, office.name])),
      divisionNames: new Map(divisions.map((division) => [division.id, division.name])),
      departmentNames: new Map(departments.map((department) => [department.id, department.name])),
      directorateNames: new Map(directorates.map((directorate) => [directorate.id, directorate.name])),
    }),
    [userLookup, offices, divisions, departments, directorates],
  );

  const grants = useMemo(
    () =>
      (document.permissions ?? [])
        .filter((permission) => permission.id)
        .map((permission) => ({
          permission,
          ...describeGrant(permission, lookups),
        })),
    [document.permissions, lookups],
  );

  // Badge reports how many people/group rules can open the document, so a
  // single grant covering two people doesn't read as "1".
  const accessCount = useMemo(
    () =>
      (document.permissions ?? []).reduce(
        (total, permission) =>
          total +
          permission.userIds.length +
          (permission.officeIds?.length ?? 0) +
          permission.divisionIds.length +
          permission.departmentIds.length +
          permission.directorateIds.length +
          permission.gradeLevels.length,
        0,
      ),
    [document.permissions],
  );

  const editors = useMemo(
    () =>
      (document.activeEditors ?? [])
        .map((editor) => ({
          userId: editor.userId,
          name: editor.userName || userLookup.get(editor.userId)?.name || "Someone",
          initials: initialsForName(editor.userName || userLookup.get(editor.userId)?.name),
        })),
    [document.activeEditors, userLookup],
  );

  const changeLevel = async (permissionId: string, access: PermissionAccess) => {
    setPendingId(permissionId);
    try {
      await apiFetch(`/dms/permissions/${permissionId}/`, {
        method: "PATCH",
        body: JSON.stringify({ access }),
      });
      toast.success("Access level updated", { description: `Now ${access} access` });
      await onChanged?.();
    } catch (error: unknown) {
      logError("Failed to update permission", error);
      toast.error("Failed to update access level");
    } finally {
      setPendingId(null);
    }
  };

  const removePermission = async (permission: DocumentPermission) => {
    if (!permission.id) return;
    setPendingId(permission.id);
    try {
      await apiFetch(`/dms/permissions/${permission.id}/`, { method: "DELETE" });
      toast.success("Access removed", {
        description: "They can no longer open this document",
      });
      await onChanged?.();
    } catch (error: unknown) {
      logError("Failed to remove permission", error);
      toast.error("Failed to remove access");
    } finally {
      setPendingId(null);
      setPermissionToRemove(null);
    }
  };

  return (
    <div className="rounded-xl bg-muted/30 px-3 py-2.5 space-y-2.5 min-w-0">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <p className="text-[13px] font-semibold tracking-tight flex items-center gap-1.5 min-w-0 truncate">
          <Users className="h-3.5 w-3.5 text-primary shrink-0" />
          Access
          {accessCount > 0 ? (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] tabular-nums">
              {accessCount}
            </Badge>
          ) : null}
        </p>
        {canManage && onAddPeople && grants.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 shrink-0"
            onClick={onAddPeople}
          >
            <Plus className="h-3 w-3" />
            Add people
          </Button>
        ) : null}
      </div>

      {editors.length > 0 ? (
        <div className="flex items-center gap-1.5 min-w-0">
          <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 shrink-0" />
          <p className="text-[11px] text-muted-foreground truncate">
            {editors.length === 1
              ? `${editors[0].name} viewing`
              : `${editors.length} people viewing`}
          </p>
          <div className="flex -space-x-1.5 ml-auto shrink-0">
            {editors.slice(0, 3).map((editor) => (
              <Avatar key={editor.userId} className="h-5 w-5 border border-background">
                <AvatarFallback className="text-[9px]">{editor.initials}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
      ) : null}

      {grants.length === 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground leading-snug">
            Not shared. Only you and document admins can open it.
          </p>
          {canManage && onAddPeople ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs gap-1"
              onClick={onAddPeople}
            >
              <Plus className="h-3 w-3" />
              Add people
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-1">
          {grants.map(({ permission, title, subtitle, isGroup }) => {
            const permissionId = permission.id as string;
            const busy = pendingId === permissionId;
            const singleUser = permission.userIds[0];
            const singleUserName = singleUser ? lookups.users.get(singleUser)?.name : undefined;
            return (
              <li key={permissionId} className="flex items-center gap-2 min-w-0 rounded-lg px-1 py-1">
                {isGroup ? (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                  </div>
                ) : (
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback className="text-[10px]">
                      {singleUserName ? initialsForName(singleUserName) : "?"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-[12px] font-medium truncate">{title}</p>
                  {subtitle ? (
                    <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>
                  ) : null}
                </div>
                {canManage ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <Select
                      value={permission.access}
                      onValueChange={(value) =>
                        void changeLevel(permissionId, value as PermissionAccess)
                      }
                      disabled={busy}
                    >
                      <SelectTrigger className="h-6 w-[74px] px-1.5 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCESS_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value} className="text-xs">
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setPermissionToRemove(permission)}
                      disabled={busy}
                      aria-label={`Remove access for ${title}`}
                    >
                      {busy ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-[10px] h-4 shrink-0 capitalize">
                    {permission.access}
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog
        open={Boolean(permissionToRemove)}
        onOpenChange={(open) => {
          if (!open) setPermissionToRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this access?</AlertDialogTitle>
            <AlertDialogDescription>
              {permissionToRemove
                ? `${describeGrant(permissionToRemove, lookups).title} will no longer be able to open this document.`
                : ""}{" "}
              You can grant it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (permissionToRemove) void removePermission(permissionToRemove);
              }}
            >
              Remove access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
