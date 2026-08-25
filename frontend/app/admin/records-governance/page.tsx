"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { RecordsSecurityTabList } from "@/components/admin/RecordsSecurityTabList";
import { StatStrip } from "@/components/shared/StatStrip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Archive,
  Trash2,
  Plus,
  Download,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { logError } from "@/lib/client-logger";
import { downloadBlob } from "@/lib/admin-api";
import {
  approveDisposalRequest,
  completeDisposalRequest,
  createLegalHold,
  createRetentionSchedule,
  downloadEdiscoveryExport,
  fetchDisposalRequests,
  fetchLegalHolds,
  fetchRecordsSummary,
  fetchRetentionSchedules,
  generateDueDisposalRequests,
  rejectDisposalRequest,
  releaseLegalHold,
  type DisposalRequest,
  type LegalHold,
  type RecordsSummary,
  type RetentionSchedule,
} from "@/lib/records-api";

function statusBadge(status: DisposalRequest["status"]) {
  const variants: Record<DisposalRequest["status"], string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    approved: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    completed: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  };
  return <Badge className={variants[status]}>{status}</Badge>;
}

function RecordsGovernanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  useEffect(() => {
    if (activeTab === "drm") {
      router.replace("/admin/records-governance/drm");
    }
  }, [activeTab, router]);

  const [summary, setSummary] = useState<RecordsSummary | null>(null);
  const [schedules, setSchedules] = useState<RetentionSchedule[]>([]);
  const [holds, setHolds] = useState<LegalHold[]>([]);
  const [disposals, setDisposals] = useState<DisposalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [holdDialogOpen, setHoldDialogOpen] = useState(false);
  const [exportingHoldId, setExportingHoldId] = useState<string | null>(null);
  const [newSchedule, setNewSchedule] = useState<{
    name: string;
    description: string;
    retention_years: number;
    retention_months: number;
    disposition_action: RetentionSchedule["disposition_action"];
  }>({
    name: "",
    description: "",
    retention_years: 7,
    retention_months: 0,
    disposition_action: "review",
  });
  const [newHold, setNewHold] = useState({
    name: "",
    matter_reference: "",
    description: "",
    correspondence_ids: "",
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, scheduleData, holdData, disposalData] = await Promise.all([
        fetchRecordsSummary(),
        fetchRetentionSchedules(),
        fetchLegalHolds(),
        fetchDisposalRequests(),
      ]);
      setSummary(summaryData);
      setSchedules(scheduleData);
      setHolds(holdData);
      setDisposals(disposalData);
    } catch (_error) {
      logError("Failed to load records governance data", _error);
      toast.error("Could not load records governance data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleCreateSchedule = async () => {
    if (!newSchedule.name.trim()) {
      toast.error("Schedule name is required");
      return;
    }
    try {
      await createRetentionSchedule(newSchedule);
      toast.success("Retention schedule created");
      setScheduleDialogOpen(false);
      setNewSchedule({
        name: "",
        description: "",
        retention_years: 7,
        retention_months: 0,
        disposition_action: "review",
      });
      await loadAll();
    } catch (error) {
      logError("Create retention schedule failed", error);
      toast.error("Failed to create retention schedule");
    }
  };

  const handleCreateHold = async () => {
    if (!newHold.name.trim()) {
      toast.error("Hold name is required");
      return;
    }
    const correspondenceIds = newHold.correspondence_ids
      .split(/[\s,]+/)
      .map((id) => id.trim())
      .filter(Boolean);
    try {
      await createLegalHold({
        name: newHold.name,
        matter_reference: newHold.matter_reference,
        description: newHold.description,
        correspondence_ids: correspondenceIds.length ? correspondenceIds : undefined,
      });
      toast.success("Legal hold created");
      setHoldDialogOpen(false);
      setNewHold({ name: "", matter_reference: "", description: "", correspondence_ids: "" });
      await loadAll();
    } catch (error) {
      logError("Create legal hold failed", error);
      toast.error("Failed to create legal hold");
    }
  };

  const handleGenerateDue = async () => {
    try {
      const result = await generateDueDisposalRequests();
      toast.success(`Created ${result.created} disposal request(s)`);
      await loadAll();
    } catch (error) {
      logError("Generate due disposals failed", error);
      toast.error("Failed to generate disposal requests");
    }
  };

  const statItems = [
    {
      key: "schedules",
      label: "Retention schedules",
      value: summary?.active_retention_schedules ?? 0,
    },
    {
      key: "holds",
      label: "Active legal holds",
      value: summary?.active_legal_holds ?? 0,
    },
    {
      key: "onHold",
      label: "On legal hold",
      value: summary?.correspondence_on_legal_hold ?? 0,
    },
    {
      key: "due",
      label: "Due for disposal",
      value: summary?.correspondence_due_for_disposal ?? 0,
    },
  ];

  return (
    <>
      <AdminPageShell
        title="Records & security"
        subtitle="Retention, legal holds, disposal, and document rights (DRM)."
        icon={Archive}
        tabs={<RecordsSecurityTabList />}
        actions={
          activeTab === "retention" ? (
            <Button size="compact" onClick={() => setScheduleDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              New schedule
            </Button>
          ) : activeTab === "holds" ? (
            <Button size="compact" onClick={() => setHoldDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              New hold
            </Button>
          ) : null
        }
      >
          {activeTab === "overview" ? (
          <div className="space-y-5">
            <StatStrip items={statItems} />
            <div className="rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Archived records</p>
              {summary?.archived_correspondence ?? 0} archived correspondence items not yet
              disposed. {summary?.pending_disposal_requests ?? 0} disposal request(s) awaiting
              review.
            </div>
          </div>
          ) : null}

          {activeTab === "retention" ? (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Retention</TableHead>
                    <TableHead>Disposition</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No retention schedules yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    schedules.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>
                          {s.retention_years}y {s.retention_months}m ({s.retention_days} days)
                        </TableCell>
                        <TableCell>{s.disposition_action}</TableCell>
                        <TableCell>
                          <Badge variant={s.is_active ? "default" : "secondary"}>
                            {s.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          ) : null}

          {activeTab === "holds" ? (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Matter ref</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No legal holds
                      </TableCell>
                    </TableRow>
                  ) : (
                    holds.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-medium">{h.name}</TableCell>
                        <TableCell>{h.matter_reference || "—"}</TableCell>
                        <TableCell>{h.correspondence_count}</TableCell>
                        <TableCell>
                          <Badge variant={h.is_active ? "destructive" : "secondary"}>
                            {h.is_active ? "Active" : "Released"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={exportingHoldId === h.id}
                              onClick={async () => {
                                setExportingHoldId(h.id);
                                try {
                                  const { blob, correspondenceCount, documentCount, sha256 } =
                                    await downloadEdiscoveryExport(h.id);
                                  const stamp = new Date().toISOString().split("T")[0];
                                  const safeName = h.name.replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 40);
                                  downloadBlob(blob, `ediscovery-${safeName}-${stamp}.zip`);
                                  toast.success(
                                    `eDiscovery bundle exported (${correspondenceCount ?? 0} correspondence, ${documentCount ?? 0} documents)${
                                      sha256 ? ` — SHA-256: ${sha256.slice(0, 12)}…` : ""
                                    }`,
                                  );
                                } catch (error) {
                                  logError("eDiscovery export failed", error);
                                  toast.error(
                                    error instanceof Error ? error.message : "Export failed",
                                  );
                                } finally {
                                  setExportingHoldId(null);
                                }
                              }}
                            >
                              <Download className={`h-3.5 w-3.5 mr-1 ${exportingHoldId === h.id ? "animate-pulse" : ""}`} />
                              Export
                            </Button>
                            {h.is_active && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    await releaseLegalHold(h.id);
                                    toast.success("Legal hold released");
                                    await loadAll();
                                  } catch (_error) {
                                    toast.error("Failed to release hold");
                                  }
                                }}
                              >
                                Release
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          ) : null}

          {activeTab === "disposal" ? (
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="compact" onClick={() => void handleGenerateDue()}>
                Generate due requests
              </Button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disposals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No disposal requests
                      </TableCell>
                    </TableRow>
                  ) : (
                    disposals.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.correspondence_reference}</TableCell>
                        <TableCell className="max-w-xs truncate">{d.correspondence_subject}</TableCell>
                        <TableCell>{statusBadge(d.status)}</TableCell>
                        <TableCell className="space-x-2">
                          {d.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={async () => {
                                  await approveDisposalRequest(d.id);
                                  toast.success("Disposal approved");
                                  await loadAll();
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  await rejectDisposalRequest(d.id, "Rejected by administrator");
                                  toast.success("Disposal rejected");
                                  await loadAll();
                                }}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {d.status === "approved" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={async () => {
                                await completeDisposalRequest(d.id);
                                toast.success("Disposal completed");
                                await loadAll();
                              }}
                            >
                              Complete disposal
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          ) : null}
      </AdminPageShell>

    <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New retention schedule</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="schedule-name">Name</Label>
            <Input
              id="schedule-name"
              value={newSchedule.name}
              onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="schedule-desc">Description</Label>
            <Textarea
              id="schedule-desc"
              value={newSchedule.description}
              onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Years</Label>
              <Input
                type="number"
                min={0}
                value={newSchedule.retention_years}
                onChange={(e) =>
                  setNewSchedule({ ...newSchedule, retention_years: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Months</Label>
              <Input
                type="number"
                min={0}
                value={newSchedule.retention_months}
                onChange={(e) =>
                  setNewSchedule({ ...newSchedule, retention_months: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div>
            <Label>Disposition action</Label>
            <Select
              value={newSchedule.disposition_action}
              onValueChange={(v) =>
                setNewSchedule({
                  ...newSchedule,
                  disposition_action: v as "review" | "archive" | "delete",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="review">Review before disposal</SelectItem>
                <SelectItem value="archive">Permanent archive</SelectItem>
                <SelectItem value="delete">Secure disposal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleCreateSchedule()}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={holdDialogOpen} onOpenChange={setHoldDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New legal hold</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={newHold.name}
              onChange={(e) => setNewHold({ ...newHold, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Matter reference</Label>
            <Input
              value={newHold.matter_reference}
              onChange={(e) => setNewHold({ ...newHold, matter_reference: e.target.value })}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={newHold.description}
              onChange={(e) => setNewHold({ ...newHold, description: e.target.value })}
            />
          </div>
          <div>
            <Label>Correspondence IDs (comma-separated, optional)</Label>
            <Textarea
              placeholder="uuid-1, uuid-2"
              value={newHold.correspondence_ids}
              onChange={(e) => setNewHold({ ...newHold, correspondence_ids: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setHoldDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleCreateHold()}>Create hold</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

export default function RecordsGovernancePage() {
  return (
    <ClientErrorBoundary>
      <Suspense fallback={null}>
        <RecordsGovernanceContent />
      </Suspense>
    </ClientErrorBoundary>
  );
}
