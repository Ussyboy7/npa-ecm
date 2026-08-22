import { ERROR_UNKNOWN } from '@/lib/constants';
import { DEFAULT_SEAL_OFFICE_NAME } from '@/lib/branding';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Image from "next/image";
import { logError, logWarn, logInfo } from '@/lib/client-logger';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Building2, FileText, User, Calendar, MessageSquare, ArrowDown, ArrowUp, Image as ImageIcon, Shield, Paperclip, Download, Eye, ExternalLink, Loader2, Users, ChevronDown } from "lucide-react";
import { Minute, CorrespondenceAttachment, type Correspondence } from "@/lib/npa-structure";
import { SealBadge } from '@/components/seals/SealBadge';
import { DigitalSealPreview } from '@/components/seals/DigitalSealPreview';
import React, { useState, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { mapApiCorrespondence } from '@/lib/api/correspondence-mappers';
import mammoth from "mammoth";
import { useCurrentUser } from "@/hooks/use-current-user";
import { logDocumentAccess, type DocumentAccessLog } from "@/lib/api/dms";
import { fetchDocumentById } from "@/lib/api/dms";
import {
  downloadCanonicalDocument,
  fetchCanonicalContent,
} from "@/lib/canonical-document";
import { SecurePdfCanvasPreview } from "@/components/dms/SecurePdfCanvasPreview";
import { ModalErrorBoundary } from '@/components/shared/ModalErrorBoundary';
import { sanitizeThemedHtml } from '@/lib/sanitize-html';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/components/ui/sonner';

/** Short routing note for Treat minutes — full memo lives in treatment response HTML. */
function getTreatMinuteSummary(minuteText: string): string {
  const text = minuteText.trim();
  if (!text) return 'Treatment & response recorded.';

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const subjects = lines.filter((l) => /^subject:/i.test(l));
  if (text.startsWith('[TREATMENT & RESPONSE]')) {
    return ['Treatment & response', ...subjects.slice(0, 2)].join('\n');
  }
  if (text.startsWith('[RESPONSE WITH DOCUMENT]')) {
    return lines.slice(0, 3).join('\n');
  }
  // Fallback: first paragraph only (avoid dumping full memo body)
  const para = text.split(/\n\n+/)[0]?.trim() || text;
  if (para.length <= 280) return para;
  return `${para.slice(0, 277).trimEnd()}…`;
}

function pickBestResponseCandidate(
  results: Record<string, unknown>[],
  sourceMinute: Minute,
): Record<string, unknown> | undefined {
  if (!results.length) return undefined;
  const minuteTime = new Date(sourceMinute.timestamp).getTime();
  const withScore = results.map((corr) => {
    const corrCurrentApprover = corr.current_approver as Record<string, unknown> | string | undefined;
    const corrCurrentApproverId = typeof corrCurrentApprover === 'object'
      ? String(corrCurrentApprover?.id ?? '')
      : String(corrCurrentApprover ?? '');
    const corrCurrentOffice = corr.current_office as Record<string, unknown> | string | undefined;
    const corrCurrentOfficeId = typeof corrCurrentOffice === 'object'
      ? String(corrCurrentOffice?.id ?? '')
      : String(corrCurrentOffice ?? '');
    const corrDirection = String(corr.direction ?? '');
    const corrTime = new Date((corr.created_at || corr.createdAt) as string).getTime();
    const timeDistance = Number.isFinite(corrTime) ? Math.abs(corrTime - minuteTime) : Number.MAX_SAFE_INTEGER;

    let score = 0;
    if (sourceMinute.toUserId && corrCurrentApproverId === sourceMinute.toUserId) score += 4;
    if (sourceMinute.toOfficeId && corrCurrentOfficeId === sourceMinute.toOfficeId) score += 3;
    if (corrDirection === 'upward') score += 1;
    if (timeDistance <= 60_000) score += 1;

    return { corr, score, timeDistance };
  });

  return withScore
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeDistance - b.timeDistance;
    })
    .find((item) => item.score > 0)?.corr ?? (results[results.length - 1] as Record<string, unknown>);
}

interface MinuteDetailModalProps {
  minute: Minute | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorName?: string;
  showDelegationInfo?: boolean; // Only show "Performed by" to the principal
}

const MinuteDetailModalContent = ({ minute, open, onOpenChange, authorName, showDelegationInfo = false }: MinuteDetailModalProps) => {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const [responseCorrespondence, setResponseCorrespondence] = useState<Correspondence | null>(null);
  const [responseLinkedDocumentIds, setResponseLinkedDocumentIds] = useState<string[]>([]);
  const [linkedDocumentMeta, setLinkedDocumentMeta] = useState<Record<string, { title: string; reference?: string; status?: string }>>({});
  const [responseLookupDone, setResponseLookupDone] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<CorrespondenceAttachment | null>(null);
  const [viewAttachment, setViewAttachment] = useState<CorrespondenceAttachment | null>(null);
  const [viewDelivery, setViewDelivery] = useState<'attachment' | 'dms-version'>('attachment');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewPdfBytes, setPreviewPdfBytes] = useState<ArrayBuffer | null>(null);
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);
  const [viewPdfBytes, setViewPdfBytes] = useState<ArrayBuffer | null>(null);
  const [wordHtml, setWordHtml] = useState<string | null>(null);
  const [wordError, setWordError] = useState<string | null>(null);
  const [distribution, setDistribution] = useState<unknown[]>([]);
  const [loadingDistribution, setLoadingDistribution] = useState(false);
  const [signatureImageSrc, setSignatureImageSrc] = useState<string | null>(null);
  const [signatureImageError, setSignatureImageError] = useState(false);
  const signatureObjectUrlRef = useRef<string | null>(null);

  // Load signature image via API when imageData is a URL (avoids CORS/auth issues with /media/)
  useEffect(() => {
    if (!open || !minute?.signature?.imageData || minute.signature.imageData.startsWith('data:')) {
      setSignatureImageSrc(null);
      setSignatureImageError(false);
      return;
    }
    setSignatureImageError(false);
    setSignatureImageSrc(null);
    if (signatureObjectUrlRef.current) {
      URL.revokeObjectURL(signatureObjectUrlRef.current);
      signatureObjectUrlRef.current = null;
    }
    apiFetch<Blob>(`/correspondence/minutes/${minute.id}/signature-image/`, { responseType: 'blob' })
      .then((blob) => {
        if (signatureObjectUrlRef.current) URL.revokeObjectURL(signatureObjectUrlRef.current);
        const u = URL.createObjectURL(blob);
        signatureObjectUrlRef.current = u;
        setSignatureImageSrc(u);
        setSignatureImageError(false);
      })
      .catch(() => {
        setSignatureImageSrc(null);
        setSignatureImageError(true);
      });
    return () => {
      if (signatureObjectUrlRef.current) {
        URL.revokeObjectURL(signatureObjectUrlRef.current);
        signatureObjectUrlRef.current = null;
      }
      setSignatureImageSrc(null);
    };
  }, [open, minute?.id, minute?.signature?.imageData]);

  // Load distribution entries for this minute (only those linked to this minute). Also filter by
  // correspondence when available so we never pull distribution from other correspondences.
  useEffect(() => {
    if (open && minute?.id) {
      setLoadingDistribution(true);
      const qs = `minute=${minute.id}${minute.correspondenceId ? `&correspondence=${minute.correspondenceId}` : ''}`;
      apiFetch(`/correspondence/distribution/?${qs}`)
        .then((response) => {
          const responseData = response as Record<string, unknown>;
          const results = Array.isArray(responseData) ? responseData : (responseData.results as unknown[]) || [];
          // Filter only active distribution entries
          const activeDistribution = results.filter((dist: Record<string, unknown>) => dist.is_active !== false);
          setDistribution(activeDistribution);
        })
        .catch((error) => {
          logError('Failed to load distribution:', error);
          setDistribution([]);
        })
        .finally(() => {
          setLoadingDistribution(false);
        });
    } else {
      setDistribution([]);
    }
  }, [open, minute?.id, minute?.correspondenceId]);

  // Load response correspondence for treatment minutes
  useEffect(() => {
    if (open && minute && minute.actionType === 'treat' && minute.correspondenceId) {
      setLoadingAttachments(true);
      setResponseLookupDone(false);
      setResponseCorrespondence(null);
      setResponseLinkedDocumentIds([]);
      setLinkedDocumentMeta({});
      // Find response correspondence that has this correspondence as parent
      apiFetch(`/correspondence/items/?parent_correspondence=${minute.correspondenceId}`)
        .then((response) => {
          const responseData = response as Record<string, unknown>;
          const results = (Array.isArray(responseData) ? responseData : (responseData.results as unknown[]) || []) as Record<string, unknown>[];
          let matching = pickBestResponseCandidate(results, minute);

          // Fallback: if parent filter returns nothing, search by parent reference in treatment response.
          if (!matching) {
            return apiFetch(`/correspondence/items/${minute.correspondenceId}/`)
              .then((parent) => {
                const parentData = parent as Record<string, unknown>;
                const parentRef = String(parentData.reference_number ?? '').trim();
                if (!parentRef) return undefined;
                return apiFetch(`/correspondence/items/?search=${encodeURIComponent(parentRef)}`)
                  .then((searchResponse) => {
                    const searchData = searchResponse as Record<string, unknown>;
                    const searchResults = (Array.isArray(searchData) ? searchData : (searchData.results as unknown[]) || []) as Record<string, unknown>[];
                    const candidates = searchResults.filter((corr) => {
                      const corrId = String(corr.id ?? '');
                      if (corrId === minute.correspondenceId) return false;
                      const parentCorr = corr.parent_correspondence as Record<string, unknown> | undefined;
                      const parentId = String(parentCorr?.id ?? '');
                      const treatmentResponse = String(corr.treatment_response ?? '').toLowerCase();
                      const subject = String(corr.subject ?? '').toLowerCase();
                      const refLower = parentRef.toLowerCase();
                      return parentId === minute.correspondenceId || treatmentResponse.includes(refLower) || subject.includes(refLower);
                    });
                    return pickBestResponseCandidate(candidates, minute);
                  })
                  .catch(() => undefined);
              })
              .then((fallbackMatch) => {
                if (!matching && fallbackMatch) matching = fallbackMatch;
                return matching;
              });
          }
          return matching;
        })
        .then((matching) => {
          if (!matching) return;

          if (matching) {
            // Map the API response to the proper format, including attachments
            const mappedCorrespondence = mapApiCorrespondence(matching);
            const linkedIdsFromRaw = Array.isArray(matching.linked_document_ids)
              ? matching.linked_document_ids.map((id) => String(id))
              : Array.isArray(matching.linked_documents)
                ? matching.linked_documents.map((id) => String(id))
                : [];
            logInfo('[MinuteDetailModal] Mapped response correspondence:', {
              id: mappedCorrespondence.id,
              attachmentsCount: mappedCorrespondence.attachments?.length || 0,
              attachments: mappedCorrespondence.attachments,
            });
            setResponseCorrespondence(mappedCorrespondence);
            setResponseLinkedDocumentIds(linkedIdsFromRaw);
          } else {
            logInfo('[MinuteDetailModal] No matching response correspondence found');
          }
        })
        .catch((error) => {
          logError('Failed to load response correspondence:', error);
        })
        .finally(() => {
          setLoadingAttachments(false);
          setResponseLookupDone(true);
        });
    } else {
      setResponseCorrespondence(null);
      setResponseLinkedDocumentIds([]);
      setResponseLookupDone(false);
      setLinkedDocumentMeta({});
    }
  }, [open, minute]);

  useEffect(() => {
    if (!open || responseLinkedDocumentIds.length === 0) return;
    let cancelled = false;

    void (async () => {
      const entries = await Promise.all(
        responseLinkedDocumentIds.map(async (docId) => {
          try {
            const doc = await fetchDocumentById(docId);
            return [docId, { title: doc.title, reference: doc.referenceNumber, status: doc.status }] as const;
          } catch {
            return [docId, { title: "Linked Document" }] as const;
          }
        }),
      );

      if (cancelled) return;
      setLinkedDocumentMeta(Object.fromEntries(entries));
    })();

    return () => {
      cancelled = true;
    };
  }, [open, responseLinkedDocumentIds]);

  // Generate preview for attachment dialog (canonical content API)
  useEffect(() => {
    const isPdf = previewAttachment?.fileType === 'application/pdf';
    const isImage = Boolean(previewAttachment?.fileType?.startsWith('image/'));
    if (previewAttachment?.id && (isPdf || isImage)) {
      setLoadingAttachments(true);
      setPreviewPdfBytes(null);
      fetchCanonicalContent({
        kind: 'corr-attachment',
        attachmentId: previewAttachment.id,
        fileName: previewAttachment.fileName,
      })
        .then(async (blob) => {
          if (isPdf) {
            setPreviewPdfBytes(await blob.arrayBuffer());
            setPreviewImageUrl(null);
          } else {
            const url = URL.createObjectURL(blob);
            setPreviewImageUrl(url);
            setPreviewPdfBytes(null);
          }
          setLoadingAttachments(false);
        })
        .catch((error) => {
          logError('Failed to load preview file:', error);
          setLoadingAttachments(false);
        });

      return () => {
        if (previewImageUrl) {
          URL.revokeObjectURL(previewImageUrl);
        }
      };
    } else {
      setPreviewImageUrl(null);
      setPreviewPdfBytes(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewAttachment]);

  // Generate PDF canvas bytes or Word HTML for view modal (canonical delivery)
  useEffect(() => {
    if (!viewAttachment?.id) {
      setViewImageUrl(null);
      setViewPdfBytes(null);
      setWordHtml(null);
      return;
    }

    const isPDF = viewAttachment.fileType === 'application/pdf' || viewAttachment.fileName?.toLowerCase().endsWith('.pdf');
    const isWordDocx = viewAttachment.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                       viewAttachment.fileName?.toLowerCase().endsWith('.docx');
    const isHtml = viewAttachment.fileType === 'text/html' ||
      viewAttachment.fileName?.toLowerCase().endsWith('.html') ||
      viewAttachment.fileName?.toLowerCase().endsWith('.htm');
    const isImage = Boolean(viewAttachment.fileType?.startsWith('image/'));

    const ref =
      viewDelivery === 'dms-version'
        ? ({
            kind: 'dms-version' as const,
            versionId: viewAttachment.id,
            fileName: viewAttachment.fileName,
          })
        : ({
            kind: 'corr-attachment' as const,
            attachmentId: viewAttachment.id,
            fileName: viewAttachment.fileName,
          });

    if (isPDF || isWordDocx || isHtml || isImage) {
      setLoadingAttachments(true);
      fetchCanonicalContent(ref)
        .then(async (blob) => {
          if (isPDF) {
            setViewPdfBytes(await blob.arrayBuffer());
            setViewImageUrl(null);
            setWordHtml(null);
            setLoadingAttachments(false);
            return;
          }
          if (isImage) {
            const url = URL.createObjectURL(blob);
            setViewImageUrl(url);
            setViewPdfBytes(null);
            setWordHtml(null);
            setLoadingAttachments(false);
            return;
          }
          if (isWordDocx) {
            const result = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() });
            setWordHtml(result.value);
            setViewImageUrl(null);
            setViewPdfBytes(null);
            setLoadingAttachments(false);
            return;
          }
          if (isHtml) {
            const text = await blob.text();
            setWordHtml(text);
            setViewImageUrl(null);
            setViewPdfBytes(null);
            setLoadingAttachments(false);
          }
        })
        .catch((error) => {
          logError('Failed to load preview:', error);
          setLoadingAttachments(false);
          toast.error(error instanceof Error ? error.message : 'Failed to load preview');
        });

      return () => {
        if (viewImageUrl) URL.revokeObjectURL(viewImageUrl);
      };
    }

    setViewImageUrl(null);
    setViewPdfBytes(null);
    setWordHtml(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewAttachment, viewDelivery]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const resolveResponseDmsTarget = (): { documentId: string; sensitivity: string } | null => {
    const completionDocId = responseCorrespondence?.completionPackage?.documentId;
    if (completionDocId) {
      return { documentId: completionDocId, sensitivity: 'internal' };
    }

    const linkedDocId = responseCorrespondence?.linkedDocumentIds?.[0];
    if (linkedDocId) {
      return { documentId: linkedDocId, sensitivity: 'internal' };
    }

    return null;
  };

  const logMinuteAttachmentDmsAccess = async (action: DocumentAccessLog['action']) => {
    if (!currentUser?.id) return;
    const target = resolveResponseDmsTarget();
    if (!target) return;

    try {
      await logDocumentAccess({
        documentId: target.documentId,
        userId: currentUser.id,
        action,
        sensitivity: target.sensitivity,
      });
    } catch (error: unknown) {
      logWarn('[MinuteDetailModal] Failed to write DMS access log', error);
    }
  };

  const handleDownload = async (attachment: CorrespondenceAttachment) => {
    if (!attachment.id) {
      await logMinuteAttachmentDmsAccess('attempted-download');
      toast.error('No file available');
      return;
    }
    try {
      await logMinuteAttachmentDmsAccess('download');
      await downloadCanonicalDocument({
        kind: 'corr-attachment',
        attachmentId: attachment.id,
        fileName: attachment.fileName || 'document',
      });
    } catch (err) {
      await logMinuteAttachmentDmsAccess('attempted-download');
      logError('Attachment download failed', err);
      toast.error(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleViewLinkedDocument = async (documentId: string) => {
    try {
      setLoadingAttachments(true);
      const document = await fetchDocumentById(documentId);
      if (!document.versions?.length) {
        logWarn("Linked document has no versions to preview", { documentId });
        toast.error('No file available to preview');
        return;
      }

      const latestVersion = [...document.versions].sort((a, b) => b.versionNumber - a.versionNumber)[0];
      if (!latestVersion?.id || (!latestVersion.hasFile && !latestVersion.contentHtml)) {
        logWarn("Linked document latest version has no content", { documentId, versionId: latestVersion?.id });
        toast.error('No file available to preview');
        return;
      }

      setViewDelivery('dms-version');
      setViewAttachment({
        id: latestVersion.id,
        fileName: latestVersion.fileName || document.title,
        fileType: latestVersion.fileType,
        fileSize: latestVersion.fileSize,
        fileUrl: latestVersion.fileUrl || '',
      });
    } catch (error: unknown) {
      logError("Failed to load linked document preview", error);
      toast.error('Could not open document preview');
    } finally {
      setLoadingAttachments(false);
    }
  };

  if (!minute) return null;

  const isTreatMinute = minute.actionType === 'treat';
  const treatmentHtml = responseCorrespondence?.treatmentResponse?.trim() || '';
  const isFallbackOnly = treatmentHtml && /^Response to [A-Z]{2,4}\/[A-Z]{2,4}\/\d{4}\/[A-F0-9]+$/i.test(treatmentHtml);
  const hasTreatmentMemo = isTreatMinute && Boolean(treatmentHtml) && !isFallbackOnly;
  const minuteContentText = isTreatMinute
    ? getTreatMinuteSummary(minute.minuteText || '')
    : (minute.minuteText || 'No minute text.');

  // Only "For Information" (purpose=information) added by THIS minute (minute_id match). Excludes
  // distribution from other minutes or correspondence-level entries (minute=null) that the user did not add here.
  const ccEntries = (distribution as Record<string, unknown>[]).filter(
    (d) =>
      String(d.purpose ?? '').toLowerCase() === 'information' &&
      d.minute != null &&
      String(d.minute) === String(minute.id)
  );

  const getActionColor = (action: string) => {
    switch (action) {
      case 'approve': return 'bg-success/10 text-success border-success/20';
      case 'forward': return 'bg-info/10 text-info border-info/20';
      case 'treat': return 'bg-primary/10 text-primary border-primary/20';
      case 'minute': return 'bg-secondary/10 text-secondary border-secondary/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" height="fill">
        <DialogDescription id="minute-detail-desc" className="sr-only">
          View minute content, routing, distribution, and related details.
        </DialogDescription>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Minute Details
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="mt-2 h-[min(82vh,calc(95vh-7rem))] pr-4">
          <div className="space-y-6 pr-2">
            {/* Header Info */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="font-medium text-foreground">{authorName || 'Unknown Author'}</span>
                  <Badge variant="outline" className="text-xs">
                    {minute.gradeLevel}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(minute.timestamp), 'PPp')}
                </div>
                {/* Only show delegation info to the principal (owner of the minute) */}
                {showDelegationInfo && minute.actedByAssistant && minute.performedByName && (
                  <div className="flex items-center gap-2 text-sm text-primary/80 bg-primary/5 px-2 py-1 rounded">
                    <User className="h-4 w-4" />
                    <span>Performed by <span className="font-medium">{minute.performedByName}</span></span>
                    {minute.assistantType && (
                      <Badge variant="outline" className="text-xs">
                        {minute.assistantType}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Badge variant="outline" className={getActionColor(minute.actionType)}>
                  {minute.actionType.toUpperCase()}
                </Badge>
                <Badge variant="outline" className={
                  minute.direction === 'downward' 
                    ? 'bg-info/10 text-info border-info/20' 
                    : 'bg-success/10 text-success border-success/20'
                }>
                  {minute.direction === 'downward' ? (
                    <>
                      <ArrowDown className="h-3 w-3 mr-1" />
                      Downward
                    </>
                  ) : (
                    <>
                      <ArrowUp className="h-3 w-3 mr-1" />
                      Upward
                    </>
                  )}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Main Content */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Minute Content
                  </h4>
                  {minute.isEdited && (
                    <Badge variant="outline" className="text-xs text-warning">
                      Edited {minute.editedAt ? format(new Date(minute.editedAt), 'PPp') : ''}
                    </Badge>
                  )}
                </div>
                <div className="rounded-lg border border-border overflow-hidden bg-muted/50 p-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {minuteContentText}
                  </p>
                </div>
                {hasTreatmentMemo && (
                  <Collapsible className="mt-3 group/treat">
                    <div className="flex items-center justify-between gap-2">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                        >
                          <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]/treat:rotate-180" />
                          Treatment memo
                        </Button>
                      </CollapsibleTrigger>
                      {responseCorrespondence?.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => {
                            onOpenChange(false);
                            router.push(`/correspondence/${responseCorrespondence.id}`);
                          }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open response
                        </Button>
                      )}
                    </div>
                    <CollapsibleContent className="mt-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 duration-200 motion-reduce:animate-none">
                      <div className="rounded-lg border border-border overflow-hidden doc-paper p-4 max-h-[50vh] overflow-y-auto">
                        <div
                          className={cn(
                            'prose prose-sm max-w-none text-neutral-900',
                            '[&_*]:!text-neutral-900 [&_a]:!text-blue-700',
                          )}
                          dangerouslySetInnerHTML={{
                            __html: sanitizeThemedHtml(treatmentHtml),
                          }}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
                {isTreatMinute && !hasTreatmentMemo && responseCorrespondence && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border border-dashed">
                    <p className="text-xs text-muted-foreground">
                      Treatment response submitted but no content was recorded.
                      {' '}
                      <button
                        type="button"
                        className="underline hover:text-foreground"
                        onClick={() => {
                          onOpenChange(false);
                          router.push(`/correspondence/${responseCorrespondence.id}`);
                        }}
                      >
                        Open response
                      </button>
                    </p>
                  </div>
                )}
                {minute.originalMinuteText && minute.originalMinuteText !== minute.minuteText && (
                  <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border border-dashed">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Original Text:</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap line-through">
                      {minute.originalMinuteText}
                    </p>
                  </div>
                )}
              </div>

              {/* Edit History */}
              {minute.editHistory && minute.editHistory.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Edit History</h4>
                  <div className="space-y-2">
                    {minute.editHistory.map((edit, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-foreground">
                            Edit #{idx + 1}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(edit.edited_at), 'PPp')}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Previous:</p>
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap line-through">
                              {edit.old_text}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Updated:</p>
                            <p className="text-xs text-foreground whitespace-pre-wrap">
                              {edit.new_text}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Minutes */}
              {minute.isAdditional && minute.relatesToMinuteId && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Related To
                  </h4>
                  <div className="p-3 rounded-lg bg-info/10 border border-info/20">
                    <p className="text-xs text-muted-foreground mb-1">This is an additional minute related to:</p>
                    <p className="text-sm text-foreground font-medium">Minute #{minute.stepNumber}</p>
                    {minute.minuteType && (
                      <Badge variant="outline" className="text-xs mt-2 bg-info/20 text-info border-info/30">
                        {minute.minuteType === 'instruction' ? 'Additional Instruction' :
                         minute.minuteType === 'clarification' ? 'Clarification' : 'Addendum'}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Fields */}
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Step Number</h4>
                  <p className="text-muted-foreground">Step {minute.stepNumber}</p>
                </div>
                
                {minute.fromOfficeName && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-1 flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      From Office
                    </h4>
                    <p className="text-muted-foreground">{minute.fromOfficeName}</p>
                  </div>
                )}
                
                {minute.toOfficeName && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-1 flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      To Office
                    </h4>
                    <p className="text-muted-foreground">{minute.toOfficeName}</p>
                  </div>
                )}
                
                {minute.actedBySecretary && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Processed By</h4>
                    <Badge variant="secondary">Secretary</Badge>
                  </div>
                )}
                
                {minute.actedByAssistant && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Assistant Type</h4>
                    <Badge variant="secondary">{minute.assistantType}</Badge>
                  </div>
                )}
                
                {minute.readAt && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Read At</h4>
                    <p className="text-muted-foreground text-xs">
                      {format(new Date(minute.readAt), 'PPp')}
                    </p>
                  </div>
                )}
              </div>

              {minute.mentions && minute.mentions.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">Mentions</h4>
                    <div className="flex flex-wrap gap-2">
                      {minute.mentions.map((mention: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          @{mention}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Distribution (CC) Section */}
              {ccEntries.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Distribution (CC)
                    </h4>
                    {loadingDistribution ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground ml-2">Loading distribution...</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {ccEntries.map((dist: Record<string, unknown>) => {
                          const recipientName = 
                            dist.user_name ||
                            dist.office_name ||
                            dist.directorate_name ||
                            dist.division_name ||
                            dist.department_name ||
                            'Unknown';
                          const recipientType = String(dist.recipient_type ?? 'division');
                          const purpose = dist.purpose ? String(dist.purpose) : '';
                          
                          return (
                            <div
                              key={dist.id as string}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Badge variant="outline" className="text-xs">
                                  {String(recipientName)}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {recipientType.charAt(0).toUpperCase() + recipientType.slice(1)}
                                </Badge>
                                {purpose && (
                                  <Badge variant="outline" className="text-xs">
                                    {purpose.charAt(0).toUpperCase() + purpose.slice(1)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Show seal for executive approvals (signature is embedded in seal) */}
              {minute.sealData ? (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-600" />
                      Digital Executive Seal
                    </h4>
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <SealBadge sealData={minute.sealData} showDetails size="md" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">
                          The digital signature is embedded within this seal. Click the badge to view full seal details.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : minute.signature ? (
                /* Show seal-style preview (signature embedded in seal) when there's no sealData */
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-600" />
                      Digital Executive Seal
                    </h4>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="p-3 border border-emerald-200 dark:border-emerald-800 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-center min-h-[200px]">
                        <DigitalSealPreview
                          officeName={DEFAULT_SEAL_OFFICE_NAME}
                          officeTitle="OFFICE OF THE MANAGING DIRECTOR"
                          serialNumber={minute.id}
                          signatureImage={
                            minute.signature.imageData?.startsWith('data:')
                              ? minute.signature.imageData
                              : signatureImageError
                                ? undefined
                                : signatureImageSrc ?? undefined
                          }
                          timestamp={minute.signature.appliedAt}
                          size={200}
                          showQR={true}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Applied at {format(new Date(minute.signature.appliedAt), 'PPp')}</p>
                        {minute.signature.fileName && <p>Source file: {minute.signature.fileName}</p>}
                        {minute.signature.templateId && (
                          <p>Template ID: {minute.signature.templateId}</p>
                        )}
                        {minute.signature.templateType && (
                          <p>Type: {minute.signature.templateType}</p>
                        )}
                        {signatureImageError && (
                          <p className="text-amber-600 dark:text-amber-500">Signature image could not be loaded; seal shown for reference.</p>
                        )}
                      </div>
                    </div>
                    {minute.signature.renderedText && (
                      <div className="p-3 border border-dashed rounded bg-muted/30">
                        <p className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                          {minute.signature.renderedText}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : null}

              {/* Attachments Section - For Treatment Minutes */}
              {minute.actionType === 'treat' && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-primary" />
                      Attached Documents
                    </h4>
                    {loadingAttachments ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground ml-2">Loading attachments...</span>
                      </div>
                    ) : responseCorrespondence?.attachments && responseCorrespondence.attachments.length > 0 ? (
                      <div className="space-y-2">
                        {responseCorrespondence.attachments.map((attachment: CorrespondenceAttachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center gap-3 p-3 border border-border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                          >
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                              {attachment.fileType?.startsWith('image/') ? (
                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                              ) : attachment.fileType === 'application/pdf' ? (
                                <FileText className="h-5 w-5 text-red-600" />
                              ) : (
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(attachment.fileSize)} • {attachment.fileType || 'Unknown type'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  void logMinuteAttachmentDmsAccess('view');
                                  setViewDelivery('attachment');
                                  setViewAttachment(attachment);
                                }}
                                title="View Document"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {(attachment.fileType?.startsWith('image/') || attachment.fileType === 'application/pdf') && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    void logMinuteAttachmentDmsAccess('view');
                                    setPreviewAttachment(attachment);
                                  }}
                                  title="Quick Preview"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => { void handleDownload(attachment); }}
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {responseCorrespondence.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => router.push(`/correspondence/${responseCorrespondence.id}`)}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Response Correspondence
                          </Button>
                        )}
                      </div>
                    ) : responseLinkedDocumentIds.length > 0 ? (
                      <div className="space-y-2">
                        {responseLinkedDocumentIds.map((docId) => (
                          <div
                            key={docId}
                            className="flex items-center justify-between gap-3 p-3 border border-border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{linkedDocumentMeta[docId]?.title || "Linked Document"}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {linkedDocumentMeta[docId]?.reference
                                  ? `${linkedDocumentMeta[docId]?.reference}${linkedDocumentMeta[docId]?.status ? ` • ${linkedDocumentMeta[docId]?.status}` : ''}`
                                  : `ID: ${docId}`}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { void handleViewLinkedDocument(docId); }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </div>
                        ))}
                        {responseCorrespondence?.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => router.push(`/correspondence/${responseCorrespondence.id}`)}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Response Correspondence
                          </Button>
                        )}
                      </div>
                    ) : responseCorrespondence ? (
                      <div className="p-3 rounded-lg bg-muted/30 border border-border border-dashed text-center">
                        <p className="text-sm text-muted-foreground">No attachments found</p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-muted/30 border border-border border-dashed text-center">
                        <p className="text-sm text-muted-foreground">
                          {responseLookupDone ? 'No response correspondence found for this minute.' : 'Loading response correspondence...'}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>

      {/* Attachment Preview Modal (Quick Preview) */}
      <Dialog open={!!previewAttachment} onOpenChange={() => setPreviewAttachment(null)}>
        <DialogContent size="2xl" height="fill">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              {previewAttachment?.fileName}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 mt-4">
            <div className="min-h-[400px]">
              {loadingAttachments ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : previewAttachment && previewAttachment.fileType?.startsWith('image/') && previewImageUrl ? (
                <div className="flex items-center justify-center p-4">
                  <Image 
                    src={previewImageUrl} 
                    alt={previewAttachment.fileName}
                    width={1200}
                    height={900}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                    unoptimized
                  />
                </div>
              ) : previewAttachment && previewAttachment.fileType === 'application/pdf' && previewPdfBytes ? (
                <div className="w-full overflow-auto">
                  <SecurePdfCanvasPreview data={previewPdfBytes} minHeightClassName="min-h-[70vh]" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    Preview not available for this file type
                  </p>
                  {previewAttachment?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => { void handleDownload(previewAttachment); }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download to View
                    </Button>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Document View Modal (Full Document View) */}
      <Dialog open={!!viewAttachment} onOpenChange={() => setViewAttachment(null)}>
        <DialogContent size="full" height="fill" density="flush">
          <DialogHeader className="px-4 pt-3 pb-1 flex-shrink-0">
            <DialogTitle className="text-sm font-medium truncate">
              {viewAttachment?.fileName || 'Document'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 border-t overflow-y-auto">
            {loadingAttachments ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-sm text-muted-foreground">Loading document...</span>
              </div>
            ) : viewAttachment && viewAttachment.fileType?.startsWith('image/') && viewImageUrl ? (
              <div className="flex items-center justify-center p-4 py-8">
                <Image 
                  src={viewImageUrl} 
                  alt={viewAttachment.fileName}
                  width={1200}
                  height={900}
                  className="max-w-full max-h-[calc(90vh-250px)] object-contain rounded-lg shadow-lg"
                  unoptimized
                />
              </div>
            ) : viewAttachment && (viewAttachment.fileType === 'application/pdf' || viewAttachment.fileName?.toLowerCase().endsWith('.pdf')) && viewPdfBytes ? (
              <div className="w-full overflow-auto py-4">
                <SecurePdfCanvasPreview data={viewPdfBytes} minHeightClassName="min-h-[600px]" />
              </div>
            ) : viewAttachment && wordError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2 text-destructive">Error loading Word document</p>
                <p className="text-sm text-muted-foreground mb-4">{wordError}</p>
              </div>
            ) : viewAttachment && wordHtml ? (
              <div className="w-full py-4">
                <div className="prose prose-base dark:prose-invert max-w-none p-6 overflow-y-auto">
                  <div dangerouslySetInnerHTML={{ __html: sanitizeThemedHtml(wordHtml) }} />
                </div>
              </div>
            ) : viewAttachment?.id ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <p className="text-sm text-muted-foreground mb-2">
                  Document preview not available for this file type
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  {viewAttachment.fileType || 'Unknown file type'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!viewAttachment?.id) return;
                    if (viewDelivery === 'dms-version') {
                      void downloadCanonicalDocument({
                        kind: 'dms-version',
                        versionId: viewAttachment.id,
                        fileName: viewAttachment.fileName || 'document',
                      }).catch((err) => {
                        logError('Linked document download failed', err);
                        toast.error(err instanceof Error ? err.message : 'Download failed');
                      });
                      return;
                    }
                    void handleDownload(viewAttachment);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download to View
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  Unable to load document
                </p>
              </div>
            )}
          </div>

        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export const MinuteDetailModal = React.memo((props: MinuteDetailModalProps) => (
  <ModalErrorBoundary onClose={() => props.onOpenChange?.(false)}>
    <MinuteDetailModalContent {...props} />
  </ModalErrorBoundary>
));
MinuteDetailModal.displayName = 'MinuteDetailModal';
