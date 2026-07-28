"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { UserCheck, Plus, Ban, Flag } from "lucide-react";
import { QueuePageShell } from "@/components/shared/QueuePageShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const [officeId, setOfficeId] = useState("");
  const [actingUserId, setActingUserId] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [reason, setReason] = useState("");
  const [candidates, setCandidates] = useState<ActingCandidate[]>([]);
  const [suggestedId, setSuggestedId] = useState("");

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

  useEffect(() => {
    if (!officeId) {
      setCandidates([]);
      return;
    }
    let ignore = false;
    const run = async () => {
      try {
        const list = await getEligibleActingCandidates({ office: officeId });
        if (!ignore) {
          setCandidates(list);
          setActingUserId("");
          setSuggestedId("");
        }
      } catch (err) {
        logError("Failed to load candidates", err);
        if (!ignore) setCandidates([]);
      }
    };
    void run();
    return () => {
      ignore = true;
    };
  }, [officeId]);

  const resetForms = () => {
    setOfficeId("");
    setActingUserId("");
    setSuggestedId("");
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
      await appointActing({
        office: officeId,
        principal: currentUser?.id,
        actingUser: actingUserId,
        endsAt: endsAt ? new Date(`${endsAt}T23:59:59`).toISOString() : undefined,
        reason: reason.trim() || "Planned leave",
      });
      toast({ title: "Acting officer appointed" });
      setAppointOpen(false);
      resetForms();
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
    if (!officeId || !reason.trim()) {
      toast({ title: "Office and reason are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await createActingRequest({
        office: officeId,
        suggestedActingUser: suggestedId || undefined,
        reason: reason.trim(),
      });
      toast({ title: "Request sent to Super Admin" });
      setRequestOpen(false);
      resetForms();
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
      title="Acting capacity"
      subtitle="Appoint someone to hold your seat while you are away, or request Super Admin help when a seat holder is unreachable."
    >
      <div className="flex flex-wrap gap-2">
        {principalOffices.length > 0 && (
          <Dialog
            open={appointOpen}
            onOpenChange={(open) => {
              setAppointOpen(open);
              if (!open) resetForms();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Appoint acting officer
              </Button>
            </DialogTrigger>
            <DialogContent size="md">
              <DialogHeader>
                <DialogTitle>Appoint acting for your seat</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Your office</Label>
                  <Select value={officeId} onValueChange={setOfficeId}>
                    <SelectTrigger>
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
                  <Label>Acting officer</Label>
                  <Select
                    value={actingUserId}
                    onValueChange={setActingUserId}
                    disabled={!officeId || candidates.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select colleague" />
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
                  <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Leave, assignment…"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAppointOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void handleAppoint()} disabled={submitting}>
                  {submitting ? "Appointing…" : "Appoint"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {memberOffices.length > 0 && (
          <Dialog
            open={requestOpen}
            onOpenChange={(open) => {
              setRequestOpen(open);
              if (!open) resetForms();
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <Flag className="mr-2 h-4 w-4" />
                Request acting appointment
              </Button>
            </DialogTrigger>
            <DialogContent size="md">
              <DialogHeader>
                <DialogTitle>Request acting appointment</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Use this when the seat holder is unreachable. Super Admin will review and appoint.
              </p>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Office</Label>
                  <Select value={officeId} onValueChange={setOfficeId}>
                    <SelectTrigger>
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
                  <Label>Suggested acting officer (optional)</Label>
                  <Select
                    value={suggestedId || "none"}
                    onValueChange={(v) => setSuggestedId(v === "none" ? "" : v)}
                    disabled={!officeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional suggestion" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No suggestion</SelectItem>
                      {candidates.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Seat holder unreachable, leave without handover, backlog…"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRequestOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void handleRequest()} disabled={submitting}>
                  {submitting ? "Sending…" : "Send to Super Admin"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <Button variant="ghost" asChild>
          <Link href="/admin/acting-appointments">Admin view</Link>
        </Button>
      </div>

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
                  <Card key={`acting-${appt.id}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <UserCheck className="h-4 w-4" />
                        You are acting as {appt.principalName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <p>
                        {appt.officeName} · until {formatDate(appt.endsAt)} ·{" "}
                        {appt.itemsTransferred} items transferred
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {asPrincipal.map((appt) => (
                  <Card key={`principal-${appt.id}`}>
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <div>
                        <CardTitle className="text-base">
                          {appt.actingUserName} is acting for you
                        </CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {appt.officeName} · until {formatDate(appt.endsAt)}
                        </p>
                      </div>
                      <Badge>Active</Badge>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleEnd(appt.id)}
                        disabled={endingId === appt.id}
                      >
                        <Ban className="mr-2 h-3.5 w-3.5" />
                        {endingId === appt.id ? "Ending…" : "End & reclaim seat"}
                      </Button>
                    </CardContent>
                  </Card>
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
                <Card key={req.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-base">{req.officeName}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        For {req.principalName} · by {req.requestedByName}
                      </p>
                    </div>
                    <Badge variant={req.status === "pending" ? "default" : "secondary"}>
                      {req.status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p>{req.reason}</p>
                    <p className="mt-2">
                      {req.pendingItemCount} open seat item(s)
                      {req.suggestedActingUserName
                        ? ` · suggested ${req.suggestedActingUserName}`
                        : ""}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* silence unused */}
    </QueuePageShell>
  );
}
