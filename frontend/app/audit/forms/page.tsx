"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Separator } from "@/components/ui/separator";
import { FileText, ClipboardCheck, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/correspondence-helpers";
import { logError } from "@/lib/client-logger";
import type { FormTemplate, FormSubmission } from "@/lib/types/forms";

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
      logError("Failed to load audit forms", err);
      setError("Failed to load audit forms. Please try again.");
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
    <AdminPageShell
      title="Audit Forms"
      subtitle="Complete audit checklists, monitoring reports, and certification forms."
      icon={ClipboardCheck}
    >
      {loading ? (
        <LoadingState message="Loading audit forms..." />
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
          <div className="grid gap-6 md:grid-cols-3">
            {auditTemplates.map((template) => {
              const meta = TEMPLATE_META[template.slug] || {
                title: template.name,
                description: template.description || "",
              };
              return (
                <Card key={template.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{meta.title}</CardTitle>
                      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {meta.description}
                    </p>
                  </CardHeader>
                  <CardContent className="mt-auto pt-0">
                    <Button
                      className="w-full"
                      onClick={() => handleStartNew(template.id)}
                      disabled={creating === template.id}
                    >
                      {creating === template.id ? (
                        "Creating..."
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Start New
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Separator className="my-6" />

          <div>
            <h2 className="mb-4 text-lg font-semibold">Recent Submissions</h2>
            {submissions.length === 0 ? (
              <EmptyState
                icon="inbox"
                title="No submissions yet"
                message="Start a new audit form above to create your first submission."
              />
            ) : (
              <div className="space-y-2">
                {submissions.map((sub) => {
                  const status = inferStatus(sub);
                  return (
                    <Card
                      key={sub.id}
                      className="cursor-pointer transition-colors hover:bg-accent/50"
                      onClick={() => router.push(`/audit/forms/${sub.id}`)}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex min-w-0 flex-1 flex-col gap-1 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {sub.template_name}
                            </span>
                            <Badge
                              variant={getBadgeVariant(status)}
                              className={cn(
                                status === "Completed" && "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
                              )}
                            >
                              {status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {sub.submitted_by_name && (
                              <span>By: {sub.submitted_by_name}</span>
                            )}
                            <span>
                              Created: {formatDateTime(sub.createdAt)}
                            </span>
                            {sub.submitted_at && (
                              <span>
                                Submitted: {formatDateTime(sub.submitted_at)}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </AdminPageShell>
  );
}
