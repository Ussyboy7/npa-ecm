"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { listFormDocuments, type FormDocument } from "@/lib/api/dms-forms";
import { fetchAllPaginatedResults } from "@/lib/pagination-utils";
import { ListRowCard } from "@/components/shared/ListRowCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormDocumentsList } from "@/components/forms/FormDocumentsList";
import { FileText, ClipboardCheck, Plus } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { formatDateTime } from "@/lib/correspondence-helpers";
import { logError } from "@/lib/client-logger";
import type { FormTemplate, FormSubmission } from "@/lib/types/forms";
import {
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueListStackClass,
  correspondenceQueueMetaItemClass,
  correspondenceQueueMetaRowClass,
  correspondenceQueueSubjectClass,
} from "@/components/shared/registry-queue-styles";

interface SubmissionRow {
  id: string;
  template_id: string;
  template_name: string;
  is_draft: boolean;
  status: string;
  submitted_by_name?: string;
  submitted_at?: string;
  createdAt: string;
}

const AUDIT_TEMPLATE_SLUGS = [
  "project-monitoring-report-audit",
  "witnessing-of-deliveries",
  "audit-query-bills-certification",
];

const TEMPLATE_META: Record<string, { title: string; description: string }> = {
  "project-monitoring-report-audit": {
    title: "Project Monitoring Report (Audit)",
    description: "Audit project progress, budgets, and implementation status.",
  },
  "witnessing-of-deliveries": {
    title: "Witnessing of Deliveries",
    description: "Record delivery observations, quantities, and compliance.",
  },
  "audit-query-bills-certification": {
    title: "Audit Query — Bills Certification",
    description: "Certify bills and respond to audit queries.",
  },
};

function getBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "draft":
    case "Draft":
      return "secondary";
    case "submitted":
    case "Submitted":
      return "default";
    case "in_progress":
    case "In Progress":
      return "outline";
    case "completed":
    case "Completed":
      return "default";
    default:
      return "secondary";
  }
}

function inferStatus(submission: SubmissionRow): string {
  if (submission.status) return submission.status;
  return submission.is_draft ? "Draft" : "Submitted";
}

function isDraftSubmission(submission: SubmissionRow): boolean {
  return submission.is_draft || inferStatus(submission).toLowerCase() === "draft";
}

export type FormsSegment = "available" | "pending" | "submissions" | "signed";

export interface AuditFormsStats {
  available: number;
  pending: number;
  drafts: number;
  submitted: number;
  signed: number;
}

export function AuditFormsLibrary({
  onStatsChange,
  initialSegment = "available",
  segment,
  onSegmentChange,
}: {
  onStatsChange?: (stats: AuditFormsStats) => void;
  initialSegment?: FormsSegment;
  /** Controlled segment (e.g. from the URL). Falls back to local state when omitted. */
  segment?: FormsSegment;
  onSegmentChange?: (segment: FormsSegment) => void;
} = {}) {
  const router = useRouter();
  const [localSegment, setLocalSegment] = useState<FormsSegment>(initialSegment);
  const activeSegment = segment ?? localSegment;
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [pendingForms, setPendingForms] = useState<FormDocument[]>([]);
  const [signedForms, setSignedForms] = useState<FormDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [templateData, submissionData, pending, signed] = await Promise.all([
        apiFetch<{ results: FormTemplate[] } | FormTemplate[]>("/forms/templates/?category=audit"),
        apiFetch<{ results: SubmissionRow[] } | SubmissionRow[]>("/forms/submissions/"),
        fetchAllPaginatedResults<FormDocument>((page, pageSize) =>
          listFormDocuments({ page, pageSize, pendingMySignature: true })
        ),
        fetchAllPaginatedResults<FormDocument>((page, pageSize) =>
          listFormDocuments({ page, pageSize, signedByMe: true })
        ),
      ]);

      setTemplates(Array.isArray(templateData) ? templateData : templateData.results);
      setSubmissions(Array.isArray(submissionData) ? submissionData : submissionData.results);
      setPendingForms(pending);
      setSignedForms(signed);
    } catch (err) {
      logError("Failed to load forms", err);
      setError("Failed to load forms. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const auditTemplates = useMemo(
    () => templates.filter((template) => AUDIT_TEMPLATE_SLUGS.includes(template.slug)),
    [templates]
  );

  const drafts = useMemo(() => submissions.filter(isDraftSubmission), [submissions]);
  const submitted = useMemo(() => submissions.filter((s) => !isDraftSubmission(s)), [submissions]);

  useEffect(() => {
    if (!onStatsChange) return;
    onStatsChange({
      available: auditTemplates.length,
      pending: pendingForms.length,
      drafts: drafts.length,
      submitted: submitted.length,
      signed: signedForms.length,
    });
  }, [onStatsChange, auditTemplates.length, pendingForms.length, drafts.length, submitted.length, signedForms.length]);

  const handleStartNew = async (templateId: string) => {
    setCreating(templateId);
    try {
      const submission = await apiFetch<FormSubmission>("/forms/submissions/", {
        method: "POST",
        body: JSON.stringify({
          template_id: templateId,
          data: {},
          is_draft: true,
        }),
      });
      toast.success("Draft created");
      router.push(`/audit/forms/${submission.id}`);
    } catch (err) {
      logError("Failed to create draft", err);
      toast.error("Failed to create draft submission");
      setCreating(null);
    }
  };

  if (loading) {
    return <LoadingState message="Loading forms…" />;
  }

  if (error) {
    return (
      <EmptyState
        icon="file"
        title="Could not load forms"
        message={error}
        actionLabel="Retry"
        onAction={() => void fetchData()}
      />
    );
  }

  const handleSegmentChange = (value: string) => {
    const next = value as FormsSegment;
    if (segment === undefined) setLocalSegment(next);
    onSegmentChange?.(next);
  };

  return (
    <Tabs value={activeSegment} onValueChange={handleSegmentChange} className="space-y-4">
      <TabsList>
        <TabsTrigger value="available" className="text-xs px-2.5 py-1">
          Available forms
        </TabsTrigger>
        <TabsTrigger value="pending" className="text-xs px-2.5 py-1 gap-1.5">
          Pending my signature
          {pendingForms.length > 0 && (
            <Badge variant="destructive" className="h-4 min-w-[1rem] px-1 text-[10px]">
              {pendingForms.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="submissions" className="text-xs px-2.5 py-1">
          My submissions
        </TabsTrigger>
        <TabsTrigger value="signed" className="text-xs px-2.5 py-1">
          Signed by me
        </TabsTrigger>
      </TabsList>

      <TabsContent value="available">
        {auditTemplates.length === 0 ? (
          <EmptyState
            icon="file"
            title="No forms available"
            message="No audit forms are assigned to your role yet."
            variant="dashed"
          />
        ) : (
          <div className={correspondenceQueueListStackClass} role="list">
            {auditTemplates.map((template) => {
              const meta = TEMPLATE_META[template.slug] || {
                title: template.name,
                description: template.description || "",
              };
              return (
                <div key={template.id} role="listitem">
                  <ListRowCard
                    density="compact"
                    leading={
                      <div className={cn(correspondenceQueueLeadingBoxClass, "bg-primary/10")}>
                        <FileText className={cn(correspondenceQueueLeadingIconClass, "text-primary")} />
                      </div>
                    }
                    actions={
                      <Button
                        size="compact"
                        variant="outline"
                        onClick={() => handleStartNew(template.id)}
                        disabled={creating === template.id}
                      >
                        {creating === template.id ? (
                          "Creating..."
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Start
                          </>
                        )}
                      </Button>
                    }
                  >
                    <h4 className={correspondenceQueueSubjectClass}>{meta.title}</h4>
                    <p className="mt-0.5 text-xs text-muted-foreground">{meta.description}</p>
                  </ListRowCard>
                </div>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="pending">
        <FormDocumentsList forms={pendingForms} loading={false} tone="pending" />
      </TabsContent>

      <TabsContent value="submissions">
        {submissions.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="No submissions yet"
            message="Start a form from Available forms to create your first submission."
            variant="dashed"
          />
        ) : (
          <div className={correspondenceQueueListStackClass} role="list">
            {[...drafts, ...submitted].map((submission) => {
              const status = inferStatus(submission);
              return (
                <div key={submission.id} role="listitem">
                  <ListRowCard
                    density="compact"
                    href={`/audit/forms/${submission.id}`}
                    leading={
                      <div className={cn(correspondenceQueueLeadingBoxClass, "bg-primary/10")}>
                        <ClipboardCheck className={cn(correspondenceQueueLeadingIconClass, "text-primary")} />
                      </div>
                    }
                  >
                    <h4 className={correspondenceQueueSubjectClass}>{submission.template_name}</h4>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <Badge variant={getBadgeVariant(status)} className="h-5 px-1.5 text-[10px]">
                        {status}
                      </Badge>
                    </div>
                    <div className={cn(correspondenceQueueMetaRowClass, "mt-1")}>
                      {submission.submitted_by_name ? (
                        <span className={correspondenceQueueMetaItemClass}>
                          By: {submission.submitted_by_name}
                        </span>
                      ) : null}
                      <span className={correspondenceQueueMetaItemClass}>
                        Created: {formatDateTime(submission.createdAt)}
                      </span>
                      {submission.submitted_at ? (
                        <span className={correspondenceQueueMetaItemClass}>
                          Submitted: {formatDateTime(submission.submitted_at)}
                        </span>
                      ) : null}
                    </div>
                  </ListRowCard>
                </div>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="signed">
        <FormDocumentsList forms={signedForms} loading={false} tone="signed" />
      </TabsContent>
    </Tabs>
  );
}
