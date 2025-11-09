"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  MoreVertical,
  ChevronRight,
  Users,
  Image as ImageIcon,
  Link as LinkIcon,
  ExternalLink,
  X,
  Eye,
} from 'lucide-react';
import {
  MOCK_USERS,
  getDivisionById,
  getDepartmentById,
  getUserById,
  Minute,
} from '@/lib/npa-structure';
import { MinuteModal } from '@/components/correspondence/MinuteModal';
import { TreatmentModal } from '@/components/correspondence/TreatmentModal';
import { MinuteDetailModal } from '@/components/correspondence/MinuteDetailModal';
import { CompletionSummaryModal } from '@/components/correspondence/CompletionSummaryModal';
import { ManualRouteModal } from '@/components/correspondence/ManualRouteModal';
import { DelegateModal } from '@/components/correspondence/DelegateModal';
import { PrintPreviewModal } from '@/components/correspondence/PrintPreviewModal';
import { DocumentPreviewModal } from '@/components/correspondence/DocumentPreviewModal';
import { addDelegation, getDelegationByCorrespondence } from '@/lib/delegation-storage';
import { downloadAsPDF, downloadAsWord } from '@/lib/document-generator';
import { formatDateShort, formatDateTime } from '@/lib/correspondence-helpers';
import { getDocumentById, addDiscussionMessage } from '@/lib/dms-storage';
import { LinkDocumentDialog } from '@/components/correspondence/LinkDocumentDialog';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { useCurrentUser } from '@/hooks/use-current-user';
import { ScrollBar } from '@/components/ui/scroll-area';

const CorrespondenceDetail = () => {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { getCorrespondenceById, getMinutesByCorrespondenceId, updateCorrespondence, refreshData } = useCorrespondence();
  const correspondence = id ? getCorrespondenceById(id) : null;
  const minutes = id ? getMinutesByCorrespondenceId(id) : [];
  const { currentUser: activeUser } = useCurrentUser();
  const [showMinuteModal, setShowMinuteModal] = useState(false);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showManualRouteModal, setShowManualRouteModal] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [showRoutingDetails, setShowRoutingDetails] = useState(true);
  const [selectedMinute, setSelectedMinute] = useState<Minute | null>(null);
  const [showMinuteDetail, setShowMinuteDetail] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [showLinkDocumentDialog, setShowLinkDocumentDialog] = useState(false);

  const handleMinuteClose = () => {
    setShowMinuteModal(false);
    refreshData(); // Refresh to show new minute
  };

  const handleTreatmentClose = () => {
    setShowTreatmentModal(false);
    refreshData(); // Refresh to show new correspondence
  };

  const handleCompletionClose = () => {
    setShowCompletionModal(false);
    refreshData(); // Refresh to update status
  };

  const handleManualRouteClose = () => {
    setShowManualRouteModal(false);
    refreshData(); // Refresh after manual routing
  };

  const handleDelegate = (assistantId: string, assistantType: 'TA' | 'PA', notes: string) => {
    if (!correspondence || !activeUser) return;

    const delegation = {
      id: `delegation-${Date.now()}`,
      correspondenceId: correspondence.id,
      executiveId: activeUser.id,
      assistantId,
      assistantType,
      delegationNotes: notes,
      delegatedAt: new Date().toISOString(),
      status: 'active' as const,
    };

    addDelegation(delegation);

    toast.success(`Successfully delegated to ${assistantType}`);
    refreshData();
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

  const division = getDivisionById(correspondence.divisionId);
  const department = correspondence.departmentId ? getDepartmentById(correspondence.departmentId) : null;
  const isCurrentUserTurn = correspondence.currentApproverId === activeUser.id;
  
  // Check if this correspondence is delegated
  const activeDelegation = getDelegationByCorrespondence(correspondence.id);

  const linkedDocuments = (correspondence.linkedDocumentIds ?? [])
    .map((docId) => getDocumentById(docId))
    .filter((doc): doc is NonNullable<ReturnType<typeof getDocumentById>> => Boolean(doc));

  const handleLinkDocumentsSave = (documentIds: string[]) => {
    updateCorrespondence(correspondence.id, { linkedDocumentIds: documentIds });
    toast.success('Linked documents updated');
    documentIds.forEach((docId) => {
      const doc = getDocumentById(docId);
      if (!doc) return;
      addDiscussionMessage({
        documentId: docId,
        authorId: activeUser?.id ?? 'system',
        message: `Linked to correspondence ${correspondence.referenceNumber} - ${correspondence.subject}`,
      });
    });
    refreshData();
  };

  const handleRemoveLink = (docId: string) => {
    const updatedIds = (correspondence.linkedDocumentIds ?? []).filter((id) => id !== docId);
    updateCorrespondence(correspondence.id, { linkedDocumentIds: updatedIds });
    addDiscussionMessage({
      documentId: docId,
      authorId: activeUser?.id ?? 'system',
      message: `Unlinked from correspondence ${correspondence.referenceNumber}`,
    });
    toast.success('Document unlinked');
    refreshData();
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'minute': return MessageSquare;
      case 'approve': return CheckCircle;
      case 'forward': return Send;
      case 'treat': return CheckCircle;
      default: return MessageSquare;
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
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
                <h1 className="text-xl font-bold text-foreground">
                  {correspondence.referenceNumber}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {correspondence.subject}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={
                correspondence.priority === 'urgent' ? 'destructive' :
                correspondence.priority === 'high' ? 'default' :
                'secondary'
              }>
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
                  <Button 
                    variant="outline" 
                    size="icon"
                    title="Download Document"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      if (correspondence && minutes) {
                        downloadAsPDF({ correspondence, minutes });
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
                        downloadAsWord({ correspondence, minutes });
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
                  'Use the right-hand actions to minute, treat, delegate, or complete.'
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
              { label: "Help & Guides", href: "/help" },
              { label: "Linked Documents", href: "#linked-documents" },
            ]}
            className="bg-background"
          />
        </div>

        {/* 3-Panel Layout */}
        <div className="flex-1 flex">
          {/* Left Panel - Document Viewer */}
          <div className="w-[30%] border-r border-border bg-muted/30">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Original Document
              </h3>
            </div>
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <div className="p-4 space-y-4">
                {/* Document Info */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{correspondence.senderName}</p>
                        {correspondence.senderOrganization && (
                          <p className="text-xs text-muted-foreground">
                            {correspondence.senderOrganization}
                          </p>
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
                      <span className="text-muted-foreground">
                        {division?.name}
                      </span>
                    </div>
                    {/* Distribution (CC) */}
                    {correspondence.distribution && correspondence.distribution.length > 0 && (
                      <div className="pt-3 border-t border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground">
                            Distribution (CC)
                          </span>
                        </div>
                        <div className="space-y-1">
                          {correspondence.distribution.map((recipient, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <Badge variant="outline" className="text-xs">
                                {recipient.type === 'division' ? 'Div' : 'Dept'}
                              </Badge>
                              <span className="text-muted-foreground">{recipient.name}</span>
                              {recipient.purpose && (
                                <Badge variant="outline" className="text-xs ml-auto">
                                  {recipient.purpose === 'information' ? 'Info' : 
                                   recipient.purpose === 'action' ? 'Action' : 'Comment'}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Document Preview */}
                <div className="aspect-[8.5/11] bg-white border-2 border-border rounded-lg overflow-hidden shadow-lg">
                  <div className="p-6 h-full overflow-auto text-xs leading-relaxed">
                    <div className="mb-4 text-center">
                      <img src="/api/placeholder/100/50" alt="NPA Logo" className="mx-auto mb-2" />
                      <h2 className="font-bold text-sm">NIGERIAN PORTS AUTHORITY</h2>
                      <p className="text-xs text-muted-foreground">{correspondence.senderOrganization || 'Head Office, Marina, Lagos'}</p>
                    </div>
                    <div className="mb-4">
                      <p className="font-semibold">Ref: {correspondence.referenceNumber}</p>
                      <p>Date: {new Date(correspondence.receivedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="mb-4">
                      <p className="font-semibold">To: {division?.name}</p>
                      <p>From: {correspondence.senderName}</p>
                      {correspondence.senderOrganization && (
                        <p className="text-muted-foreground">{correspondence.senderOrganization}</p>
                      )}
                    </div>
                    <div className="mb-4">
                      <p className="font-bold underline">Subject: {correspondence.subject}</p>
                    </div>
                    <div className="space-y-3">
                      <p>Dear Sir/Madam,</p>
                      <p className="indent-8">
                        This is to formally bring to your attention the matter referenced above. 
                        Following our previous communications and in accordance with established 
                        procedures, we hereby request your urgent attention and appropriate action.
                      </p>
                      <p className="indent-8">
                        The details of this correspondence require careful review and consideration 
                        by your office. We trust that you will give this matter the priority it deserves 
                        and provide the necessary guidance and approval as required.
                      </p>
                      <p className="indent-8">
                        We await your favorable response and remain available for any clarifications 
                        that may be required.
                      </p>
                      <p className="mt-6">Yours faithfully,</p>
                      <p className="mt-4 font-semibold">{correspondence.senderName}</p>
                    </div>
                  </div>
                </div>

                {/* Attachments */}
                {correspondence.attachments && correspondence.attachments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Attachments</h4>
                    <div className="space-y-2">
                      {correspondence.attachments.map((att, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center gap-2 p-2 bg-background border border-border rounded hover:bg-muted/50 cursor-pointer"
                        >
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-sm flex-1">Attachment {idx + 1}</span>
                          <Download className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
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

          {/* Center Panel - Minute Thread */}
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
                  minutes.map((minute, idx) => {
                    const user = getUserById(minute.userId);
                    const ActionIcon = getActionIcon(minute.actionType);
                    const isDownward = minute.direction === 'downward';
                    
                    return (
                      <div key={minute.id} className="relative">
                        {/* Connector Line */}
                        {idx < minutes.length - 1 && (
                          <div className={`absolute left-8 top-16 w-0.5 h-8 ${
                            isDownward ? 'bg-info' : 'bg-success'
                          }`} />
                        )}
                        
                        <Card className={`${
                          minute.userId === activeUser.id 
                            ? 'border-primary shadow-glow' 
                            : ''
                        } cursor-pointer hover:shadow-md transition-all`}
                        onClick={() => {
                          setSelectedMinute(minute);
                          setShowMinuteDetail(true);
                        }}
                        >
                          <CardContent className="p-4">
                            <div className="flex gap-3">
                              {/* Avatar */}
                              <Avatar className={`h-10 w-10 ${
                                isDownward ? 'ring-2 ring-info' : 'ring-2 ring-success'
                              }`}>
                                <AvatarFallback className="text-xs font-semibold">
                                  {user?.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <p className="font-semibold text-sm">{user?.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {user?.systemRole} • {minute.gradeLevel}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs gap-1">
                                      <ActionIcon className="h-3 w-3" />
                                      {minute.actionType}
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
                                
                                <p className="text-sm text-foreground mb-2 line-clamp-2">
                                  {minute.minuteText}
                                </p>
                                
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>
                                    {formatDateTime(minute.timestamp)}
                                  </span>
                                  <span>Step {minute.stepNumber}</span>
                                  {minute.actedBySecretary && (
                                    <Badge variant="outline" className="text-xs">Secretary</Badge>
                                  )}
                                  {minute.actedByAssistant && (
                                    <Badge variant="outline" className="text-xs">
                                      {minute.assistantType}
                                    </Badge>
                                  )}
                                </div>
                                {minute.signature && (
                                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                    <ImageIcon className="h-3 w-3 text-primary" />
                                    <span>Signed {formatDateTime(minute.signature.appliedAt)}</span>
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
            </ScrollArea>
          </div>

          {/* Right Panel - Action Panel */}
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
                <>
                  <Button 
                    className="w-full bg-gradient-success hover:opacity-90 transition-opacity"
                    onClick={() => setShowMinuteModal(true)}
                    disabled={!isCurrentUserTurn}
                  >
                    <ArrowUp className="h-4 w-4 mr-2" />
                    Review & Forward Up
                  </Button>
                </>
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

              {/* Enhanced Routing Chain */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Routing Chain</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowRoutingDetails(!showRoutingDetails)}
                    >
                      <ChevronRight className={`h-4 w-4 transition-transform ${showRoutingDetails ? 'rotate-90' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[320px] pr-4 -mr-4">
                    <div className="space-y-4">
                      {minutes.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No routing history yet</p>
                      ) : (
                        minutes.map((minute, idx) => {
                          const user = getUserById(minute.userId);
                          const isCurrentStep = idx === minutes.length - 1;
                          
                          return (
                            <div key={minute.id} className="relative">
                              {/* Connector */}
                              {idx < minutes.length - 1 && (
                                <div className="absolute left-3 top-8 w-0.5 h-4 bg-border" />
                              )}
                              
                              <div className={`flex items-start gap-2 ${isCurrentStep ? 'bg-accent/10 -mx-2 px-2 py-1 rounded-lg' : ''}`}>
                                <div className={`mt-1 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                                  isCurrentStep ? 'bg-accent text-accent-foreground' : 'bg-success/10 text-success'
                                }`}>
                                  {isCurrentStep ? '●' : <CheckCircle className="h-3 w-3" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold truncate">{user?.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{user?.systemRole}</p>
                                  {showRoutingDetails && (
                                    <>
                                      <p className="text-[10px] text-muted-foreground mt-1">
                                        {minute.actionType} • {minute.direction}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {formatDateShort(minute.timestamp)}
                                      </p>
                                      {minute.signature && (
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                                          <ImageIcon className="h-3 w-3 text-primary" />
                                          Signed
                                        </p>
                                      )}
                                    </>
                                  )}
                                </div>
                                {minute.actedBySecretary && (
                                  <Badge variant="outline" className="text-[9px] h-4">Sec</Badge>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      
                      {/* Next Expected Step */}
                      {correspondence.currentApproverId && (
                        <>
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
                                  {getUserById(correspondence.currentApproverId)?.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {getUserById(correspondence.currentApproverId)?.systemRole}
                                </p>
                                <p className="text-[10px] text-primary font-medium mt-1">
                                  Awaiting Action
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
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
          authorName={getUserById(selectedMinute.userId)?.name}
        />
      )}

      <CompletionSummaryModal
        open={showCompletionModal}
        onOpenChange={handleCompletionClose}
        correspondence={correspondence}
        minutes={minutes}
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
        onClose={() => setShowDocumentPreview(false)}
      />

      <PrintPreviewModal
        correspondence={correspondence}
        minutes={minutes}
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
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
        currentUser={activeUser}
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
