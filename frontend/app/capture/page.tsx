"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { ScanDialog } from "@/components/capture/ScanDialog";
import { BatchUploadDialog } from "@/components/capture/BatchUploadDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Scan,
  Upload,
  RefreshCw,
  FileText,
  Layers,
  Loader2,
  Link2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  listBatchUploads,
  listCaptureJobs,
  retryCaptureJob,
  cancelCaptureJob,
  type BatchUpload,
  type CaptureJob,
} from "@/lib/api/capture";
import { logError } from "@/lib/client-logger";
import { ListRowCard } from "@/components/shared/ListRowCard";
import { QueuePageShell } from "@/components/shared/QueuePageShell";
import { StatStrip } from "@/components/shared/StatStrip";
import {
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueListStackClass,
} from "@/components/shared/registry-queue-styles";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/datetime";

function jobStatusBadge(status: CaptureJob["status"]) {
  const styles: Record<CaptureJob["status"], string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    processing: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    completed: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    cancelled: "bg-muted text-muted-foreground border-border",
  };
  return <Badge className={styles[status]}>{status}</Badge>;
}

function batchStatusBadge(status: BatchUpload["status"]) {
  const styles: Record<BatchUpload["status"], string> = {
    uploading: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    processing: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    completed: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    partial: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  };
  return <Badge className={styles[status]}>{status}</Badge>;
}

function CaptureHubContent() {
  const [scanOpen, setScanOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [jobs, setJobs] = useState<CaptureJob[]>([]);
  const [batches, setBatches] = useState<BatchUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionJobId, setActionJobId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [jobData, batchData] = await Promise.all([listCaptureJobs(), listBatchUploads()]);
      setJobs(jobData);
      setBatches(batchData);
    } catch (error) {
      logError("Failed to load capture hub data", error);
      toast.error("Could not load capture jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const hasActiveJobs = useMemo(
    () => jobs.some((j) => j.status === "pending" || j.status === "processing"),
    [jobs],
  );

  useEffect(() => {
    if (!hasActiveJobs) return;
    const interval = setInterval(() => {
      void listCaptureJobs()
        .then(setJobs)
        .catch(() => undefined);
    }, 3000);
    return () => clearInterval(interval);
  }, [hasActiveJobs]);

  const activeJobs = useMemo(() => {
    const active = jobs.filter((j) => j.status === "pending" || j.status === "processing");
    const latestByDocument = new Map<string, CaptureJob>();
    for (const job of active) {
      const docId = job.document?.id;
      if (!docId) {
        latestByDocument.set(job.id, job);
        continue;
      }
      const existing = latestByDocument.get(docId);
      if (!existing || new Date(job.created_at) > new Date(existing.created_at)) {
        latestByDocument.set(docId, job);
      }
    }
    return Array.from(latestByDocument.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [jobs]);
  const completedJobs = jobs.filter((j) => j.status === "completed").slice(0, 20);

  const handleCancelJob = async (jobId: string) => {
    setActionJobId(jobId);
    try {
      await cancelCaptureJob(jobId);
      toast.success("Job cancelled");
      await loadData();
    } catch {
      toast.error("Failed to cancel job");
    } finally {
      setActionJobId(null);
    }
  };

  const handleRestartJob = async (jobId: string) => {
    setActionJobId(jobId);
    try {
      await retryCaptureJob(jobId);
      toast.success("Job restarted from the beginning");
      await loadData();
    } catch {
      toast.error("Failed to restart job");
    } finally {
      setActionJobId(null);
    }
  };

  const renderJobActions = (job: CaptureJob) => {
    const busy = actionJobId === job.id;

    if (job.status === "failed") {
      return (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={busy}
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await handleRestartJob(job.id);
          }}
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Restart"}
        </Button>
      );
    }

    if (job.status === "pending" || job.status === "processing") {
      return (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={busy}
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              await handleRestartJob(job.id);
            }}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Restart"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground"
            disabled={busy}
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              await handleCancelJob(job.id);
            }}
          >
            Cancel
          </Button>
        </div>
      );
    }

    return undefined;
  };

  return (
    <QueuePageShell
      title="Content Capture"
      subtitle="Scan documents, run batch uploads, and track OCR processing jobs."
      actions={(
        <>
          <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setScanOpen(true)}>
            <Scan className="mr-2 h-4 w-4" />
            Scan document
          </Button>
          <Button variant="secondary" onClick={() => setBatchOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Batch upload
          </Button>
        </>
      )}
      stats={(
        <StatStrip
          items={[
            { key: 'active', label: 'Active jobs', value: activeJobs.length },
            { key: 'completed', label: 'Completed', value: jobs.filter((j) => j.status === "completed").length },
            { key: 'batches', label: 'Batch uploads', value: batches.length },
          ]}
        />
      )}
    >
      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="jobs">
            <FileText className="mr-2 h-4 w-4" />
            Capture jobs
          </TabsTrigger>
          <TabsTrigger value="batches">
            <Layers className="mr-2 h-4 w-4" />
            Batch uploads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          {jobs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No capture jobs yet. Scan a document or upload from DMS to start OCR.
              </CardContent>
            </Card>
          ) : (
            <div className={correspondenceQueueListStackClass}>
              {[...activeJobs, ...completedJobs].map((job) => (
                <ListRowCard
                  key={job.id}
                  density="compact"
                  href={job.document ? `/dms/${job.document.id}` : undefined}
                  leading={(
                    <div className={cn(
                      correspondenceQueueLeadingBoxClass,
                      job.status === "completed" ? "bg-green-500/10" :
                      job.status === "failed" ? "bg-red-500/10" :
                      job.status === "processing" ? "bg-blue-500/10" :
                      "bg-amber-500/10"
                    )}>
                      <FileText className={cn(
                        correspondenceQueueLeadingIconClass,
                        job.status === "completed" ? "text-green-600 dark:text-green-400" :
                        job.status === "failed" ? "text-red-600 dark:text-red-400" :
                        job.status === "processing" ? "text-blue-600 dark:text-blue-400" :
                        "text-amber-600 dark:text-amber-400"
                      )} />
                    </div>
                  )}
                  actions={renderJobActions(job)}
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {job.document ? job.document.title : "Untitled"}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="text-[10px] uppercase text-muted-foreground font-medium">{job.job_type}</span>
                        {jobStatusBadge(job.status)}
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {formatDateShort(job.created_at)}
                    </span>
                  </div>
                  {(job.status === "processing" || job.status === "pending") && (
                    <div className="space-y-1 mt-1">
                      <Progress value={job.progress_percentage} className="h-1.5" />
                      <span className="text-[11px] text-muted-foreground">{job.progress_percentage}%</span>
                    </div>
                  )}
                  {job.status === "failed" && job.error_message && (
                    <p className="text-xs text-destructive line-clamp-2 mt-1">{job.error_message}</p>
                  )}
                </ListRowCard>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="batches">
          {batches.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No batch uploads yet
              </CardContent>
            </Card>
          ) : (
            <div className={correspondenceQueueListStackClass}>
              {batches.map((batch) => (
                <ListRowCard
                  key={batch.id}
                  density="compact"
                  leading={(
                    <div className={cn(
                      correspondenceQueueLeadingBoxClass,
                      batch.status === "completed" ? "bg-green-500/10" :
                      batch.status === "failed" ? "bg-red-500/10" :
                      "bg-blue-500/10"
                    )}>
                      <Layers className={cn(
                        correspondenceQueueLeadingIconClass,
                        batch.status === "completed" ? "text-green-600 dark:text-green-400" :
                        batch.status === "failed" ? "text-red-600 dark:text-red-400" :
                        "text-blue-600 dark:text-blue-400"
                      )} />
                    </div>
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {batchStatusBadge(batch.status)}
                      {batch.process_ocr && (
                        <Badge variant="outline" className="h-5 rounded-md border px-1.5 py-0 text-[10px] font-semibold leading-none gap-1">
                          <CheckCircle2 className="h-3 w-3" />OCR
                        </Badge>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {formatDateShort(batch.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="inline-flex items-center gap-1">
                      <Link2 className="h-3 w-3" />
                      {batch.successful_files}/{batch.total_files} files
                    </span>
                    {batch.failed_files > 0 && (
                      <span className="inline-flex items-center gap-1 text-destructive">
                        <XCircle className="h-3 w-3" />
                        {batch.failed_files} failed
                      </span>
                    )}
                    {batch.total_files > 0 && (
                      <span className="inline-flex items-center gap-1">
                        {batch.processed_files}/{batch.total_files} processed
                      </span>
                    )}
                  </div>
                </ListRowCard>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ScanDialog open={scanOpen} onOpenChange={setScanOpen} />
      <BatchUploadDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        onComplete={() => void loadData()}
      />
    </QueuePageShell>
  );
}

export default function ContentCapturePage() {
  return (
    <ClientErrorBoundary>
      <CaptureHubContent />
    </ClientErrorBoundary>
  );
}
