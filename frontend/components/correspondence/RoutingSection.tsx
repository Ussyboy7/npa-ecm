"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OfficeCombobox, officeTypeLabel } from "@/components/correspondence/OfficeCombobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Send,
  User as UserIcon,
  Building2,
  FileText,
  CheckCircle,
  AlertCircle,
  Search,
  X,
} from "lucide-react";
import type { User } from "@/lib/npa-structure";

interface RoutingSectionProps {
  /** Rendered inside a parent route card; keeps the fields, drops the extra surface. */
  embedded?: boolean;
  // Route type (person or office)
  routeType: "person" | "office";
  onRouteTypeChange: (type: "person" | "office") => void;

  // Person routing
  forwardTo: string;
  onForwardToChange: (userId: string) => void;
  forwardToError?: string;
  personSearchQuery: string;
  onPersonSearchQueryChange: (query: string) => void;

  // Office routing
  targetOfficeId: string;
  onTargetOfficeIdChange: (officeId: string) => void;
  officeSearchQuery: string;
  onOfficeSearchQueryChange: (query: string) => void;
  officeFilterDirectorate: string;
  onOfficeFilterDirectorateChange: (directorateId: string) => void;
  officeFilterDivision: string;
  onOfficeFilterDivisionChange: (divisionId: string) => void;

  // Purpose
  purpose: "action" | "information" | "approval";
  onPurposeChange: (purpose: "action" | "information" | "approval") => void;
  /**
   * `segmented` asks for action/info/approval explicitly. `information-toggle`
   * keeps the default (action) implicit and offers one "for information only" checkbox.
   */
  purposeControl?: "segmented" | "information-toggle";
  /** Formal approval has its own flow; omit it where that flow is the right entry point. */
  allowApproval?: boolean;

  // Data
  offices: Array<{ id: string; name: string; officeType?: string; directorateId?: string; divisionId?: string }>;
  directorates: Array<{ id: string; name: string; shortName?: string }>;
  divisions: Array<{ id: string; name: string; shortName?: string; directorateId?: string }>;
  assistantList: User[];
  approverList: User[];
  suggestedNext?: User;

  // Helpers
  findUserById: (id: string) => User | undefined;
  getUserOfficeInfo: (userId: string) => { office?: { name: string }; division?: { name: string } } | null;
}

// The control is already labelled "Recipient action", so each option names the
// action directly instead of repeating "For …" three times.
const PURPOSE_OPTIONS = [
  { value: "action" as const, label: "Action" },
  { value: "information" as const, label: "Information" },
  { value: "approval" as const, label: "Approval" },
];

export const RoutingSection = ({
  embedded = false,
  routeType,
  onRouteTypeChange,
  forwardTo,
  onForwardToChange,
  forwardToError,
  personSearchQuery,
  onPersonSearchQueryChange,
  targetOfficeId,
  onTargetOfficeIdChange,
  purpose,
  onPurposeChange,
  purposeControl = "segmented",
  allowApproval = true,
  offices,
  assistantList,
  approverList,
  suggestedNext,
  findUserById,
  getUserOfficeInfo,
}: RoutingSectionProps) => {
  // Filtered users for person search
  const filteredUsers = useMemo(() => {
    if (!personSearchQuery.trim()) return approverList;
    const query = personSearchQuery.toLowerCase();
    return approverList.filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.systemRole?.toLowerCase().includes(query) ||
      user.gradeLevel?.toLowerCase().includes(query)
    );
  }, [approverList, personSearchQuery]);

  const recipientUser = forwardTo ? findUserById(forwardTo) : undefined;
  const recipientInfo = forwardTo ? getUserOfficeInfo(forwardTo) : null;
  const selectedOffice = targetOfficeId ? offices.find(o => o.id === targetOfficeId) : undefined;
  // Only the active route type counts as a destination. A leftover selection
  // from the other tab must not show a card or satisfy the route requirement.
  const activeRecipient = routeType === "office" ? targetOfficeId : forwardTo;
  const hasRecipient = Boolean(activeRecipient);
  const purposeOptions = allowApproval
    ? PURPOSE_OPTIONS
    : PURPOSE_OPTIONS.filter((option) => option.value !== "approval");

  return (
    <div className="space-y-4">
      {/* Section header */}
      {!embedded && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
              <Send className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            </span>
            <div>
              <Label className="text-sm font-semibold">Route to *</Label>
              <p className="text-[11px] text-muted-foreground">Where this minute goes next.</p>
            </div>
          </div>
          <Badge
            variant={hasRecipient ? "default" : "outline"}
            className="rounded-full text-[11px] font-normal"
          >
            {!hasRecipient
              ? "No recipient yet"
              : routeType === "office"
                ? "1 office"
                : "1 person"}
          </Badge>
        </div>
      )}

      {forwardToError && (
        <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {forwardToError}
        </p>
      )}

      <div
        className={
          embedded
            ? "space-y-4"
            : "space-y-4 rounded-2xl border border-border/60 bg-muted/20 p-4"
        }
      >
        {/* Person or office */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Send to</Label>
          <SegmentedControl
            ariaLabel="Route type"
            value={routeType}
            onValueChange={(v: "person" | "office") => {
              onRouteTypeChange(v);
              if (v === "office") {
                onForwardToChange("");
                onPersonSearchQueryChange("");
              } else {
                onTargetOfficeIdChange("");
              }
            }}
            tone="quiet"
            size="sm"
            options={[
              { value: "person", label: "Person", icon: UserIcon },
              { value: "office", label: "Office", icon: Building2 },
            ]}
          />
        </div>

        {/* Recipient picker */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1 text-xs text-muted-foreground">
            {routeType === "office" ? (
              <Building2 className="h-3 w-3" aria-hidden="true" />
            ) : (
              <UserIcon className="h-3 w-3" aria-hidden="true" />
            )}
            {routeType === "office" ? "Office inbox" : "Recipient"}
          </Label>
          {routeType === "office" ? (
            <OfficeCombobox
              offices={offices}
              value={targetOfficeId}
              onSelect={(officeId) => {
                onTargetOfficeIdChange(officeId);
                onForwardToChange("");
              }}
              placeholder="Select office"
              emptyMessage="No offices found"
              ariaInvalid={Boolean(forwardToError)}
              className="h-10"
            />
          ) : (
            <Select
              value={forwardTo}
              onValueChange={(v) => {
                onForwardToChange(v);
              }}
            >
              <SelectTrigger
                className={`h-10 rounded-xl bg-background ${forwardToError ? "border-destructive" : ""}`}
                aria-label="Recipient"
              >
                <SelectValue placeholder="Select person" />
              </SelectTrigger>
              <SelectContent className="z-50 max-h-[400px] overflow-y-auto border-border bg-popover">
                {/* Search Input */}
                <div className="sticky top-0 z-10 border-b border-border bg-popover p-2">
                  <div className="relative">
                    <Search
                      className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      placeholder="Search by name, role..."
                      value={personSearchQuery}
                      onChange={(e) => onPersonSearchQueryChange(e.target.value)}
                      className="h-8 pl-8"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>

                {assistantList.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-primary">
                      Assistants ({assistantList.length})
                    </div>
                    {assistantList.map((user) => {
                      const userInfo = getUserOfficeInfo(user.id);
                      return (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {user.systemRole}
                              {userInfo?.office && ` • ${userInfo.office.name}`}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                    <Separator className="my-1" />
                  </>
                )}

                {suggestedNext && !personSearchQuery.trim() && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-success">
                      Suggested next
                    </div>
                    <SelectItem value={suggestedNext.id}>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 shrink-0 text-success" aria-hidden="true" />
                        <div className="flex flex-col">
                          <span className="font-medium">{suggestedNext.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {suggestedNext.systemRole} • {suggestedNext.gradeLevel}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                    <Separator className="my-1" />
                  </>
                )}

                {filteredUsers.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      All recipients ({filteredUsers.length})
                    </div>
                    {filteredUsers.slice(0, 30).map(user => {
                      const userInfo = getUserOfficeInfo(user.id);
                      return (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex flex-col">
                            <span>{user.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {user.systemRole}
                              {userInfo?.division && ` • ${userInfo.division.name}`}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </>
                )}

                {filteredUsers.length === 0 && assistantList.length === 0 && !suggestedNext && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No recipients available
                  </div>
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* What the recipient should do */}
        <div className="space-y-2">
          {purposeControl === "information-toggle" ? (
            <>
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="route-information-only"
                  checked={purpose === "information"}
                  onCheckedChange={(checked) =>
                    onPurposeChange(checked === true ? "information" : "action")
                  }
                  className="mt-0.5"
                  aria-label="Send for information only"
                />
                <div className="space-y-0.5">
                  <Label
                    htmlFor="route-information-only"
                    className="cursor-pointer text-[13px] font-normal"
                  >
                    Send for information only
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {purpose === "information"
                      ? "Shared for awareness; no response is expected."
                      : "The recipient is expected to act and respond."}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" aria-hidden="true" />
                Recipient action
              </Label>
              <SegmentedControl
                ariaLabel="Recipient action"
                value={purpose}
                onValueChange={onPurposeChange}
                tone="quiet"
                options={purposeOptions}
              />
              <p className="text-[11px] text-muted-foreground">
                {purpose === "approval"
                  ? "The recipient is expected to approve."
                  : purpose === "action"
                    ? "The recipient is expected to act and respond."
                    : "Shared for awareness; no response is expected."}
              </p>
            </>
          )}
        </div>

        {/* Chosen destination — compact confirmation, not a second picker */}
        {hasRecipient && (
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
              {routeType === "office" ? (
                <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
              ) : (
                <UserIcon className="h-4 w-4 text-primary" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {routeType === "office"
                  ? selectedOffice?.name ?? "Selected office"
                  : recipientUser?.name ?? "Selected person"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {routeType === "office"
                  ? [officeTypeLabel(selectedOffice?.officeType), "Office inbox"]
                      .filter(Boolean)
                      .join(" · ")
                  : [recipientUser?.systemRole, recipientInfo?.office?.name].filter(Boolean).join(" · ")}
              </p>
            </div>
            <Badge variant="outline" className="shrink-0 rounded-full text-[11px]">
              {purpose === "information" ? "Information" : purpose === "action" ? "Action" : "Approval"}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="ml-1 h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => {
                if (routeType === "office") onTargetOfficeIdChange("");
                else onForwardToChange("");
              }}
              aria-label={routeType === "office" ? "Remove office" : "Remove recipient"}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
