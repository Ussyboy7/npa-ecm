"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2,
  User as UserIcon,
  FileText,
  CheckCircle,
  Search,
  X,
  AlertCircle,
} from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOrgUsers } from "@/hooks/use-org-users";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { DistributionRecipient, Office, User } from "@/lib/npa-structure";

interface DistributionSelectorProps {
  selectedDistribution: DistributionRecipient[];
  onDistributionChange: (distribution: DistributionRecipient[]) => void;
  currentDivisionId?: string;
  currentDepartmentId?: string;
}

const recipientKey = (recipient: DistributionRecipient): string => {
  if (recipient.type === "user") return `user:${recipient.userId ?? recipient.id}`;
  return `${recipient.type}:${recipient.id}`;
};

export const DistributionSelector = ({
  selectedDistribution,
  onDistributionChange,
}: DistributionSelectorProps) => {
  const { currentUser } = useCurrentUser();
  const { offices, divisions, departments: _departments, directorates } = useOrganization();
  const { users } = useOrgUsers();

  const canCreateParallelRouting = useMemo(() => {
    if (!currentUser?.gradeLevel) return false;
    return ["MDCS", "EDCS", "MSS1", "MSS2", "MSS3"].includes(currentUser.gradeLevel);
  }, [currentUser?.gradeLevel]);

  const [routeType, setRouteType] = useState<"person" | "office">("office");
  const [purpose, setPurpose] = useState<"information" | "action">("information");
  const [personSearchQuery, setPersonSearchQuery] = useState("");
  const [officeFilterDirectorate, setOfficeFilterDirectorate] = useState<string>("all");
  const [officeFilterDivision, setOfficeFilterDivision] = useState<string>("all");
  const [lastAdded, setLastAdded] = useState<{ type: "person" | "office"; name: string; meta?: string } | null>(null);

  const selectedKeys = useMemo(() => new Set(selectedDistribution.map(recipientKey)), [selectedDistribution]);

  const filteredOfficeDivisions = useMemo(() => {
    if (officeFilterDirectorate === "all") return divisions;
    return divisions.filter((d) => d.directorateId === officeFilterDirectorate);
  }, [divisions, officeFilterDirectorate]);

  const mapOfficeToRecipient = (office: Office): DistributionRecipient => ({
    id: office.id,
    type: "office",
    officeId: office.id,
    name: office.name,
    purpose,
  });

  const filteredOfficeOptions = useMemo(() => {
    let result = offices.filter((o) => o.isActive);
    if (officeFilterDirectorate !== "all") result = result.filter((o) => o.directorateId === officeFilterDirectorate);
    if (officeFilterDivision !== "all") result = result.filter((o) => o.divisionId === officeFilterDivision);

    result = result.filter((o) => {
      const mapped = mapOfficeToRecipient(o);
      if (!mapped) return false;
      return !selectedKeys.has(recipientKey(mapped));
    });
    return result.sort((a, b) => a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    offices,
    officeFilterDirectorate,
    officeFilterDivision,
    selectedKeys,
  ]);

  const filteredUsers = useMemo(() => {
    const base = users
      .filter((u) => u.active !== false && u.id !== currentUser?.id)
      .filter((u) => !selectedKeys.has(`user:${u.id}`));
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
  }, [users, currentUser?.id, selectedKeys, personSearchQuery]);

  const addDistribution = (recipient: DistributionRecipient, meta?: string) => {
    if (recipient.type === "user" && recipient.purpose === "action" && !canCreateParallelRouting) return;
    onDistributionChange([...selectedDistribution, recipient]);
    setLastAdded({
      type: recipient.type === "user" ? "person" : "office",
      name: recipient.name || "Recipient",
      meta,
    });
  };

  const handleSelectUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    addDistribution(
      { id: user.id, type: "user", userId: user.id, name: user.name, purpose },
      `${user.systemRole || ""}${user.gradeLevel ? ` • ${user.gradeLevel}` : ""}`.trim(),
    );
  };

  const handleSelectOffice = (officeId: string) => {
    const office = offices.find((o) => o.id === officeId);
    if (!office) return;
    const mapped = mapOfficeToRecipient(office);
    if (!mapped) return;
    addDistribution(mapped, (office.officeType || "").toUpperCase());
  };

  const handleRemove = (recipient: DistributionRecipient) => {
    onDistributionChange(selectedDistribution.filter((item) => recipientKey(item) !== recipientKey(recipient)));
  };

  const getUserDivisionName = (user: User) => {
    if (!user.division) return "";
    return divisions.find((d) => d.id === user.division)?.name || "";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-semibold">Distribution (CC)</Label>
        <Badge variant="outline" className="text-xs">
          {selectedDistribution.length} recipient{selectedDistribution.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              {routeType === "office" ? <><Building2 className="h-3 w-3" /> Office</> : <><UserIcon className="h-3 w-3" /> Person</>}
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
                    <SelectTrigger className="h-8 text-xs text-foreground">
                      <SelectValue placeholder="Directorate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-foreground">All Directorates</SelectItem>
                      {directorates.map((d) => (
                        <SelectItem key={d.id} value={d.id} className="text-foreground">
                          {d.shortName || d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={officeFilterDivision} onValueChange={setOfficeFilterDivision}>
                    <SelectTrigger className="h-8 text-xs text-foreground">
                      <SelectValue placeholder="Division" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-foreground">All Divisions</SelectItem>
                      {filteredOfficeDivisions.map((d) => (
                        <SelectItem key={d.id} value={d.id} className="text-foreground">
                          {d.shortName || d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Select onValueChange={handleSelectOffice}>
                  <SelectTrigger className="h-9 text-foreground">
                    <SelectValue placeholder="Select office" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {filteredOfficeOptions.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">No offices found</div>
                    ) : (
                      filteredOfficeOptions.map((office) => (
                        <SelectItem key={office.id} value={office.id} className="text-foreground">
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="text-foreground">{office.name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{office.officeType}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <Select onValueChange={handleSelectUser}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50 max-h-[400px] overflow-y-auto">
                  <div className="p-2 border-b border-border sticky top-0 bg-popover z-10">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, role..."
                        value={personSearchQuery}
                        onChange={(e) => setPersonSearchQuery(e.target.value)}
                        className="pl-8 h-8"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  {filteredUsers.length > 0 ? (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        All Recipients ({filteredUsers.length})
                      </div>
                      {filteredUsers.slice(0, 30).map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex flex-col">
                            <span>{user.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {user.systemRole}
                              {getUserDivisionName(user) ? ` • ${getUserDivisionName(user)}` : ""}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">No recipients available</div>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" /> Purpose
            </Label>
            <Select value={purpose} onValueChange={(v) => setPurpose(v as "information" | "action")}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="action">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-warning" />
                    For Action
                  </div>
                </SelectItem>
                <SelectItem value="information">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-info" />
                    For Information
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {routeType === "person" && purpose === "action" && !canCreateParallelRouting && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Your role cannot create parallel routing for person-based action distribution.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {lastAdded && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {lastAdded.type === "office" ? "Selected Office" : "Selected Recipient"}
          </Label>
          <div className="rounded-xl border border-border/60 p-3">
<div className="flex items-center gap-3">
                <div className={lastAdded.type === "office" ? "h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center" : "h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"}>
                  {lastAdded.type === "office" ? <Building2 className="h-5 w-5 text-secondary-foreground" /> : <UserIcon className="h-5 w-5 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{lastAdded.name}</p>
                  {lastAdded.meta ? <p className="text-xs text-muted-foreground">{lastAdded.meta}</p> : null}
                  <p className="text-xs text-muted-foreground">
                    {lastAdded.type === "office" ? "Will be routed to office inbox" : "Added to distribution"}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {lastAdded.type === "office" ? "Office" : "Person"}
                </Badge>
              </div>
</div>
        </div>
      )}

      {selectedDistribution.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Selected Recipients ({selectedDistribution.length})</Label>
          <div className="space-y-2">
            {selectedDistribution.map((recipient, index) => (
              <div className="rounded-xl border border-border/60 border-border p-3">
<div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {recipient.type === "user" ? <UserIcon className="h-4 w-4 text-primary" /> : <Building2 className="h-4 w-4 text-primary" />}
                      <div>
                        <p className="text-sm font-medium">{recipient.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{recipient.type}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {recipient.purpose === "action" ? "Action" : "Information"}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(recipient)}
                      aria-label="Remove recipient"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
</div>
            ))}
          </div>
        </div>
      )}

      {selectedDistribution.length === 0 && (
        <div className="rounded-xl border border-border/60 border-dashed p-4 text-center">
<p className="text-sm text-muted-foreground">No distribution recipients added yet.</p>
</div>
      )}
    </div>
  );
};
