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
  FileText,
  Clock,
  BadgeCheck,
  Share2,
  Hourglass,
  Inbox,
  Lock,
  CheckCircle,
  AlertCircle,
  FileCheck,
  MailQuestion,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { logError } from "@/lib/client-logger";
import { formatDateTime } from "@/lib/correspondence-helpers";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOrgUsers } from "@/hooks/use-org-users";
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
  const [forwardAttentionUser, setForwardAttentionUser] = useState("");
  const [forwardCc, setForwardCc] = useState("");
  const [forwardDueDate, setForwardDueDate] = useState("");
  const [forwardActionRequired, setForwardActionRequired] = useState(true);
  const [forwardRequiredApprovalLevel, setForwardRequiredApprovalLevel] = useState("departmental");
  const [forwardSubject, setForwardSubject] = useState("");
  const [forwarding, setForwarding] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [auditState, setAuditState] = useState<string | null>(null);
  const [caseMetadata, setCaseMetadata] = useState<Record<string, unknown> | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  // Office-centric routing state per spec
  const { directorates, divisions, departments, offices } = useOrganization();
  const { users: orgUsers } = useOrgUsers();
  const [routeType, setRouteType] = useState<"division" | "department" | "directorate" | "office">("division");
  const [selectedDivisionId, setSelectedDivisionId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedDirectorateId, setSelectedDirectorateId] = useState("");
  const [selectedOfficeId, setSelectedOfficeId] = useState("");

  const fetchSubmission = useCallback(async () => {
    try {
      setLoading(true);
      let subData: FormSubmission | null = null;
      let workflowData: FormSignatureWorkflow | null = null;
      let canonicalSubmissionId = submissionId;
      try {
        const results = await Promise.all([
          apiFetch<FormSubmission>(`/forms/submissions/${submissionId}/`),
          apiFetch<FormSignatureWorkflow | null>(`/forms/submissions/${submissionId}/signature_workflow/`).catch(() => null),
        ]);
        subData = results[0];
        workflowData = results[1];
        canonicalSubmissionId = String(subData.id);
      } catch (subErr: unknown) {
        const status = (subErr as Record<string, unknown>)?.status as number | undefined;
        // If FormSubmission not found, it may be a FormDocument id (e.g., opened from My Documents). Auto-resolve to the correct AQ submission.
        if (status === 404) {
          try {
            const formDocuments = await apiFetch<{ results?: Array<{ id: string; template?: { id: string; slug?: string; name?: string }; case_links?: Array<{ case: { id: string; case_number?: string } }>; document?: { id: string } }> }>(`/dms/form-documents/?submission=${submissionId}`);
            const fd = formDocuments?.results?.[0];
            if (fd?.case_links?.[0]?.case?.id) {
              const caseIdFromFd = fd.case_links[0].case.id;
              const caseData = await apiFetch<{ id: string; metadata?: Record<string, unknown> }>(`/correspondence/cases/${caseIdFromFd}/`).catch(() => null);
              const realSubId = (caseData?.metadata as Record<string, unknown>)?.audit_submission_id as string | undefined;
              if (realSubId) {
                const realResults = await Promise.all([
                  apiFetch<FormSubmission>(`/forms/submissions/${realSubId}/`),
                  apiFetch<FormSignatureWorkflow | null>(`/forms/submissions/${realSubId}/signature_workflow/`).catch(() => null),
                ]);
                subData = realResults[0];
                workflowData = realResults[1];
                canonicalSubmissionId = realSubId;
                // Update URL to canonical submission id without pushing history
                router.replace(`/audit/forms/${realSubId}`);
              } else {
                throw new Error(`No FormSubmission for ${submissionId} — this FormDocument has no linked audit submission.`);
              }
            } else if (fd?.id) {
              throw new Error(`No FormSubmission for ${submissionId} — this appears to be a FormDocument (${fd.template?.name || fd.id}). Open via Audit → Cases or My Documents → Open Audit Case.`);
            }
            if (subData) {
              // Successfully resolved via FormDocument → Case → Submission
            } else {
              throw subErr;
            }
          } catch (fallbackErr) {
            // Keep a successful resolution; otherwise preserve the fallback
            // failure so the user sees the actual cause, not the first 404.
            if (!subData) {
              throw fallbackErr;
            }
          }
        } else {
          throw subErr;
        }
      }

      if (!subData) throw new Error("Submission not found");
      setSubmission(subData);
      setTemplate(subData.template);
      setFormData(subData.data || {});
      setWorkflow(workflowData);
      setSignatures(workflowData?.signatures || []);

      // Resolve Case(AUDIT) for this submission to drive state-machine actions
      try {
        const caseData = await apiFetch<{ id: string; metadata?: Record<string, unknown> }>(
          `/correspondence/cases/by-submission/${canonicalSubmissionId}/`
        ).catch(() => null);
        if (caseData && caseData.id) {
          setCaseId(caseData.id);
          const ms = (caseData.metadata as Record<string, unknown>) || {};
          setCaseMetadata(ms);
          if (ms.audit_state) setAuditState(String(ms.audit_state).toUpperCase());
          else setAuditState("DRAFT");
        } else {
          // Fallback: list audit cases and match by metadata audit_submission_id
          const list = await apiFetch<{ results: Array<{ id: string; metadata?: Record<string, unknown> }> }>(
            `/correspondence/cases/?case_type=audit&page_size=100`
          ).catch(() => null);
          const found = list?.results?.find(
            (c) => String((c.metadata as Record<string, unknown>)?.audit_submission_id) === String(canonicalSubmissionId)
          );
          if (found) {
            setCaseId(found.id);
            const ms = (found.metadata as Record<string, unknown>) || {};
            setCaseMetadata(ms);
            if (ms.audit_state) setAuditState(String(ms.audit_state).toUpperCase());
            else setAuditState("DRAFT");
          } else {
            setCaseId(null);
            setAuditState(null);
            setCaseMetadata(null);
          }
        }
      } catch {
        // case resolution optional — keep actions disabled if not found
      }
    } catch (err) {
      const status = (err as Record<string, unknown>)?.status as number | undefined;
      const msg = err instanceof Error ? err.message : String(err);
      // 404 is expected when opening a FormDocument id as submission — show EmptyState, don't spam console error
      if (status === 404 || msg.includes("No FormSubmission")) {
        setSubmission(null);
        setTemplate(null);
        // Keep toast but not logError for 404
        toast.error("Audit query not found — try Audit → Cases (AQ-...) or My Documents → Open Audit Case");
      } else {
        logError("Failed to load submission", err);
        toast.error("Failed to load submission");
        router.push("/audit/forms");
      }
    } finally {
      setLoading(false);
    }
  }, [submissionId, router]);

  useEffect(() => {
    void fetchSubmission();
  }, [fetchSubmission]);

  // Resolve target office from routeType + selection — office is recipient per spec
  const resolvedOffice = (() => {
    if (routeType === "office" && selectedOfficeId) return offices.find((o) => o.id === selectedOfficeId) || null;
    if (routeType === "division" && selectedDivisionId) {
      // Prefer GM/division office for this division, fallback to any office with this division
      return offices.find((o) => o.divisionId === selectedDivisionId && (o.officeType === "gm" || o.officeType === "division")) || offices.find((o) => o.divisionId === selectedDivisionId) || null;
    }
    if (routeType === "department" && selectedDepartmentId) {
      return offices.find((o) => o.departmentId === selectedDepartmentId) || null;
    }
    if (routeType === "directorate" && selectedDirectorateId) {
      return offices.find((o) => o.directorateId === selectedDirectorateId && (o.officeType === "ed" || o.officeType === "directorate")) || offices.find((o) => o.directorateId === selectedDirectorateId) || null;
    }
    return null;
  })();

  useEffect(() => {
    if (resolvedOffice) setForwardTargetOffice(resolvedOffice.code || resolvedOffice.id);
    else if (routeType === "office" && !selectedOfficeId) setForwardTargetOffice("");
  }, [resolvedOffice, routeType, selectedOfficeId]);

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

  const handleRequestAuthorization = async () => {
    if (!caseId) {
      toast.error("Case not found — ensure audit case exists (CERTIFIED)");
      return;
    }
    setActionLoading("request_auth");
    try {
      await apiFetch(`/correspondence/cases/${caseId}/actions/`, {
        method: "POST",
        body: JSON.stringify({ action: "REQUEST_AUTHORIZATION" }),
      });
      toast.success("Sent to Department Head for authorization");
      void fetchSubmission();
    } catch (err) {
      logError("Failed to request authorization", err);
      toast.error(err instanceof Error ? err.message : "Failed to request authorization");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAuthorize = async () => {
    if (!caseId) {
      toast.error("Case not found");
      return;
    }
    setActionLoading("authorize");
    try {
      await apiFetch(`/correspondence/cases/${caseId}/actions/`, {
        method: "POST",
        body: JSON.stringify({ action: "AUTHORIZE" }),
      });
      toast.success("Authorized — ready to route to destination office");
      void fetchSubmission();
    } catch (err) {
      logError("Failed to authorize", err);
      toast.error(err instanceof Error ? err.message : "Authorization failed — only Department Head / designated authority can authorize");
    } finally {
      setActionLoading(null);
    }
  };

  const handleForwardViaCorrespondence = async () => {
    const officeCode = (resolvedOffice?.code || resolvedOffice?.id || forwardTargetOffice.trim());
    if (!officeCode || !forwardSubject.trim()) {
      toast.error("Select destination and enter subject");
      return;
    }
    if (!caseId) {
      toast.error("Case not found for this submission — ensure audit case exists (CERTIFIED/AUTHORIZED)");
      return;
    }
    // Office is recipient — Attention is optional per spec
    const isValidOffice =
      /^OFF_[A-Z0-9_]+$/i.test(officeCode) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(officeCode);
    if (!isValidOffice) {
      toast.error("Resolved office invalid — select a valid Division/Department/Directorate");
      return;
    }
    setForwarding(true);
    try {
      const dueDateValue = forwardDueDate.trim() ? forwardDueDate.trim() : null;
      const ccList = forwardCc.trim() ? forwardCc.split(",").map((s) => s.trim()).filter(Boolean) : [];
      const attentionUserValue = forwardAttentionUser.trim() || null;
      const subject = forwardSubject.trim();
      const bodyHtml = `<p>Audit query <strong>${template?.name ?? "Audit Query"}</strong> certified by GM Audit — forwarded for your explanation/action.</p><p>Form: ${submission?.id ?? ""}</p><p>PV: ${(formData as Record<string, unknown>)?.pv_no as string ?? ""}</p>`;

      // Wire via Case action REFER (atomically creates Correspondence + links + transitions)
      const result = await apiFetch<{ id: string; correspondence_id?: string; correspondence_reference?: string; audit_state?: string }>(
        `/correspondence/cases/${caseId}/actions/`,
        {
          method: "POST",
          body: JSON.stringify({
            action: "REFER",
            subject,
            body: bodyHtml,
            body_html: bodyHtml,
            target_office: officeCode,
            attention: attentionUserValue,
            attention_user: attentionUserValue,
            cc: ccList,
            action_required: forwardActionRequired,
            due_date: dueDateValue,
            required_approval_level: forwardRequiredApprovalLevel,
          }),
        }
      );
      const officeLabel = resolvedOffice ? `${resolvedOffice.name} (${resolvedOffice.code})` : officeCode;
      toast.success(`Referred to ${officeLabel} via ${result.correspondence_reference ?? result.correspondence_id ?? "correspondence"} — office queue`);
      setForwardDialogOpen(false);
      setForwardTargetOffice("");
      setForwardAttentionUser("");
      setForwardCc("");
      setForwardDueDate("");
      setForwardActionRequired(true);
      setForwardRequiredApprovalLevel("departmental");
      setForwardSubject("");
      setSelectedDivisionId("");
      setSelectedDepartmentId("");
      setSelectedDirectorateId("");
      setSelectedOfficeId("");
      // Refresh case state/banner; show updated state
      await fetchSubmission();
      if (result.correspondence_id) {
        // Keep user on page but offer link — banner will show CORR-...
        toast.success(`Correspondence: ${result.correspondence_reference ?? result.correspondence_id}`);
      }
    } catch (err) {
      logError("Failed to refer audit query", err);
      const msg = err instanceof Error ? err.message : "Failed to refer — ensure state is CERTIFIED and you are Audit member";
      toast.error(msg);
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

      {/* Audit Case source of truth header — AQ-2026-014 per product rule */}
      {caseId && (() => {
        const meta = (caseMetadata || {}) as Record<string, unknown>;
        const trail = (meta.audit_trail as Array<Record<string, unknown>>) || [];
        const certifiedBy = trail.find((t) => String(t.action).toUpperCase() === "CERTIFY") as Record<string, unknown> | undefined;
        const authorizedBy = (meta.last_authorization as Record<string, unknown>) || trail.find((t) => String(t.action).toUpperCase() === "AUTHORIZE") as Record<string, unknown> | undefined;
        const lastRefer = (meta.last_refer as Record<string, unknown>) || {};
        const corrRef = (lastRefer.correspondence_reference as string) || (meta.refer_correspondence_reference as string) || "";
        const authLabel = auditState === "AWAITING_INTERNAL_AUTHORIZATION" ? "Awaiting Authorization" : auditState === "AUTHORIZED" ? `Authorized by ${String((authorizedBy as Record<string, unknown>)?.authorized_by_username || (authorizedBy as Record<string, unknown>)?.actor_username || "Dept Head")}` : "Not Required";
        const caseNumber = (meta.case_number as string) || (caseMetadata as Record<string, unknown>)?.case_number as string || submission?.id?.slice(0,8) || caseId.slice(0,8);
        const raisedBy = submission?.submitted_by ? `${submission.submitted_by.name} (${submission.submitted_by.email ?? ""})`.trim() : "Officer";
        const raisedAt = submission?.createdAt ? formatDateTime(submission.createdAt) : submission?.submitted_at ? formatDateTime(submission.submitted_at) : "";
        return (
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">AQ-{String(caseNumber).replace(/^AQ-/, "")} · Audit Query — Bills Certification</p>
                <p className="text-xs text-muted-foreground">Case: {caseId.slice(0,8)} · Raised by: {raisedBy} {raisedAt ? `· ${raisedAt}` : ""}</p>
              </div>
              <Badge variant="outline">{auditState || "DRAFT"}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-muted-foreground">Certified by</p>
                <p className="font-medium">{certifiedBy ? String((certifiedBy as Record<string, unknown>).actor_username || (certifiedBy as Record<string, unknown>).actor || "GM Audit") : "—"}</p>
                {Boolean((certifiedBy as Record<string, unknown>)?.timestamp) && <p className="text-muted-foreground">{String((certifiedBy as Record<string, unknown>).timestamp).slice(0,10)}</p>}
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-muted-foreground">Authorization</p>
                <p className="font-medium">{authLabel}</p>
                <p className="text-muted-foreground text-xs">Dept Head authorization ≠ GM Audit certification</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-muted-foreground">Correspondence</p>
                <p className="font-medium font-mono">{corrRef || "—"}</p>
                {corrRef && <p className="text-muted-foreground">Office queue</p>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Audit work-item state banner — DRAFT/SUBMITTED/AWAITING_CERTIFICATION/CERTIFIED/REFERRED/AWAITING_RESPONSE/RESPONSE_RECEIVED/CLOSED */}
      {auditState && (() => {
        const meta = (caseMetadata || {}) as Record<string, unknown>;
        const lastRefer = (meta.last_refer as Record<string, unknown>) || {};
        const trail = (meta.audit_trail as Array<Record<string, unknown>>) || [];
        const lastEntry = trail.length ? trail[trail.length - 1] : null;
        const certifiedBy = trail.find((t) => String(t.action).toUpperCase() === "CERTIFY") as Record<string, unknown> | undefined;
        const corrRef = (lastRefer.correspondence_reference as string) || (meta.refer_correspondence_reference as string) || (lastEntry?.correspondence_reference as string) || "";
        const corrId = (lastRefer.correspondence_id as string) || (meta.refer_correspondence_id as string) || (lastEntry?.correspondence_id as string) || "";
        const targetOffice = (lastRefer.target_office_code as string) || (lastRefer.target_office as string) || (meta.refer_target_office as string) || "";
        const dueDate = (lastRefer.due_date as string) || (meta.refer_due_date as string) || "";
        const state = auditState.toUpperCase();
        // Config per state with distinct colors/icons — office is recipient per spec
        const configs: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode; label: string; desc: string }> = {
          DRAFT: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", icon: <FileText className="h-4 w-4" />, label: "Draft", desc: "Draft — complete and submit the query." },
          SUBMITTED: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", icon: <Send className="h-4 w-4" />, label: "Submitted", desc: "Submitted — awaiting GM Audit certification." },
          AWAITING_CERTIFICATION: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-800", icon: <Clock className="h-4 w-4" />, label: "Awaiting Certification", desc: `Awaiting certification — only GM Audit (gmaudit) can certify.` },
          CERTIFIED: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", icon: <BadgeCheck className="h-4 w-4" />, label: "Certified", desc: certifiedBy ? `Certified by ${String(certifiedBy.actor_username || certifiedBy.actor || "GM Audit")} — ready for authorization or routing` : "Certified by GM Audit — request Department Head authorization or route to destination office." },
          AWAITING_INTERNAL_AUTHORIZATION: { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-800", icon: <Clock className="h-4 w-4" />, label: "Awaiting Authorization", desc: "Awaiting Department Head / Audit authority authorization — distinct from GM Audit certification." },
          AUTHORIZED: { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-800", icon: <CheckCircle className="h-4 w-4" />, label: "Authorized", desc: "Authorized by Department Head — ready to route to destination office queue." },
          REFERRED: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-800", icon: <Share2 className="h-4 w-4" />, label: "Referred", desc: targetOffice ? `Routes to ${targetOffice} office${corrRef ? ` via ${corrRef}` : ""} — office queue` : `Referred — correspondence in office queue${corrRef ? `: ${corrRef}` : ""}` },
          AWAITING_RESPONSE: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-800", icon: <Hourglass className="h-4 w-4" />, label: "Awaiting Response", desc: targetOffice ? `Awaiting response from ${targetOffice} office${dueDate ? ` — due ${dueDate}` : ""}${corrRef ? ` · ${corrRef}` : ""}` : `Awaiting response — office queue${corrRef ? ` · ${corrRef}` : ""}` },
          RESPONSE_RECEIVED: { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-800", icon: <Inbox className="h-4 w-4" />, label: "Response Received", desc: corrRef ? `Response received — ${corrRef} — under audit review` : "Response received — under audit review." },
          AUDIT_REVIEW: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-800", icon: <Eye className="h-4 w-4" />, label: "Audit Review", desc: "Under audit review — awaiting closure." },
          CLOSED: { bg: "bg-slate-900", border: "border-slate-700", text: "text-slate-100", icon: <Lock className="h-4 w-4" />, label: "Closed", desc: lastEntry?.timestamp ? `Closed on ${String(lastEntry.timestamp).slice(0,10)} by ${String(lastEntry.actor_username || "system")}` : "Closed — audit work-item complete." },
        };
        const cfg = configs[state] || configs.DRAFT;
        const showCorrLink = !!(corrId || corrRef) && ["REFERRED","AWAITING_RESPONSE","RESPONSE_RECEIVED","AUDIT_REVIEW","CLOSED"].includes(state);
        return (
          <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
            <div className="flex items-start gap-3 min-w-0">
              <span className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border ${cfg.border} bg-white/60 ${cfg.text}`}>{cfg.icon}</span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${cfg.text}`}>{cfg.label} <span className="font-normal opacity-70">· {state}</span></p>
                <p className="text-xs text-muted-foreground line-clamp-2">{cfg.desc}</p>
                {state === "CERTIFIED" && certifiedBy && (certifiedBy.timestamp as string) && (
                  <p className="text-xs text-muted-foreground">Certified by {String(certifiedBy.actor_username || certifiedBy.actor)} at {String(certifiedBy.timestamp).slice(0,19).replace("T"," ")}</p>
                )}
                {state === "AWAITING_CERTIFICATION" && (
                  <p className="text-xs text-muted-foreground">State: AWAITING_CERTIFICATION — Send for Certification → CERTIFY</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Badge variant="outline" className={`${cfg.border} ${cfg.text} bg-white/50`}>{state}</Badge>
              {showCorrLink && corrId && (
                <Button variant="outline" size="compact" onClick={() => router.push(`/correspondence/${corrId}`)}>
                  <FileCheck className="mr-1 h-3.5 w-3.5" />
                  {corrRef ? corrRef : `Correspondence: ${corrId.slice(0,8)}`}
                </Button>
              )}
              {showCorrLink && !corrId && corrRef && (
                <span className="text-xs font-mono text-muted-foreground">Correspondence: {corrRef}</span>
              )}
            </div>
          </div>
        );
      })()}

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

      {/* Routing — office is recipient per spec, not N users. Two-stage: Internal Authorization (optional) → External Routing */}
      {!submission.is_draft && auditState && ["CERTIFIED", "AWAITING_INTERNAL_AUTHORIZATION", "AUTHORIZED"].includes(auditState) && (
        <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/20 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-emerald-900">
                {auditState === "CERTIFIED" && `Certified by ${(() => { const s = signatures.find((x) => x.status === "signed") || workflow?.signatures?.find((x) => x.status === "signed"); return s?.signer_name?.trim() || s?.signed_by_name?.trim() || "GM Audit"; })()} — routes to office queue`}
                {auditState === "AWAITING_INTERNAL_AUTHORIZATION" && "Awaiting Department Head authorization"}
                {auditState === "AUTHORIZED" && "Authorized — ready to route to destination office"}
              </p>
              <p className="text-xs text-muted-foreground">
                {auditState === "CERTIFIED" && "Office is recipient. Request Department Head authorization (optional) or route directly to Division/Department/Directorate office."}
                {auditState === "AWAITING_INTERNAL_AUTHORIZATION" && "GM Audit certification ≠ Department Head authorization — awaiting HOD / designated authority."}
                {auditState === "AUTHORIZED" && "Department Head authorized — select destination office (with optional Attention) to refer."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {auditState === "CERTIFIED" && (
                <Button size="compact" variant="outline" disabled={actionLoading === "request_auth"} onClick={handleRequestAuthorization}>
                  {actionLoading === "request_auth" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                  Request Dept Head Authorization
                </Button>
              )}
              {auditState === "AWAITING_INTERNAL_AUTHORIZATION" && (
                <Button size="compact" disabled={actionLoading === "authorize"} onClick={handleAuthorize}>
                  {actionLoading === "authorize" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BadgeCheck className="mr-2 h-4 w-4" />}
                  Authorize
                </Button>
              )}
              {(auditState === "CERTIFIED" || auditState === "AUTHORIZED") && (
                <Button size="compact" onClick={() => setForwardDialogOpen(true)}>
                  <Send className="mr-2 h-4 w-4" /> Route to Office
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Office members with access can act on this item. Attention is optional and does not change the primary recipient.</p>
        </div>
      )}

      {/* State-machine actions: SEND_FOR_CERTIFICATION (officer) and CERTIFY (GM Audit, signature-gated) */}
      {!submission.is_draft && (
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">GM Audit certification</p>
            <p className="text-xs text-muted-foreground">
              {auditState === "AWAITING_CERTIFICATION"
                ? "Awaiting GM Audit certification — only gmaudit can certify (signature required)."
                : "Officer or any audit member can send this query to GM Audit (gmaudit) to verify/approve."}
              {auditState ? ` State: ${auditState}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="compact"
              variant="outline"
              disabled={!caseId || actionLoading === "send"}
              onClick={async () => {
                if (!caseId) {
                  toast.error("Case not found for this submission — ensure audit case exists");
                  return;
                }
                setActionLoading("send");
                try {
                  // If audit state is DRAFT, first SUBMIT then SEND_FOR_CERTIFICATION (strict state machine)
                  if (auditState === "DRAFT") {
                    await apiFetch(`/correspondence/cases/${caseId}/actions/`, {
                      method: "POST",
                      body: JSON.stringify({ action: "SUBMIT" }),
                    }).catch(() => null);
                  }
                  await apiFetch(`/correspondence/cases/${caseId}/actions/`, {
                    method: "POST",
                    body: JSON.stringify({ action: "SEND_FOR_CERTIFICATION" }),
                  });
                  // Ensure workflow assigned_to_user=gmaudit explicitly (not just office membership)
                  try {
                    if (!workflow) {
                      let gmauditId: string | null = null;
                      try {
                        const usersRes = await apiFetch<{ results: Array<{ id: string; username: string }> }>(`/accounts/users/?search=gmaudit&page_size=10`);
                        const list: Array<{ id: string; username: string }> = Array.isArray((usersRes as unknown as { results?: unknown })?.results)
                          ? ((usersRes as unknown as { results: Array<{ id: string; username: string }> }).results as Array<{ id: string; username: string }>)
                          : (Array.isArray(usersRes) ? (usersRes as unknown as Array<{ id: string; username: string }>) : []);
                        const found = list.find((u) => (u.username || "").toLowerCase() === "gmaudit");
                        if (found) gmauditId = found.id;
                      } catch {}
                      if (gmauditId) {
                        await apiFetch(`/forms/signature-workflows/create_workflow/`, {
                          method: "POST",
                          body: JSON.stringify({
                            submission_id: submissionId,
                            routing_mode: "sequential",
                            signature_assignments: [{ field_name: "gm_audit_signature", field_label: "GM Audit Signature", user_id: gmauditId }],
                            notes: "GM Audit certification",
                          }),
                        }).catch(() => null);
                      }
                    }
                  } catch {}
                  toast.success("Sent for certification");
                  void fetchSubmission();
                } catch (err) {
                  logError("Failed to send for certification", err);
                  const msg = err instanceof Error ? err.message : "Failed to send for certification";
                  toast.error(msg);
                } finally {
                  setActionLoading(null);
                }
              }}
            >
              {actionLoading === "send" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="mr-2 h-4 w-4" />
              )}
              Send for Certification
            </Button>
            <Button
              size="compact"
              disabled={!caseId || actionLoading === "certify"}
              onClick={async () => {
                if (!caseId) {
                  toast.error("Case not found for this submission");
                  return;
                }
                setActionLoading("certify");
                try {
                  // CERTIFY internally creates signature workflow if needed and signs (gmaudit only)
                  await apiFetch(`/correspondence/cases/${caseId}/actions/`, {
                    method: "POST",
                    body: JSON.stringify({ action: "CERTIFY" }),
                  });
                  toast.success("Certified by GM Audit");
                  void fetchSubmission();
                } catch (err) {
                  logError("Failed to certify", err);
                  const msg = err instanceof Error ? err.message : "Certify failed — ensure GM Audit signature is completed";
                  toast.error(msg);
                } finally {
                  setActionLoading(null);
                }
              }}
            >
              {actionLoading === "certify" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Pencil className="mr-2 h-4 w-4" />
              )}
              Certify
            </Button>
          </div>
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

      {/* Route Audit Query — office is recipient, Attention is optional per spec */}
      {forwardDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-background p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold">Route Audit Query</h3>
            <p className="mt-1 text-xs text-muted-foreground">Routes to destination office queue — Office members with access can act on this item. Attention is optional and does not change the primary recipient.</p>
            <div className="mt-4 space-y-4">
              {/* Route To — Division / Department / Directorate / Office */}
              <div className="space-y-2">
                <Label>Route To *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["division","department","directorate","office"] as const).map((t) => (
                    <label key={t} className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer ${routeType===t ? "border-primary bg-primary/5" : "border-border"}`}>
                      <input type="radio" name="routeType" value={t} checked={routeType===t} onChange={() => setRouteType(t)} className="h-4 w-4" />
                      <span className="text-sm capitalize">{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              {routeType === "division" && (
                <div className="space-y-2">
                  <Label>Destination: Division *</Label>
                  <select value={selectedDivisionId} onChange={(e) => setSelectedDivisionId(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                    <option value="">Select division</option>
                    {divisions.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                  </select>
                  {resolvedOffice && <p className="text-xs text-muted-foreground">Office: {resolvedOffice.name} ({resolvedOffice.code}) — Routes to {resolvedOffice.name} office queue</p>}
                </div>
              )}
              {routeType === "department" && (
                <div className="space-y-2">
                  <Label>Destination: Department *</Label>
                  <select value={selectedDepartmentId} onChange={(e) => setSelectedDepartmentId(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                    <option value="">Select department</option>
                    {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                  </select>
                  {resolvedOffice && <p className="text-xs text-muted-foreground">Office: {resolvedOffice.name} ({resolvedOffice.code}) — office queue</p>}
                </div>
              )}
              {routeType === "directorate" && (
                <div className="space-y-2">
                  <Label>Destination: Directorate *</Label>
                  <select value={selectedDirectorateId} onChange={(e) => setSelectedDirectorateId(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                    <option value="">Select directorate</option>
                    {directorates.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                  </select>
                  {resolvedOffice && <p className="text-xs text-muted-foreground">Office: {resolvedOffice.name} ({resolvedOffice.code})</p>}
                </div>
              )}
              {routeType === "office" && (
                <div className="space-y-2">
                  <Label>Destination: Office *</Label>
                  <select value={selectedOfficeId} onChange={(e) => setSelectedOfficeId(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                    <option value="">Select office</option>
                    {offices.filter((o) => o.isActive).slice(0,100).map((o) => (<option key={o.id} value={o.id}>{o.name} ({o.code})</option>))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Attention — Optional</Label>
                <select value={forwardAttentionUser} onChange={(e) => setForwardAttentionUser(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                  <option value="">None — office queue</option>
                  {orgUsers.filter((u) => u.active !== false).slice(0,100).map((u) => (<option key={u.id} value={u.id}>{u.name} {u.email ? `— ${u.email}` : ""}</option>))}
                </select>
                <p className="text-xs text-muted-foreground">E.g. Finance Division → Attention: GM Finance — does not change primary recipient.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={forwardDueDate} onChange={(e) => setForwardDueDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Action Required</Label>
                  <select value={forwardActionRequired ? "explanation" : "information"} onChange={(e) => setForwardActionRequired(e.target.value==="explanation")} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                    <option value="explanation">Explanation / Response</option>
                    <option value="information">For Information</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Correspondence Subject *</Label>
                <Input value={forwardSubject} onChange={(e) => setForwardSubject(e.target.value)} placeholder={`Re: ${template?.name} — ${submission?.id?.slice(0,8)}`} />
              </div>

              {auditState && !["CERTIFIED","AUTHORIZED"].includes(auditState) && (
                <p className="text-xs text-amber-600">REFER requires CERTIFIED or AUTHORIZED — current: {auditState}</p>
              )}
              {resolvedOffice && (
                <p className="text-xs text-emerald-700">Routes to {resolvedOffice.name} ({resolvedOffice.code}) office. Office members with access can act on this item.</p>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setForwardDialogOpen(false)} disabled={forwarding}>Cancel</Button>
                <Button onClick={handleForwardViaCorrespondence} disabled={forwarding || !resolvedOffice || !forwardSubject.trim()}>
                  {forwarding ? "Routing..." : `Route to ${resolvedOffice ? resolvedOffice.code : "Office"}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
