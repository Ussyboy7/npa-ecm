"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  ArrowLeft,
  Save,
  Send,
  Plus,
  Trash2,
  Download,
  UserCheck,
  Loader2,
  Eye,
  Pencil,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { logError } from "@/lib/client-logger";
import { formatDateTime } from "@/lib/correspondence-helpers";
import { cn } from "@/lib/utils";
import type {
  FormTemplate,
  FormSubmission,
  FormSignatureWorkflow,
  FormSignature,
} from "@/lib/types/forms";

interface TableFieldColumn {
  key: string;
  label: string;
  type: "text" | "number" | "currency" | "calculated";
  formula?: string;
  width?: string;
}

interface TableFieldConfig {
  id: string;
  name: string;
  label: string;
  type: "table";
  columns: TableFieldColumn[];
  min_rows?: number;
}

type AuditField = {
  id: string;
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  columns?: TableFieldColumn[];
  options?: { value: string; label: string }[];
};

type AuditSection = {
  id: string;
  title: string;
  fields: string[];
};

const DEFAULT_TABLE_ROWS = 10;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(value);
}

function parseCurrency(raw: string): number {
  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  return parseFloat(cleaned) || 0;
}

function evaluateFormula(formula: string, rowValues: Record<string, number>): number {
  if (!formula) return 0;
  let expr = formula;
  for (const [key, val] of Object.entries(rowValues)) {
    expr = expr.replace(new RegExp(`\\b${key}\\b`, "g"), String(val));
  }
  try {
    const result = Function(`"use strict"; return (${expr})`)();
    return typeof result === "number" && isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}

function TableFieldRenderer({
  field,
  value,
  onChange,
}: {
  field: TableFieldConfig;
  value: Record<string, unknown>[];
  onChange: (rows: Record<string, unknown>[]) => void;
}) {
  const columns = field.columns || [];
  const rows = Array.isArray(value) && value.length > 0 ? value : [];

  useEffect(() => {
    const min = Math.max(field.min_rows || DEFAULT_TABLE_ROWS, 1);
    if (rows.length < min) {
      const newRows = [...rows];
      while (newRows.length < min) {
        const row: Record<string, unknown> = {};
        for (const col of columns) {
          row[col.key] = col.type === "number" || col.type === "currency" ? 0 : "";
        }
        newRows.push(row);
      }
      onChange(recalculateCalculated(newRows));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recalculateCalculated = (currentRows: Record<string, unknown>[]) => {
    return currentRows.map((row) => {
      const newRow = { ...row };
      const numericValues: Record<string, number> = {};
      for (const col of columns) {
        if (col.type === "number") {
          numericValues[col.key] = typeof newRow[col.key] === "number" ? (newRow[col.key] as number) : 0;
        } else if (col.type === "currency") {
          numericValues[col.key] = typeof newRow[col.key] === "number" ? (newRow[col.key] as number) : 0;
        }
      }
      for (const col of columns) {
        if (col.type === "calculated" && col.formula) {
          newRow[col.key] = evaluateFormula(col.formula, numericValues);
        }
      }
      return newRow;
    });
  };

  const updateCell = (rowIndex: number, colKey: string, rawValue: string | number | boolean) => {
    const updated = rows.map((row, ri) => {
      if (ri !== rowIndex) return row;
      const newRow = { ...row };
      const col = columns.find((c) => c.key === colKey);
      if (col?.type === "currency") {
        newRow[colKey] = typeof rawValue === "string" ? parseCurrency(rawValue) : rawValue;
      } else if (col?.type === "number") {
        newRow[colKey] = typeof rawValue === "string" ? (parseFloat(rawValue) || 0) : rawValue;
      } else {
        newRow[colKey] = rawValue;
      }
      return newRow;
    });
    onChange(recalculateCalculated(updated));
  };

  const addRow = () => {
    const newRow: Record<string, unknown> = {};
    for (const col of columns) {
      newRow[col.key] = col.type === "number" || col.type === "currency" ? 0 : "";
    }
    onChange(recalculateCalculated([...rows, newRow]));
  };

  const removeRow = (rowIndex: number) => {
    if (rows.length <= 1) {
      toast.error("Table must have at least one row");
      return;
    }
    const updated = rows.filter((_, ri) => ri !== rowIndex);
    onChange(recalculateCalculated(updated));
  };

  if (columns.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-10 px-2 py-2 text-left text-xs font-medium text-muted-foreground">#</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-2 py-2 text-left text-xs font-medium text-muted-foreground"
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                </th>
              ))}
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b last:border-0">
                <td className="px-2 py-1.5 text-xs text-muted-foreground">{ri + 1}</td>
                {columns.map((col) => {
                  if (col.type === "calculated") {
                    return (
                      <td key={col.key} className="px-2 py-1.5">
                        <div className="flex h-8 items-center rounded-md border border-transparent bg-muted/30 px-2 text-xs font-medium">
                          {col.formula && col.formula.includes(col.key)
                            ? ""
                            : formatCurrency(Number(row[col.key]) || 0)}
                        </div>
                      </td>
                    );
                  }
                  return (
                    <td key={col.key} className="px-2 py-1.5">
                      {col.type === "currency" ? (
                        <div className="relative">
                          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            ₦
                          </span>
                          <Input
                            type="number"
                            value={Number(row[col.key]) || 0}
                            onChange={(e) => updateCell(ri, col.key, e.target.value)}
                            className="h-8 pl-5 text-xs"
                          />
                        </div>
                      ) : col.type === "number" ? (
                        <Input
                          type="number"
                          value={Number(row[col.key]) || 0}
                          onChange={(e) => updateCell(ri, col.key, e.target.value)}
                          className="h-8 text-xs"
                        />
                      ) : (
                        <Input
                          type="text"
                          value={String(row[col.key] ?? "")}
                          onChange={(e) => updateCell(ri, col.key, e.target.value)}
                          className="h-8 text-xs"
                        />
                      )}
                    </td>
                  );
                })}
                <td className="px-2 py-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeRow(ri)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button variant="outline" size="sm" onClick={addRow}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add Row
      </Button>
    </div>
  );
}

export default function AuditFormFillPage() {
  const router = useRouter();
  const params = useParams();
  const submissionId = params.submissionId as string;

  const [submission, setSubmission] = useState<FormSubmission | null>(null);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [workflow, setWorkflow] = useState<FormSignatureWorkflow | null>(null);
  const [signatures, setSignatures] = useState<FormSignature[]>([]);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [signingId, setSigningId] = useState<string | null>(null);

  const [signFormData, setSignFormData] = useState<Record<string, { signer_name: string; signer_pn: string; signer_designation: string }>>({});
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [forwardTargetOffice, setForwardTargetOffice] = useState("");
  const [forwardSubject, setForwardSubject] = useState("");
  const [forwarding, setForwarding] = useState(false);

  const fetchSubmission = useCallback(async () => {
    try {
      setLoading(true);
      const [subData, workflowData] = await Promise.all([
        apiFetch<FormSubmission>(`/forms/submissions/${submissionId}/`),
        apiFetch<FormSignatureWorkflow | null>(
          `/forms/submissions/${submissionId}/signature_workflow/`
        ).catch(() => null),
      ]);

      setSubmission(subData);
      setTemplate(subData.template);
      setFormData(subData.data || {});
      setWorkflow(workflowData);
      setSignatures(workflowData?.signatures || []);
    } catch (err) {
      logError("Failed to load submission", err);
      toast.error("Failed to load submission");
      router.push("/audit/forms");
    } finally {
      setLoading(false);
    }
  }, [submissionId, router]);

  useEffect(() => {
    void fetchSubmission();
  }, [fetchSubmission]);

  const getFields = (): AuditField[] => {
    if (!template?.structure?.fields) return [];
    return template.structure.fields as AuditField[];
  };

  const getSections = (): AuditSection[] => {
    return (template?.structure?.sections as AuditSection[]) || [];
  };

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await apiFetch(`/forms/submissions/${submissionId}/`, {
        method: "PATCH",
        body: JSON.stringify({ data: formData, is_draft: true }),
      });
      setSubmission((prev) => (prev ? { ...prev, is_draft: true } : prev));
      toast.success("Draft saved");
    } catch (err) {
      logError("Failed to save draft", err);
      toast.error("Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await apiFetch(`/forms/submissions/${submissionId}/submit/`, {
        method: "POST",
      });
      toast.success("Form submitted successfully");
      void fetchSubmission();
    } catch (err) {
      logError("Failed to submit form", err);
      toast.error("Failed to submit form");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      const blob = await apiFetch<Blob>(
        `/forms/submissions/${submissionId}/generate_pdf/`,
        { responseType: "blob" as never }
      );
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success("PDF generated");
    } catch (err) {
      logError("Failed to generate PDF", err);
      toast.error("Failed to generate PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSign = async (signature: FormSignature) => {
    const data = signFormData[signature.id];
    if (!data?.signer_name?.trim() || !data?.signer_pn?.trim() || !data?.signer_designation?.trim()) {
      toast.error("Please fill in all signatory fields");
      return;
    }

    setSigningId(signature.id);
    try {
      if (!workflow) return;
      await apiFetch(`/forms/signature-workflows/${workflow.id}/sign/`, {
        method: "POST",
        body: JSON.stringify({
          signature_id: signature.id,
          signer_name: data.signer_name,
          signer_pn: data.signer_pn,
          signer_designation: data.signer_designation,
        }),
      });
      toast.success("Signed successfully");
      void fetchSubmission();
    } catch (err) {
      logError("Failed to sign", err);
      toast.error("Failed to complete signature");
    } finally {
      setSigningId(null);
    }
  };

  const getSignatureStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "signed":
        return "default";
      case "pending":
        return "outline";
      case "rejected":
        return "destructive";
      case "skipped":
        return "secondary";
      default:
        return "outline";
    }
  };

  const handleForwardViaCorrespondence = async () => {
    if (!forwardTargetOffice || !forwardSubject.trim()) {
      toast.error("Select target office and enter subject");
      return;
    }
    setForwarding(true);
    try {
      const corr = await apiFetch<{ id: string }>("/correspondence/items/", {
        method: "POST",
        body: JSON.stringify({
          subject: forwardSubject.trim(),
          body_html: `<p>Audit query <strong>${template?.name}</strong> certified by GM Audit — forwarded for your explanation/action.</p><p>Form: ${submission?.id}</p>`,
          correspondence_type: "audit_query",
          priority: "high",
          owning_office: forwardTargetOffice,
          amount: 0,
        }),
      });
      // Link form to correspondence via case or direct link if available
      try {
        await apiFetch(`/correspondence/items/${corr.id}/link-document/`, {
          method: "POST",
          body: JSON.stringify({ document_id: submission?.id }),
        });
      } catch { /* link optional — correspondence itself is the audit trail */ }
      toast.success("Audit query forwarded via correspondence");
      setForwardDialogOpen(false);
      setForwardTargetOffice("");
      setForwardSubject("");
      router.push(`/correspondence/${corr.id}`);
    } catch (err) {
      logError("Failed to forward audit query", err);
      toast.error("Failed to create correspondence");
    } finally {
      setForwarding(false);
    }
  };

  const canSign = (sig: FormSignature): boolean => {
    if (sig.status !== "pending") return false;
    if (!workflow) return false;
    if (workflow.routing_mode === "sequential") {
      return sig.order === workflow.current_step;
    }
    return true;
  };

  const isReadOnly = !submission?.is_draft;

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <LoadingState message="Loading submission..." />
      </div>
    );
  }

  if (!submission || !template) {
    return (
      <div className="container mx-auto p-6">
        <EmptyState
          icon="file"
          title="Submission not found"
          message="The submission could not be loaded."
          actionLabel="Back to forms"
          onAction={() => router.push("/audit/forms")}
        />
      </div>
    );
  }

  const fields = getFields();
  const sections = getSections();
  const hasSections = sections.length > 0;

  const unsectionedFields = hasSections
    ? fields.filter((f) => !sections.some((s) => s.fields.includes(f.id)))
    : fields;

  const getFieldValue = (field: AuditField) => {
    return formData[field.name] ?? "";
  };

  const renderFieldInput = (field: AuditField) => {
    const value = getFieldValue(field);

    if (field.type === "table") {
      return (
        <TableFieldRenderer
          field={field as unknown as TableFieldConfig}
          value={Array.isArray(value) ? (value as Record<string, unknown>[]) : []}
          onChange={(rows) => handleFieldChange(field.name, rows)}
        />
      );
    }

    if (field.type === "textarea") {
      return (
        <Textarea
          id={field.name}
          value={String(value ?? "")}
          onChange={(e) => handleFieldChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          disabled={isReadOnly}
          rows={4}
        />
      );
    }

    if (field.type === "checkbox") {
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={field.name}
            checked={Boolean(value)}
            onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
            disabled={isReadOnly}
          />
          <Label htmlFor={field.name} className="text-sm font-normal cursor-pointer">
            {field.label}
          </Label>
        </div>
      );
    }

    if (field.type === "date") {
      return (
        <Input
          id={field.name}
          type="date"
          value={String(value ?? "")}
          onChange={(e) => handleFieldChange(field.name, e.target.value)}
          disabled={isReadOnly}
        />
      );
    }

    if (field.type === "currency") {
      return (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            ₦
          </span>
          <Input
            id={field.name}
            type="number"
            value={Number(value) || 0}
            onChange={(e) => handleFieldChange(field.name, parseFloat(e.target.value) || 0)}
            disabled={isReadOnly}
            className="pl-8"
          />
        </div>
      );
    }

    if (field.type === "number") {
      return (
        <Input
          id={field.name}
          type="number"
          value={Number(value) || 0}
          onChange={(e) => handleFieldChange(field.name, parseFloat(e.target.value) || 0)}
          placeholder={field.placeholder}
          disabled={isReadOnly}
        />
      );
    }

    if (field.type === "file") {
      return (
        <Input
          id={field.name}
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFieldChange(field.name, file.name);
          }}
          disabled={isReadOnly}
        />
      );
    }

    return (
      <Input
        id={field.name}
        type="text"
        value={String(value ?? "")}
        onChange={(e) => handleFieldChange(field.name, e.target.value)}
        placeholder={field.placeholder}
        disabled={isReadOnly}
      />
    );
  };

  const renderField = (field: AuditField) => {
    if (field.type === "checkbox") {
      return renderFieldInput(field);
    }

    return (
      <div className="space-y-2">
        <Label htmlFor={field.name}>
          {field.label}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </Label>
        {renderFieldInput(field)}
      </div>
    );
  };

  return (
    <div className="container max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="compact" onClick={() => router.push("/audit/forms")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{template.name}</h1>
            <p className="text-sm text-muted-foreground">
              {submission.is_draft ? "Draft" : "Submitted"}
              {submission.submitted_at && ` — ${formatDateTime(submission.submitted_at)}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {submission.is_draft && (
            <>
              <Button variant="outline" size="compact" onClick={handleSaveDraft} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {saving ? "Saving..." : "Save Draft"}
              </Button>
              <Button size="compact" onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </>
          )}
          <Button variant="secondary" size="compact" onClick={handleGeneratePdf} disabled={generatingPdf}>
            {generatingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {generatingPdf ? "Generating..." : "PDF"}
          </Button>
        </div>
      </div>

      <Separator />

      {unsectionedFields.length > 0 && (
        <div className="rounded-xl border border-border/60">
          <div className="border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-medium">Form Fields</h2>
          </div>
          <div className="space-y-6 p-4">
            {unsectionedFields.map((field) => (
              <div key={field.id}>{renderField(field)}</div>
            ))}
          </div>
        </div>
      )}

      {sections.map((section) => {
        const sectionFields = fields.filter((f) => section.fields.includes(f.id));
        if (sectionFields.length === 0) return null;
        return (
          <div key={section.id} className="rounded-xl border border-border/60">
            <div className="border-b border-border/60 px-4 py-3">
              <h2 className="text-sm font-medium">{section.title}</h2>
            </div>
            <div className="space-y-6 p-4">
              {sectionFields.map((field) => (
                <div key={field.id}>{renderField(field)}</div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Forward via Correspondence — appears after GM Audit certification */}
      {workflow?.status === "completed" && !submission.is_draft && (
        <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-emerald-900">Certified by GM Audit — ready to forward</p>
            <p className="text-xs text-muted-foreground">Send this audit query via correspondence to the target department/division for explanation.</p>
          </div>
          <Button size="compact" onClick={() => setForwardDialogOpen(true)}>
            <Send className="mr-2 h-4 w-4" /> Forward via Correspondence
          </Button>
        </div>
      )}

      {/* Send to GM Audit for certification — officer can initiate, any audit member can raise */}
      {!submission.is_draft && (!workflow || workflow.status !== "completed") && (
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">GM Audit certification</p>
            <p className="text-xs text-muted-foreground">Officer or any audit member can send this query to GM Audit (gmaudit) to verify/approve. GM Audit is busy — anyone from audit can raise it.</p>
          </div>
          <Button
            size="compact"
            variant="outline"
            onClick={async () => {
              try {
                await apiFetch(`/forms/submissions/${submissionId}/create_signature_workflow/`, {
                  method: "POST",
                  body: JSON.stringify({
                    routing_mode: "sequential",
                    signature_assignments: [{ field_name: "gm_audit_signature", office_id: "OFF_DIV_AUDIT" }],
                  }),
                });
                toast.success("Sent to GM Audit for certification");
                void fetchSubmission();
              } catch (err) {
                logError("Failed to create certification workflow", err);
                toast.error("Failed to send to GM Audit — ensure GM Audit office exists");
              }
            }}
          >
            <UserCheck className="mr-2 h-4 w-4" /> Send to GM Audit
          </Button>
        </div>
      )}

      {(workflow || signatures.length > 0) && (
        <>
          <Separator />
          <div className="rounded-xl border border-border/60">
            <div className="border-b border-border/60 px-4 py-3">
              <h2 className="text-sm font-medium flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Signatures
              </h2>
              {workflow && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Mode: {workflow.routing_mode === "sequential" ? "Sequential" : "Parallel"} &middot;
                  Status: <Badge variant={getSignatureStatusVariant(workflow.status)}>{workflow.status}</Badge>
                  &middot; {workflow.completed_signatures_count}/{workflow.total_steps} completed
                </p>
              )}
            </div>
            <div className="space-y-4 p-4">
              {signatures.length === 0 ? (
                <p className="text-sm text-muted-foreground">No signatures configured.</p>
              ) : (
                signatures.map((sig) => (
                  <div
                    key={sig.id}
                    className={cn(
                      "rounded-xl border border-border/60 bg-muted/20 p-4",
                      sig.status === "signed" && "border-green-200/60 bg-green-50/20 dark:bg-green-950/10",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{sig.field_label || sig.field_name}</span>
                          <Badge variant={getSignatureStatusVariant(sig.status)}>
                            {sig.status}
                          </Badge>
                        </div>
                        {sig.signer_name && (
                          <p className="text-sm text-muted-foreground">
                            Signed by: {sig.signer_name}
                            {sig.signer_designation && ` (${sig.signer_designation})`}
                          </p>
                        )}
                        {sig.signed_at && (
                          <p className="text-xs text-muted-foreground">
                            Signed: {formatDateTime(sig.signed_at)}
                          </p>
                        )}
                        {sig.assigned_to_office_name && (
                          <p className="text-xs text-muted-foreground">
                            Office: {sig.assigned_to_office_name}
                          </p>
                        )}
                        {sig.notes && (
                          <p className="text-xs text-muted-foreground">Notes: {sig.notes}</p>
                        )}
                      </div>
                      {sig.status === "signed" && sig.signature_file_url && (
                        <Button variant="outline" size="compact" asChild>
                          <a href={sig.signature_file_url} target="_blank" rel="noopener noreferrer">
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            View
                          </a>
                        </Button>
                      )}
                    </div>

                    {sig.status === "pending" && canSign(sig) && (
                      <div className="mt-4 space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                        <p className="text-sm font-medium">Sign this document</p>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="space-y-1.5">
                            <Label htmlFor={`sign-name-${sig.id}`} className="text-xs">Full Name</Label>
                            <Input
                              id={`sign-name-${sig.id}`}
                              value={signFormData[sig.id]?.signer_name ?? ""}
                              onChange={(e) =>
                                setSignFormData((prev) => ({
                                  ...prev,
                                  [sig.id]: { ...prev[sig.id] || { signer_name: "", signer_pn: "", signer_designation: "" }, signer_name: e.target.value },
                                }))
                              }
                              placeholder="e.g., Dr. John Doe"
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`sign-pn-${sig.id}`} className="text-xs">PN / Staff ID</Label>
                            <Input
                              id={`sign-pn-${sig.id}`}
                              value={signFormData[sig.id]?.signer_pn ?? ""}
                              onChange={(e) =>
                                setSignFormData((prev) => ({
                                  ...prev,
                                  [sig.id]: { ...prev[sig.id] || { signer_name: "", signer_pn: "", signer_designation: "" }, signer_pn: e.target.value },
                                }))
                              }
                              placeholder="e.g., PN12345"
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`sign-desig-${sig.id}`} className="text-xs">Designation</Label>
                            <Input
                              id={`sign-desig-${sig.id}`}
                              value={signFormData[sig.id]?.signer_designation ?? ""}
                              onChange={(e) =>
                                setSignFormData((prev) => ({
                                  ...prev,
                                  [sig.id]: { ...prev[sig.id] || { signer_name: "", signer_pn: "", signer_designation: "" }, signer_designation: e.target.value },
                                }))
                              }
                              placeholder="e.g., Chief Audit Officer"
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>
                        <Button
                          size="compact"
                          onClick={() => handleSign(sig)}
                          disabled={signingId === sig.id}
                        >
                          {signingId === sig.id ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                          )}
                          {signingId === sig.id ? "Signing..." : "Sign"}
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Forward via Correspondence — dialog */}
      {forwardDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-background p-6 shadow-xl">
            <h3 className="text-base font-semibold">Forward Audit Query via Correspondence</h3>
            <p className="mt-1 text-xs text-muted-foreground">Certified query will be sent to the selected office for explanation/action.</p>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Target Office</Label>
                <Input value={forwardTargetOffice} onChange={(e) => setForwardTargetOffice(e.target.value)} placeholder="Office ID (e.g., OFF_DIV_FINANCE) — will be office picker" />
                <p className="text-xs text-muted-foreground">For now enter office code; office picker will be added.</p>
              </div>
              <div className="space-y-2">
                <Label>Correspondence Subject</Label>
                <Input value={forwardSubject} onChange={(e) => setForwardSubject(e.target.value)} placeholder={`Re: ${template?.name} — ${submission?.id?.slice(0,8)}`} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setForwardDialogOpen(false)} disabled={forwarding}>Cancel</Button>
                <Button onClick={handleForwardViaCorrespondence} disabled={forwarding || !forwardTargetOffice || !forwardSubject.trim()}>
                  {forwarding ? "Forwarding..." : "Create Correspondence"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
