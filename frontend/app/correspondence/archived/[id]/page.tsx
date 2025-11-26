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
  Archive,
  FileArchive,
  Calendar,
  User as UserIcon,
  Building2,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  FileText,
  Download,
  Printer,
  Clock,
  MapPin,
  Tag,
  Mail,
  Phone,
  ExternalLink,
  Loader2,
  Eye,
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Correspondence, Minute } from '@/lib/npa-structure';
import { formatDateShort, formatDateTime } from '@/lib/correspondence-helpers';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence, mapApiMinute } from '@/contexts/CorrespondenceContext';
import { CorrespondenceTreeView } from '@/components/correspondence/CorrespondenceTreeView';
import { toast } from 'sonner';
import { fetchDocumentById, type DocumentRecord } from '@/lib/dms-storage';
import mammoth from 'mammoth';

const ArchiveDetailPage = () => {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { divisions, departments, directorates, users: organizationUsers } = useOrganization();

  const [correspondence, setCorrespondence] = useState<Correspondence | null>(null);
  const [minutes, setMinutes] = useState<Minute[]>([]);
  const [linkedDocuments, setLinkedDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chain' | 'tree'>('chain');
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
        setError(err.message || 'Failed to load archive record');
        toast.error('Failed to load archive record');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading archive record...</p>
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
              <Archive className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Archive Record Not Found</h3>
              <p className="text-muted-foreground mb-4">{error || 'The requested archive record could not be found.'}</p>
              <Button onClick={() => router.push('/correspondence/archived')} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Archive
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const division = correspondence.divisionId ? divisions.find((d) => d.id === correspondence.divisionId) : null;
  const department = correspondence.departmentId ? departments.find((d) => d.id === correspondence.departmentId) : null;
  const directorate = correspondence.directorateId ? directorates.find((d) => d.id === correspondence.directorateId) : null;
  const archiveLevel = correspondence.archiveLevel || 'department';
  const levelLabel =
    archiveLevel === 'directorate'
      ? 'Directorate Archive'
      : archiveLevel === 'division'
        ? 'Division Archive'
        : 'Department Archive';

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
            <Button variant="ghost" size="icon" onClick={() => router.push('/correspondence/archived')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <FileArchive className="h-8 w-8 text-muted-foreground" />
                Archive Record
              </h1>
              <p className="text-muted-foreground mt-1">{levelLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 text-success bg-success/10">
              <CheckCircle2 className="h-3 w-3" />
              {correspondence.status === 'archived' ? 'Archived' : 'Completed'}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Archive Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5" />
                  Archive Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Archive Level</p>
                    <p className="font-medium">{levelLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Completed Date</p>
                    <p className="font-medium">
                      {correspondence.completedAt ? formatDateTime(correspondence.completedAt) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Received Date</p>
                    <p className="font-medium">{formatDateShort(correspondence.receivedDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Days in Archive</p>
                    <p className="font-medium">
                      {correspondence.completedAt
                        ? Math.floor((Date.now() - new Date(correspondence.completedAt).getTime()) / (1000 * 60 * 60 * 24))
                        : 'N/A'}{' '}
                      days
                    </p>
                  </div>
                </div>
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
                      Sender
                    </p>
                    <p className="font-medium">{correspondence.senderName}</p>
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

            {/* Historical Routing */}
            {minutes.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Historical Routing
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant={viewMode === 'chain' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('chain')}
                      >
                        Chain View
                      </Button>
                      <Button
                        variant={viewMode === 'tree' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('tree')}
                      >
                        Tree View
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {viewMode === 'tree' ? (
                    <ScrollArea className="h-[320px]">
                      <CorrespondenceTreeView minutes={minutes} />
                    </ScrollArea>
                  ) : (
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
                                      {minute.createdAt ? formatDateTime(minute.createdAt) : 'N/A'}
                                    </p>
                                  </div>
                                  <Badge variant={minute.action === 'approved' ? 'default' : 'secondary'}>
                                    {minute.action}
                                  </Badge>
                                </div>
                                {minute.comment && (
                                  <p className="text-sm text-muted-foreground mt-2">{minute.comment}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
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
                          onClick={() => router.push(`/dms/${doc.id}`)}
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
            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {correspondence.status === 'archived' ? 'Archived' : 'Completed'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Created By</p>
                  <p className="font-medium">{correspondence.createdByName || 'Unknown'}</p>
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

            {/* Archive Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Archive Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Minutes</span>
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

export default ArchiveDetailPage;

