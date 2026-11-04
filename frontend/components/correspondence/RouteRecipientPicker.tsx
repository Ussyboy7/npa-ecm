"use client";

import { useMemo, useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  User as UserIcon,
  FileText,
  CheckCircle,
  Search,
  X,
} from "lucide-react";
import type { User } from "@/lib/npa-structure";
import type { BranchConfig } from "@/lib/parallel-routing";
import { branchKey } from "@/lib/parallel-routing";
import type { RoutePurpose } from "@/components/correspondence/PrimaryRoutePanel";

export interface OfficePickerOption {
  id: string;
  name: string;
  officeType?: string;
  directorateId?: string;
  divisionId?: string;
}

interface RouteRecipientPickerProps {
  userIds: string[];
  officeIds: string[];
  onUserIdsChange: (ids: string[]) => void;
  onOfficeIdsChange: (ids: string[]) => void;
  users: User[];
  offices: OfficePickerOption[];
  directorates: Array<{ id: string; name: string; shortName?: string }>;
  divisions: Array<{ id: string; name: string; shortName?: string; directorateId?: string }>;
  defaultPurpose: RoutePurpose;
  purposeOptions?: RoutePurpose[];
  /** CC mode — only information, no action/approval */
  informationOnly?: boolean;
  branchConfigs?: Record<string, BranchConfig>;
  onBranchConfigsChange?: (configs: Record<string, BranchConfig>) => void;
  defaultBranchText?: string;
  showPerRecipientEditor?: boolean;
  excludeUserId?: string;
  emptyMessage?: string;
}

const PURPOSE_LABELS: Record<RoutePurpose, string> = {
  action: "Action",
  information: "Information",
  approval: "Approval",
};

export function RouteRecipientPicker({
  userIds,
  officeIds,
  onUserIdsChange,
  onOfficeIdsChange,
  users,
  offices,
  directorates,
  divisions,
  defaultPurpose,
  purposeOptions = ["action", "information", "approval"],
  informationOnly = false,
  branchConfigs = {},
  onBranchConfigsChange,
  defaultBranchText = "",
  showPerRecipientEditor = false,
  excludeUserId,
  emptyMessage = "No recipients added yet.",
}: RouteRecipientPickerProps) {
  const [routeType, setRouteType] = useState<"person" | "office">("office");
  const [addPurpose, setAddPurpose] = useState<RoutePurpose>(
    informationOnly ? "information" : defaultPurpose,
  );
  const [personSearchQuery, setPersonSearchQuery] = useState("");
  const [officeFilterDirectorate, setOfficeFilterDirectorate] = useState("all");
  const [officeFilterDivision, setOfficeFilterDivision] = useState("all");

  useEffect(() => {
    if (!informationOnly) {
      setAddPurpose(defaultPurpose);
    }
  }, [defaultPurpose, informationOnly]);

  const selectedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const id of userIds) keys.add(branchKey("user", id));
    for (const id of officeIds) keys.add(branchKey("office", id));
    return keys;
  }, [userIds, officeIds]);

  const filteredOfficeDivisions = useMemo(() => {
    if (officeFilterDirectorate === "all") return divisions;
    return divisions.filter((d) => d.directorateId === officeFilterDirectorate);
  }, [divisions, officeFilterDirectorate]);

  const filteredOfficeOptions = useMemo(() => {
    let result = offices.filter((o) => !selectedKeys.has(branchKey("office", o.id)));
    if (officeFilterDirectorate !== "all") {
      result = result.filter((o) => o.directorateId === officeFilterDirectorate);
    }
    if (officeFilterDivision !== "all") {
      result = result.filter((o) => o.divisionId === officeFilterDivision);
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [offices, officeFilterDirectorate, officeFilterDivision, selectedKeys]);

  const filteredUsers = useMemo(() => {
    const base = users
      .filter((u) => u.active !== false && u.id !== excludeUserId)
      .filter((u) => !selectedKeys.has(branchKey("user", u.id)));
    if (!personSearchQuery.trim()) return base.sort((a, b) => a.name.localeCompare(b.name));
    const q = personSearchQuery.toLowerCase();
    return base
      .filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          (u.systemRole || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, excludeUserId, selectedKeys, personSearchQuery]);

  const syncBranchConfig = (key: string, purpose: RoutePurpose) => {
    if (!onBranchConfigsChange) return;
    onBranchConfigsChange({
      ...branchConfigs,
      [key]: {
        purpose,
        minuteText:
          branchConfigs[key]?.minuteText ||
          defaultBranchText ||
          "Please review and respond.",
      },
    });
  };

  const handleAddUser = (userId: string) => {
    if (userIds.includes(userId)) return;
    const purpose = informationOnly ? "information" : addPurpose;
    onUserIdsChange([...userIds, userId]);
    syncBranchConfig(branchKey("user", userId), purpose);
  };

  const handleAddOffice = (officeId: string) => {
    if (officeIds.includes(officeId)) return;
    const purpose = informationOnly ? "information" : addPurpose;
    onOfficeIdsChange([...officeIds, officeId]);
    syncBranchConfig(branchKey("office", officeId), purpose);
  };

  const handleRemoveUser = (userId: string) => {
    onUserIdsChange(userIds.filter((id) => id !== userId));
    if (onBranchConfigsChange) {
      const next = { ...branchConfigs };
      delete next[branchKey("user", userId)];
      onBranchConfigsChange(next);
    }
  };

  const handleRemoveOffice = (officeId: string) => {
    onOfficeIdsChange(officeIds.filter((id) => id !== officeId));
    if (onBranchConfigsChange) {
      const next = { ...branchConfigs };
      delete next[branchKey("office", officeId)];
      onBranchConfigsChange(next);
    }
  };

  const updateBranchConfig = (key: string, patch: Partial<BranchConfig>) => {
    if (!onBranchConfigsChange) return;
    const current = branchConfigs[key] ?? {
      purpose: defaultPurpose,
      minuteText: defaultBranchText || "Please review and respond.",
    };
    onBranchConfigsChange({ ...branchConfigs, [key]: { ...current, ...patch } });
  };

  const selectedRecipients = useMemo(() => {
    const items: Array<{
      key: string;
      type: "user" | "office";
      id: string;
      name: string;
      meta?: string;
    }> = [];
    for (const userId of userIds) {
      const user = users.find((u) => u.id === userId);
      items.push({
        key: branchKey("user", userId),
        type: "user",
        id: userId,
        name: user?.name ?? "Person",
        meta: user?.systemRole,
      });
    }
    for (const officeId of officeIds) {
      const office = offices.find((o) => o.id === officeId);
      items.push({
        key: branchKey("office", officeId),
        type: "office",
        id: officeId,
        name: office?.name ?? "Office",
        meta: office?.officeType,
      });
    }
    return items;
  }, [userIds, officeIds, users, offices]);

  const effectivePurposeOptions = informationOnly ? (["information"] as RoutePurpose[]) : purposeOptions;

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Route Type</Label>
            <Select value={routeType} onValueChange={(v) => setRouteType(v as "person" | "office")}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="person">Person</SelectItem>
                <SelectItem value="office">Office</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              {routeType === "office" ? (
                <>
                  <Building2 className="h-3 w-3" /> Office
                </>
              ) : (
                <>
                  <UserIcon className="h-3 w-3" /> Person
                </>
              )}
            </Label>
            {routeType === "office" ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={officeFilterDirectorate}
                    onValueChange={(v) => {
                      setOfficeFilterDirectorate(v);
                      setOfficeFilterDivision("all");
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Directorate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Directorates</SelectItem>
                      {directorates.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.shortName || d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={officeFilterDivision} onValueChange={setOfficeFilterDivision}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Division" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Divisions</SelectItem>
                      {filteredOfficeDivisions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.shortName || d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Select onValueChange={handleAddOffice}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select office" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {filteredOfficeOptions.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">No offices found</div>
                    ) : (
                      filteredOfficeOptions.map((office) => (
                        <SelectItem key={office.id} value={office.id}>
                          <div className="flex w-full items-center justify-between gap-2">
                            <span>{office.name}</span>
                            <span className="text-[10px] uppercase text-muted-foreground">
                              {office.officeType}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <Select onValueChange={handleAddUser}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent className="z-50 max-h-[400px] overflow-y-auto bg-popover">
                  <div className="sticky top-0 z-10 border-b border-border bg-popover p-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, role..."
                        value={personSearchQuery}
                        onChange={(e) => setPersonSearchQuery(e.target.value)}
                        className="h-8 pl-8"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  {filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">No recipients available</div>
                  ) : (
                    filteredUsers.slice(0, 40).map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex flex-col">
                          <span>{user.name}</span>
                          <span className="text-xs text-muted-foreground">{user.systemRole}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {!informationOnly && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" /> Purpose
              </Label>
              <Select
                value={addPurpose}
                onValueChange={(v) => setAddPurpose(v as RoutePurpose)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {effectivePurposeOptions.includes("action") && (
                    <SelectItem value="action">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-warning" />
                        For Action
                      </div>
                    </SelectItem>
                  )}
                  {effectivePurposeOptions.includes("information") && (
                    <SelectItem value="information">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-info" />
                        For Information
                      </div>
                    </SelectItem>
                  )}
                  {effectivePurposeOptions.includes("approval") && (
                    <SelectItem value="approval">For Approval</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {selectedRecipients.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Selected Recipients ({selectedRecipients.length})
          </Label>
          <div className="space-y-2">
            {selectedRecipients.map((recipient) => {
              const cfg = branchConfigs[recipient.key] ?? {
                purpose: informationOnly ? "information" : defaultPurpose,
                minuteText: defaultBranchText || "Please review and respond.",
              };
              const purposeLabel = PURPOSE_LABELS[cfg.purpose] ?? cfg.purpose;
              return (
                <div
                  key={recipient.key}
                  className="rounded-xl border border-border/60 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      {recipient.type === "user" ? (
                        <UserIcon className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <Building2 className="h-4 w-4 shrink-0 text-primary" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{recipient.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {recipient.meta ? `${recipient.type} • ${recipient.meta}` : recipient.type}
                        </p>
                      </div>
                      {showPerRecipientEditor && onBranchConfigsChange ? (
                        <Select
                          value={cfg.purpose}
                          onValueChange={(v) =>
                            updateBranchConfig(recipient.key, { purpose: v as RoutePurpose })
                          }
                        >
                          <SelectTrigger className="h-7 w-[120px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {effectivePurposeOptions.map((p) => (
                              <SelectItem key={p} value={p}>
                                {PURPOSE_LABELS[p]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {purposeLabel}
                        </Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        recipient.type === "user"
                          ? handleRemoveUser(recipient.id)
                          : handleRemoveOffice(recipient.id)
                      }
                      aria-label={`Remove ${recipient.name}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {showPerRecipientEditor && onBranchConfigsChange && (
                    <Textarea
                      value={cfg.minuteText}
                      onChange={(e) =>
                        updateBranchConfig(recipient.key, { minuteText: e.target.value })
                      }
                      rows={2}
                      className="resize-none text-xs"
                      placeholder="Branch-specific instruction..."
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 p-4 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
