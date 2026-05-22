"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { sanitizeHtml } from '@/lib/sanitize-html';
import {
  ArrowLeft,
  Send,
  Mail,
  Calendar,
  User as UserIcon,
  Building2,
  ArrowDown,
  ArrowUp,
  Clock,
  FileText,
  Download,
  Printer,
  Eye,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Edit,
  Route,
  Tag,
  Phone,
  ExternalLink,
  RefreshCw,
  MoreVertical,
  Users,
  Copy,
  Trash2,
  Share2,
  ChevronDown,
  ChevronUp,
  FolderTree,
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Correspondence, Minute, CorrespondenceAttachment } from '@/lib/npa-structure';
import { formatDateShort, formatDateTime } from '@/lib/correspondence-helpers';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence, mapApiMinute } from '@/contexts/CorrespondenceContext';
import { toast } from 'sonner';
import { logError, logWarn } from '@/lib/client-logger';
import { fetchDocumentById, logDocumentAccess, type DocumentRecord } from '@/lib/dms-storage';
import mammoth from 'mammoth';
import { useCurrentUser } from '@/hooks/use-current-user';

const OutboxDetailPage = () => {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const { divisions, departments, directorates, users: organizationUsers } = useOrganization();

  const [correspondence, setCorrespondence] = useState<Correspondence | null>(null);
  const [minutes, setMinutes] = useState<Minute[]>([]);
  const [linkedDocuments, setLinkedDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentPreviewLoading, setDocumentPreviewLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [selectedAttachmentIndex, setSelectedAttachmentIndex] = useState(0);
  const [attachmentPreviews, setAttachmentPreviews] = useState<Map<number, { pdfUrl?: string; wordHtml?: string; error?: string }>>(new Map());
  const [relatedCorrespondence, setRelatedCorrespondence] = useState<Correspondence[]>([]);
  const [caseLinks, setCaseLinks] = useState<Array<{ id: string; caseNumber: string; title: string }>>([]);
  const [expandRoutingHistory, setExpandRoutingHistory] = useState(false);
  const [previewErrors, setPreviewErrors] = useState<Map<number, string>>(new Map());
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [resendCustomMessage, setResendCustomMessage] = useState('');
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');

  const resolveOutboxDmsTarget = useCallback((): { documentId: string; sensitivity: string } | null => {
    const completionDocId = correspondence?.completionPackage?.documentId;
    if (completionDocId) {
      return { documentId: completionDocId, sensitivity: 'internal' };
    }

    const linkedDoc = linkedDocuments[0];
    if (linkedDoc?.id) {
      return { documentId: linkedDoc.id, sensitivity: linkedDoc.sensitivity ?? 'internal' };
    }

    const linkedDocId = correspondence?.linkedDocumentIds?.[0];
    if (linkedDocId) {
      return { documentId: linkedDocId, sensitivity: 'internal' };
    }

    return null;
  }, [correspondence?.completionPackage?.documentId, correspondence?.linkedDocumentIds, linkedDocuments]);

  const logOutboxDmsAccess = useCallback(async (
    action: 'view' | 'download' | 'attempted-download',
    documentIdOverride?: string,
    sensitivityOverride?: string,
  ) => {
    if (!currentUser?.id) return;
    const target = documentIdOverride
      ? { documentId: documentIdOverride, sensitivity: sensitivityOverride ?? 'internal' }
      : resolveOutboxDmsTarget();
    if (!target) return;

    try {
      await logDocumentAccess({
        documentId: target.documentId,
        userId: currentUser.id,
        action,
        sensitivity: target.sensitivity,
      });
    } catch (error: unknown) {
      logWarn('[OutboxDetailPage] Failed to write DMS access log', error);
    }
  }, [currentUser?.id, resolveOutboxDmsTarget]);

  // Load attachment preview helper - defined before loadData so it can be used
  const loadAttachmentPreview = useCallback(async (index: number, attachment: CorrespondenceAttachment) => {
    if (!attachment?.fileUrl) return;
    void logOutboxDmsAccess('view');

    const fileName = attachment.fileName || '';
    const isPDF = attachment.fileType === 'application/pdf';
    const isWord = fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc');

    if (!isPDF && !isWord) {
      setPreviewErrors((prev) => new Map(prev).set(index, 'Preview not available for this file type'));
      return;
    }

    setDocumentPreviewLoading(true);
    try {
      const response = await fetch(attachment.fileUrl);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      if (isPDF) {
        setAttachmentPreviews((prev) => {
          const newMap = new Map(prev);
          newMap.set(index, { pdfUrl: blobUrl });
          return newMap;
        });
      } else if (isWord) {
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          const sanitized = sanitizeHtml(result.value);
          setAttachmentPreviews((prev) => {
            const newMap = new Map(prev);
            newMap.set(index, { wordHtml: sanitized });
            return newMap;
          });
        } catch (mammothErr) {
          throw new Error('Failed to convert Word document');
        }
      }
      setPreviewErrors((prev) => {
        const newMap = new Map(prev);
        newMap.delete(index);
        return newMap;
      });
    } catch (err: unknown) {
      const errorMsg = (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') ? err.message : 'Failed to load preview';
      setPreviewErrors((prev) => new Map(prev).set(index, errorMsg));
      setAttachmentPreviews((prev) => {
        const newMap = new Map(prev);
        newMap.delete(index);
        return newMap;
      });
    } finally {
      setDocumentPreviewLoading(false);
    }
  }, [logOutboxDmsAccess]);

  // Extract loadData as useCallback so it can be called for refresh
  const loadData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      // Fetch correspondence
      const corrResponse = await apiFetch<Record<string, unknown>>(`/correspondence/items/${id}/`);
      const mappedCorr = mapApiCorrespondence(corrResponse);
      setCorrespondence(mappedCorr);

      // Fetch minutes
      type MinutesResponse = Array<Record<string, unknown>> | { results: Array<Record<string, unknown>> };
      const minutesResponse = await apiFetch<MinutesResponse>(`/correspondence/minutes/?correspondence=${id}`);
      const minutesData = Array.isArray(minutesResponse) ? minutesResponse : (minutesResponse?.results || []);
      setMinutes(minutesData.map(mapApiMinute));

      // Load linked documents
      if (mappedCorr.linkedDocumentIds && mappedCorr.linkedDocumentIds.length > 0) {
        const docs = await Promise.all(
          mappedCorr.linkedDocumentIds.map(async (docId) => {
            try {
              return await fetchDocumentById(docId);
            } catch {
              return null;
            }
          })
        );
        setLinkedDocuments(docs.filter((doc): doc is DocumentRecord => Boolean(doc)));
      }

      // Load document previews for all attachments (lazy load on demand)
      // Reset preview state
      setAttachmentPreviews(new Map());
      setPreviewErrors(new Map());
      setSelectedAttachmentIndex(0);

      // Load first attachment preview immediately
      const firstAttachment = mappedCorr.attachments?.[0];
      if (firstAttachment?.fileUrl) {
        await loadAttachmentPreview(0, firstAttachment);
      }

      // Fetch related correspondence (if any)
      try {
        // Check if this correspondence references others or is referenced
        const relatedResponse = await apiFetch<unknown[]>(`/correspondence/items/?linked_documents=${mappedCorr.linkedDocumentIds?.[0] || ''}`).catch(() => []);
        if (Array.isArray(relatedResponse)) {
          const related = (relatedResponse as Array<Record<string, unknown>>)
            .filter((item) => item.id as string !== mappedCorr.id)
            .map(mapApiCorrespondence)
            .slice(0, 5); // Limit to 5 related items
          setRelatedCorrespondence(related);
        }
      } catch (err) {
        logError('Failed to load related correspondence:', err);
      }

      // Fetch case links
      try {
        const caseLinksResponse = await apiFetch<Array<Record<string, unknown>>>(`/correspondence/case-correspondence-links/?correspondence=${id}`);
        if (Array.isArray(caseLinksResponse)) {
          const links = caseLinksResponse.map((link) => ({
            id: String((link.case && typeof link.case === 'object' && 'id' in link.case ? (link.case as Record<string, unknown>).id : null) || link.case_id || ''),
            caseNumber: String((link.case && typeof link.case === 'object' && 'case_number' in link.case ? (link.case as Record<string, unknown>).case_number : null) || link.case_number || 'N/A'),
            title: String((link.case && typeof link.case === 'object' && 'title' in link.case ? (link.case as Record<string, unknown>).title : null) || 'Untitled Case'),
          })).filter((link) => link.id);
          setCaseLinks(links);
        }
      } catch (err) {
        logError('Failed to load case links:', err);
      }
    } catch (err: unknown) {
      let errorMessage = 'Failed to load outbox item';
      if (err && typeof err === 'object') {
        const errorObj = err as Record<string, unknown>;
        if (errorObj.response && typeof errorObj.response === 'object') {
          const response = errorObj.response as Record<string, unknown>;
          if (response.data && typeof response.data === 'object') {
            const data = response.data as Record<string, unknown>;
            errorMessage = (data.detail as string) || errorMessage;
          }
        }
        if (errorMessage === 'Failed to load outbox item') {
          errorMessage = (errorObj.message as string) || errorMessage;
        }
      }
      setError(errorMessage);
      toast.error(`Failed to load outbox item: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [id, loadAttachmentPreview]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const calculateDaysPending = () => {
    if (!correspondence) return 0;
    const date = correspondence.updatedAt ?? correspondence.createdAt ?? correspondence.receivedDate;
    if (!date) return 0;
    const diff = Date.now() - new Date(date).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = () => {
    if (!correspondence) return null;
    const status = correspondence.status;
    if (status === 'pending') {
      return (
        <Badge variant="outline" className="gap-1 text-warning bg-warning/10">
          <Clock className="h-3 w-3" />
          Pending Dispatch
        </Badge>
      );
    }
    if (status === 'in-progress') {
      return (
        <Badge variant="outline" className="gap-1 text-info bg-info/10">
          <Route className="h-3 w-3" />
          In Progress
        </Badge>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading outbox item...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !correspondence) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h3 className="text-lg font-semibold mb-2">Failed to Load Outbox Item</h3>
              <p className="text-muted-foreground mb-4">{error || 'The requested outbox item could not be found.'}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => router.push('/correspondence/outbox')} variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Outbox
                </Button>
                <Button onClick={() => void loadData()} variant="default" disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Verify this is an outbox item (created by current user and pending/in-progress)
  const isOutboxItem =
    correspondence.createdById === currentUser?.id &&
    (correspondence.status === 'pending' || correspondence.status === 'in-progress');

  if (!isOutboxItem) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-warning" />
              <h3 className="text-lg font-semibold mb-2">Not an Outbox Item</h3>
              <p className="text-muted-foreground mb-4">
                This item is not in your outbox. It may have been dispatched or you may not have created it.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => router.push('/correspondence/outbox')} variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Outbox
                </Button>
                <Button onClick={() => router.push(`/correspondence/${id}`)} variant="default">
                  View Correspondence
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const division = correspondence.divisionId ? divisions.find((d) => d.id === correspondence.divisionId) : null;
  const department = correspondence.departmentId ? departments.find((d) => d.id === correspondence.departmentId) : null;
  const directorate = correspondence.directorateId ? directorates.find((d) => d.id === correspondence.directorateId) : null;
  const daysPending = calculateDaysPending();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getDaysPendingColor = () => {
    if (daysPending > 5) return 'text-destructive';
    if (daysPending > 2) return 'text-warning';
    return 'text-success';
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      await logOutboxDmsAccess('download');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      await logOutboxDmsAccess('attempted-download');
      toast.error('Failed to download file');
    }
  };

  const handleAttachmentDownload = (attachment: CorrespondenceAttachment) => {
    if (!attachment.fileUrl) {
      void logOutboxDmsAccess('attempted-download');
      toast.error('Attachment is missing a downloadable file URL');
      return;
    }
    void handleDownload(attachment.fileUrl, attachment.fileName);
  };

  const handleResendReminder = async () => {
    if (!correspondence || !correspondence.currentApproverId) {
      toast.error('No current approver to send reminder to');
      return;
    }
    setResendDialogOpen(true);
  };

  const confirmResendReminder = async () => {
    if (!correspondence || !correspondence.currentApproverId) return;

    setResending(true);
    try {
      const payload: Record<string, unknown> = {};
      if (resendCustomMessage.trim()) {
        payload.custom_message = resendCustomMessage.trim();
      }

      await apiFetch(`/correspondence/items/${id}/resend-reminder/`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      toast.success('Reminder sent successfully', {
        description: `Sent to ${correspondence.currentApproverName || 'current approver'}`,
      });
      setResendDialogOpen(false);
      setResendCustomMessage('');
      await loadData();
    } catch (err: unknown) {
      const errorObj = err && typeof err === 'object' ? err as Record<string, unknown> : null;
      const errorStatus = errorObj && 'status' in errorObj ? errorObj.status : null;
      const responseStatus = errorObj && errorObj.response && typeof errorObj.response === 'object' && 'status' in errorObj.response ? (errorObj.response as Record<string, unknown>).status : null;
      if (errorStatus === 404 || responseStatus === 404) {
        toast.info('Resend functionality is not yet available on the backend');
      } else {
        let errorMessage = 'Failed to send reminder';
        if (errorObj) {
          if (errorObj.response && typeof errorObj.response === 'object') {
            const response = errorObj.response as Record<string, unknown>;
            if (response.data && typeof response.data === 'object') {
              const data = response.data as Record<string, unknown>;
              errorMessage = (data.detail as string) || errorMessage;
            }
          }
          if (errorMessage === 'Failed to send reminder') {
            errorMessage = (errorObj.message as string) || errorMessage;
          }
        }
        toast.error(`Failed to send reminder: ${errorMessage}`);
      }
    } finally {
      setResending(false);
    }
  };

  const handleWithdraw = () => {
    if (!correspondence || correspondence.status !== 'pending') {
      toast.error('Only pending correspondence can be withdrawn');
      return;
    }
    setWithdrawDialogOpen(true);
  };

  const confirmWithdraw = async () => {
    if (!correspondence || !withdrawReason.trim()) {
      toast.error('Please provide a reason for withdrawal');
      return;
    }

    try {
      await apiFetch(`/correspondence/items/${id}/withdraw/`, {
        method: 'POST',
        body: JSON.stringify({ reason: withdrawReason.trim() }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      toast.success('Correspondence withdrawn successfully');
      setWithdrawDialogOpen(false);
      setWithdrawReason('');
      await loadData();
      setTimeout(() => {
        router.push('/correspondence/outbox');
      }, 1500);
    } catch (err: unknown) {
      const errorObj3 = err && typeof err === 'object' ? err as Record<string, unknown> : null;
      const errorStatus3 = errorObj3 && 'status' in errorObj3 ? errorObj3.status : null;
      const responseStatus3 = errorObj3 && errorObj3.response && typeof errorObj3.response === 'object' && 'status' in errorObj3.response ? (errorObj3.response as Record<string, unknown>).status : null;
      if (errorStatus3 === 404 || responseStatus3 === 404) {
        toast.info('Withdraw functionality is not yet available on the backend');
      } else {
        let errorMessage = 'Failed to withdraw correspondence';
        if (errorObj3) {
          if (errorObj3.response && typeof errorObj3.response === 'object') {
            const response = errorObj3.response as Record<string, unknown>;
            if (response.data && typeof response.data === 'object') {
              const data = response.data as Record<string, unknown>;
              errorMessage = (data.detail as string) || errorMessage;
            }
          }
          if (errorMessage === 'Failed to withdraw correspondence') {
            errorMessage = (errorObj3.message as string) || errorMessage;
          }
        }
        toast.error(`Failed to withdraw: ${errorMessage}`);
      }
    }
  };

  // Action handlers
  const handleDuplicate = async () => {
    if (!correspondence) return;
    try {
      router.push(`/correspondence/register?duplicate=${id}`);
      toast.info('Opening duplicate form...');
    } catch (err) {
      toast.error('Failed to duplicate correspondence');
    }
  };

  const handleShare = () => {
    if (!correspondence) return;
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  const handleExport = () => {
    if (!correspondence) return;
    const exportData = {
      referenceNumber: correspondence.referenceNumber,
      subject: correspondence.subject,
      status: correspondence.status,
      priority: correspondence.priority,
      direction: correspondence.direction,
      createdDate: correspondence.createdAt,
      updatedDate: correspondence.updatedAt,
      attachments: correspondence.attachments?.map(a => a.fileName) || [],
      minutes: minutes.map(m => ({
        user: m.userName,
        action: m.actionType,
        timestamp: m.timestamp,
        text: m.minuteText,
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${correspondence.referenceNumber}-export.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Exported successfully');
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-screen">
        {/* Header - Reorganized to match Document Detail pattern */}
        <div className="border-b border-border bg-background px-3 md:px-6 py-2 md:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
                onClick={() => router.push('/correspondence/outbox')}
                aria-label="Back to outbox"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                {/* Breadcrumb */}
                <Breadcrumb className="hidden md:flex mb-1">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/correspondence/outbox">Outbox</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="truncate max-w-[200px]">
                        {correspondence.referenceNumber || 'Outbox Item'}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                {/* Title and badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base md:text-xl font-bold text-foreground truncate">
                    {correspondence.referenceNumber || 'Outbox Item'}
                  </h1>
                  {getStatusBadge()}
                  <Badge variant="outline" className="capitalize flex-shrink-0">
                    {correspondence.priority}
                  </Badge>
                  <Badge variant="outline" className="flex-shrink-0">
                    {correspondence.direction === 'downward' ? (
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
                <p className="text-xs md:text-sm text-muted-foreground truncate mt-1">
                  {correspondence.subject}
                </p>
              </div>
            </div>
            {/* Desktop action buttons */}
            <div className="hidden md:flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="icon"
                onClick={() => void loadData()}
                disabled={loading}
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" title="More actions">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/correspondence/register?edit=${id}`)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit & Dispatch
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/correspondence/${id}`)}>
                    <Route className="h-4 w-4 mr-2" />
                    View Full Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicate}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => window.print()}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </DropdownMenuItem>
                  {correspondence.status === 'pending' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleWithdraw} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Withdraw
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* Mobile action menu */}
            <div className="md:hidden flex items-center gap-1 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadData()}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/correspondence/register?edit=${id}`)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit & Dispatch
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/correspondence/${id}`)}>
                    <Route className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status & Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Dispatch Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      {getStatusBadge()}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Days Pending</p>
                    <p className={`font-semibold text-lg ${getDaysPendingColor()}`}>{daysPending} days</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Created Date</p>
                    <p className="font-medium">{formatDateTime(correspondence.createdAt || correspondence.receivedDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Last Updated</p>
                    <p className="font-medium">
                      {correspondence.updatedAt ? formatDateTime(correspondence.updatedAt) : 'N/A'}
                    </p>
                  </div>
                </div>
                {correspondence.currentApproverName && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Current Approver</p>
                      <p className="font-medium">{correspondence.currentApproverName}</p>
                      {correspondence.currentOfficeName && (
                        <p className="text-sm text-muted-foreground">{correspondence.currentOfficeName}</p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Correspondence Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Correspondence Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Reference Number</p>
                  <p className="font-semibold text-lg">{correspondence.referenceNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Subject</p>
                  <p className="font-medium">{correspondence.subject}</p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Priority
                    </p>
                    <Badge variant={getPriorityColor(correspondence.priority)}>{correspondence.priority.toUpperCase()}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                      {correspondence.direction === 'downward' ? (
                        <ArrowDown className="h-3 w-3 text-info" />
                      ) : (
                        <ArrowUp className="h-3 w-3 text-success" />
                      )}
                      Direction
                    </p>
                    <Badge variant="outline" className="gap-1">
                      {correspondence.direction === 'downward' ? (
                        <>
                          <ArrowDown className="h-3 w-3 text-info" />
                          Downward
                        </>
                      ) : (
                        <>
                          <ArrowUp className="h-3 w-3 text-success" />
                          Upward
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                      <UserIcon className="h-3 w-3" />
                      Recipient
                    </p>
                    <p className="font-medium">{correspondence.recipientName || correspondence.senderName}</p>
                    <p className="text-sm text-muted-foreground">{correspondence.senderOrganization}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      Organization Unit
                    </p>
                    <p className="font-medium">
                      {directorate && `${directorate.name}${division ? ` • ${division.name}` : ''}${department ? ` • ${department.name}` : ''}`}
                    </p>
                  </div>
                </div>
                {correspondence.senderEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{correspondence.senderEmail}</span>
                  </div>
                )}
                {correspondence.senderPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{correspondence.senderPhone}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Distribution List */}
            {correspondence.distribution && correspondence.distribution.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Distribution List
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {correspondence.distribution.map((dist) => (
                      <div key={dist.id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div>
                          <p className="font-medium">{dist.name || `${dist.type} distribution`}</p>
                          <p className="text-xs text-muted-foreground capitalize">{dist.type}</p>
                        </div>
                        <Badge variant="outline">{dist.type}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {correspondence.tags && correspondence.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(correspondence.tags)
                      ? correspondence.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary">
                            {tag}
                          </Badge>
                        ))
                      : typeof correspondence.tags === 'string' && (
                          <Badge variant="secondary">{correspondence.tags}</Badge>
                        )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Document Preview - Enhanced with tabs for multiple attachments */}
            {correspondence.attachments && correspondence.attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Document Preview
                    {correspondence.attachments.length > 1 && (
                      <Badge variant="secondary" className="ml-2">
                        {correspondence.attachments.length} files
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {correspondence.attachments.length > 1 ? (
                    <Tabs value={selectedAttachmentIndex.toString()} onValueChange={(val) => {
                      const idx = parseInt(val, 10);
                      setSelectedAttachmentIndex(idx);
                      void logOutboxDmsAccess('view');
                      const attachment = correspondence.attachments?.[idx];
                      if (attachment && !attachmentPreviews.has(idx)) {
                        void loadAttachmentPreview(idx, attachment);
                      }
                    }}>
                      <TabsList className="mb-4">
                        {correspondence.attachments.map((att, idx) => (
                          <TabsTrigger key={att.id} value={idx.toString()} className="truncate max-w-[150px]">
                            {att.fileName || `File ${idx + 1}`}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {correspondence.attachments.map((attachment, idx) => {
                        const preview = attachmentPreviews.get(idx);
                        const error = previewErrors.get(idx);
                        const isLoading = documentPreviewLoading && selectedAttachmentIndex === idx;
                        return (
                          <TabsContent key={attachment.id} value={idx.toString()} className="mt-0">
                            {isLoading ? (
                              <div className="flex items-center justify-center py-12 min-h-[400px]">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <span className="ml-2 text-sm text-muted-foreground">Loading preview...</span>
                              </div>
                            ) : error ? (
                              <div className="text-center py-12 min-h-[400px] flex flex-col items-center justify-center">
                                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
                                <p className="text-muted-foreground mb-4">{error}</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAttachmentDownload(attachment)}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download File
                                </Button>
                              </div>
                            ) : preview?.pdfUrl ? (
                              <ScrollArea className="h-[500px] sm:h-[600px] w-full rounded-md border">
                                <iframe src={preview.pdfUrl} className="w-full h-full min-h-[500px] sm:min-h-[600px]" title={`PDF Preview: ${attachment.fileName}`} />
                              </ScrollArea>
                            ) : preview?.wordHtml ? (
                              <ScrollArea className="h-[500px] sm:h-[600px] w-full rounded-md border p-4">
                                <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: preview.wordHtml }} />
                              </ScrollArea>
                            ) : (
                              <div className="text-center py-12 min-h-[400px] flex flex-col items-center justify-center">
                                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p className="text-muted-foreground mb-4">Preview not available for this file type</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAttachmentDownload(attachment)}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download File
                                </Button>
                              </div>
                            )}
                            <div className="mt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto"
                                onClick={() => handleAttachmentDownload(attachment)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download {attachment.fileName}
                              </Button>
                            </div>
                          </TabsContent>
                        );
                      })}
                    </Tabs>
                  ) : (
                    // Single attachment - no tabs needed
                    (() => {
                      const attachment = correspondence.attachments[0];
                      const preview = attachmentPreviews.get(0);
                      const error = previewErrors.get(0);
                      const isLoading = documentPreviewLoading && selectedAttachmentIndex === 0;
                      return (
                        <>
                          {isLoading ? (
                            <div className="flex items-center justify-center py-12 min-h-[400px]">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              <span className="ml-2 text-sm text-muted-foreground">Loading preview...</span>
                            </div>
                          ) : error ? (
                            <div className="text-center py-12 min-h-[400px] flex flex-col items-center justify-center">
                              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
                              <p className="text-muted-foreground mb-4">{error}</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAttachmentDownload(attachment)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download File
                              </Button>
                            </div>
                          ) : preview?.pdfUrl ? (
                            <ScrollArea className="h-[500px] sm:h-[600px] w-full rounded-md border">
                              <iframe src={preview.pdfUrl} className="w-full h-full min-h-[500px] sm:min-h-[600px]" title={`PDF Preview: ${attachment.fileName}`} />
                            </ScrollArea>
                          ) : preview?.wordHtml ? (
                            <ScrollArea className="h-[500px] sm:h-[600px] w-full rounded-md border p-4">
                              <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: preview.wordHtml }} />
                            </ScrollArea>
                          ) : (
                            <div className="text-center py-12 min-h-[400px] flex flex-col items-center justify-center">
                              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p className="text-muted-foreground mb-4">Preview not available for this file type</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAttachmentDownload(attachment)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download File
                              </Button>
                            </div>
                          )}
                          <div className="mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full sm:w-auto"
                              onClick={() => handleAttachmentDownload(attachment)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download {attachment.fileName}
                            </Button>
                          </div>
                        </>
                      );
                    })()
                  )}
                </CardContent>
              </Card>
            )}

            {/* Routing History - Enhanced with visual timeline and workflow progress */}
            {minutes.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Route className="h-5 w-5" />
                      Routing History & Workflow Progress
                      <Badge variant="secondary">{minutes.length} step{minutes.length !== 1 ? 's' : ''}</Badge>
                    </CardTitle>
                    {minutes.length > 3 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandRoutingHistory(!expandRoutingHistory)}
                      >
                        {expandRoutingHistory ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-2" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-2" />
                            Show All
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Workflow Progress Indicator */}
                  <div className="mb-6 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Workflow Progress</span>
                      <span className="font-medium">
                        {minutes.filter(m => m.actionType === 'approve').length} of {minutes.length} steps completed
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{
                          width: `${(minutes.filter(m => m.actionType === 'approve').length / Math.max(minutes.length, 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <span>Approved: {minutes.filter(m => m.actionType === 'approve').length}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-secondary" />
                        <span>Routed: {minutes.filter(m => m.actionType === 'forward').length}</span>
                      </div>
                      {minutes.filter(m => m.actionType === 'reject').length > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-destructive" />
                          <span>Rejected: {minutes.filter(m => m.actionType === 'reject').length}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <ScrollArea className={expandRoutingHistory ? 'h-auto max-h-[600px]' : 'h-[320px]'}>
                    <div className="space-y-4 relative pl-8">
                      {/* Timeline line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                      {minutes.map((minute, index) => {
                        const user = organizationUsers.find((u) => u.id === minute.userId);
                        const isLast = index === minutes.length - 1;
                        const direction = minute.direction || 'upward';
                        return (
                          <div key={minute.id} className="relative flex gap-4">
                            {/* Timeline dot */}
                            <div className="absolute left-[-32px] top-1">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                minute.actionType === 'approve' ? 'bg-primary text-primary-foreground' :
                                minute.actionType === 'reject' ? 'bg-destructive text-destructive-foreground' :
                                'bg-secondary text-secondary-foreground'
                              }`}>
                                {minute.actionType === 'approve' ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : minute.actionType === 'reject' ? (
                                  <XCircle className="h-4 w-4" />
                                ) : (
                                  <Route className="h-4 w-4" />
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0 bg-card border rounded-lg p-4">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium">{user?.name || minute.userName || 'Unknown User'}</p>
                                    <Badge variant={minute.actionType === 'approve' ? 'default' : minute.actionType === 'reject' ? 'destructive' : 'secondary'} className="capitalize">
                                      {minute.actionType}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {direction === 'downward' ? (
                                        <>
                                          <ArrowDown className="h-3 w-3 mr-1" />
                                          Down
                                        </>
                                      ) : (
                                        <>
                                          <ArrowUp className="h-3 w-3 mr-1" />
                                          Up
                                        </>
                                      )}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {minute.timestamp ? formatDateTime(minute.timestamp) : 'N/A'}
                                  </p>
                                </div>
                              </div>
                              {minute.minuteText && (
                                <p className="text-sm text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                                  {minute.minuteText}
                                </p>
                              )}
                              {(minute.fromOfficeName || minute.toOfficeName) && (
                                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                                  {minute.fromOfficeName && (
                                    <p>
                                      <span className="font-medium">From:</span> {minute.fromOfficeName}
                                      {minute.userName && ` (${minute.userName})`}
                                    </p>
                                  )}
                                  {minute.toOfficeName && (
                                    <p>
                                      <span className="font-medium">To:</span> {minute.toOfficeName}
                                      {minute.toUserName && ` (${minute.toUserName})`}
                                    </p>
                                  )}
                                </div>
                              )}
                              {/* Approval Chain Details */}
                              {minute.actionType === 'approve' && (
                                <div className="mt-2 flex items-center gap-2 text-xs">
                                  <CheckCircle2 className="h-3 w-3 text-primary" />
                                  <span className="text-muted-foreground">Approved at step {index + 1}</span>
                                </div>
                              )}
                              {minute.actionType === 'reject' && (
                                <div className="mt-2 flex items-center gap-2 text-xs">
                                  <XCircle className="h-3 w-3 text-destructive" />
                                  <span className="text-destructive">Rejected at step {index + 1}</span>
                                </div>
                              )}
                              {!isLast && (
                                <div className="mt-2 text-xs text-muted-foreground italic">
                                  → Next: {minutes[index + 1]?.userName || 'Pending'}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Related Correspondence */}
            {relatedCorrespondence.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Related Correspondence
                    <Badge variant="secondary">{relatedCorrespondence.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {relatedCorrespondence.map((rel) => (
                      <div key={rel.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{rel.referenceNumber || 'No Reference'}</p>
                          <p className="text-sm text-muted-foreground truncate">{rel.subject}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{rel.status}</Badge>
                            <Badge variant="outline" className="text-xs capitalize">{rel.priority}</Badge>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/correspondence/${rel.id}`)}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Case Links */}
            {caseLinks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderTree className="h-5 w-5" />
                    Linked Cases
                    <Badge variant="secondary">{caseLinks.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {caseLinks.map((link) => (
                      <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{link.caseNumber}</p>
                          <p className="text-sm text-muted-foreground truncate">{link.title}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/cases/${link.id}`)}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Case
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Linked Documents */}
            {linkedDocuments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Linked Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {linkedDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">{doc.documentType}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            void logOutboxDmsAccess('view', doc.id, doc.sensitivity ?? 'internal');
                            router.push(`/dms/${doc.id}`);
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => router.push(`/correspondence/register?edit=${id}`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit & Dispatch
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/correspondence/${id}`)}
                >
                  <Route className="h-4 w-4 mr-2" />
                  View Full Details
                </Button>
                {correspondence.currentApproverId && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleResendReminder}
                    disabled={resending}
                  >
                    {resending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Resend Reminder
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                  {getStatusBadge()}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Created By</p>
                  <p className="font-medium">{correspondence.createdByName || 'You'}</p>
                </div>
                {correspondence.owningOfficeName && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Owning Office</p>
                    <p className="font-medium">{correspondence.owningOfficeName}</p>
                  </div>
                )}
                {correspondence.remarks && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Remarks</p>
                    <p className="text-sm">{correspondence.remarks}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Outbox Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Item Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Days Pending</span>
                  <span className={`font-semibold ${getDaysPendingColor()}`}>{daysPending} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Routing Steps</span>
                  <span className="font-semibold">{minutes.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Attachments</span>
                  <span className="font-semibold">{correspondence.attachments?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Linked Documents</span>
                  <span className="font-semibold">{linkedDocuments.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </div>

      {/* Resend Reminder Confirmation Dialog */}
      <AlertDialog open={resendDialogOpen} onOpenChange={setResendDialogOpen}>
        <AlertDialogContent className="max-w-2xl w-[95vw] sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Send Reminder
            </AlertDialogTitle>
            <AlertDialogDescription>
              Send a reminder notification to the current approver about this correspondence.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            {/* Recipient Information */}
            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Recipient:</span>
                  <span className="text-sm">{correspondence?.currentApproverName || 'Current Approver'}</span>
                </div>
                {correspondence?.currentOfficeName && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Office:</span>
                    <span className="text-sm">{correspondence.currentOfficeName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Reference:</span>
                  <span className="text-sm">{correspondence?.referenceNumber}</span>
                </div>
              </CardContent>
            </Card>

            {/* Custom Message */}
            <div className="space-y-2">
              <Label htmlFor="resend-message">Custom Message (Optional)</Label>
              <Textarea
                id="resend-message"
                placeholder="Add a custom message to include with the reminder..."
                value={resendCustomMessage}
                onChange={(e) => setResendCustomMessage(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This message will be included in the reminder notification.
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResendCustomMessage('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResendReminder} disabled={resending}>
              {resending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reminder
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Withdraw Confirmation Dialog */}
      <AlertDialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <AlertDialogContent className="max-w-2xl w-[95vw] sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Withdraw Correspondence
            </AlertDialogTitle>
            <AlertDialogDescription>
              Withdrawing this correspondence will cancel it and prevent further routing. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            {/* Correspondence Info */}
            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Reference:</span>
                  <span className="text-sm">{correspondence?.referenceNumber}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Subject:</span>
                  <span className="text-sm">{correspondence?.subject}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Days Pending:</span>
                  <span className="text-sm">{daysPending} days</span>
                </div>
              </CardContent>
            </Card>

            {/* Withdrawal Reason */}
            <div className="space-y-2">
              <Label htmlFor="withdraw-reason">
                Reason for Withdrawal <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="withdraw-reason"
                placeholder="Please provide a reason for withdrawing this correspondence..."
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                rows={4}
                className="resize-none"
                required
              />
              <p className="text-xs text-muted-foreground">
                This reason will be recorded in the correspondence history.
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setWithdrawReason('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmWithdraw}
              disabled={!withdrawReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Confirm Withdrawal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default OutboxDetailPage;
