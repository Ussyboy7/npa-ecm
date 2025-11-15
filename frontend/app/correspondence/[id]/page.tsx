"use client";

import { logError, logWarn } from '@/lib/client-logger';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  ArrowLeft,
  FileText,
  User as UserIcon,
  Calendar,
  Building2,
  ArrowDown,
  ArrowUp,
  MessageSquare,
  CheckCircle,
  Send,
  Archive,
  Download,
  Printer,
  ChevronRight,
  Users,
  Image as ImageIcon,
  Link as LinkIcon,
  ExternalLink,
  X,
  Eye,
} from 'lucide-react';
import type { Minute, DistributionRecipient } from '@/lib/npa-structure';
import { useOrganization } from '@/contexts/OrganizationContext';
import { fetchDocumentById, type DocumentRecord } from '@/lib/dms-storage';
import { getDelegationByCorrespondence } from '@/lib/delegation-storage';
import { apiFetch } from '@/lib/api-client';
import { MinuteModal } from '@/components/correspondence/MinuteModal';
import { TreatmentModal } from '@/components/correspondence/TreatmentModal';
import { MinuteDetailModal } from '@/components/correspondence/MinuteDetailModal';
import { CompletionSummaryModal } from '@/components/correspondence/CompletionSummaryModal';
import { ManualRouteModal } from '@/components/correspondence/ManualRouteModal';
import { DelegateModal } from '@/components/correspondence/DelegateModal';
import { PrintPreviewModal } from '@/components/correspondence/PrintPreviewModal';
import { DocumentPreviewModal } from '@/components/correspondence/DocumentPreviewModal';
import { OfficeReassignModal } from '@/components/correspondence/OfficeReassignModal';
import { downloadAsPDF, downloadAsWord } from '@/lib/document-generator';
import { formatDateShort, formatDateTime } from '@/lib/correspondence-helpers';
import { LinkDocumentDialog } from '@/components/correspondence/LinkDocumentDialog';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { useCurrentUser } from '@/hooks/use-current-user';
const CorrespondenceDetail = () => {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { getCorrespondenceById, getMinutesByCorrespondenceId, updateCorrespondence, refreshData, syncFromApi } = useCorrespondence();
  const correspondence = id ? getCorrespondenceById(id) : null;
  const minutes = id ? getMinutesByCorrespondenceId(id) : [];
  const { currentUser: activeUser } = useCurrentUser();
  const { directorates, divisions, departments, users: organizationUsers, assistantAssignments, refreshOrganizationData } = useOrganization();

  const [showMinuteModal, setShowMinuteModal] = useState(false);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showManualRouteModal, setShowManualRouteModal] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showRoutingDetails, setShowRoutingDetails] = useState(true);
  const [selectedMinute, setSelectedMinute] = useState<Minute | null>(null);
  const [showMinuteDetail, setShowMinuteDetail] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [selectedAttachmentIndex, setSelectedAttachmentIndex] = useState<number | null>(null);
  const [showLinkDocumentDialog, setShowLinkDocumentDialog] = useState(false);
  const [linkedDocuments, setLinkedDocuments] = useState<DocumentRecord[]>([]);

  useEffect(() => {
    const linkedIds = correspondence?.linkedDocumentIds ?? [];
    if (linkedIds.length === 0) {
      setLinkedDocuments([]);
      return;
    }

    let ignore = false;

    const loadLinkedDocs = async () => {
      try {
        const results = await Promise.all(
          linkedIds.map(async (docId) => {
            try {
              const document = await fetchDocumentById(docId);
              return document;
            } catch (error) {
              logWarn(`Failed to load linked document ${docId}`, error);
              return null;
            }
          }),
        );

        if (!ignore) {
          setLinkedDocuments(results.filter((doc): doc is DocumentRecord => Boolean(doc)));
        }
      } catch (error) {
        logError('Failed to load linked documents', error);
      }
    };

    void loadLinkedDocs();

    return () => {
      ignore = true;
    };
  }, [correspondence?.linkedDocumentIds]);

  const handleMinuteClose = () => {
    setShowMinuteModal(false);
    refreshData();
    void syncFromApi();
  };

  const handleTreatmentClose = () => {
    setShowTreatmentModal(false);
    refreshData();
    void syncFromApi();
  };

  const handleCompletionClose = () => {
    setShowCompletionModal(false);
    refreshData();
    void syncFromApi();
  };

  const handleManualRouteClose = () => {
    setShowManualRouteModal(false);
    refreshData();
    void syncFromApi();
  };

  const handleDelegate = async (assistantId: string, assistantType: 'TA' | 'PA', notes: string) => {
    if (!correspondence || !activeUser) return;

    const assignment = assistantAssignments.find(
      (entry) => entry.executiveId === activeUser.id && entry.assistantId === assistantId,
    );

    const permissions = assignment?.permissions ?? [];
    const canMinute = permissions.includes('minute') || assistantType === 'PA' || assistantType === 'TA';
    const canForward = permissions.includes('forward') || assistantType === 'PA' || assistantType === 'TA';
    const canApprove = permissions.includes('approve') || assistantType === 'TA';

    const payload = {
      principal_id: activeUser.id,
      assistant_id: assistantId,
      can_minute: canMinute,
      can_forward: canForward,
      can_approve: canApprove,
      active: true,
      starts_at: null,
      ends_at: null,
    };

    try {
      if (assignment?.id) {
        await apiFetch(`/correspondence/delegations/${assignment.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/correspondence/delegations/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      await refreshOrganizationData();
      await syncFromApi();
      toast.success(`Successfully delegated to ${assistantType}`, {
        description: notes ? `Instructions recorded: ${notes}` : undefined,
      });
    } catch (error) {
      logError('Failed to delegate correspondence', error);
      toast.error('Unable to delegate correspondence', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  if (!correspondence) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Correspondence not found</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!activeUser) {
    return null;
  }

  const division = correspondence.divisionId
    ? divisions.find((entry) => entry.id === correspondence.divisionId) ?? null
    : null;
  const department = correspondence.departmentId
    ? departments.find((entry) => entry.id === correspondence.departmentId) ?? null
    : null;
  const isCurrentUserTurn = correspondence.currentApproverId === activeUser.id;
  const activeDelegation = getDelegationByCorrespondence(correspondence.id);

  const lookupUser = (userId?: string) => {
    if (!userId) return undefined;
    return organizationUsers.find((user) => user.id === userId);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || Number.isNaN(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const resolveDistributionName = (recipient: DistributionRecipient) => {
    if (recipient.type === 'directorate') {
      if (recipient.directorateId) {
        const directorate = directorates.find((dir) => dir.id === recipient.directorateId);
        if (directorate) return directorate.name;
      }
      return recipient.name ?? 'Directorate';
    }

    if (recipient.type === 'department') {
      if (recipient.departmentId) {
        const departmentRecord = departments.find((dept) => dept.id === recipient.departmentId);
        if (departmentRecord) return departmentRecord.name;
      }
    }

    if (recipient.divisionId) {
      const divisionRecord = divisions.find((div) => div.id === recipient.divisionId);
      if (divisionRecord) return divisionRecord.name;
    }

    return recipient.name ?? 'Recipient';
  };

  const handleLinkDocumentsSave = async (documentIds: string[]) => {
    try {
      await updateCorrespondence(correspondence.id, { linkedDocumentIds: documentIds });
      toast.success('Linked documents updated');
      await syncFromApi();
    } catch (error) {
      logError('Failed to update linked documents', error);
      toast.error('Unable to update linked documents', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  const handleRemoveLink = async (docId: string) => {
    try {
      const updatedIds = (correspondence.linkedDocumentIds ?? []).filter((idValue) => idValue !== docId);
      await updateCorrespondence(correspondence.id, { linkedDocumentIds: updatedIds });
      toast.success('Document unlinked');
      await syncFromApi();
    } catch (error) {
      logError('Failed to unlink document', error);
      toast.error('Unable to unlink document', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'minute':
        return MessageSquare;
      case 'approve':
        return CheckCircle;
      case 'forward':
        return Send;
      case 'treat':
        return CheckCircle;
      default:
        return MessageSquare;
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-screen">
        <div className="border-b border-border bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/correspondence/inbox')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">{correspondence.referenceNumber}</h1>
                <p className="text-sm text-muted-foreground">{correspondence.subject}</p>
                <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    Owning: {correspondence.owningOfficeName ?? 'Not set'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    Current: {correspondence.currentOfficeName ?? correspondence.owningOfficeName ?? 'Not set'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  correspondence.priority === 'urgent'
                    ? 'destructive'
                    : correspondence.priority === 'high'
                    ? 'default'
                    : 'secondary'
                }
              >
                {correspondence.priority.toUpperCase()}
              </Badge>
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
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowDocumentPreview(true)}
                title="Preview Document"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowPrintPreview(true)}
                title="Print Preview"
              >
                <Printer className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" title="Download Document">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      if (correspondence && minutes) {
                        // Get document content
                        const firstAttachment = correspondence.attachments && correspondence.attachments.length > 0 
                          ? correspondence.attachments[0] 
                          : null;
                        const latestVersion = linkedDocuments[0]?.versions?.[linkedDocuments[0].versions.length - 1];
                        const documentContentHtml = latestVersion?.contentHtml;
                        
                        downloadAsPDF({ 
                          correspondence, 
                          minutes,
                          documentContentHtml,
                          attachmentUrl: firstAttachment?.fileUrl,
                          attachmentFileName: firstAttachment?.fileName
                        });
                        toast.success('Downloading as PDF...');
                      }
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Download as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (correspondence && minutes) {
                        // Get document content
                        const firstAttachment = correspondence.attachments && correspondence.attachments.length > 0 
                          ? correspondence.attachments[0] 
                          : null;
                        const latestVersion = linkedDocuments[0]?.versions?.[linkedDocuments[0].versions.length - 1];
                        const documentContentHtml = latestVersion?.contentHtml;
                        
                        downloadAsWord({ 
                          correspondence, 
                          minutes,
                          documentContentHtml,
                          attachmentUrl: firstAttachment?.fileUrl,
                          attachmentFileName: firstAttachment?.fileName
                        });
                        toast.success('Downloading as Word document...');
                      }
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Download as Word
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ContextualHelp
                title="Need help on this correspondence?"
                description="Print previews generate a clean memo view, downloads attach the latest minutes, and the action panel lets you minute, treat, delegate, or archive."
                steps={[
                  'Use Print Preview before hard copies or PDF export.',
                  'Download to share as PDF or Word outside the ECM.',
                  'Use the right-hand actions to minute, treat, delegate, or complete.',
                ]}
              />
            </div>
          </div>
        </div>

        <div className="border-b border-border bg-background/70 px-6 py-4">
          <HelpGuideCard
            title="Work the Correspondence"
            description="Review metadata, minute history, signatures, and routing chain. Use the actions on the right to minute, approve, treat, delegate, distribute (CC), print, download, or complete and archive."
            links={[
              { label: 'Help & Guides', href: '/help' },
              { label: 'Linked Documents', href: '#linked-documents' },
            ]}
            className="bg-background"
          />
        </div>

        <div className="flex-1 flex">
          <div className="w-[30%] border-r border-border bg-muted/30">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Original Document
              </h3>
            </div>
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <div className="p-4 space-y-4">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{correspondence.senderName}</p>
                        {correspondence.senderOrganization && (
                          <p className="text-xs text-muted-foreground">{correspondence.senderOrganization}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Received: {formatDateShort(correspondence.receivedDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{division?.name}</span>
                    </div>
                    {correspondence.distribution && correspondence.distribution.length > 0 && (
                      <div className="pt-3 border-t border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground">Distribution (CC)</span>
                        </div>
                        <div className="space-y-1">
                          {correspondence.distribution.map((recipient, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <Badge variant="outline" className="text-xs">
                                {recipient.type === 'directorate'
                                  ? 'Dir'
                                  : recipient.type === 'division'
                                  ? 'Div'
                                  : 'Dept'}
                              </Badge>
                              <span className="text-muted-foreground">{resolveDistributionName(recipient)}</span>
                              {recipient.purpose && (
                                <Badge variant="outline" className="text-xs ml-auto">
                                  {recipient.purpose === 'information'
                                    ? 'Info'
                                    : recipient.purpose === 'action'
                                    ? 'Action'
                                    : 'Comment'}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="aspect-[8.5/11] bg-white border-2 border-border rounded-lg overflow-hidden shadow-lg">
                  {(() => {
                    // Check for uploaded attachments first
                    const firstAttachment = correspondence.attachments && correspondence.attachments.length > 0 
                      ? correspondence.attachments[0] 
                      : null;
                    
                    // Check for linked DMS document content
                    const linkedDoc = linkedDocuments.length > 0 ? linkedDocuments[0] : null;
                    const latestVersion = linkedDoc?.versions && linkedDoc.versions.length > 0
                      ? linkedDoc.versions[linkedDoc.versions.length - 1]
                      : null;
                    const documentContentHtml = latestVersion?.contentHtml;

                    // If we have an attachment, show it
                    if (firstAttachment?.fileUrl) {
                      if (firstAttachment.fileType === 'application/pdf') {
                        return (
                          <object
                            data={firstAttachment.fileUrl}
                            type="application/pdf"
                            className="w-full h-full border-0"
                            title="Original Document"
                          />
                        );
                      } else if (firstAttachment.fileType?.startsWith('image/')) {
                        return (
                          <div className="h-full flex items-center justify-center p-4 bg-muted/30">
                            <img
                              src={firstAttachment.fileUrl}
                              alt={firstAttachment.fileName}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        );
                      } else {
                        return (
                          <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-muted/30">
                            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                            <p className="text-sm font-medium mb-2">{firstAttachment.fileName || 'Document'}</p>
                            <p className="text-xs text-muted-foreground">
                              Use the Preview button above to view this file
                            </p>
                          </div>
                        );
                      }
                    }
                    
                    // If we have DMS document content (from editor), show it
                    if (documentContentHtml) {
                      return (
                        <div className="h-full overflow-auto p-6 text-xs leading-relaxed">
                          <div dangerouslySetInnerHTML={{ __html: documentContentHtml }} />
                        </div>
                      );
                    }
                    
                    // No document available
                    return (
                      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-muted/30">
                        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                        <p className="text-sm font-medium text-muted-foreground">
                          No document preview available
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {correspondence.attachments && correspondence.attachments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Attachments</h4>
                    <div className="space-y-2">
                      {correspondence.attachments.map((attachment) => {
                        const sizeLabel = formatFileSize(attachment.fileSize);
                        const content = (
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate" title={attachment.fileName}>
                                {attachment.fileName}
                              </p>
                              {(attachment.fileType || sizeLabel) && (
                                <p className="text-xs text-muted-foreground">
                                  {[attachment.fileType, sizeLabel].filter(Boolean).join(' • ')}
                                </p>
                              )}
                            </div>
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </div>
                        );

                        if (attachment.fileUrl) {
                          return (
                            <button
                              key={attachment.id}
                              onClick={() => {
                                const attachmentIndex = correspondence.attachments?.findIndex(a => a.id === attachment.id) ?? 0;
                                setSelectedAttachmentIndex(attachmentIndex);
                                setShowDocumentPreview(true);
                              }}
                              className="w-full flex items-center gap-2 p-2 bg-background border border-border rounded hover:bg-muted/50 cursor-pointer text-left"
                            >
                              {content}
                            </button>
                          );
                        }

                        return (
                          <div key={attachment.id} className="flex items-center gap-2 p-2 bg-background border border-border rounded">
                            {content}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2" id="linked-documents">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Linked Documents</h4>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowLinkDocumentDialog(true)}>
                      <LinkIcon className="h-3 w-3" />
                      Manage
                    </Button>
                  </div>
                  {linkedDocuments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No DMS documents linked. Use <strong>Manage</strong> to attach references.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {linkedDocuments.map((doc) => (
                        <div key={doc.id} className="border border-border rounded-md p-3 text-xs space-y-2 bg-background">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-3.5 w-3.5 text-primary" />
                              <span className="font-medium text-foreground line-clamp-1">{doc.title}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => router.push(`/dms/${doc.id}`)}
                                title="Open document"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => handleRemoveLink(doc.id)}
                                title="Unlink document"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="capitalize">
                              {doc.documentType}
                            </Badge>
                            <Badge variant="secondary" className="capitalize">
                              {doc.status}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground line-clamp-2">
                            {doc.description || 'No description available.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-border bg-background">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-secondary" />
                Minute Thread (360° View)
              </h3>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-3xl mx-auto">
                {minutes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No minutes yet</p>
                    <p className="text-sm">Be the first to add a minute</p>
                  </div>
                ) : (
                  minutes.map((minuteItem, idx) => {
                    const user = lookupUser(minuteItem.userId);
                    const ActionIcon = getActionIcon(minuteItem.actionType);
                    const isDownward = minuteItem.direction === 'downward';
                    const displayName = user?.name ?? minuteItem.userName ?? 'Unknown user';
                    // Ensure we never display UUIDs as role names
                    let systemRole = user?.systemRole ?? minuteItem.userSystemRole ?? 'Team Member';
                    // Filter out UUIDs (strings with dashes and length > 30)
                    if (systemRole && systemRole.includes('-') && systemRole.length > 30) {
                      systemRole = user?.systemRole ?? 'Team Member';
                    }

                    return (
                      <div key={minuteItem.id} className="relative">
                        {idx < minutes.length - 1 && (
                          <div
                            className={`absolute left-8 top-16 w-0.5 h-8 ${isDownward ? 'bg-info' : 'bg-success'}`}
                          />
                        )}
                        <Card
                          className={`${minuteItem.userId === activeUser.id ? 'border-primary shadow-glow' : ''} cursor-pointer hover:shadow-md transition-all`}
                          onClick={() => {
                            setSelectedMinute(minuteItem);
                            setShowMinuteDetail(true);
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex gap-3">
                              <Avatar className={`h-10 w-10 ${isDownward ? 'ring-2 ring-info' : 'ring-2 ring-success'}`}>
                                <AvatarFallback className="text-xs font-semibold">
                                  {displayName
                                    .split(' ')
                                    .map((namePart) => namePart[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <p className="font-semibold text-sm">{displayName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {systemRole} • {minuteItem.gradeLevel}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs gap-1">
                                      {ActionIcon && <ActionIcon className="h-3 w-3" />}
                                      {minuteItem.actionType}
                                    </Badge>
                                    <Badge
                                      variant={isDownward ? 'default' : 'secondary'}
                                      className={`text-xs gap-1 ${
                                        isDownward ? 'bg-info/10 text-info' : 'bg-success/10 text-success'
                                      }`}
                                    >
                                      {isDownward ? (
                                        <>
                                          <ArrowDown className="h-3 w-3" />
                                          Down
                                        </>
                                      ) : (
                                        <>
                                          <ArrowUp className="h-3 w-3" />
                                          Up
                                        </>
                                      )}
                                    </Badge>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                </div>
                                <p className="text-sm text-foreground mb-2 line-clamp-2">{minuteItem.minuteText}</p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>{formatDateTime(minuteItem.timestamp)}</span>
                                  <span>Step {minuteItem.stepNumber}</span>
                                  {minuteItem.actedBySecretary && (
                                    <Badge variant="outline" className="text-xs">
                                      Secretary
                                    </Badge>
                                  )}
                                  {minuteItem.actedByAssistant && (
                                    <Badge variant="outline" className="text-xs">
                                      {minuteItem.assistantType}
                                    </Badge>
                                  )}
                                </div>
                                {minuteItem.signature && (
                                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                    <ImageIcon className="h-3 w-3 text-primary" />
                                    <span>Signed {formatDateTime(minuteItem.signature.appliedAt)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          <div className="w-[30%] border-l border-border bg-background">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Send className="h-4 w-4 text-accent" />
                Actions
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {isCurrentUserTurn && (
                <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                  <p className="text-sm font-medium text-accent flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Your Turn to Act
                  </p>
                </div>
              )}

              {activeUser.gradeLevel === 'MDCS' ? (
                <>
                  <Button
                    className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                    onClick={() => setShowMinuteModal(true)}
                    disabled={!isCurrentUserTurn}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Review & Approve
                  </Button>
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() => setShowTreatmentModal(true)}
                    disabled={!isCurrentUserTurn}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Treat & Respond
                  </Button>
                </>
              ) : correspondence.direction === 'downward' ? (
                <>
                  <Button
                    className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                    onClick={() => setShowMinuteModal(true)}
                    disabled={!isCurrentUserTurn}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Minute & Forward Down
                  </Button>
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() => setShowTreatmentModal(true)}
                    disabled={!isCurrentUserTurn}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Treat & Respond
                  </Button>
                </>
              ) : (
                <Button
                  className="w-full bg-gradient-success hover:opacity-90 transition-opacity"
                  onClick={() => setShowMinuteModal(true)}
                  disabled={!isCurrentUserTurn}
                >
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Review & Forward Up
                </Button>
              )}

              <Button
                className="w-full mt-3"
                variant="outline"
                onClick={() => setShowCompletionModal(true)}
                disabled={!isCurrentUserTurn || correspondence.status === 'completed'}
              >
                <Archive className="h-4 w-4 mr-2" />
                {correspondence.status === 'completed' ? 'Completed' : 'Mark Complete & Archive'}
              </Button>

              <Separator />

              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowReassignModal(true)}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Reassign Office / Approver
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowManualRouteModal(true)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Manual Route
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowDelegateModal(true)}
                  disabled={!isCurrentUserTurn || !!activeDelegation}
                >
                  <UserIcon className="h-4 w-4 mr-2" />
                  {activeDelegation ? 'Already Delegated' : 'Delegate to TA/PA'}
                </Button>
              </div>

              <Separator />

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Routing Chain</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRoutingDetails((prev) => !prev)}
                    >
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${showRoutingDetails ? 'rotate-90' : ''}`}
                      />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[320px] pr-4 -mr-4">
                    <div className="space-y-4 p-4 pt-0">
                      {minutes.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No routing history yet</p>
                      ) : (
                        minutes.map((minuteEntry, idx) => {
                          const user = lookupUser(minuteEntry.userId);
                          const isCurrentStep = idx === minutes.length - 1;

                          return (
                            <div key={minuteEntry.id} className="relative">
                              {idx < minutes.length - 1 && (
                                <div className="absolute left-3 top-8 w-0.5 h-4 bg-border" />
                              )}
                              <div
                                className={`flex items-start gap-2 ${
                                  isCurrentStep ? 'bg-accent/10 -mx-2 px-2 py-1 rounded-lg' : ''
                                }`}
                              >
                                <div
                                  className={`mt-1 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                                    isCurrentStep ? 'bg-accent text-accent-foreground' : 'bg-success/10 text-success'
                                  }`}
                                >
                                  {isCurrentStep ? '●' : <CheckCircle className="h-3 w-3" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold truncate">
                                    {user?.name ?? minuteEntry.userName ?? 'Unknown User'}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {(() => {
                                      let role = user?.systemRole ?? minuteEntry.userSystemRole ?? 'Team Member';
                                      // Filter out UUIDs (strings with dashes and length > 30)
                                      if (role && role.includes('-') && role.length > 30) {
                                        role = user?.systemRole ?? 'Team Member';
                                      }
                                      return role;
                                    })()}
                                  </p>
                                  {showRoutingDetails && (
                                    <>
                                      <p className="text-[10px] text-muted-foreground mt-1">
                                        {minuteEntry.actionType} • {minuteEntry.direction}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {formatDateShort(minuteEntry.timestamp)}
                                      </p>
                                      {minuteEntry.signature && (
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                                          <ImageIcon className="h-3 w-3 text-primary" />
                                          Signed
                                        </p>
                                      )}
                                    </>
                                  )}
                                </div>
                                {minuteEntry.actedBySecretary && (
                                  <Badge variant="outline" className="text-[9px] h-4">
                                    Sec
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}

                      {correspondence.currentApproverId && (
                        <div className="relative">
                          {minutes.length > 0 && (
                            <div className="absolute left-3 top-0 w-0.5 h-4 bg-border" />
                          )}
                          <div className="flex items-start gap-2 bg-primary/5 -mx-2 px-2 py-1 rounded-lg border border-primary/20">
                            <div className="mt-1 h-6 w-6 rounded-full flex items-center justify-center animate-pulse bg-primary">
                              <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-semibold">
                                {lookupUser(correspondence.currentApproverId)?.name ?? 'Pending Approver'}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {lookupUser(correspondence.currentApproverId)?.systemRole ?? 'Awaiting assignment'}
                              </p>
                              <p className="text-[10px] text-primary font-medium mt-1">Awaiting Action</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <MinuteModal
        correspondence={correspondence}
        isOpen={showMinuteModal}
        onClose={handleMinuteClose}
        direction={correspondence.direction}
      />

      <TreatmentModal
        correspondence={correspondence}
        isOpen={showTreatmentModal}
        onClose={handleTreatmentClose}
      />

      {selectedMinute && (
        <MinuteDetailModal
          minute={selectedMinute}
          open={showMinuteDetail}
          onOpenChange={setShowMinuteDetail}
          authorName={lookupUser(selectedMinute.userId)?.name ?? selectedMinute.userName}
        />
      )}

      <CompletionSummaryModal
        open={showCompletionModal}
        onOpenChange={(open) => {
          setShowCompletionModal(open);
          if (!open) {
            handleCompletionClose();
          }
        }}
        correspondence={correspondence}
        minutes={minutes}
      />

      <OfficeReassignModal
        correspondence={correspondence}
        isOpen={showReassignModal}
        onClose={() => setShowReassignModal(false)}
      />

      <ManualRouteModal
        correspondence={correspondence}
        isOpen={showManualRouteModal}
        onClose={handleManualRouteClose}
      />

      <DocumentPreviewModal
        correspondence={correspondence}
        minutes={minutes}
        isOpen={showDocumentPreview}
        onClose={() => {
          setShowDocumentPreview(false);
          setSelectedAttachmentIndex(null);
        }}
        documentContentHtml={linkedDocuments[0]?.versions?.[linkedDocuments[0].versions.length - 1]?.contentHtml}
        attachmentUrl={
          selectedAttachmentIndex !== null && correspondence.attachments?.[selectedAttachmentIndex]
            ? correspondence.attachments[selectedAttachmentIndex].fileUrl
            : correspondence.attachments?.[0]?.fileUrl
        }
        attachmentFileName={
          selectedAttachmentIndex !== null && correspondence.attachments?.[selectedAttachmentIndex]
            ? correspondence.attachments[selectedAttachmentIndex].fileName
            : correspondence.attachments?.[0]?.fileName
        }
      />

      <PrintPreviewModal
        correspondence={correspondence}
        minutes={minutes}
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        documentContentHtml={linkedDocuments[0]?.versions?.[linkedDocuments[0].versions.length - 1]?.contentHtml}
        attachmentUrl={correspondence.attachments?.[0]?.fileUrl}
        attachmentFileName={correspondence.attachments?.[0]?.fileName}
      />

      <DelegateModal
        open={showDelegateModal}
        onOpenChange={setShowDelegateModal}
        correspondenceId={correspondence.id}
        executiveId={activeUser.id}
        onDelegate={handleDelegate}
      />

      <LinkDocumentDialog
        open={showLinkDocumentDialog}
        onOpenChange={setShowLinkDocumentDialog}
        linkedDocumentIds={correspondence.linkedDocumentIds}
        onSave={handleLinkDocumentsSave}
        divisionId={correspondence.divisionId}
        departmentId={correspondence.departmentId}
        subject={correspondence.subject}
      />
    </DashboardLayout>
  );
};

export default CorrespondenceDetail;