"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Correspondence, Minute } from '@/lib/npa-structure';
import { formatDateShort, formatDateTime } from '@/lib/correspondence-helpers';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence, mapApiMinute } from '@/contexts/CorrespondenceContext';
import { toast } from 'sonner';
import { fetchDocumentById, type DocumentRecord } from '@/lib/dms-storage';
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
  const [wordHtml, setWordHtml] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch correspondence
        const corrResponse = await apiFetch<any>(`/correspondence/items/${id}/`);
        const mappedCorr = mapApiCorrespondence(corrResponse);
        setCorrespondence(mappedCorr);

        // Fetch minutes
        const minutesResponse = await apiFetch<any>(`/correspondence/minutes/?correspondence=${id}`);
        const minutesData = Array.isArray(minutesResponse) ? minutesResponse : minutesResponse.results || [];
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

        // Load document preview if attachment exists
        const firstAttachment = mappedCorr.attachments?.[0];
        if (firstAttachment?.fileUrl) {
          const fileName = firstAttachment.fileName || '';
          const isPDF = firstAttachment.fileType === 'application/pdf';
          const isWord = fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc');

          if (isPDF || isWord) {
            setDocumentPreviewLoading(true);
            try {
              const response = await fetch(firstAttachment.fileUrl);
              const blob = await response.blob();
              const blobUrl = URL.createObjectURL(blob);

              if (isPDF) {
                setPdfBlobUrl(blobUrl);
              } else if (isWord) {
                const arrayBuffer = await blob.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer });
                setWordHtml(result.value);
              }
            } catch (err) {
              console.error('Failed to load document preview:', err);
            } finally {
              setDocumentPreviewLoading(false);
            }
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load outbox item');
        toast.error('Failed to load outbox item');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [id]);

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
              <Send className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Outbox Item Not Found</h3>
              <p className="text-muted-foreground mb-4">{error || 'The requested outbox item could not be found.'}</p>
              <Button onClick={() => router.push('/correspondence/outbox')} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Outbox
              </Button>
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
      const response = await fetch(url);
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
      toast.error('Failed to download file');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/correspondence/outbox')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Mail className="h-8 w-8 text-primary" />
                Outbox Item
              </h1>
              <p className="text-muted-foreground mt-1">Pending dispatch correspondence</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Button variant="outline" size="sm" onClick={() => router.push(`/correspondence/${id}`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

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

            {/* Document Preview */}
            {correspondence.attachments && correspondence.attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Document Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {documentPreviewLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : pdfBlobUrl ? (
                    <ScrollArea className="h-[600px] w-full rounded-md border">
                      <iframe src={pdfBlobUrl} className="w-full h-full min-h-[600px]" title="PDF Preview" />
                    </ScrollArea>
                  ) : wordHtml ? (
                    <ScrollArea className="h-[600px] w-full rounded-md border p-4">
                      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: wordHtml }} />
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Preview not available for this file type</p>
                    </div>
                  )}
                  <div className="mt-4 flex gap-2">
                    {correspondence.attachments.map((attachment) => (
                      <Button
                        key={attachment.id}
                        variant="outline"
                        size="sm"
                        onClick={() => attachment.fileUrl && handleDownload(attachment.fileUrl, attachment.fileName)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download {attachment.fileName}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Routing History */}
            {minutes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Route className="h-5 w-5" />
                    Routing History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[320px]">
                    <div className="space-y-3">
                      {minutes.map((minute, index) => {
                        const user = organizationUsers.find((u) => u.id === minute.userId);
                        return (
                          <div key={minute.id} className="flex gap-3 p-3 border rounded-lg">
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-semibold text-primary">{index + 1}</span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div>
                                  <p className="font-medium">{user?.name || minute.userName || 'Unknown User'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {minute.timestamp ? formatDateTime(minute.timestamp) : 'N/A'}
                                  </p>
                                </div>
                                <Badge variant={minute.actionType === 'approve' ? 'default' : 'secondary'}>
                                  {minute.actionType}
                                </Badge>
                              </div>
                              {minute.minuteText && (
                                <p className="text-sm text-muted-foreground mt-2">{minute.minuteText}</p>
                              )}
                              {minute.toOfficeName && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  → {minute.toOfficeName}
                                  {minute.toUserName && ` (${minute.toUserName})`}
                                </p>
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
                        <Button variant="outline" size="sm" onClick={() => router.push(`/dms/${doc.id}`)}>
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
                  onClick={() => router.push(`/correspondence/${id}`)}
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
    </DashboardLayout>
  );
};

export default OutboxDetailPage;

