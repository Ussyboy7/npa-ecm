"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UserCheck, Plus, Ban } from "lucide-react";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { OrganizationTabList } from "@/components/admin/OrganizationTabList";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOrgUsers } from "@/hooks/use-org-users";
import { useCurrentUser } from "@/hooks/use-current-user";
import { logError } from "@/lib/client-logger";
import {
  appointActing,
  dismissActingRequest,
  endActingAppointment,
  getEligibleActingCandidates,
  listActingAppointments,
  listActingRequests,
  type ActingAppointment,
  type ActingCandidate,
  type ActingRequest,
} from "@/lib/api/acting-appointments";
import { formatDateLong } from "@/lib/datetime";
import { hasRolePermission } from "@/lib/permissions";

function formatDate(value: string | null): string {
  if (!value) return "Open-ended";
  return formatDateLong(value);
}

export default function ActingAppointmentsPage() {
  const { offices, officeMemberships } = useOrganization();
  const { users } = useOrgUsers();
  const { currentUser } = useCurrentUser();
  const [appointments, setAppointments] = useState<ActingAppointment[]>([]);
  const [requests, setRequests] = useState<ActingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [actingView, setActingView] = useState<"appointments" | "requests">("appointments");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [endingId, setEndingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const [officeId, setOfficeId] = useState("");
  const [principalId, setPrincipalId] = useState("");
  const [actingUserId, setActingUserId] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [reason, setReason] = useState("");
  const [candidates, setCandidates] = useState<ActingCandidate[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, pendingRequests] = await Promise.all([
        listActingAppointments(showInactive ? undefined : { isActive: true }),
        listActingRequests({ status: "pending" }),
      ]);
      setAppointments(data);
      setRequests(pendingRequests);
    } catch (err) {
      logError("Failed to load acting appointments", err);
      toast({
        title: "Could not load acting appointments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    void load();
  }, [load]);

  const principalOptions = useMemo(() => {
    if (!officeId) return [];
    const principalMemberships = officeMemberships.filter(
      (m) =>
        String(m.officeId) === officeId &&
        m.isActive &&
        m.assignmentRole === "principal"
    );
    if (principalMemberships.length > 0) {
      return principalMemberships.map((m) => {
        const user = users.find((u) => String(u.id) === String(m.userId));
        return {
          id: String(m.userId),
          name: user?.name || user?.username || String(m.userId),
        };
      });
    }
    return users
      .filter((u) =>
        officeMemberships.some(
          (m) => String(m.officeId) === officeId && String(m.userId) === String(u.id) && m.isActive
        )
      )
      .map((u) => ({ id: String(u.id), name: u.name || u.username }));
  }, [officeId, officeMemberships, users]);

  useEffect(() => {
    if (!officeId) {
      setCandidates([]);
      setActingUserId("");
      return;
    }
    const principal = principalId || principalOptions[0]?.id;
    if (principal && !principalId) setPrincipalId(principal);

    let ignore = false;
    const fetchCandidates = async () => {
      try {
        const list = await getEligibleActingCandidates({
          office: officeId,
          principal: principal || undefined,
        });
        if (!ignore) {
          setCandidates(list);
          setActingUserId("");
        }
      } catch (err) {
        logError("Failed to load eligible acting candidates", err);
        if (!ignore) setCandidates([]);
      }
    };
    void fetchCandidates();
    return () => {
      ignore = true;
    };
  }, [officeId, principalId, principalOptions]);

  const resetForm = () => {
    setOfficeId("");
    setPrincipalId("");
    setActingUserId("");
    setEndsAt("");
    setReason("");
    setCandidates([]);
  };

  const handleAppoint = async () => {
    if (!officeId || !actingUserId) {
      toast({ title: "Office and acting officer are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const endsAtIso = endsAt
        ? new Date(`${endsAt}T23:59:59`).toISOString()
        : undefined;
      await appointActing({
        office: officeId,
        principal: principalId || undefined,
        actingUser: actingUserId,
        endsAt: endsAtIso,
        reason: reason.trim(),
      });
      toast({ title: "Acting appointment created" });
      setDialogOpen(false);
      resetForm();
      await load();
    } catch (err) {
      logError("Failed to appoint acting officer", err);
      toast({
        title: "Could not create acting appointment",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnd = async (id: string) => {
    setEndingId(id);
    try {
      await endActingAppointment(id, "Ended from admin");
      toast({ title: "Acting appointment ended — open seat items reclaimed" });
      await load();
    } catch (err) {
      logError("Failed to end acting appointment", err);
      toast({
        title: "Could not end acting appointment",
        variant: "destructive",
      });
    } finally {
      setEndingId(null);
    }
  };

  const handleDismissRequest = async (id: string) => {
    setDismissingId(id);
    try {
      await dismissActingRequest(id, "Dismissed from admin");
      toast({ title: "Acting request dismissed" });
      await load();
    } catch (err) {
      logError("Failed to dismiss acting request", err);
      toast({ title: "Could not dismiss request", variant: "destructive" });
    } finally {
      setDismissingId(null);
    }
  };

  const openAppointFromRequest = (req: ActingRequest) => {
    setOfficeId(req.office);
    setPrincipalId(req.principal);
    setActingUserId(req.suggestedActingUser || "");
    setReason(req.reason);
    setDialogOpen(true);
  };

  const isOfficePrincipal = useMemo(
    () =>
      officeMemberships.some(
        (m) =>
          m.isActive &&
          m.assignmentRole === "principal" &&
          String(m.userId) === String(currentUser?.id ?? "")
      ),
    [officeMemberships, currentUser?.id]
  );

  const canManage =
    Boolean(currentUser?.isSuperuser) ||
    hasRolePermission(currentUser, "can_manage_org_structure") ||
    hasRolePermission(currentUser, "can_manage_users") ||
    isOfficePrincipal;

  return (
    <AdminPageShell
      title="Organization"
      subtitle="Appoint an officer to temporarily hold an office seat. Open My Inbox items for that seat move to the acting officer and return automatically when the appointment ends."
      icon={UserCheck}
      tabs={<OrganizationTabList />}
      actions={
        canManage ? (
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="compact">
                <Plus className="mr-2 h-4 w-4" />
                Appoint acting
              </Button>
            </DialogTrigger>
            <DialogContent size="md">
              <DialogHeader>
                <DialogTitle>Appoint acting officer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Office</Label>
                  <Select value={officeId} onValueChange={setOfficeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select office" />
                    </SelectTrigger>
                    <SelectContent>
                      {offices
                        .filter((o) => o.isActive !== false)
                        .map((office) => (
                          <SelectItem key={String(office.id)} value={String(office.id)}>
                            {office.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Principal (absent)</Label>
                  <Select
                    value={principalId}
                    onValueChange={setPrincipalId}
                    disabled={!officeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select principal" />
                    </SelectTrigger>
                    <SelectContent>
                      {principalOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Acting officer</Label>
                  <Select
                    value={actingUserId}
                    onValueChange={setActingUserId}
                    disabled={!officeId || candidates.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select acting officer" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.gradeLevel ? ` (${c.gradeLevel})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ends on (optional)</Label>
                  <Input
                    type="date"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Leave, assignment, emergency…"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void handleAppoint()} disabled={submitting}>
                  {submitting ? "Appointing…" : "Appoint"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-md border border-border/60 p-0.5">
            <Button
              type="button"
              variant={actingView === "appointments" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setActingView("appointments")}
            >
              Appointments
            </Button>
            <Button
              type="button"
              variant={actingView === "requests" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setActingView("requests")}
            >
              Requests{requests.length > 0 ? ` (${requests.length})` : ""}
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInactive((v) => !v)}
          >
            {showInactive ? "Show active only" : "Include ended"}
          </Button>
        </div>

        {actingView === "requests" ? (
        <div className="space-y-4">
          {loading ? (
            <LoadingState message="Loading requests…" />
          ) : requests.length === 0 ? (
            <EmptyState
              icon="inbox"
              title="No pending requests"
              message="Office members can request an acting appointment when a seat holder is unreachable."
            />
          ) : (
            requests.map((req) => (
              <div key={req.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex flex-row items-start justify-between gap-3 pb-2">
                  <div>
                    <p className="text-base font-semibold">{req.officeName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      For {req.principalName} · requested by {req.requestedByName}
                    </p>
                  </div>
                  <Badge>{req.pendingItemCount} open items</Badge>
                </div>
                <div className="space-y-3 text-sm">
                  <p className="text-muted-foreground">{req.reason}</p>
                  {req.suggestedActingUserName ? (
                    <p className="text-muted-foreground">
                      Suggested: {req.suggestedActingUserName}
                    </p>
                  ) : null}
                  {canManage ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="compact" onClick={() => openAppointFromRequest(req)}>
                        Appoint from request
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleDismissRequest(req.id)}
                        disabled={dismissingId === req.id}
                      >
                        {dismissingId === req.id ? "Dismissing…" : "Dismiss"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
        ) : (
        <div className="space-y-4">
      {loading ? (
        <LoadingState message="Loading acting appointments…" />
      ) : appointments.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="No acting appointments"
          message="Appoint an acting officer when a seat holder is away. Open personal inbox items for that seat move to the acting officer."
        />
      ) : (
        <div className="grid gap-4">
          {appointments.map((appt) => (
            <div key={appt.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex flex-row items-start justify-between gap-3 pb-2">
                <div>
                  <p className="text-base font-semibold">
                    {appt.officeName}
                    {appt.officeCode ? ` (${appt.officeCode})` : ""}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {appt.actingUserName} acting for {appt.principalName}
                  </p>
                </div>
                <Badge variant={appt.isActive ? "default" : "secondary"}>
                  {appt.isActive
                    ? appt.isCurrentlyEffective
                      ? "Active"
                      : "Scheduled"
                    : "Ended"}
                </Badge>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                  <span>From {formatDate(appt.startsAt)}</span>
                  <span>Until {formatDate(appt.endsAt)}</span>
                  <span>{appt.itemsTransferred} transferred</span>
                  {!appt.isActive && (
                    <span>{appt.itemsReclaimed} reclaimed</span>
                  )}
                </div>
                {appt.reason ? (
                  <p className="text-muted-foreground">{appt.reason}</p>
                ) : null}
                {appt.isActive && canManage ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleEnd(appt.id)}
                    disabled={endingId === appt.id}
                  >
                    <Ban className="mr-2 h-3.5 w-3.5" />
                    {endingId === appt.id ? "Ending…" : "End & reclaim seat"}
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
        </div>
        )}
      </div>
    </AdminPageShell>
  );
}
