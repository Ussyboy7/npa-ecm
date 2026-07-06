"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { ScanDialog } from "@/components/capture/ScanDialog";
import { BatchUploadDialog } from "@/components/capture/BatchUploadDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Scan,
  Upload,
  RefreshCw,
  FileText,
  Layers,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  listBatchUploads,
  listCaptureJobs,
  retryCaptureJob,
  type BatchUpload,
  type CaptureJob,
} from "@/lib/capture-storage";
import { logError } from "@/lib/client-logger";

function jobStatusBadge(status: CaptureJob["status"]) {
  const styles: Record<CaptureJob["status"], string> = {
    pending: "bg-amber-100 text-amber-800",
    processing: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
  };
  return <Badge className={styles[status]}>{status}</Badge>;
}

function batchStatusBadge(status: BatchUpload["status"]) {
  const styles: Record<BatchUpload["status"], string> = {
    uploading: "bg-amber-100 text-amber-800",
    processing: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    partial: "bg-orange-100 text-orange-800",
  };
  return <Badge className={styles[status]}>{status}</Badge>;
}

function CaptureHubContent() {
  const [scanOpen, setScanOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [jobs, setJobs] = useState<CaptureJob[]>([]);
  const [batches, setBatches] = useState<BatchUpload[]>([]);
  const [loading, setLoading] = useState(true);

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

  const activeJobs = jobs.filter((j) => j.status === "pending" || j.status === "processing");
  const completedJobs = jobs.filter((j) => j.status === "completed").slice(0, 20);

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground">
            <Scan className="h-8 w-8 shrink-0 text-primary" />
            Content Capture
          </h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Scan documents, run batch uploads, and track OCR processing jobs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active jobs</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{activeJobs.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {jobs.filter((j) => j.status === "completed").length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Batch uploads</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{batches.length}</CardContent>
        </Card>
      </div>

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
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No capture jobs yet. Scan a document or upload from DMS to start OCR.
                    </TableCell>
                  </TableRow>
                ) : (
                  [...activeJobs, ...completedJobs].map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        {job.document ? (
                          <Link
                            href={`/dms/${job.document.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {job.document.title}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="uppercase text-xs">{job.job_type}</TableCell>
                      <TableCell>{jobStatusBadge(job.status)}</TableCell>
                      <TableCell className="w-40">
                        {(job.status === "processing" || job.status === "pending") && (
                          <div className="space-y-1">
                            <Progress value={job.progress_percentage} />
                            <span className="text-xs text-muted-foreground">
                              {job.progress_percentage}%
                            </span>
                          </div>
                        )}
                        {job.status === "failed" && (
                          <span className="text-xs text-destructive line-clamp-2">
                            {job.error_message || "Processing failed"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(job.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {job.status === "failed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await retryCaptureJob(job.id);
                                toast.success("Job requeued");
                                await loadData();
                              } catch {
                                toast.error("Failed to retry job");
                              }
                            }}
                          >
                            Retry
                          </Button>
                        )}
                        {job.status === "processing" && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="batches">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Files</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>OCR</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No batch uploads yet
                    </TableCell>
                  </TableRow>
                ) : (
                  batches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>
                        {batch.successful_files}/{batch.total_files} successful
                        {batch.failed_files > 0 && (
                          <span className="ml-1 text-destructive">({batch.failed_files} failed)</span>
                        )}
                      </TableCell>
                      <TableCell>{batchStatusBadge(batch.status)}</TableCell>
                      <TableCell>
                        {batch.total_files > 0 && (
                          <span className="text-sm">
                            {batch.processed_files}/{batch.total_files} processed
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{batch.process_ocr ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(batch.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <ScanDialog open={scanOpen} onOpenChange={setScanOpen} />
      <BatchUploadDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        onComplete={() => void loadData()}
      />
    </div>
  );
}

export default function ContentCapturePage() {
  return (
    <ClientErrorBoundary>
      <CaptureHubContent />
    </ClientErrorBoundary>
  );
}
