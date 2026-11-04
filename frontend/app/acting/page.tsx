"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UserCheck, Plus, Ban, Flag } from "lucide-react";
import { QueuePageShell } from "@/components/shared/QueuePageShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useCurrentUser } from "@/hooks/use-current-user";
import { logError } from "@/lib/client-logger";
import {
  appointActing,
  createActingRequest,
  endActingAppointment,
  getEligibleActingCandidates,
  getMyActingAppointments,
  getMyPrincipalActingAppointments,
  listActingRequests,
  type ActingAppointment,
  type ActingCandidate,
  type ActingRequest,
} from "@/lib/api/acting-appointments";
import { formatDateLong } from '@/lib/datetime';

function formatDate(value: string | null): string {
  if (!value) return "Open-ended";
  return formatDateLong(value);
}

function toISODateTime(dateStr: string, endOfDay: boolean): string | undefined {
  if (!dateStr) return undefined;
  const suffix = endOfDay ? "T23:59:59" : "T00:00:00";
  try {
    return new Date(`${dateStr}${suffix}`).toISOString();
  } catch {
    return undefined;
  }
}

export default function ActingSelfServicePage() {
  const { offices, officeMemberships } = useOrganization();
  const { currentUser } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [asActing, setAsActing] = useState<ActingAppointment[]>([]);
  const [asPrincipal, setAsPrincipal] = useState<ActingAppointment[]>([]);
  const [myRequests, setMyRequests] = useState<ActingRequest[]>([]);

  const [appointOpen, setAppointOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [endingId, setEndingId] = useState<string | null>(null);

  // Appoint form state (isolated from request form)
  const [appointOfficeId, setAppointOfficeId] = useState("");
  const [appointActingUserId, setAppointActingUserId] = useState("");
  const [appointStartsAt, setAppointStartsAt] = useState("");
  const [appointEndsAt, setAppointEndsAt] = useState("");
  const [appointReason, setAppointReason] = useState("");
  const [appointCandidates, setAppointCandidates] = useState<ActingCandidate[]>([]);
  const [appointCandidatesLoading, setAppointCandidatesLoading] = useState(false);

  // Request form state
  const [requestOfficeId, setRequestOfficeId] = useState("");
  const [requestSuggestedId, setRequestSuggestedId] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [requestCandidates, setRequestCandidates] = useState<ActingCandidate[]>([]);
  const [requestCandidatesLoading, setRequestCandidatesLoading] = useState(false);

  const myMemberships = useMemo(
    () =>
      officeMemberships.filter(
        (m) => m.isActive && String(m.userId) === String(currentUser?.id ?? "")
      ),
    [officeMemberships, currentUser?.id]
  );

  const principalOffices = useMemo(
    () => myMemberships.filter((m) => m.assignmentRole === "principal"),
    [myMemberships]
  );

  const memberOffices = useMemo(() => myMemberships, [myMemberships]);

  const load = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const [acting, principal, requests] = await Promise.all([
        getMyActingAppointments(),
        getMyPrincipalActingAppointments(),
        listActingRequests(),
      ]);
      setAsActing(acting.filter((a) => a.isActive));
      setAsPrincipal(principal.filter((a) => a.isActive));
      setMyRequests(
        requests.filter(
          (r) =>
            String(r.requestedBy) === String(currentUser.id) ||
            String(r.principal) === String(currentUser.id)
        )
      );
    } catch (err) {
      logError("Failed to load acting self-service data", err);
      toast({ title: "Could not load acting data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Fetch candidates for appoint dialog
  useEffect(() => {
    if (!appointOfficeId) {
      setAppointCandidates([]);
      return;
    }
    let ignore = false;
    setAppointCandidatesLoading(true);
    const run = async () => {
      try {
        const list = await getEligibleActingCandidates({ office: appointOfficeId });
        if (!ignore) {
          setAppointCandidates(list);
          setAppointActingUserId("");
        }
      } catch (err) {
        logError("Failed to load appoint candidates", err);
        if (!ignore) setAppointCandidates([]);
      } finally {
        if (!ignore) setAppointCandidatesLoading(false);
      }
    };
    void run();
    return () => {
      ignore = true;
    };
  }, [appointOfficeId]);

  // Fetch candidates for request dialog
  useEffect(() => {
    if (!requestOfficeId) {
      setRequestCandidates([]);
      return;
    }
    let ignore = false;
    setRequestCandidatesLoading(true);
    const run = async () => {
      try {
        const list = await getEligibleActingCandidates({ office: requestOfficeId });
        if (!ignore) {
          setRequestCandidates(list);
          setRequestSuggestedId("");
        }
      } catch (err) {
        logError("Failed to load request candidates", err);
        if (!ignore) setRequestCandidates([]);
      } finally {
        if (!ignore) setRequestCandidatesLoading(false);
      }
    };
    void run();
    return () => {
      ignore = true;
    };
  }, [requestOfficeId]);

  const resetAppointForm = () => {
    setAppointOfficeId("");
    setAppointActingUserId("");
    setAppointStartsAt("");
    setAppointEndsAt("");
    setAppointReason("");
    setAppointCandidates([]);
  };

  const resetRequestForm = () => {
    setRequestOfficeId("");
    setRequestSuggestedId("");
    setRequestReason("");
    setRequestCandidates([]);
  };

  const handleAppoint = async () => {
    if (!appointOfficeId || !appointActingUserId) {
      toast({ title: "Office and acting officer are required", variant: "destructive" });
      return;
    }
    if (appointStartsAt && appointEndsAt && appointStartsAt > appointEndsAt) {
      toast({ title: "Start date must be before end date", variant: "destructive" });
      return;
    }
    if (!appointReason.trim()) {
      toast({ title: "Reason is required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await appointActing({
        office: appointOfficeId,
        principal: currentUser?.id,
        actingUser: appointActingUserId,
        startsAt: toISODateTime(appointStartsAt, false),
        endsAt: toISODateTime(appointEndsAt, true),
        reason: appointReason.trim(),
      });
      toast({ title: "Acting officer appointed" });
      setAppointOpen(false);
      resetAppointForm();
      await load();
    } catch (err) {
      logError("Appoint failed", err);
      toast({
        title: "Could not appoint acting officer",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequest = async () => {
    if (!requestOfficeId || !requestReason.trim()) {
      toast({ title: "Office and reason are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await createActingRequest({
        office: requestOfficeId,
        suggestedActingUser: requestSuggestedId || undefined,
        reason: requestReason.trim(),
      });
      toast({ title: "Request sent to Super Admin" });
      setRequestOpen(false);
      resetRequestForm();
      await load();
    } catch (err) {
      logError("Request failed", err);
      toast({
        title: "Could not submit acting request",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnd = async (id: string) => {
    setEndingId(id);
    try {
      await endActingAppointment(id, "Ended by principal");
      toast({ title: "Acting appointment ended — remaining items reclaimed" });
      await load();
    } catch (err) {
      logError("End failed", err);
      toast({ title: "Could not end appointment", variant: "destructive" });
    } finally {
      setEndingId(null);
    }
  };

  const officeLabel = (officeIdValue: string) =>
    offices.find((o) => String(o.id) === officeIdValue)?.name ||
    officeMemberships.find((m) => String(m.officeId) === officeIdValue)?.officeName ||
    officeIdValue;

  const todayStr = new Date().toISOString().slice(0, 10);

  if (!currentUser) {
    return (
      <QueuePageShell title="Acting capacity" subtitle="Office seat succession">
        <EmptyState
          icon="inbox"
          title="Sign in required"
          message="Sign in to manage acting appointments for your office."
        />
      </QueuePageShell>
    );
  }

  return (
    <QueuePageShell
      title="Acting"
      subtitle="Appoint someone to hold your seat while you are away, or request Super Admin help when a seat holder is unreachable."
      actions={
        <>
          {principalOffices.length > 0 ? (
            <Dialog
              open={appointOpen}
              onOpenChange={(open) => {
                setAppointOpen(open);
                if (!open) resetAppointForm();
              }}
            >
              <DialogTrigger asChild>
                <Button size="compact">
                  <Plus className="h-4 w-4" />
                  Appoint acting
                </Button>
              </DialogTrigger>
              <DialogContent size="md">
                <DialogHeader>
                  <DialogTitle>Appoint acting for your seat</DialogTitle>
                  <DialogDescription>
                    Select the office, dates, and colleague who will hold your seat. Candidates are drawn from the same department, division, or directorate.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="appoint-office">Your office</Label>
                    <Select value={appointOfficeId} onValueChange={setAppointOfficeId}>
                      <SelectTrigger id="appoint-office">
                        <SelectValue placeholder="Select office" />
                      </SelectTrigger>
                      <SelectContent>
                        {principalOffices.map((m) => (
                          <SelectItem key={String(m.officeId)} value={String(m.officeId)}>
                            {m.officeName || officeLabel(String(m.officeId))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appoint-officer">Acting officer</Label>
                    <Select
                      value={appointActingUserId}
                      onValueChange={setAppointActingUserId}
                      disabled={!appointOfficeId || appointCandidatesLoading}
                    >
                      <SelectTrigger id="appoint-officer">
                        <SelectValue placeholder={appointCandidatesLoading ? "Loading colleagues…" : appointCandidates.length === 0 && appointOfficeId ? "No eligible officers found" : "Select colleague"} />
                      </SelectTrigger>
                      <SelectContent>
                        {appointCandidates.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                            {c.gradeLevel ? ` — ${c.gradeLevel}` : ""}
                            {c.officeName ? ` · ${c.officeName}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {appointOfficeId && !appointCandidatesLoading && appointCandidates.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No eligible officers found in this office hierarchy. Officers must hold an active membership in the same department, division, or directorate.
                      </p>
                    ) : null}
                    {appointCandidates.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {appointCandidates.length} officer{appointCandidates.length !== 1 ? "s" : ""} available from same directorate/division/department.
                      </p>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="appoint-starts">Starts on</Label>
                      <Input id="appoint-starts" type="date" value={appointStartsAt} min={todayStr} onChange={(e) => setAppointStartsAt(e.target.value)} />
                      <p className="text-[11px] text-muted-foreground">Defaults to now if left empty.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="appoint-ends">Ends on</Label>
                      <Input id="appoint-ends" type="date" value={appointEndsAt} min={appointStartsAt || todayStr} onChange={(e) => setAppointEndsAt(e.target.value)} />
                      <p className="text-[11px] text-muted-foreground">Leave empty for open-ended.</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appoint-reason">Reason</Label>
                    <Textarea
                      id="appoint-reason"
                      value={appointReason}
                      onChange={(e) => setAppointReason(e.target.value)}
                      placeholder="Leave, annual assignment, training…"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAppointOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => void handleAppoint()} disabled={submitting} size="compact">
                    {submitting ? "Appointing…" : "Appoint"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}

          {memberOffices.length > 0 ? (
            <Dialog
              open={requestOpen}
              onOpenChange={(open) => {
                setRequestOpen(open);
                if (!open) resetRequestForm();
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline" size="compact">
                  <Flag className="h-4 w-4" />
                  Request acting
                </Button>
              </DialogTrigger>
              <DialogContent size="md">
                <DialogHeader>
                  <DialogTitle>Request acting appointment</DialogTitle>
                  <DialogDescription>
                    Use this when the seat holder is unreachable. Super Admin will review and appoint.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="request-office">Office</Label>
                    <Select value={requestOfficeId} onValueChange={setRequestOfficeId}>
                      <SelectTrigger id="request-office">
                        <SelectValue placeholder="Select office" />
                      </SelectTrigger>
                      <SelectContent>
                        {memberOffices.map((m) => (
                          <SelectItem key={String(m.officeId)} value={String(m.officeId)}>
                            {m.officeName || officeLabel(String(m.officeId))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="request-suggested">Suggested acting officer (optional)</Label>
                    <Select
                      value={requestSuggestedId || "none"}
                      onValueChange={(v) => setRequestSuggestedId(v === "none" ? "" : v)}
                      disabled={!requestOfficeId || requestCandidatesLoading}
                    >
                      <SelectTrigger id="request-suggested">
                        <SelectValue placeholder={requestCandidatesLoading ? "Loading…" : "Optional suggestion"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No suggestion</SelectItem>
                        {requestCandidates.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                            {c.officeName ? ` · ${c.officeName}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {requestOfficeId && !requestCandidatesLoading && requestCandidates.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No eligible officers found in hierarchy.</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="request-reason">Reason</Label>
                    <Textarea
                      id="request-reason"
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      placeholder="Seat holder unreachable, leave without handover, backlog…"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRequestOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => void handleRequest()} disabled={submitting} size="compact">
                    {submitting ? "Sending…" : "Send to Super Admin"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}
        </>
      }
    >
      {loading ? (
        <LoadingState message="Loading acting appointments…" />
      ) : (
        <Tabs defaultValue="mine" className="space-y-4">
          <TabsList>
            <TabsTrigger value="mine">My appointments</TabsTrigger>
            <TabsTrigger value="requests">My requests</TabsTrigger>
          </TabsList>

          <TabsContent value="mine" className="space-y-4">
            {asActing.length === 0 && asPrincipal.length === 0 ? (
              <EmptyState
                icon="inbox"
                title="No active acting appointments"
                message="Appoint an acting officer before leave, or request help if a seat holder is away without handover."
              />
            ) : (
              <>
                {asActing.map((appt) => (
                  <div key={`acting-${appt.id}`} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                    <div className="pb-2">
                      <p className="flex items-center gap-2 text-base font-semibold">
                        <UserCheck className="h-4 w-4" />
                        You are acting as {appt.principalName}
                      </p>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>
                        {appt.officeName} · {formatDate(appt.startsAt)} → {formatDate(appt.endsAt)} ·{" "}
                        {appt.itemsTransferred} items transferred
                      </p>
                      {appt.reason ? <p className="text-xs">Reason: {appt.reason.split("\n")[0]}</p> : null}
                    </div>
                  </div>
                ))}
                {asPrincipal.map((appt) => (
                  <div key={`principal-${appt.id}`} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <div>
                        <p className="text-base font-semibold">
                          {appt.actingUserName} is acting for you
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {appt.officeName} · {formatDate(appt.startsAt)} → {formatDate(appt.endsAt)}
                        </p>
                      </div>
                      <Badge>Active</Badge>
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleEnd(appt.id)}
                        disabled={endingId === appt.id}
                      >
                        <Ban className="mr-2 h-3.5 w-3.5" />
                        {endingId === appt.id ? "Ending…" : "End & reclaim seat"}
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            {myRequests.length === 0 ? (
              <EmptyState
                icon="inbox"
                title="No acting requests"
                message="Office members can request Super Admin to appoint an acting officer when the seat holder is unreachable."
              />
            ) : (
              myRequests.map((req) => (
                <div key={req.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div>
                      <p className="text-base font-semibold">{req.officeName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        For {req.principalName} · by {req.requestedByName}
                      </p>
                    </div>
                    <Badge variant={req.status === "pending" ? "default" : "secondary"}>
                      {req.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>{req.reason}</p>
                    <p className="mt-2">
                      {req.pendingItemCount} open seat item(s)
                      {req.suggestedActingUserName
                        ? ` · suggested ${req.suggestedActingUserName}`
                        : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </QueuePageShell>
  );
}
