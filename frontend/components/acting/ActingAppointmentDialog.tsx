"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { logError } from "@/lib/client-logger";
import { listOfficeMembershipsForOffice } from "@/lib/office-memberships-client";
import { appointActing, getEligibleActingCandidates, type ActingCandidate, type ActingRequest } from "@/lib/api/acting-appointments";
import type { Office, OfficeMembership } from "@/lib/organization-types";
import type { User } from "@/lib/npa-structure";

export type ActingMode = "self-service" | "admin";

interface ActingAppointmentDialogProps {
  mode: ActingMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: User;
  offices: Office[];
  principalOffices: OfficeMembership[];
  officeMemberships: OfficeMembership[];
  users: User[];
  initialRequest?: ActingRequest | null;
  onCompleted: () => void | Promise<void>;
}

function toISODateTime(value: string, endOfDay: boolean): string | undefined {
  if (!value) return undefined;
  try {
    return new Date(`${value}${endOfDay ? "T23:59:59" : "T00:00:00"}`).toISOString();
  } catch {
    return undefined;
  }
}

export function ActingAppointmentDialog({
  mode, open, onOpenChange, currentUser, offices, principalOffices,
  officeMemberships, users, initialRequest, onCompleted,
}: ActingAppointmentDialogProps) {
  const isAdmin = mode === "admin";
  const [officeId, setOfficeId] = useState("");
  const [principalId, setPrincipalId] = useState("");
  const [actingUserId, setActingUserId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [reason, setReason] = useState("");
  const [candidates, setCandidates] = useState<ActingCandidate[]>([]);
  const [selectedOfficeMemberships, setSelectedOfficeMemberships] = useState<OfficeMembership[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setOfficeId(""); setPrincipalId(""); setActingUserId("");
    setStartsAt(""); setEndsAt(""); setReason(""); setCandidates([]);
    setSelectedOfficeMemberships([]);
  };
  const close = () => {
    onOpenChange(false);
    reset();
  };

  useEffect(() => {
    if (!open || !initialRequest) return;
    setOfficeId(initialRequest.office);
    setPrincipalId(initialRequest.principal);
    setActingUserId(initialRequest.suggestedActingUser || "");
    setReason(initialRequest.reason);
  }, [initialRequest, open]);

  useEffect(() => {
    if (!isAdmin || !officeId) {
      setSelectedOfficeMemberships([]);
      return;
    }
    let ignore = false;
    void listOfficeMembershipsForOffice(officeId).then((memberships) => {
      if (!ignore) setSelectedOfficeMemberships(memberships);
    }).catch((error: unknown) => {
      logError("Failed to load office memberships for acting appointment", error);
      if (!ignore) setSelectedOfficeMemberships([]);
    });
    return () => { ignore = true; };
  }, [isAdmin, officeId]);

  const principalOptions = useMemo(() => {
    const active = selectedOfficeMemberships.filter((membership) =>
      String(membership.officeId) === officeId && membership.isActive);
    const principals = active.filter((membership) => membership.assignmentRole === "principal");
    return (principals.length ? principals : active).map((membership) => {
      const user = users.find((candidate) => String(candidate.id) === String(membership.userId));
      return { id: String(membership.userId), name: user?.name || user?.username || String(membership.userId) };
    });
  }, [officeId, selectedOfficeMemberships, users]);

  useEffect(() => {
    if (!open || !officeId || (isAdmin && !principalId && principalOptions.length === 0)) {
      setCandidates([]);
      setCandidatesLoading(false);
      return;
    }
    const principal = isAdmin ? principalId || principalOptions[0]?.id : undefined;
    if (isAdmin && principal && !principalId) setPrincipalId(principal);
    let ignore = false;
    setCandidatesLoading(true);
    void getEligibleActingCandidates({ office: officeId, principal }).then((eligible) => {
      if (!ignore) setCandidates(eligible);
    }).catch((error: unknown) => {
      logError("Failed to load eligible acting candidates", error);
      if (!ignore) setCandidates([]);
    }).finally(() => {
      if (!ignore) setCandidatesLoading(false);
    });
    return () => { ignore = true; };
  }, [isAdmin, officeId, open, principalId, principalOptions]);

  const officeLabel = (value: string) =>
    offices.find((office) => String(office.id) === value)?.name ||
    officeMemberships.find((membership) => String(membership.officeId) === value)?.officeName || value;

  const submit = async () => {
    if (!officeId || !actingUserId || !reason.trim()) {
      toast({ title: "Office, acting officer, and reason are required", variant: "destructive" });
      return;
    }
    if (!isAdmin && startsAt && endsAt && startsAt > endsAt) {
      toast({ title: "Start date must be before end date", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await appointActing({
        office: officeId,
        principal: isAdmin ? principalId || undefined : currentUser.id,
        actingUser: actingUserId,
        startsAt: isAdmin ? undefined : toISODateTime(startsAt, false),
        endsAt: toISODateTime(endsAt, true),
        reason: reason.trim(),
      });
      toast({ title: isAdmin ? "Acting appointment created" : "Acting officer appointed" });
      close();
      await onCompleted();
    } catch (error) {
      logError("Acting appointment failed", error);
      toast({ title: "Could not appoint acting officer", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const availableOffices = isAdmin
    ? offices.filter((office) => office.isActive !== false).map((office) => ({ id: String(office.id), name: office.name }))
    : principalOffices.map((membership) => ({ id: String(membership.officeId), name: officeLabel(String(membership.officeId)) }));

  return (
    <Dialog open={open} onOpenChange={(value) => { if (value) onOpenChange(true); else close(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{isAdmin ? "Appoint acting officer" : "Appoint acting for your seat"}</DialogTitle>
          <DialogDescription>{isAdmin ? "Choose an office and principal for the acting appointment." : "Select your office, dates, and colleague who will hold your seat. Candidates are drawn from the same hierarchy."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>{isAdmin ? "Office" : "Your office"}<Select value={officeId} onValueChange={(value) => { setOfficeId(value); setPrincipalId(""); setActingUserId(""); }}><SelectTrigger><SelectValue placeholder="Select office" /></SelectTrigger><SelectContent>{availableOffices.map((office) => <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>)}</SelectContent></Select></Label></div>
          {isAdmin ? <div className="space-y-2"><Label>Principal (absent)<Select value={principalId} onValueChange={setPrincipalId} disabled={!officeId}><SelectTrigger><SelectValue placeholder="Select principal" /></SelectTrigger><SelectContent>{principalOptions.map((principal) => <SelectItem key={principal.id} value={principal.id}>{principal.name}</SelectItem>)}</SelectContent></Select></Label></div> : null}
          <div className="space-y-2"><Label>Acting officer<Select value={actingUserId} onValueChange={setActingUserId} disabled={!officeId || candidatesLoading}><SelectTrigger><SelectValue placeholder={candidatesLoading ? "Loading colleagues…" : "Select colleague"} /></SelectTrigger><SelectContent>{candidates.map((candidate) => <SelectItem key={candidate.id} value={candidate.id}>{candidate.name}{candidate.gradeLevel ? ` · ${candidate.gradeLevel}` : ""}{candidate.officeName ? ` — ${candidate.officeName}` : ""}</SelectItem>)}</SelectContent></Select></Label>{officeId && !candidatesLoading && candidates.length === 0 ? <p className="text-xs text-muted-foreground">No eligible officers found in this office hierarchy.</p> : null}</div>
          {!isAdmin ? <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="acting-starts">Starts on</Label><Input id="acting-starts" type="date" value={startsAt} min={today} onChange={(event) => setStartsAt(event.target.value)} /><p className="text-[11px] text-muted-foreground">Defaults to now if left empty.</p></div><div className="space-y-2"><Label htmlFor="acting-ends">Ends on</Label><Input id="acting-ends" type="date" value={endsAt} min={startsAt || today} onChange={(event) => setEndsAt(event.target.value)} /><p className="text-[11px] text-muted-foreground">Leave empty for open-ended.</p></div></div> : <div className="space-y-2"><Label htmlFor="acting-admin-ends">Ends on (optional)</Label><Input id="acting-admin-ends" type="date" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></div>}
          <div className="space-y-2"><Label htmlFor="acting-reason">Reason</Label><Textarea id="acting-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Leave, assignment, emergency…" rows={3} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={close}>Cancel</Button><Button onClick={() => void submit()} disabled={submitting}>{submitting ? "Appointing…" : "Appoint"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
