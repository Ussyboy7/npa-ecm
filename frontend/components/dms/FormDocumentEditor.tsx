"use client";

import { useState, useEffect, useRef } from "react";
import { logError, logWarn, logInfo } from '@/lib/client-logger';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { DynamicFormRenderer } from "@/components/forms/DynamicFormRenderer";
import { SignatureWorkflowDialog } from "@/components/forms/SignatureWorkflowDialog";
import { FormSignatureDialog } from "@/components/forms/FormSignatureDialog";
import { getFormTemplate } from "@/lib/api/forms";
import {
  getFormDocument,
  updateFormDocument,
  generateFormDocumentPdf,
  markFormDocumentCompleted,
  type FormDocument as FormDocumentType,
} from "@/lib/api/dms-forms";
import {
  getSignatures,
  getSignatureWorkflow,
} from "@/lib/api/forms";
import type { FormSignature, FormSignatureWorkflow } from "@/lib/types/forms";
import { toast } from "@/components/ui/sonner";
import { formatDateShort } from "@/lib/datetime";
import { FileText, PenTool, CheckCircle2, Clock, FileDown, Loader2, AlertCircle, Paperclip, Upload, Download, Send, Eye } from "lucide-react";
import { ForwardFormDialog } from "@/components/forms/ForwardFormDialog";
import { formatDateTime } from "@/lib/correspondence-helpers";
import type { FormTemplate } from "@/lib/types/forms";
import { getWorkflowCollectedFieldNames, isSignatureFileField } from "@/lib/forms/field-classification";
import { createDocumentVersion, type DocumentVersion } from "@/lib/api/dms";
import { Input } from "@/components/ui/input";
import { DocumentVersionPreviewModal } from "@/components/dms/DocumentVersionPreviewModal";

interface FormDocumentEditorProps {
  documentId: string;
  formDocumentId: string;
}

export function FormDocumentEditor({ documentId, formDocumentId }: FormDocumentEditorProps) {
  const MAX_SUPPORTING_DOC_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
  const ALLOWED_SUPPORTING_DOC_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
  ];
  const [formDoc, setFormDoc] = useState<FormDocumentType | null>(null);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSignatureWorkflow, setShowSignatureWorkflow] = useState(false);
  const [pendingSignatures, setPendingSignatures] = useState<FormSignature[]>([]);
  const [workflow, setWorkflow] = useState<FormSignatureWorkflow | null>(null);
  const [selectedSignature, setSelectedSignature] = useState<{
    signature: FormSignature;
    workflow: FormSignatureWorkflow;
  } | null>(null);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [allSignatures, setAllSignatures] = useState<FormSignature[]>([]);
  const [supportingDocuments, setSupportingDocuments] = useState<DocumentVersion[]>([]);
  const [generatedPdf, setGeneratedPdf] = useState<DocumentVersion | null>(null);
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("form");
  const supportingFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadFormDocument();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formDocumentId]);

  const loadFormDocument = async () => {
    try {
      logInfo('[FormDocumentEditor] Loading form document:', formDocumentId);
      setLoading(true);
      
      logInfo('[FormDocumentEditor] Calling getFormDocument...');
      const doc = await getFormDocument(formDocumentId);
      
      logInfo('[FormDocumentEditor] Received form document:', { id: doc.id, template: doc.template });
      setFormDoc(doc);
      setFormData(doc.form_data || {});

      if (doc.template?.id) {
        logInfo('[FormDocumentEditor] Loading template:', doc.template.id);
        const templateData = await getFormTemplate(doc.template.id);
        logInfo('[FormDocumentEditor] Template loaded:', templateData.name);
        setTemplate(templateData);
      } else {
        logWarn('[FormDocumentEditor] No template ID found in form document');
      }

      // Load signature workflow if exists
      let finalWorkflow: FormSignatureWorkflow | null = null;
      let finalPendingSigs: FormSignature[] = [];
      let finalAllSigs: FormSignature[] = [];
      
      if (doc.signature_workflow?.id) {
        logInfo('[FormDocumentEditor] Loading signature workflow:', doc.signature_workflow.id);
        try {
          const workflowData = await getSignatureWorkflow(doc.signature_workflow.id, true); // true = isWorkflowId
          finalWorkflow = workflowData;
          setWorkflow(workflowData);

          // Load all signatures (pending and completed)
          const allSigs = await getSignatures({ workflow: workflowData.id });
          finalAllSigs = allSigs;
          const pendingSigs = allSigs.filter(sig => sig.status === "pending");
          finalPendingSigs = pendingSigs;
          logInfo('[FormDocumentEditor] Pending signatures:', pendingSigs.length);
          logInfo('[FormDocumentEditor] Total signatures:', allSigs.length);
          setPendingSignatures(pendingSigs);
          setAllSignatures(allSigs);
        } catch (error: unknown) {
          logError('[FormDocumentEditor] Error loading workflow:', error);
          setWorkflow(null);
          setPendingSignatures([]);
          setAllSignatures([]);
        }
      } else {
        logInfo('[FormDocumentEditor] No signature workflow found');
        setWorkflow(null);
        setPendingSignatures([]);
        setAllSignatures([]);
      }

      // Auto-generate PDF if all signatures are complete and no PDF exists yet
      if (finalPendingSigs.length === 0 && finalAllSigs.length > 0) {
        const hasPdfVersion = doc.document?.versions?.some((v: Record<string, unknown>) => {
          const fileType = typeof v.file_type === 'string' ? v.file_type : '';
          const notes = typeof v.notes === 'string' ? v.notes : '';
          return fileType === 'application/pdf' && (notes.includes('Generated PDF') || notes.includes('Auto-generated'));
        });
        if (!hasPdfVersion && doc.status === "awaiting_signatures") {
          // Auto-generate PDF
          try {
            await generateFormDocumentPdf(formDocumentId);
            logInfo('[FormDocumentEditor] Auto-generated PDF after all signatures completed');
            // Reload to get updated document
            await loadFormDocument();
          } catch (error: unknown) {
            logError('[FormDocumentEditor] Failed to auto-generate PDF:', error);
            // Don't show error toast - user can generate manually
          }
        }
      }

      // Load supporting documents and generated PDF
      // Ensure versions is always an array (defensive check)
      const versions = Array.isArray(doc.document?.versions) 
        ? doc.document.versions 
        : (doc.document?.versions ? [doc.document.versions] : []);
      
      logInfo('[FormDocumentEditor] Checking document versions:', {
        hasDocument: !!doc.document,
        hasVersions: !!doc.document?.versions,
        versionsType: typeof doc.document?.versions,
        versionsIsArray: Array.isArray(doc.document?.versions),
        versionsLength: versions.length,
        versions: versions,
        rawVersions: doc.document?.versions,
        documentKeys: doc.document ? Object.keys(doc.document) : null,
      });
      
      let finalPdfVersion: DocumentVersion | null = null;
      let finalSupportingDocs: DocumentVersion[] = [];
      
      if (versions.length > 0) {
        logInfo('[FormDocumentEditor] Document has versions:', versions.length);
        // Map versions to DocumentVersion format
        const mappedVersions = versions.map((v: Record<string, unknown>) => {
          logInfo('[FormDocumentEditor] Mapping version:', { id: v.id, file_name: v.file_name, file_type: v.file_type, notes: v.notes });
          return {
            id: String(v.id ?? ''),
            documentId: documentId,
            versionNumber: typeof v.version_number === 'number' ? v.version_number : 1,
            fileName: typeof v.file_name === 'string' ? v.file_name : 'file',
            fileType: typeof v.file_type === 'string' ? v.file_type : 'application/octet-stream',
            fileSize: typeof v.file_size === 'number' ? v.file_size : 0,
            fileUrl: typeof v.file_url === 'string' ? v.file_url : undefined,
            uploadedBy:
              typeof v.uploaded_by === 'object' && v.uploaded_by !== null && 'id' in (v.uploaded_by as Record<string, unknown>)
                ? String((v.uploaded_by as Record<string, unknown>).id ?? '')
                : v.uploaded_by
                  ? String(v.uploaded_by)
                  : '',
            uploadedAt: typeof v.uploaded_at === 'string' ? v.uploaded_at : new Date().toISOString(),
            notes: typeof v.notes === 'string' ? v.notes : undefined,
          };
        }) as DocumentVersion[];
        
        logInfo('[FormDocumentEditor] Mapped versions:', mappedVersions.map(v => ({ 
          id: v.id, 
          fileName: v.fileName, 
          fileType: v.fileType, 
          notes: v.notes 
        })));
        
        // Find generated PDF (PDF with notes about being generated)
        finalPdfVersion = mappedVersions.find(v => 
          v.fileType === 'application/pdf' && 
          (v.notes?.toLowerCase().includes('generated') || 
           v.notes?.toLowerCase().includes('auto-generated') ||
           v.notes?.toLowerCase().includes('generated pdf'))
        ) || null;
        setGeneratedPdf(finalPdfVersion);
        logInfo('[FormDocumentEditor] Generated PDF:', finalPdfVersion ? { id: finalPdfVersion.id, fileName: finalPdfVersion.fileName, notes: finalPdfVersion.notes } : 'none');
        
        // Supporting documents are all versions except the generated PDF
        // If there's a generated PDF, exclude it. Otherwise, show all versions as potential supporting docs
        finalSupportingDocs = mappedVersions.filter(v => {
          // Always exclude the generated PDF if it exists
          if (finalPdfVersion && v.id === finalPdfVersion.id) return false;
          
          // Include everything else (non-PDFs and PDFs that aren't the generated one)
          return true;
        });
        setSupportingDocuments(finalSupportingDocs);
        logInfo('[FormDocumentEditor] Supporting documents:', finalSupportingDocs.length, finalSupportingDocs.map(a => ({ id: a.id, fileName: a.fileName, fileType: a.fileType, notes: a.notes })));
      } else {
        logInfo('[FormDocumentEditor] No document versions found', { 
          hasDocument: !!doc.document, 
          hasVersions: !!doc.document?.versions,
          versionsLength: doc.document?.versions?.length,
          documentStructure: doc.document ? JSON.stringify(doc.document, null, 2) : null,
        });
        setGeneratedPdf(null);
        setSupportingDocuments([]);
      }
      
      logInfo('[FormDocumentEditor] Finished loading form document - Summary:', {
        hasFormDoc: !!doc,
        hasTemplate: !!template,
        hasWorkflow: !!finalWorkflow,
        pendingSignaturesCount: finalPendingSigs.length,
        allSignaturesCount: finalAllSigs.length,
        supportingDocumentsCount: finalSupportingDocs.length,
        hasGeneratedPdf: !!finalPdfVersion,
        versionsCount: versions.length,
        documentId: documentId,
        formDocumentId: formDocumentId,
        documentStructure: doc.document ? {
          id: doc.document.id,
          title: doc.document.title,
          hasVersions: !!doc.document.versions,
          versionsType: typeof doc.document.versions,
          versionsIsArray: Array.isArray(doc.document.versions),
        } : null,
      });
    } catch (error: unknown) {
      logError("[FormDocumentEditor] Error loading form document:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load form document";
      logError("[FormDocumentEditor] Error details:", { error, errorMessage });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formDoc) return;

    try {
      setSaving(true);
      await updateFormDocument(formDocumentId, {
        form_data: formData,
        status: "in_progress",
      });
      toast.success("Form saved successfully");
      await loadFormDocument();
    } catch (error: unknown) {
      logError("Error saving form:", error);
      toast.error("Failed to save form");
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!formDoc) return;

    try {
      setSaving(true);
      await generateFormDocumentPdf(formDocumentId);
      toast.success("PDF generated successfully! Check the 'Supporting Documents' tab.", {
        duration: 5000,
        action: {
          label: "View PDF",
          onClick: () => setActiveTab("attachments"),
        },
      });
      await loadFormDocument();
      // Auto-switch to attachments tab to show the generated PDF
      setActiveTab("attachments");
    } catch (error: unknown) {
      logError("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!formDoc) return;

    try {
      setSaving(true);
      await markFormDocumentCompleted(formDocumentId);
      toast.success("Form marked as completed");
      await loadFormDocument();
    } catch (error: unknown) {
      logError("Error marking form as completed:", error);
      toast.error("Failed to mark form as completed");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForSignatures = async () => {
    if (!formDoc || formDoc.status === "completed" || formDoc.signature_workflow) return;

    try {
      setSaving(true);
      await updateFormDocument(formDocumentId, {
        form_data: formData,
        status: "in_progress",
      });
      setShowSignatureWorkflow(true);
    } catch (error: unknown) {
      logError("Error preparing form for signature routing:", error);
      toast.error("Failed to prepare form for signatures");
    } finally {
      setSaving(false);
    }
  };

  const handleSign = (signature: FormSignature) => {
    if (!workflow) {
      toast.error("Workflow not found");
      return;
    }
    setSelectedSignature({ signature, workflow });
  };

  const handleSigned = () => {
    loadFormDocument();
    setSelectedSignature(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading form...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!formDoc || !template) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            Form document or template not found
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusBadge = {
    draft: { label: "Draft", variant: "outline" as const, icon: FileText },
    in_progress: { label: "In Progress", variant: "default" as const, icon: Clock },
    awaiting_signatures: { label: "Awaiting Signatures", variant: "secondary" as const, icon: PenTool },
    completed: { label: "Completed", variant: "default" as const, icon: CheckCircle2 },
  }[formDoc.status];

  const StatusIcon = statusBadge.icon;

  // Calculate form completion
  const fields = template.structure?.fields || [];
  const workflowCollectedFieldNames = getWorkflowCollectedFieldNames(fields);
  const requiredFields = fields.filter((field) => field.required && !workflowCollectedFieldNames.has(field.name));
  const filledRequiredFields = requiredFields.filter(f => {
    const value = formData[f.name];
    return value !== undefined && value !== null && value !== "";
  });
  const completionPercentage = requiredFields.length > 0
    ? Math.round((filledRequiredFields.length / requiredFields.length) * 100)
    : 100;
  const signatureFields = fields.filter((field) => isSignatureFileField(field));
  const supportsSignatures = signatureFields.length > 0;
  const signedCount = allSignatures.filter((signature) => signature.status === "signed").length;
  const signatureCompletionPercentage = allSignatures.length > 0
    ? (signedCount / allSignatures.length) * 100
    : 0;

  return (
    <div className="space-y-4">
      {/* Compact Header with Status and Actions */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-start gap-2.5 mb-1.5">
                <FileText className="h-4 w-4 text-primary mt-0.5" />
                <div className="min-w-0">
                  <CardTitle className="text-base leading-tight truncate">{formDoc.document.title}</CardTitle>
                  {template && (
                    <CardDescription className="mt-0.5 text-xs truncate">{template.name}</CardDescription>
                  )}
                </div>
              </div>
              {/* Progress Bar */}
              {formDoc.status !== "completed" && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Form Completion</span>
                    <span className="font-medium">{completionPercentage}%</span>
                  </div>
                  <Progress 
                    value={completionPercentage} 
                    className="h-1.5"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {filledRequiredFields.length} of {requiredFields.length} required editable fields completed
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusBadge.variant} className="text-xs h-6">
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusBadge.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-end gap-1.5 flex-wrap">
            <Button 
              onClick={handleSave} 
              disabled={saving || formDoc.status === "completed"}
              size="sm"
              className="h-8 text-xs px-2.5"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Save Form
                </>
              )}
            </Button>

            {formDoc.status === "awaiting_signatures" && pendingSignatures.length > 0 && (
              <Button 
                variant="default" 
                onClick={() => handleSign(pendingSignatures[0])}
                size="sm"
                className="h-8 text-xs px-2.5"
              >
                <PenTool className="h-3.5 w-3.5 mr-1.5" />
                Sign ({pendingSignatures.length} pending)
              </Button>
            )}

            {(formDoc.status === "draft" || formDoc.status === "in_progress") && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setShowForwardDialog(true)}
                  size="sm"
                  className="h-8 text-xs px-2.5"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Forward
                </Button>
                {!formDoc.signature_workflow && supportsSignatures && (
                  <Button 
                    variant="outline" 
                    onClick={handleSubmitForSignatures}
                    size="sm"
                    disabled={saving}
                    className="h-8 text-xs px-2.5"
                  >
                    <PenTool className="h-3.5 w-3.5 mr-1.5" />
                    Submit for Signatures
                  </Button>
                )}
              </>
            )}

            {formDoc.status === "completed" && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleGeneratePdf} 
                  disabled={saving}
                  size="sm"
                  className="h-8 text-xs px-2.5"
                >
                  <FileDown className="h-3.5 w-3.5 mr-1.5" />
                  Generate PDF
                </Button>
              </>
            )}

            {formDoc.status !== "completed" && workflow && workflow.status === "completed" && (
              <Button 
                onClick={handleMarkCompleted} 
                disabled={saving}
                size="sm"
                className="h-8 text-xs px-2.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Mark Completed
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Interface */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <CardHeader className="pb-3">
            <TabsList className="grid w-full grid-cols-4 gap-1">
              <TabsTrigger value="form" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Form Fields</span>
                <span className="sm:hidden">Form</span>
              </TabsTrigger>
              <TabsTrigger value="signatures" className="flex items-center gap-1.5 text-xs sm:text-sm relative">
                <PenTool className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Signatures</span>
                <span className="sm:hidden">Sign</span>
                {pendingSignatures.length > 0 && (
                  <Badge variant="destructive" className="ml-0.5 h-4 min-w-4 px-1 text-[10px] leading-none">
                    {pendingSignatures.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="attachments" className="flex items-center gap-1.5 text-xs sm:text-sm relative">
                <Paperclip className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Documents</span>
                <span className="sm:hidden">Docs</span>
                <div className="flex items-center gap-0.5 ml-0.5">
                  {generatedPdf && (
                    <Badge variant="default" className="h-4 min-w-4 px-1 text-[10px] leading-none bg-green-600">
                      PDF
                    </Badge>
                  )}
                  {supportingDocuments.length > 0 && (
                    <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] leading-none">
                      {supportingDocuments.length}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Timeline
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Form Fields Tab */}
            <TabsContent value="form" className="mt-0 space-y-4">
              <div className="max-h-[calc(100vh-400px)] min-h-[500px] overflow-y-auto overflow-x-hidden pr-2">
                <div className="pr-4 space-y-6">
                  <DynamicFormRenderer
                    template={template}
                    initialData={formData}
                    onChange={setFormData}
                    disabled={formDoc.status === "completed"}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Signatures Tab */}
            <TabsContent value="signatures" className="mt-0 space-y-4 pt-4">
              {pendingSignatures.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Pending Signatures</h3>
                    <Badge variant="outline">{pendingSignatures.length} pending</Badge>
                  </div>
                  {pendingSignatures.map((signature) => (
                    <Card key={signature.id} className="border-l-4 border-l-yellow-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{signature.field_label}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Assigned to: {signature.assigned_to_office_name ||
                                signature.assigned_to_department_name ||
                                signature.assigned_to_division_name ||
                                "Unassigned"}
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handleSign(signature)}
                            className="ml-4"
                          >
                            <PenTool className="h-4 w-4 mr-2" />
                            Sign Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : workflow && allSignatures.length > 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-600 dark:text-green-500" />
                  <p className="text-base font-medium mb-1 text-green-700 dark:text-green-400">All signatures have been completed</p>
                  <p className="text-sm text-muted-foreground mt-2 mb-4">View the Timeline tab for signature history</p>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("timeline")}
                    className="gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    View Timeline
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <PenTool className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-base font-medium mb-1">
                    {supportsSignatures ? "No signature workflow initiated" : "No signature fields configured"}
                  </p>
                  <p className="text-sm mb-6">
                    {supportsSignatures
                      ? "Route the form for signatures to begin the workflow"
                      : "This template has no signature fields. Add signature fields in the form template to enable routing."}
                  </p>
                  {formDoc && supportsSignatures && (formDoc.status === "draft" || formDoc.status === "in_progress") && (
                    <Button
                      variant="default"
                      onClick={() => setShowSignatureWorkflow(true)}
                      className="gap-2"
                    >
                      <PenTool className="h-4 w-4" />
                      Route for Signatures
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Supporting Documents Tab */}
            <TabsContent value="attachments" className="mt-0 space-y-4 pt-4">
              <div className="space-y-4">
                {/* Generated PDF Section */}
                {generatedPdf && (
                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-green-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">Generated PDF (Final Form)</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(generatedPdf.uploadedAt)} • {(generatedPdf.fileSize / 1024).toFixed(1)} KB
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              This PDF contains all form data and signatures. Use "Link Correspondence" button above to attach it to correspondence for dispatch.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {generatedPdf.fileUrl && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewVersion(generatedPdf)}
                                className="gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                View PDF
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  if (!generatedPdf.fileUrl) return;
                                  const link = document.createElement('a');
                                  link.href = generatedPdf.fileUrl;
                                  link.download = generatedPdf.fileName || 'form-document.pdf';
                                  link.click();
                                }}
                                className="gap-2"
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Supporting Documents</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Attach supporting files, receipts, or other documents related to this form
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Note:</strong> Accepted formats: PDF, images, Word, Excel, TXT, CSV. Max file size: 10MB each.
                    </p>
                  </div>
                  {formDoc.status !== "completed" && (
                    <div>
                      <Input
                        ref={supportingFileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv"
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length === 0) return;
                          const invalidTypeFiles = files.filter(
                            (file) => file.type && !ALLOWED_SUPPORTING_DOC_TYPES.includes(file.type)
                          );
                          const oversizedFiles = files.filter(
                            (file) => file.size > MAX_SUPPORTING_DOC_SIZE_BYTES
                          );

                          if (invalidTypeFiles.length > 0) {
                            toast.error(`Unsupported file type: ${invalidTypeFiles[0].name}`);
                            e.target.value = '';
                            return;
                          }

                          if (oversizedFiles.length > 0) {
                            toast.error(`File exceeds 10MB: ${oversizedFiles[0].name}`);
                            e.target.value = '';
                            return;
                          }

                          setUploadingAttachment(true);
                          try {
                            for (const file of files) {
                              const fileUrl = await new Promise<string>((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve(reader.result as string);
                                reader.onerror = reject;
                                reader.readAsDataURL(file);
                              });

                              await createDocumentVersion(documentId, {
                                fileName: file.name,
                                fileType: file.type || 'application/octet-stream',
                                fileSize: file.size,
                                fileUrl,
                                notes: `Supporting document: ${file.name}`,
                              });
                            }
                            toast.success(`${files.length} file(s) uploaded successfully`);
                            await loadFormDocument();
                          } catch (error: unknown) {
                            logError('Error uploading attachment:', error);
                            toast.error('Failed to upload attachment');
                          } finally {
                            setUploadingAttachment(false);
                            // Reset input
                            e.target.value = '';
                          }
                        }}
                        disabled={uploadingAttachment}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingAttachment}
                        className="gap-2"
                        onClick={() => supportingFileInputRef.current?.click()}
                      >
                        {uploadingAttachment ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Upload Documents
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {supportingDocuments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                    <Paperclip className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No supporting documents attached</p>
                    {formDoc.status !== "completed" && (
                      <p className="text-xs mt-1">Upload files to provide supporting evidence</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {supportingDocuments.map((doc) => (
                      <Card key={doc.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Paperclip className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{doc.fileName}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(doc.uploadedAt)} • {(doc.fileSize / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.fileUrl && (
                              <>
                                {(doc.fileType?.startsWith('image/') || doc.fileType === 'application/pdf' || doc.fileName?.toLowerCase().endsWith('.pdf')) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPreviewVersion(doc)}
                                    title="View document"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (!doc.fileUrl) return;
                                    const link = document.createElement('a');
                                    link.href = doc.fileUrl;
                                    link.download = doc.fileName || 'document';
                                    link.click();
                                  }}
                                  title="Download document"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="mt-0 space-y-6 pt-4">
              {/* Signature Workflow Timeline */}
              {workflow && allSignatures.length > 0 ? (
                <div className="space-y-6">
                  {/* Completion Details Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold">Completion Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Form Status</p>
                            <div className="flex items-center gap-2">
                              <StatusIcon className="h-4 w-4" />
                              <p className="text-sm font-medium">{statusBadge.label}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Form Completion</p>
                            <div className="flex items-center gap-2">
                              <Progress value={completionPercentage} className="flex-1 h-2" />
                              <p className="text-sm font-medium">{completionPercentage}%</p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {filledRequiredFields.length} of {requiredFields.length} required editable fields
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Signature Progress</p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">
                                {signedCount} / {allSignatures.length} signed
                              </p>
                            </div>
                            <Progress 
                              value={signatureCompletionPercentage}
                              className="h-2" 
                            />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Supporting Documents</p>
                            <p className="text-sm font-medium">
                              {supportingDocuments.length} document{supportingDocuments.length !== 1 ? 's' : ''}
                              {generatedPdf && ' + 1 PDF'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">Signature Workflow Timeline</h3>
                    <Badge variant="outline">
                      {signedCount} / {allSignatures.length} completed
                    </Badge>
                  </div>
                  <div className="max-h-[600px] overflow-y-auto pr-2">
                    <ol className="relative border-s-2 border-border ml-4 space-y-6">
                      {[...allSignatures]
                        .sort((a, b) => a.order - b.order || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                        .map((signature) => {
                          const isSigned = signature.status === "signed";
                          const isRejected = signature.status === "rejected";
                          const isSkipped = signature.status === "skipped";
                          const isPending = signature.status === "pending";
                          
                          return (
                            <li key={signature.id} className="relative pl-6">
                              <span className={`absolute flex items-center justify-center w-8 h-8 rounded-full -left-4 ring-4 ring-background ${
                                isSigned ? "bg-green-500" : 
                                isRejected ? "bg-red-500" : 
                                isSkipped ? "bg-gray-400" : 
                                "bg-yellow-500"
                              }`}>
                                {isSigned ? (
                                  <CheckCircle2 className="w-4 h-4 text-white" />
                                ) : isRejected ? (
                                  <AlertCircle className="w-4 h-4 text-white" />
                                ) : (
                                  <Clock className="w-4 h-4 text-white" />
                                )}
                              </span>
                              <Card className={`ml-2 ${isPending ? "border-l-4 border-l-yellow-500" : ""}`}>
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 space-y-2">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-sm">{signature.field_label}</h4>
                                        <Badge 
                                          variant={
                                            isSigned ? "default" : 
                                            isRejected ? "destructive" : 
                                            isSkipped ? "secondary" : 
                                            "outline"
                                          }
                                          className="text-xs"
                                        >
                                          {signature.status.charAt(0).toUpperCase() + signature.status.slice(1)}
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-muted-foreground space-y-1">
                                        <p>
                                          <span className="font-medium">Assigned to:</span> {signature.assigned_to_office_name || 
                                            signature.assigned_to_department_name || 
                                            signature.assigned_to_division_name || 
                                            "Unassigned"}
                                        </p>
                                        {isSigned && signature.signed_by_name && (
                                          <p><span className="font-medium">Signed by:</span> {signature.signed_by_name}</p>
                                        )}
                                        {isSigned && signature.signer_name && (
                                          <p><span className="font-medium">Signer:</span> {signature.signer_name} {signature.signer_pn && `(${signature.signer_pn})`}</p>
                                        )}
                                        {isSigned && signature.signer_designation && (
                                          <p><span className="font-medium">Designation:</span> {signature.signer_designation}</p>
                                        )}
                                        {isSigned && signature.signed_date && (
                                          <p><span className="font-medium">Date:</span> {formatDateShort(signature.signed_date)}</p>
                                        )}
                                        {isSigned && signature.signed_at && (
                                          <p><span className="font-medium">Time:</span> {formatDateTime(signature.signed_at)}</p>
                                        )}
                                        {isRejected && signature.rejection_reason && (
                                          <p className="text-destructive"><span className="font-medium">Reason:</span> {signature.rejection_reason}</p>
                                        )}
                                        {isSkipped && (
                                          <p className="italic">This signature was skipped</p>
                                        )}
                                        {isPending && (
                                          <p className="text-yellow-600 dark:text-yellow-400 font-medium">Awaiting signature</p>
                                        )}
                                      </div>
                                    </div>
                                    {isPending && workflow && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleSign(signature)}
                                        className="ml-4"
                                      >
                                        <PenTool className="h-3 w-3 mr-1" />
                                        Sign
                                      </Button>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </li>
                          );
                        })}
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                  <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-base font-medium mb-1">No signature workflow started</p>
                  <p className="text-sm mb-6">Submit this form for signatures to start the timeline.</p>
                  {formDoc && supportsSignatures && (formDoc.status === "draft" || formDoc.status === "in_progress") && (
                    <Button
                      variant="default"
                      onClick={handleSubmitForSignatures}
                      className="gap-2"
                    >
                      <PenTool className="h-4 w-4" />
                      Submit for Signatures
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Signature Workflow Dialog */}
      {showSignatureWorkflow && formDoc && template && (
        <SignatureWorkflowDialog
          open={showSignatureWorkflow}
          onOpenChange={setShowSignatureWorkflow}
          submission={{
            id: formDocumentId, // Will be replaced with actual submission ID
            template: template,
            data: formData,
            is_draft: false,
            createdAt: formDoc.created_at || new Date().toISOString(),
            updatedAt: formDoc.updated_at || new Date().toISOString(),
          }}
          onWorkflowCreated={async (workflowId) => {
            try {
              // The workflow was created with a submission_id
              // We need to link it to the form document
              await updateFormDocument(formDocumentId, {
                signature_workflow_id: workflowId,
                status: "awaiting_signatures",
              });
              await loadFormDocument();
              setShowSignatureWorkflow(false);
              toast.success("Signature workflow created successfully");
            } catch (error: unknown) {
              logError("Error linking workflow:", error);
              toast.error("Failed to link signature workflow");
            }
          }}
        />
      )}

      {/* Forward Form Dialog */}
      {formDoc && (
        <ForwardFormDialog
          open={showForwardDialog}
          onOpenChange={setShowForwardDialog}
          form={formDoc as FormDocumentType}
          onForwarded={async () => {
            await loadFormDocument();
            setShowForwardDialog(false);
          }}
        />
      )}

      {/* Signature Dialog */}
      {selectedSignature && (
        <FormSignatureDialog
          open={!!selectedSignature}
          onOpenChange={(open) => !open && setSelectedSignature(null)}
          signature={selectedSignature.signature}
          workflow={selectedSignature.workflow}
          onSigned={handleSigned}
        />
      )}

      {/* PDF Preview Modal */}
      {previewVersion && (
        <DocumentVersionPreviewModal
          version={previewVersion}
          isOpen={!!previewVersion}
          onClose={() => setPreviewVersion(null)}
        />
      )}
    </div>
  );
}
