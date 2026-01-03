"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CaseTimeline } from "@/components/cases/CaseTimeline";
import { CaseComments } from "@/components/cases/CaseComments";
import { LinkCorrespondenceDialog } from "@/components/cases/LinkCorrespondenceDialog";
import { LinkDocumentDialog } from "@/components/cases/LinkDocumentDialog";
import { LinkFormDialog } from "@/components/cases/LinkFormDialog";
import { CaseHeader } from "./components/CaseHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useOrganization } from "@/contexts/OrganizationContext";
import { getCaseById, updateCaseStatus, updateCase, generateCaseCompletionPackage, unlinkCorrespondenceFromCase, unlinkDocumentFromCase, unlinkFormFromCase, exportCase, importCases, getCaseSLAStatus } from "@/lib/api/cases";
import type { CaseDetail } from "@/lib/npa-structure";
import { logError } from "@/lib/client-logger";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  FileText,
  Link as LinkIcon,
  Download,
  CheckCircle2,
  Clock,
  Archive,
  AlertCircle,
  Trash2,
  Loader2,
  Calendar,
  Building2,
  User,
  MoreVertical,
  Printer,
  Edit,
  ExternalLink,
  MessageSquare,
  Upload,
  AlertTriangle,
  FileCheck,
  Mail,
} from "lucide-react";
import { HelpGuideCard } from "@/components/help/HelpGuideCard";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDateShort, formatDateTime } from "@/lib/correspondence-helpers";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CaseDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;
  const { currentUser, hydrated } = useCurrentUser();
  const { divisions, departments, offices, users } = useOrganization();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [itemToUnlink, setItemToUnlink] = useState<{
    type: "correspondence" | "document" | "form";
    id: string;
    name: string;
  } | null>(null);
  const [slaStatus, setSlaStatus] = useState<{
    status: 'ok' | 'warning' | 'critical' | 'breach';
    target_date: string;
    target_days: number;
    breached: boolean;
  } | null>(null);
  const [slaError, setSlaError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showLinkCorrespondenceDialog, setShowLinkCorrespondenceDialog] = useState(false);
  const [showLinkDocumentDialog, setShowLinkDocumentDialog] = useState(false);
  const [showLinkFormDialog, setShowLinkFormDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCase, setEditingCase] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<CaseDetail>>({});

  useEffect(() => {
    if (!caseId || !hydrated) {
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const fetchCase = async () => {
      setLoading(true);
      setError(null);
      setSlaError(null);
      try {
        const data = await getCaseById(caseId, signal);
        
        if (signal.aborted) return;
        
        setCaseData(data);
        
        // Load SLA status with proper error handling
        try {
          const sla = await getCaseSLAStatus(caseId, signal);
          
          if (signal.aborted) return;
          
          setSlaStatus(sla);
        } catch (err: unknown) {
          if (err.name === 'AbortError') return;
          // Log error and show user-friendly message
          logError("Failed to load SLA status", err);
          setSlaError("SLA status unavailable");
          // Don't set slaStatus to null, just show error
        }
      } catch (err: Record<string, unknown>) {
        if (err.name === 'AbortError') return;
        logError("Failed to load case", err);
        setError("Failed to load case. Please try again.");
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchCase();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [hydrated, currentUser, caseId]);

  const handleStatusUpdate = async (newStatus: CaseDetail["status"]) => {
    if (!caseData) return;

    setUpdatingStatus(true);
    try {
      const updated = await updateCaseStatus(caseData.id, newStatus);
      setCaseData({ ...caseData, ...updated });
      toast.success("Case status updated successfully");
    } catch (err) {
      logError("Failed to update case status", err);
      toast.error("Failed to update case status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleGenerateCompletionPackage = async () => {
    if (!caseData) return;

    try {
      const updated = await generateCaseCompletionPackage(caseData.id);
      setCaseData({ ...caseData, ...updated });
      toast.success("Completion package generated successfully");
    } catch (err) {
      logError("Failed to generate completion package", err);
      toast.error("Failed to generate completion package");
    }
  };

  const handleExport = async () => {
    if (!caseData) return;
    
    setExporting(true);
    try {
      const exportData = await exportCase(caseId);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `case-${caseData.caseNumber}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Case exported successfully");
    } catch (err) {
      logError("Failed to export case", err);
      toast.error("Failed to export case");
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await importCases(data);
      
      if (result.imported > 0) {
        toast.success(`Successfully imported ${result.imported} case(s)`);
        if (result.failed > 0) {
          toast.warning(`${result.failed} case(s) failed to import`);
        }
        router.push('/cases');
      } else {
        toast.error("No cases were imported");
      }
    } catch (err) {
      logError("Failed to import cases", err);
      toast.error("Failed to import cases. Please check the file format.");
    }
  };

  const handleUnlinkClick = (
    type: "correspondence" | "document" | "form",
    id: string,
    name: string
  ) => {
    setItemToUnlink({ type, id, name });
    setShowUnlinkConfirm(true);
  };

  const handleUnlinkConfirm = async () => {
    if (!itemToUnlink || !caseData) return;

    try {
      if (itemToUnlink.type === "correspondence") {
        await unlinkCorrespondenceFromCase(caseData.id, itemToUnlink.id);
      } else if (itemToUnlink.type === "document") {
        await unlinkDocumentFromCase(caseData.id, itemToUnlink.id);
      } else if (itemToUnlink.type === "form") {
        await unlinkFormFromCase(caseData.id, itemToUnlink.id);
      }

      // Reload case data
      const updated = await getCaseById(caseData.id);
      setCaseData(updated);
      toast.success(`${itemToUnlink.type.charAt(0).toUpperCase() + itemToUnlink.type.slice(1)} unlinked successfully`);
      setShowUnlinkConfirm(false);
      setItemToUnlink(null);
    } catch (err) {
      logError(`Failed to unlink ${itemToUnlink.type}`, err);
      toast.error(`Failed to unlink ${itemToUnlink.type}`);
    }
  };

  const handleItemLinked = async () => {
    if (!caseData) return;
    // Reload case data to show newly linked items
    try {
      const updated = await getCaseById(caseData.id);
      setCaseData(updated);
    } catch (err) {
      logError("Failed to reload case data", err);
    }
  };
  
  const handleEditClick = () => {
    if (!caseData) return;
    setEditFormData({
      title: caseData.title,
      description: caseData.description,
      caseType: caseData.caseType,
      priority: caseData.priority,
      divisionId: caseData.divisionId,
      departmentId: caseData.departmentId,
      owningOfficeId: caseData.owningOfficeId,
    });
    setShowEditDialog(true);
  };
  
  const handleEditSubmit = async () => {
    if (!caseData) return;
    
    setEditingCase(true);
    try {
      const updated = await updateCase(caseData.id, editFormData);
      setCaseData({ ...caseData, ...updated });
      toast.success("Case updated successfully");
      setShowEditDialog(false);
    } catch (err: Record<string, unknown>) {
      if (err.name === 'AbortError') return;
      logError("Failed to update case", err);
      toast.error("Failed to update case");
    } finally {
      setEditingCase(false);
    }
  };


  if (!hydrated || !currentUser) {
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center py-12 gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Loading case...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !caseData) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-destructive">{error || "Case not found"}</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const division = divisions.find((d) => d.id === caseData.divisionId);
  const department = departments.find((d) => d.id === caseData.departmentId);
  const owningOffice = offices.find((o) => o.id === caseData.owningOfficeId);
  const assignedTo = users.find((u) => u.id === caseData.assignedToId);
  const createdBy = users.find((u) => u.id === caseData.createdById);

  return (
    <ErrorBoundary>
      <DashboardLayout>
        {/* Case Header */}
        <CaseHeader
          caseData={caseData}
          slaStatus={slaStatus}
          slaError={slaError}
          updatingStatus={updatingStatus}
          exporting={exporting}
          onStatusUpdate={handleStatusUpdate}
          onGenerateCompletionPackage={handleGenerateCompletionPackage}
          onExport={handleExport}
          onEdit={() => setShowEditDialog(true)}
          onImport={() => setShowImportDialog(true)}
          owningOffice={owningOffice || null}
          assignedTo={assignedTo || null}
          createdBy={createdBy || null}
        />
        
        <div className="container mx-auto p-6 space-y-6">

        {/* Help Guide */}
        <HelpGuideCard
          title="Case Details"
          description="Review case information and manage related correspondence, documents, and forms. Update status and generate completion packages when the case is closed."
          links={[
            { label: 'Case Management', href: '/cases/my' },
            { label: 'Help & Guides', href: '/help' },
          ]}
          dismissible
          dismissKey="case-detail-guide"
        />

        {/* Case Description Card - Only show if description exists */}
        {caseData.description && (
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm whitespace-pre-wrap">{caseData.description}</div>
            </CardContent>
          </Card>
        )}

        {/* Tabs for Related Items */}
        <Tabs defaultValue="correspondence" className="space-y-4">
          <TabsList>
            <TabsTrigger value="correspondence" className="gap-2">
              <FileText className="h-4 w-4" />
              Correspondence
              <Badge variant="secondary" className="ml-1">
                {caseData.correspondence?.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              Documents
              <Badge variant="secondary" className="ml-1">
                {caseData.documents?.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="forms" className="gap-2">
              <FileText className="h-4 w-4" />
              Forms
              <Badge variant="secondary" className="ml-1">
                {caseData.forms?.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="comments" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Clock className="h-4 w-4" />
              Timeline & History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="correspondence">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Related Correspondence</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLinkCorrespondenceDialog(true)}
                    aria-label="Link correspondence to case"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Link Correspondence
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!caseData.correspondence || caseData.correspondence.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No correspondence linked to this case</p>
                    <Button
                      variant="outline"
                      onClick={() => setShowLinkCorrespondenceDialog(true)}
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Link Correspondence
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reference</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Primary</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {caseData.correspondence.map((link) => (
                          <TableRow key={link.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="font-mono text-sm">
                              {link.correspondence?.referenceNumber || "-"}
                            </TableCell>
                            <TableCell className="max-w-[300px]">
                              <div className="truncate" title={link.correspondence?.subject}>
                                {link.correspondence?.subject || "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {link.correspondence?.status || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {link.isPrimary && (
                                <Badge variant="default">Primary</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {link.correspondence && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                  >
                                    <Link href={`/correspondence/${link.correspondence.id}`}>
                                      View
                                    </Link>
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    link.correspondence &&
                                    handleUnlinkClick(
                                      "correspondence",
                                      link.correspondence.id,
                                      link.correspondence.referenceNumber || link.correspondence.subject || "correspondence"
                                    )
                                  }
                                  className="text-destructive hover:text-destructive"
                                  title="Unlink correspondence"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Related Documents</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLinkDocumentDialog(true)}
                    aria-label="Link document to case"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Link Document
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!caseData.documents || caseData.documents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No documents linked to this case</p>
                    <Button
                      variant="outline"
                      onClick={() => setShowLinkDocumentDialog(true)}
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Link Document
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {caseData.documents.map((link) => (
                          <TableRow key={link.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="max-w-[300px]">
                              <div className="flex items-center gap-2">
                                <div className="truncate font-medium" title={link.documentTitle}>
                                  {link.documentTitle || "-"}
                                </div>
                                {!link.documentId && (
                                  <Badge variant="destructive" className="text-xs">
                                    Missing ID
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                              <div className="truncate" title={link.notes || undefined}>
                                {link.notes || "-"}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {link.documentId ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                  >
                                    <Link href={`/dms/${link.documentId}`}>
                                      View
                                    </Link>
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled
                                    title="Document ID is missing"
                                  >
                                    View
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    link.documentId &&
                                    handleUnlinkClick("document", link.documentId, link.documentTitle || "document")
                                  }
                                  disabled={!link.documentId}
                                  className="text-destructive hover:text-destructive"
                                  title={link.documentId ? "Unlink document" : "Cannot unlink: missing document ID"}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forms">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Related Forms</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLinkFormDialog(true)}
                    aria-label="Link form to case"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Link Form
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!caseData.forms || caseData.forms.length === 0 ? (
                  <div className="text-center py-8">
                    <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No forms linked to this case</p>
                    <Button
                      variant="outline"
                      onClick={() => setShowLinkFormDialog(true)}
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Link Form
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Form</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {caseData.forms.map((link) => (
                          <TableRow key={link.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="max-w-[300px]">
                              <div className="flex items-center gap-2">
                                <div className="truncate font-medium" title={link.formTitle}>
                                  {link.formTitle || "-"}
                                </div>
                                {!link.formDocumentId && (
                                  <Badge variant="destructive" className="text-xs">
                                    Missing ID
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                              <div className="truncate" title={link.notes || undefined}>
                                {link.notes || "-"}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {link.formDocumentId ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                  >
                                    <Link href={`/dms/${link.formDocumentId}`}>
                                      View
                                    </Link>
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled
                                    title="Form document ID is missing"
                                  >
                                    View
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    link.formDocumentId &&
                                    handleUnlinkClick("form", link.formDocumentId, link.formTitle || "form")
                                  }
                                  disabled={!link.formDocumentId}
                                  className="text-destructive hover:text-destructive"
                                  title={link.formDocumentId ? "Unlink form" : "Cannot unlink: missing form document ID"}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments">
            <CaseComments caseId={caseId} />
          </TabsContent>
          <TabsContent value="timeline">
            <CaseTimeline caseId={caseId} caseData={caseData} />
          </TabsContent>
        </Tabs>

        {/* Import Dialog */}
        <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Import Cases</AlertDialogTitle>
              <AlertDialogDescription>
                Select a JSON file exported from the case management system to import cases.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImport(file);
                    setShowImportDialog(false);
                  }
                }}
                className="w-full"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Link Dialogs */}
        {caseData && (
          <>
            <LinkCorrespondenceDialog
              open={showLinkCorrespondenceDialog}
              onOpenChange={setShowLinkCorrespondenceDialog}
              caseId={caseData.id}
              caseNumber={caseData.caseNumber}
              onLinked={handleItemLinked}
            />
            <LinkDocumentDialog
              open={showLinkDocumentDialog}
              onOpenChange={setShowLinkDocumentDialog}
              caseId={caseData.id}
              caseNumber={caseData.caseNumber}
              onLinked={handleItemLinked}
            />
            <LinkFormDialog
              open={showLinkFormDialog}
              onOpenChange={setShowLinkFormDialog}
              caseId={caseData.id}
              caseNumber={caseData.caseNumber}
              onLinked={handleItemLinked}
            />
          </>
        )}

        {/* Unlink Confirmation Dialog */}
        <AlertDialog open={showUnlinkConfirm} onOpenChange={setShowUnlinkConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Unlink</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to unlink <strong>{itemToUnlink?.name}</strong> from case{" "}
                <strong>{caseData?.caseNumber}</strong>? This action can be undone by linking it again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleUnlinkConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Unlink
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
    </ErrorBoundary>
  );
};

export default CaseDetailPage;

