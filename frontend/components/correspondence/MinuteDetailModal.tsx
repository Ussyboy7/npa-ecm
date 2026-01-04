import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { logError, logWarn, logInfo } from '@/lib/client-logger';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Building2, FileText, User, Calendar, MessageSquare, ArrowDown, ArrowUp, Image as ImageIcon, Shield, Paperclip, Download, Eye, ExternalLink, Loader2, Users } from "lucide-react";
import { Minute, CorrespondenceAttachment, type Correspondence } from "@/lib/npa-structure";
import { SealBadge } from '@/components/seals/SealBadge';
import { useState, useEffect } from "react";
import { apiFetch, getStoredAccessToken } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { mapApiCorrespondence } from "@/contexts/CorrespondenceContext";
import mammoth from "mammoth";

interface MinuteDetailModalProps {
  minute: Minute | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorName?: string;
  showDelegationInfo?: boolean; // Only show "Performed by" to the principal
}

export const MinuteDetailModal = ({ minute, open, onOpenChange, authorName, showDelegationInfo = false }: MinuteDetailModalProps) => {
  const router = useRouter();
  const [responseCorrespondence, setResponseCorrespondence] = useState<Correspondence | null>(null);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<CorrespondenceAttachment | null>(null);
  const [viewAttachment, setViewAttachment] = useState<CorrespondenceAttachment | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [viewPdfBlobUrl, setViewPdfBlobUrl] = useState<string | null>(null);
  const [wordHtml, setWordHtml] = useState<string | null>(null);
  const [wordError, setWordError] = useState<string | null>(null);
  const [distribution, setDistribution] = useState<unknown[]>([]);
  const [loadingDistribution, setLoadingDistribution] = useState(false);

  // Load distribution entries for this minute
  useEffect(() => {
    if (open && minute?.id) {
      setLoadingDistribution(true);
      apiFetch(`/correspondence/distribution/?minute=${minute.id}`)
        .then((response) => {
          const responseData = response as Record<string, unknown>;
          const results = Array.isArray(responseData) ? responseData : (responseData.results as any[]) || [];
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
  }, [open, minute?.id]);

  // Load response correspondence for treatment minutes
  useEffect(() => {
    if (open && minute && minute.actionType === 'treat' && minute.correspondenceId) {
      setLoadingAttachments(true);
      // Find response correspondence that has this correspondence as parent
      apiFetch(`/correspondence/items/?parent_correspondence=${minute.correspondenceId}`)
        .then((response) => {
          const responseData = response as Record<string, unknown>;
          const results = Array.isArray(responseData) ? responseData : (responseData.results as any[]) || [];
          // Find the one created around the same time as the minute (within 5 seconds)
          const minuteTime = new Date(minute.timestamp).getTime();
          const matching = results.find((corr: Record<string, unknown>) => {
            const corrTime = new Date((corr.created_at || corr.createdAt) as string).getTime();
            return Math.abs(corrTime - minuteTime) < 5000; // 5 seconds tolerance
          });
          if (matching) {
            // Map the API response to the proper format, including attachments
            const mappedCorrespondence = mapApiCorrespondence(matching);
            logInfo('[MinuteDetailModal] Mapped response correspondence:', {
              id: mappedCorrespondence.id,
              attachmentsCount: mappedCorrespondence.attachments?.length || 0,
              attachments: mappedCorrespondence.attachments,
            });
            setResponseCorrespondence(mappedCorrespondence);
          } else {
            logInfo('[MinuteDetailModal] No matching response correspondence found');
          }
        })
        .catch((error) => {
          logError('Failed to load response correspondence:', error);
        })
        .finally(() => {
          setLoadingAttachments(false);
        });
    } else {
      setResponseCorrespondence(null);
    }
  }, [open, minute]);

  // Generate PDF blob URL for preview
  useEffect(() => {
    if (previewAttachment && previewAttachment.fileType === 'application/pdf' && previewAttachment.fileUrl) {
      setLoadingAttachments(true);
      fetch(previewAttachment.fileUrl, { credentials: 'include' })
        .then((response) => response.blob())
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          setPdfBlobUrl(url);
          setLoadingAttachments(false);
        })
        .catch((error) => {
          logError('Failed to load PDF:', error);
          setLoadingAttachments(false);
        });

      return () => {
        if (pdfBlobUrl) {
          URL.revokeObjectURL(pdfBlobUrl);
        }
      };
    } else {
      setPdfBlobUrl(null);
    }
  }, [previewAttachment]);

  // Generate PDF blob URL or Word HTML for view modal
  useEffect(() => {
    if (!viewAttachment || !viewAttachment.fileUrl) {
      setViewPdfBlobUrl(null);
      setWordHtml(null);
      return;
    }

    const isPDF = viewAttachment.fileType === 'application/pdf' || viewAttachment.fileName?.toLowerCase().endsWith('.pdf');
    const isWordDocx = viewAttachment.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                       viewAttachment.fileName?.toLowerCase().endsWith('.docx');
    const isWordDoc = viewAttachment.fileType === 'application/msword' || 
                     viewAttachment.fileName?.toLowerCase().endsWith('.doc');

    if (isPDF) {
      setLoadingAttachments(true);
      const token = getStoredAccessToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      fetch(viewAttachment.fileUrl, { 
        credentials: 'include',
        headers,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load PDF: ${response.status} ${response.statusText}`);
          }
          return response.blob();
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          setViewPdfBlobUrl(url);
          setWordHtml(null);
          setLoadingAttachments(false);
        })
        .catch((error) => {
          logError('Failed to load PDF:', error);
          setLoadingAttachments(false);
        });

      return () => {
        if (viewPdfBlobUrl) {
          URL.revokeObjectURL(viewPdfBlobUrl);
        }
      };
    } else if (isWordDocx) {
      setLoadingAttachments(true);
      const token = getStoredAccessToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      fetch(viewAttachment.fileUrl, {
        credentials: 'include',
        headers,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load Word document: ${response.status} ${response.statusText}`);
          }
          return response.blob();
        })
        .then((blob) => {
          return blob.arrayBuffer();
        })
        .then((arrayBuffer) => {
          return mammoth.convertToHtml({ arrayBuffer });
        })
        .then((result) => {
          setWordHtml(result.value);
          setWordError(null);
          setViewPdfBlobUrl(null);
          setLoadingAttachments(false);
        })
        .catch((error) => {
          logError('Error converting Word document:', error);
          setWordError((error instanceof Error ? error.message : "Unknown error") || 'Failed to convert Word document');
          setWordHtml(null);
          setLoadingAttachments(false);
        });
    } else {
      setViewPdfBlobUrl(null);
      setWordHtml(null);
      setWordError(null);
    }
  }, [viewAttachment]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = (attachment: CorrespondenceAttachment) => {
    if (attachment.fileUrl) {
      window.open(attachment.fileUrl, '_blank');
    }
  };

  if (!minute) return null;

  // Debug logging
  if (open) {
    logInfo('[MinuteDetailModal] Minute data:', {
      id: minute.id,
      actionType: minute.actionType,
      hasSealData: !!minute.sealData,
      hasSignature: !!minute.signature,
      sealData: minute.sealData,
      signature: minute.signature,
    });
  }

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
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Minute Details
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6 pr-4">
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
                    <FileText className="h-4 w-4 text-primary" />
                    Minute Content
                  </h4>
                  {minute.isEdited && (
                    <Badge variant="outline" className="text-xs text-warning">
                      Edited {minute.editedAt ? format(new Date(minute.editedAt), 'PPp') : ''}
                    </Badge>
                  )}
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {minute.minuteText}
                  </p>
                </div>
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
              {distribution.length > 0 && (
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
                        {(distribution as Record<string, unknown>[]).map((dist: Record<string, unknown>) => {
                          const recipientName = 
                            dist.user_name ||
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
                /* Show signature only if there's no seal */
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      Digital Signature
                    </h4>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="p-3 border rounded-lg bg-muted/50">
                        <img
                          src={minute.signature.imageData}
                          alt="Applied digital signature preview"
                          className="max-h-32 object-contain"
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
                                onClick={() => setViewAttachment(attachment)}
                                title="View Document"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {(attachment.fileType?.startsWith('image/') || attachment.fileType === 'application/pdf') && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setPreviewAttachment(attachment)}
                                  title="Quick Preview"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDownload(attachment)}
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
                    ) : responseCorrespondence ? (
                      <div className="p-3 rounded-lg bg-muted/30 border border-border border-dashed text-center">
                        <p className="text-sm text-muted-foreground">No attachments found</p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-muted/30 border border-border border-dashed text-center">
                        <p className="text-sm text-muted-foreground">Loading response correspondence...</p>
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
        <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden p-4 sm:p-6">
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
              ) : previewAttachment && previewAttachment.fileType?.startsWith('image/') && previewAttachment.fileUrl ? (
                <div className="flex items-center justify-center p-4">
                  <img 
                    src={previewAttachment.fileUrl} 
                    alt={previewAttachment.fileName}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  />
                </div>
              ) : previewAttachment && previewAttachment.fileType === 'application/pdf' && pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  className="w-full h-[70vh] border-0 rounded-lg"
                  title={`PDF Preview: ${previewAttachment.fileName}`}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    Preview not available for this file type
                  </p>
                  {previewAttachment?.fileUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => handleDownload(previewAttachment)}
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
        <DialogContent className="max-w-6xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="space-y-1 px-6 pt-6 flex-shrink-0">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document View
            </DialogTitle>
            <DialogDescription>
              {viewAttachment?.fileName} • {formatFileSize(viewAttachment?.fileSize)} • {viewAttachment?.fileType || 'Unknown type'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 border-t border-b overflow-y-auto px-6" style={{ height: 'calc(90vh - 200px)', maxHeight: 'calc(90vh - 200px)' }}>
            {loadingAttachments ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-sm text-muted-foreground">Loading document...</span>
              </div>
            ) : viewAttachment && viewAttachment.fileType?.startsWith('image/') && viewAttachment.fileUrl ? (
              <div className="flex items-center justify-center p-4 py-8">
                <img 
                  src={viewAttachment.fileUrl} 
                  alt={viewAttachment.fileName}
                  className="max-w-full max-h-[calc(90vh-250px)] object-contain rounded-lg shadow-lg"
                />
              </div>
            ) : viewAttachment && viewAttachment.fileType === 'application/pdf' && viewPdfBlobUrl ? (
              <div className="w-full h-full min-h-[600px] py-4">
                <iframe
                  src={viewPdfBlobUrl}
                  className="w-full h-full border-0 rounded-lg"
                  title={`PDF Document: ${viewAttachment.fileName}`}
                />
              </div>
            ) : viewAttachment && wordError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2 text-destructive">Error loading Word document</p>
                <p className="text-sm text-muted-foreground mb-4">{wordError}</p>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleDownload(viewAttachment)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download to View
                </Button>
              </div>
            ) : viewAttachment && wordHtml ? (
              <div className="w-full py-4">
                <div className="prose prose-base dark:prose-invert max-w-none p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 250px)' }}>
                  <div dangerouslySetInnerHTML={{ __html: wordHtml }} />
                </div>
              </div>
            ) : viewAttachment && viewAttachment.fileUrl ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <p className="text-sm text-muted-foreground mb-2">
                  Document preview not available for this file type
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  {viewAttachment.fileType || 'Unknown file type'}
                </p>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleDownload(viewAttachment)}
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

          <DialogFooter className="px-6 pb-6 flex-shrink-0">
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-muted-foreground">
                {viewAttachment?.fileName}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleDownload(viewAttachment!)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="default"
                  onClick={() => setViewAttachment(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
