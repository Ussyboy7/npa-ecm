"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { logError } from "@/lib/client-logger";
import { createActingRequest, getEligibleActingCandidates, type ActingCandidate } from "@/lib/api/acting-appointments";
import type { Office, OfficeMembership } from "@/lib/organization-types";

interface ActingRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Offices the signed-in user actively belongs to; scoping is decided by the caller. */
  memberOffices: OfficeMembership[];
  offices: Office[];
  onCompleted: () => void | Promise<void>;
}

export function ActingRequestDialog({ open, onOpenChange, memberOffices, offices, onCompleted }: ActingRequestDialogProps) {
  const [officeId, setOfficeId] = useState("");
  const [suggestedId, setSuggestedId] = useState("");
  const [reason, setReason] = useState("");
  const [candidates, setCandidates] = useState<ActingCandidate[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setOfficeId(""); setSuggestedId(""); setReason(""); setCandidates([]); };
  const close = () => {
    onOpenChange(false);
    reset();
  };

  useEffect(() => {
    if (!open || !officeId) {
      setCandidates([]);
      setCandidateLoading(false);
      return;
    }
    let ignore = false;
    setCandidateLoading(true);
    void getEligibleActingCandidates({ office: officeId }).then((eligible) => {
      if (!ignore) setCandidates(eligible);
    }).catch((error: unknown) => {
      logError("Failed to load acting request candidates", error);
      if (!ignore) setCandidates([]);
    }).finally(() => {
      if (!ignore) setCandidateLoading(false);
    });
    return () => { ignore = true; };
  }, [officeId, open]);

  const submit = async () => {
    if (!officeId || !reason.trim()) {
      toast({ title: "Office and reason are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await createActingRequest({ office: officeId, suggestedActingUser: suggestedId || undefined, reason: reason.trim() });
      toast({ title: "Request sent to Super Admin" });
      close();
      await onCompleted();
    } catch (error) {
      logError("Acting request failed", error);
      toast({ title: "Could not submit acting request", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const officeLabel = (id: string) => memberOffices.find((membership) => String(membership.officeId) === id)?.officeName ||
    offices.find((office) => String(office.id) === id)?.name || id;

  return (
    <Dialog open={open} onOpenChange={(value) => { if (value) onOpenChange(true); else close(); }}>
      <DialogContent size="md">
        <DialogHeader><DialogTitle>Request acting appointment</DialogTitle><DialogDescription>Use this when the seat holder is unreachable. Super Admin will review and appoint.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>Office<Select value={officeId} onValueChange={setOfficeId}><SelectTrigger><SelectValue placeholder="Select office" /></SelectTrigger><SelectContent>{memberOffices.map((membership) => <SelectItem key={String(membership.officeId)} value={String(membership.officeId)}>{officeLabel(String(membership.officeId))}</SelectItem>)}</SelectContent></Select></Label></div>
          <div className="space-y-2"><Label>Suggested acting officer (optional)<Select value={suggestedId || "none"} onValueChange={(value) => setSuggestedId(value === "none" ? "" : value)} disabled={!officeId || candidateLoading}><SelectTrigger><SelectValue placeholder={candidateLoading ? "Loading…" : "Optional suggestion"} /></SelectTrigger><SelectContent><SelectItem value="none">No suggestion</SelectItem>{candidates.map((candidate) => <SelectItem key={candidate.id} value={candidate.id}>{candidate.name}{candidate.officeName ? ` · ${candidate.officeName}` : ""}</SelectItem>)}</SelectContent></Select></Label></div>
          <div className="space-y-2"><Label htmlFor="acting-request-reason">Reason</Label><Textarea id="acting-request-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Seat holder unreachable, leave without handover, backlog…" rows={3} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={close}>Cancel</Button><Button onClick={() => void submit()} disabled={submitting}>{submitting ? "Sending…" : "Send to Super Admin"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
