"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Share2, Circle } from "lucide-react";
import type { DocumentRecord, DocumentPermission } from "@/lib/api/dms";
import type { User } from "@/lib/npa-structure";

interface CollaborationPanelProps {
  document: DocumentRecord;
  userLookup: Map<string, User>;
  divisionNameById?: Map<string, string>;
  departmentNameById?: Map<string, string>;
  onShare?: () => void;
  getUserInitials: (userId: string) => string;
}

type ShareTarget = {
  key: string;
  label: string;
  sub?: string;
  access: DocumentPermission["access"];
  kind: "user" | "division" | "department" | "grade";
};

function accessLabel(access: DocumentPermission["access"]): string {
  if (access === "admin") return "Admin";
  if (access === "write") return "Edit";
  return "View";
}

function collectTargets(
  permissions: DocumentPermission[],
  userLookup: Map<string, User>,
  divisionNameById?: Map<string, string>,
  departmentNameById?: Map<string, string>,
): ShareTarget[] {
  const targets: ShareTarget[] = [];
  const seen = new Set<string>();

  for (const perm of permissions) {
    for (const userId of perm.userIds) {
      const key = `user:${userId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const user = userLookup.get(userId);
      targets.push({
        key,
        label: user?.name || "Unknown user",
        sub: user?.email,
        access: perm.access,
        kind: "user",
      });
    }
    for (const divisionId of perm.divisionIds) {
      const key = `div:${divisionId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      targets.push({
        key,
        label: divisionNameById?.get(divisionId) || "Division",
        access: perm.access,
        kind: "division",
      });
    }
    for (const departmentId of perm.departmentIds) {
      const key = `dept:${departmentId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      targets.push({
        key,
        label: departmentNameById?.get(departmentId) || "Department",
        access: perm.access,
        kind: "department",
      });
    }
    for (const grade of perm.gradeLevels) {
      const key = `grade:${grade}`;
      if (seen.has(key)) continue;
      seen.add(key);
      targets.push({
        key,
        label: `Grade ${grade}`,
        access: perm.access,
        kind: "grade",
      });
    }
  }

  return targets;
}

/** Compact shared-with + presence for the document detail rail. */
export function CollaborationPanel({
  document,
  userLookup,
  divisionNameById,
  departmentNameById,
  onShare,
  getUserInitials,
}: CollaborationPanelProps) {
  const targets = useMemo(
    () =>
      collectTargets(
        document.permissions ?? [],
        userLookup,
        divisionNameById,
        departmentNameById,
      ),
    [document.permissions, userLookup, divisionNameById, departmentNameById],
  );

  const editors = useMemo(() => {
    return (document.activeEditors ?? [])
      .map((editor) => {
        const user = userLookup.get(editor.userId);
        return {
          userId: editor.userId,
          name: user?.name || "Someone",
          initials: getUserInitials(editor.userId),
        };
      })
      .filter((e) => e.userId);
  }, [document.activeEditors, userLookup, getUserInitials]);

  const preview = targets.slice(0, 6);
  const extra = targets.length - preview.length;

  return (
    <div className="rounded-xl bg-muted/30 px-3 py-2.5 space-y-2.5 min-w-0">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <p className="text-[13px] font-semibold tracking-tight flex items-center gap-1.5 min-w-0 truncate">
          <Users className="h-3.5 w-3.5 text-primary shrink-0" />
          Shared with
        </p>
        {onShare ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 shrink-0"
            onClick={onShare}
          >
            <Share2 className="h-3 w-3" />
            Share
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

      {preview.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Not shared yet.{onShare ? " Use Share to grant access." : ""}
        </p>
      ) : (
        <ul className="space-y-1">
          {preview.map((target) => (
            <li
              key={target.key}
              className="flex items-center gap-2 min-w-0 rounded-lg px-1 py-1"
            >
              {target.kind === "user" ? (
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className="text-[10px]">
                    {getUserInitials(target.key.replace("user:", ""))}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Users className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="text-[12px] font-medium truncate">{target.label}</p>
                {target.sub ? (
                  <p className="text-[10px] text-muted-foreground truncate">{target.sub}</p>
                ) : null}
              </div>
              <Badge variant="outline" className="text-[10px] h-4 shrink-0">
                {accessLabel(target.access)}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      {extra > 0 ? (
        <p className="text-[11px] text-muted-foreground px-1">
          +{extra} more{onShare ? " · open Share to manage" : ""}
        </p>
      ) : null}
    </div>
  );
}
