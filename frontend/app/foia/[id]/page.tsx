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
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { HelpGuideCard } from "@/components/help/HelpGuideCard";
import { ErrorState } from "@/components/shared/ErrorState";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

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

const STATUS_BADGE: Record<FOIAStatus, { label: string; className: string }> = {
  submitted: { label: "Submitted", className: "bg-amber-500" },
  acknowledged: { label: "Acknowledged", className: "bg-blue-500" },
  in_processing: { label: "In Processing", className: "bg-purple-500" },
  review: { label: "Under Review", className: "bg-orange-500" },
  approved: { label: "Approved", className: "bg-green-500" },
  partially_granted: { label: "Partially Granted", className: "bg-yellow-500" },
  denied: { label: "Denied", className: "bg-red-500" },
  responded: { label: "Responded", className: "bg-teal-500" },
  closed: { label: "Closed", className: "bg-gray-500" },
  awaiting_clarification: { label: "Awaiting Clarification", className: "bg-pink-500" },
  appealed: { label: "Appealed", className: "bg-violet-500" },
};

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
    loadData();
  }, [loadData]);

  const handleAcknowledge = async () => {
    try {
      await apiFetch(`/api/correspondence/foia-requests/${params.id}/acknowledge/`, {
        method: "POST",
      });
      toast.success("Request acknowledged");
      loadData();
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
      loadData();
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
      loadData();
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

  const daysRemaining = request?.days_remaining ?? (request?.deadline_date
    ? Math.ceil(
        (new Date(request.deadline_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null);

  const isPastDeadline = daysRemaining !== null && daysRemaining < 0;
  const statusInfo = request ? STATUS_BADGE[request.status] : null;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !request) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <ErrorState message={error || "Request not found"} variant="inline" />
          <Button variant="outline" className="mt-4" onClick={() => router.push("/foia")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to FOIA Requests
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => router.push("/foia")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {statusInfo && <Badge className={statusInfo.className}>{statusInfo.label}</Badge>}
        </div>

        <HelpGuideCard
          title={`FOIA Request ${request.request_number}`}
          description={`Submitted by ${request.requester_name} — manage status, notes, and linked documents.`}
          links={[{ label: "FOIA Requests", href: "/foia" }, { label: "Help & Guides", href: "/help" }]}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Request Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Request Number</Label>
                    <p className="font-mono text-sm">{request.request_number}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="mt-0.5">
                      {statusInfo && <Badge className={statusInfo.className}>{statusInfo.label}</Badge>}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Received Date</Label>
                    <p className="text-sm flex items-center gap-1.5 mt-0.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {request.received_date
                        ? new Date(request.received_date).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Deadline</Label>
                    <p
                      className={`text-sm flex items-center gap-1.5 mt-0.5 ${
                        isPastDeadline ? "text-red-600 font-medium" : ""
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      {request.deadline_date
                        ? new Date(request.deadline_date).toLocaleDateString()
                        : "—"}
                      {daysRemaining !== null && (
                        <span className={isPastDeadline ? "text-red-600" : "text-muted-foreground"}>
                          ({isPastDeadline ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d remaining`})
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Format Preference</Label>
                    <p className="text-sm capitalize mt-0.5">{request.format_preference || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Assigned To</Label>
                    <p className="text-sm mt-0.5">
                      {request.assigned_to && typeof request.assigned_to === "object"
                        ? request.assigned_to.name || request.assigned_to.username || "Unassigned"
                        : request.assigned_to || "Unassigned"}
                    </p>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{request.description_of_documents}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={noteIsInternal ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNoteIsInternal(true)}
                    >
                      Internal
                    </Button>
                    <Button
                      variant={!noteIsInternal ? "default" : "outline"}
                      size="sm"
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
                    size="sm"
                    onClick={handleAddNote}
                    disabled={!noteContent.trim() || addingNote}
                  >
                    {addingNote ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-1" />
                    )}
                    Add Note
                  </Button>
                </div>
                <Separator />
                {notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notes yet.</p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className={`p-3 rounded-lg border ${
                          note.is_internal
                            ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                            : "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              note.is_internal
                                ? "border-amber-300 text-amber-700 dark:text-amber-300"
                                : "border-blue-300 text-blue-700 dark:text-blue-300"
                            }`}
                          >
                            {note.is_internal ? "Internal" : "Public"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(note.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No documents attached.</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate">{doc.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Requester Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{request.requester_name}</span>
                </div>
                {request.organization && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{request.organization}</span>
                  </div>
                )}
                {request.requester_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{request.requester_email}</span>
                  </div>
                )}
                {request.requester_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{request.requester_phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {canAcknowledge && (
                  <Button className="w-full" onClick={handleAcknowledge}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Acknowledge Request
                  </Button>
                )}

                {canRespond && (
                  <div className="space-y-3 p-3 border rounded-lg">
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
                        <Label>Exemption Reason</Label>
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
                      onClick={handleRespond}
                      disabled={!outcome || responding}
                    >
                      {responding ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Submit Response
                    </Button>
                  </div>
                )}

                {canClose && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleClose}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Close Request
                  </Button>
                )}

                {!canAcknowledge && !canRespond && !canClose && (
                  <p className="text-sm text-muted-foreground text-center">
                    No actions available for this request.
                  </p>
                )}
              </CardContent>
            </Card>

            {request.outcome && (
              <Card>
                <CardHeader>
                  <CardTitle>Outcome</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Badge
                    className={
                      request.outcome === "approved"
                        ? "bg-green-500"
                        : request.outcome === "partial"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }
                  >
                    {request.outcome.charAt(0).toUpperCase() + request.outcome.slice(1)}
                  </Badge>
                  {request.exemption_reason && (
                    <div className="mt-2">
                      <Label className="text-xs text-muted-foreground">Exemption Reason</Label>
                      <p className="text-sm mt-1">{request.exemption_reason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
