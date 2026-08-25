"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { QueuePageShell } from "@/components/shared/QueuePageShell";
import { ListRowCard } from "@/components/shared/ListRowCard";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Separator } from "@/components/ui/separator";
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

export default function AuditFormsPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [templateData, submissionData] = await Promise.all([
        apiFetch<{ results: FormTemplate[] } | FormTemplate[]>(
          "/forms/templates/?category=audit"
        ),
        apiFetch<{ results: SubmissionRow[] } | SubmissionRow[]>(
          "/forms/submissions/"
        ),
      ]);

      const templatesList = Array.isArray(templateData)
        ? templateData
        : templateData.results;

      const submissionsList = Array.isArray(submissionData)
        ? submissionData
        : submissionData.results;

      setTemplates(templatesList);
      setSubmissions(submissionsList);
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

  const auditTemplates = templates.filter((t) =>
    AUDIT_TEMPLATE_SLUGS.includes(t.slug)
  );

  return (
    <QueuePageShell
      title="Forms"
      subtitle="Office forms, checklists, and submissions."
    >
      {loading ? (
        <LoadingState message="Loading forms…" />
      ) : error ? (
        <EmptyState
          icon="file"
          title="Could not load forms"
          message={error}
          actionLabel="Retry"
          onAction={() => void fetchData()}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {auditTemplates.map((template) => {
              const meta = TEMPLATE_META[template.slug] || {
                title: template.name,
                description: template.description || "",
              };
              return (
                <div
                  key={template.id}
                  className="flex flex-col rounded-xl border border-border/60 bg-muted/20 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium">{meta.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {meta.description}
                      </p>
                    </div>
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                  <Button
                    size="compact"
                    className="mt-4 w-full"
                    onClick={() => handleStartNew(template.id)}
                    disabled={creating === template.id}
                  >
                    {creating === template.id ? (
                      "Creating..."
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Start New
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          <Separator className="my-2" />

          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Recent Submissions</h2>
            {submissions.length === 0 ? (
              <EmptyState
                icon="inbox"
                title="No submissions yet"
                message="Start a form above to create your first submission."
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/60">
                <div className={correspondenceQueueListStackClass} role="list">
                {submissions.map((sub) => {
                  const status = inferStatus(sub);
                  return (
                    <div key={sub.id} role="listitem">
                      <ListRowCard
                        density="compact"
                        href={`/audit/forms/${sub.id}`}
                        leading={
                          <div className={cn(correspondenceQueueLeadingBoxClass, "bg-primary/10")}>
                            <ClipboardCheck className={cn(correspondenceQueueLeadingIconClass, "text-primary")} />
                          </div>
                        }
                      >
                        <h4 className={correspondenceQueueSubjectClass}>{sub.template_name}</h4>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <Badge
                            variant={getBadgeVariant(status)}
                            className={cn(
                              "h-5 px-1.5 text-[10px]",
                              status === "Completed" &&
                                "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
                            )}
                          >
                            {status}
                          </Badge>
                        </div>
                        <div className={cn(correspondenceQueueMetaRowClass, "mt-1")}>
                          {sub.submitted_by_name ? (
                            <span className={correspondenceQueueMetaItemClass}>
                              By: {sub.submitted_by_name}
                            </span>
                          ) : null}
                          <span className={correspondenceQueueMetaItemClass}>
                            Created: {formatDateTime(sub.createdAt)}
                          </span>
                          {sub.submitted_at ? (
                            <span className={correspondenceQueueMetaItemClass}>
                              Submitted: {formatDateTime(sub.submitted_at)}
                            </span>
                          ) : null}
                        </div>
                      </ListRowCard>
                    </div>
                  );
                })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </QueuePageShell>
  );
}
