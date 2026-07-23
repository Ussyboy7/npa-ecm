"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  MessageSquare,
  Loader2,
  Send,
  User,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DetailStatusStrip,
  StatusStripSep,
} from "@/components/shared/DetailStatusStrip";
import { ErrorState } from "@/components/shared/ErrorState";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { appType } from "@/lib/app-type";
import { getFoiaStatusBadge } from "@/lib/status-badge";
import { cn } from "@/lib/utils";

type FOIAStatus =
  | "submitted"
  | "acknowledged"
  | "in_processing"
  | "review"
  | "approved"
  | "partially_granted"
  | "denied"
  | "responded"
  | "closed"
  | "awaiting_clarification"
  | "appealed";

interface FOIARequest {
  id: string;
  request_number: string;
  requester_name: string;
  requester_email: string;
  requester_phone: string;
  requester_address: string;
  organization: string;
  description_of_documents: string;
  status: FOIAStatus;
  received_date: string;
  deadline_date: string | null;
  days_remaining?: number;
  is_overdue?: boolean;
  assigned_to: { name?: string; username?: string } | string | null;
  exemption_reason: string | null;
  outcome?: string | null;
  acknowledged_date: string | null;
  response_date: string | null;
  format_preference: string;
}

interface FOIANote {
  id: string;
  foia_request: string;
  content: string;
  is_internal: boolean;
  created_by: string;
  created_at: string;
}

interface FOIADocument {
  id: string;
  foia_request: string;
  title: string;
  file: string;
  uploaded_at: string;
}

function formatShortDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

export default function FOIADetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<FOIARequest | null>(null);
  const [notes, setNotes] = useState<FOIANote[]>([]);
  const [documents, setDocuments] = useState<FOIADocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [responding, setResponding] = useState(false);
  const [outcome, setOutcome] = useState<string>("");
  const [exemptionReason, setExemptionReason] = useState("");

  const [noteContent, setNoteContent] = useState("");
  const [noteIsInternal, setNoteIsInternal] = useState(true);
  const [addingNote, setAddingNote] = useState(false);

  const loadData = useCallback(async () => {
    if (!params?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [reqData, notesData, docsData] = await Promise.all([
        apiFetch<FOIARequest>(`/api/correspondence/foia-requests/${params.id}/`),
        apiFetch<FOIANote[] | { results: FOIANote[] }>(
          `/api/correspondence/foia-notes/?foia_request=${params.id}`
        ),
        apiFetch<FOIADocument[] | { results: FOIADocument[] }>(
          `/api/correspondence/foia-documents/?foia_request=${params.id}`
        ),
      ]);
      setRequest(reqData);
      setNotes(Array.isArray(notesData) ? notesData : notesData.results ?? []);
      setDocuments(Array.isArray(docsData) ? docsData : docsData.results ?? []);
    } catch {
      setError("Failed to load FOIA request details.");
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleAcknowledge = async () => {
    try {
      await apiFetch(`/api/correspondence/foia-requests/${params.id}/acknowledge/`, {
        method: "POST",
      });
      toast.success("Request acknowledged");
      void loadData();
    } catch {
      toast.error("Failed to acknowledge request");
    }
  };

  const handleRespond = async () => {
    if (!outcome) {
      toast.error("Please select an outcome");
      return;
    }
    setResponding(true);
    try {
      await apiFetch(`/api/correspondence/foia-requests/${params.id}/respond/`, {
        method: "POST",
        body: JSON.stringify({
          outcome,
          exemption_reason: exemptionReason || undefined,
        }),
      });
      toast.success("Response submitted");
      setOutcome("");
      setExemptionReason("");
      void loadData();
    } catch {
      toast.error("Failed to submit response");
    } finally {
      setResponding(false);
    }
  };

  const handleClose = async () => {
    try {
      await apiFetch(`/api/correspondence/foia-requests/${params.id}/close/`, {
        method: "POST",
      });
      toast.success("Request closed");
      void loadData();
    } catch {
      toast.error("Failed to close request");
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    setAddingNote(true);
    try {
      const note = await apiFetch<FOIANote>(`/api/correspondence/foia-notes/`, {
        method: "POST",
        body: JSON.stringify({
          foia_request: params.id,
          content: noteContent,
          is_internal: noteIsInternal,
        }),
      });
      setNotes((prev) => [note, ...prev]);
      setNoteContent("");
      toast.success("Note added");
    } catch {
      toast.error("Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  const canAcknowledge = request?.status === "submitted";
  const canRespond =
    request?.status === "acknowledged" ||
    request?.status === "in_processing" ||
    request?.status === "review";
  const canClose =
    request?.status === "approved" ||
    request?.status === "partially_granted" ||
    request?.status === "denied" ||
    request?.status === "responded";

  const daysRemaining =
    request?.days_remaining ??
    (request?.deadline_date
      ? Math.ceil(
          (new Date(request.deadline_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      : null);

  const isPastDeadline = daysRemaining !== null && daysRemaining < 0;
  const statusBadge = request ? getFoiaStatusBadge(request.status) : null;
  const assignedName =
    request?.assigned_to && typeof request.assigned_to === "object"
      ? request.assigned_to.name || request.assigned_to.username || null
      : typeof request?.assigned_to === "string"
        ? request.assigned_to
        : null;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="container mx-auto p-6">
        <ErrorState message={error || "Request not found"} variant="inline" />
        <Button variant="outline" className="mt-4" onClick={() => router.push("/foia")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to FOIA Requests
        </Button>
      </div>
    );
  }

  const primaryAction = canAcknowledge ? (
    <Button size="sm" onClick={handleAcknowledge}>
      <CheckCircle2 className="h-4 w-4 mr-2" />
      Acknowledge
    </Button>
  ) : canClose ? (
    <Button size="sm" variant="outline" onClick={handleClose}>
      <XCircle className="h-4 w-4 mr-2" />
      Close
    </Button>
  ) : null;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="border-b border-border/60 bg-background px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 md:gap-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 mt-0.5"
              onClick={() => router.push("/foia")}
              aria-label="Back to FOIA requests"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className={cn(appType.pageTitle, "truncate font-mono")}>
                {request.request_number}
              </h1>
              <p className={cn(appType.subject, "mt-1 truncate")}>
                {request.requester_name}
                {request.organization ? ` · ${request.organization}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
            {primaryAction}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {canAcknowledge && (
                  <DropdownMenuItem onClick={handleAcknowledge}>
                    <CheckCircle2 className="h-4 w-4 mr-2 opacity-70" />
                    Acknowledge
                  </DropdownMenuItem>
                )}
                {canClose && (
                  <DropdownMenuItem onClick={handleClose}>
                    <XCircle className="h-4 w-4 mr-2 opacity-70" />
                    Close request
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => void loadData()}>
                  <Loader2 className="h-4 w-4 mr-2 opacity-70" />
                  Refresh
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <DetailStatusStrip>
        {statusBadge ? (
          <Badge
            variant={statusBadge.variant}
            className={cn("text-[10px] h-5 shrink-0", statusBadge.className)}
          >
            {statusBadge.label}
          </Badge>
        ) : null}

        {request.is_overdue || isPastDeadline ? (
          <>
            <StatusStripSep />
            <Badge variant="destructive" className="text-[10px] h-5 shrink-0">
              Overdue
            </Badge>
          </>
        ) : null}

        <StatusStripSep />
        <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
          <Calendar className="h-3 w-3" />
          Received {formatShortDate(request.received_date)}
        </span>

        <StatusStripSep />
        <span
          className={cn(
            "inline-flex items-center gap-1 shrink-0 whitespace-nowrap",
            isPastDeadline && "text-destructive",
          )}
        >
          <Clock className="h-3 w-3" />
          Deadline {formatShortDate(request.deadline_date)}
          {daysRemaining !== null
            ? isPastDeadline
              ? ` · ${Math.abs(daysRemaining)}d overdue`
              : ` · ${daysRemaining}d left`
            : ""}
        </span>

        {assignedName ? (
          <>
            <StatusStripSep />
            <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
              <User className="h-3 w-3" />
              {assignedName}
            </span>
          </>
        ) : null}

        {request.format_preference ? (
          <>
            <StatusStripSep />
            <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap capitalize">
              <FileText className="h-3 w-3" />
              {request.format_preference}
            </span>
          </>
        ) : null}
      </DetailStatusStrip>

      <div className="px-4 md:px-6 py-5 space-y-5">
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <section className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-4">
              <h2 className={appType.panelTitle}>Request</h2>
              <p className={cn(appType.body, "whitespace-pre-wrap")}>
                {request.description_of_documents}
              </p>
              {request.outcome ? (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className={appType.sectionLabel}>Outcome</p>
                    <Badge variant={getFoiaStatusBadge(request.outcome).variant} className="capitalize">
                      {request.outcome}
                    </Badge>
                    {request.exemption_reason ? (
                      <p className={appType.meta}>{request.exemption_reason}</p>
                    ) : null}
                  </div>
                </>
              ) : null}
            </section>

            <section className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-4">
              <h2 className={cn(appType.panelTitle, "flex items-center gap-2")}>
                <MessageSquare className="h-3.5 w-3.5 opacity-70" />
                Notes
              </h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant={noteIsInternal ? "default" : "outline"}
                    size="compact"
                    onClick={() => setNoteIsInternal(true)}
                  >
                    Internal
                  </Button>
                  <Button
                    variant={!noteIsInternal ? "default" : "outline"}
                    size="compact"
                    onClick={() => setNoteIsInternal(false)}
                  >
                    Public
                  </Button>
                </div>
                <Textarea
                  placeholder="Add a note..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={3}
                />
                <Button
                  size="compact"
                  onClick={handleAddNote}
                  disabled={!noteContent.trim() || addingNote}
                >
                  {addingNote ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-1" />
                  )}
                  Add note
                </Button>
              </div>
              <Separator />
              {notes.length === 0 ? (
                <p className={appType.meta}>No notes yet.</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-lg border border-border/50 bg-background/60 p-3"
                    >
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {note.is_internal ? "Internal" : "Public"}
                        </Badge>
                        <span className={appType.caption}>
                          {new Date(note.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className={cn(appType.body, "whitespace-pre-wrap")}>{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
              <h2 className={cn(appType.panelTitle, "flex items-center gap-2")}>
                <FileText className="h-3.5 w-3.5 opacity-70" />
                Documents
              </h2>
              {documents.length === 0 ? (
                <p className={appType.meta}>No documents attached.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/40 px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className={cn(appType.itemTitle, "truncate")}>{doc.title}</span>
                      </div>
                      <span className={cn(appType.caption, "shrink-0")}>
                        {formatShortDate(doc.uploaded_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3">
              <h2 className={appType.panelTitle}>Requester</h2>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className={appType.body}>{request.requester_name}</span>
                </div>
                {request.organization ? (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={appType.body}>{request.organization}</span>
                  </div>
                ) : null}
                {request.requester_email ? (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={appType.body}>{request.requester_email}</span>
                  </div>
                ) : null}
                {request.requester_phone ? (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={appType.body}>{request.requester_phone}</span>
                  </div>
                ) : null}
              </div>
            </section>

            {(canRespond || canAcknowledge || canClose) && (
              <section className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-4">
                <h2 className={appType.panelTitle}>Actions</h2>
                {canAcknowledge && (
                  <Button className="w-full" size="compact" onClick={handleAcknowledge}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Acknowledge request
                  </Button>
                )}

                {canRespond && (
                  <div className="space-y-3 rounded-lg border border-border/40 p-3">
                    <Label>Outcome</Label>
                    <Select value={outcome} onValueChange={setOutcome}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select outcome" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="denied">Denied</SelectItem>
                      </SelectContent>
                    </Select>
                    {outcome === "denied" || outcome === "partial" ? (
                      <div className="space-y-1">
                        <Label>Exemption reason</Label>
                        <Textarea
                          placeholder="Provide the legal basis for exemption..."
                          value={exemptionReason}
                          onChange={(e) => setExemptionReason(e.target.value)}
                          rows={3}
                        />
                      </div>
                    ) : null}
                    <Button
                      className="w-full"
                      size="compact"
                      onClick={handleRespond}
                      disabled={!outcome || responding}
                    >
                      {responding ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Submit response
                    </Button>
                  </div>
                )}

                {canClose && (
                  <Button
                    variant="outline"
                    className="w-full"
                    size="compact"
                    onClick={handleClose}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Close request
                  </Button>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
