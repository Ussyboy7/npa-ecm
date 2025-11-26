"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { DynamicFormRenderer } from "@/components/forms/DynamicFormRenderer";
import { SignatureWorkflowDialog } from "@/components/forms/SignatureWorkflowDialog";
import { FormSignatureDialog } from "@/components/forms/FormSignatureDialog";
import { getFormTemplates, getFormTemplate } from "@/lib/api/forms";
import {
  getFormDocument,
  updateFormDocument,
  generateFormDocumentPdf,
  markFormDocumentCompleted,
  type FormDocument,
} from "@/lib/api/dms-forms";
import {
  getSignatures,
  getSignatureWorkflow,
  signForm,
  createFormSubmission,
} from "@/lib/api/forms";
import type { FormSignature, FormSignatureWorkflow } from "@/lib/types/forms";
import { toast } from "sonner";
import { FileText, PenTool, CheckCircle2, Clock, FileDown, Loader2, Link as LinkIcon, AlertCircle, CheckCircle, Paperclip, Upload, X, Download } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { LinkDocumentDialog } from "@/components/correspondence/LinkDocumentDialog";
import { formatDateTime } from "@/lib/correspondence-helpers";
import type { FormTemplate } from "@/lib/types/forms";
import { createDocumentVersion, type DocumentVersion } from "@/lib/dms-storage";
import { Input } from "@/components/ui/input";

interface FormDocumentEditorProps {
  documentId: string;
  formDocumentId: string;
}

export function FormDocumentEditor({ documentId, formDocumentId }: FormDocumentEditorProps) {
  const { currentUser } = useCurrentUser();
  const [formDoc, setFormDoc] = useState<FormDocument | null>(null);
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
  const [showLinkCorrespondence, setShowLinkCorrespondence] = useState(false);
  const [allSignatures, setAllSignatures] = useState<FormSignature[]>([]);
  const [supportingDocuments, setSupportingDocuments] = useState<DocumentVersion[]>([]);
  const [generatedPdf, setGeneratedPdf] = useState<DocumentVersion | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("form");

  useEffect(() => {
    loadFormDocument();
  }, [formDocumentId]);

  const loadFormDocument = async () => {
    try {
      console.log('[FormDocumentEditor] Loading form document:', formDocumentId);
      setLoading(true);
      
      console.log('[FormDocumentEditor] Calling getFormDocument...');
      const doc = await Promise.race([
        getFormDocument(formDocumentId),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
        )
      ]) as FormDocument;
      
      console.log('[FormDocumentEditor] Received form document:', { id: doc.id, template: doc.template });
      setFormDoc(doc);
      setFormData(doc.form_data || {});

      if (doc.template?.id) {
        console.log('[FormDocumentEditor] Loading template:', doc.template.id);
        const templateData = await getFormTemplate(doc.template.id);
        console.log('[FormDocumentEditor] Template loaded:', templateData.name);
        setTemplate(templateData);
      } else {
        console.warn('[FormDocumentEditor] No template ID found in form document');
      }

      // Load signature workflow if exists
      if (doc.signature_workflow?.id) {
        console.log('[FormDocumentEditor] Loading signature workflow:', doc.signature_workflow.id);
        const workflowData = await getSignatureWorkflow(doc.signature_workflow.id);
        setWorkflow(workflowData);

        // Load all signatures (pending and completed)
        const allSigs = await getSignatures({ workflow: workflowData.id });
        const pendingSigs = allSigs.filter(sig => sig.status === "pending");
        console.log('[FormDocumentEditor] Pending signatures:', pendingSigs.length);
        console.log('[FormDocumentEditor] Total signatures:', allSigs.length);
        setPendingSignatures(pendingSigs);
        setAllSignatures(allSigs);

        // Auto-generate PDF if all signatures are complete and no PDF exists yet
        if (pendingSigs.length === 0 && allSigs.length > 0) {
          const hasPdfVersion = doc.document.versions?.some((v: any) => 
            v.file_type === 'application/pdf' && (v.notes?.includes('Generated PDF') || v.notes?.includes('Auto-generated'))
          );
          if (!hasPdfVersion && doc.status === "awaiting_signatures") {
            // Auto-generate PDF
            try {
              await generateFormDocumentPdf(formDocumentId);
              console.log('[FormDocumentEditor] Auto-generated PDF after all signatures completed');
              // Reload to get updated document
              await loadFormDocument();
            } catch (error) {
              console.error('[FormDocumentEditor] Failed to auto-generate PDF:', error);
              // Don't show error toast - user can generate manually
            }
          }
        }
      }

      // Load supporting documents and generated PDF
      if (doc.document.versions) {
        // Map versions to DocumentVersion format
        const mappedVersions = doc.document.versions.map((v: any) => ({
          id: v.id,
          documentId: documentId,
          versionNumber: v.version_number ?? 1,
          fileName: v.file_name ?? 'file',
          fileType: v.file_type ?? 'application/octet-stream',
          fileSize: v.file_size ?? 0,
          fileUrl: v.file_url,
          uploadedBy: v.uploaded_by?.id ? String(v.uploaded_by.id) : String(v.uploaded_by ?? ''),
          uploadedAt: v.uploaded_at ?? new Date().toISOString(),
          notes: v.notes,
        })) as DocumentVersion[];
        
        // Find generated PDF (PDF with notes about being generated)
        const pdfVersion = mappedVersions.find(v => 
          v.fileType === 'application/pdf' && 
          (v.notes?.toLowerCase().includes('generated') || v.notes?.toLowerCase().includes('auto-generated'))
        );
        setGeneratedPdf(pdfVersion || null);
        
        // Supporting documents are non-PDFs or PDFs marked as attachments
        const attachments = mappedVersions.filter(v => 
          v.id !== pdfVersion?.id && (
            v.fileType !== 'application/pdf' || 
            v.notes?.toLowerCase().includes('supporting') || 
            v.notes?.toLowerCase().includes('attachment')
          )
        );
        setSupportingDocuments(attachments);
      }
      
      console.log('[FormDocumentEditor] Finished loading form document');
    } catch (error: any) {
      console.error("[FormDocumentEditor] Error loading form document:", error);
      const errorMessage = error?.message || "Failed to load form document";
      console.error("[FormDocumentEditor] Error details:", { error, errorMessage, stack: error?.stack });
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
    } catch (error) {
      console.error("Error saving form:", error);
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
      toast.success("PDF generated successfully");
      await loadFormDocument();
    } catch (error) {
      console.error("Error generating PDF:", error);
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
    } catch (error) {
      console.error("Error marking form as completed:", error);
      toast.error("Failed to mark form as completed");
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
  const requiredFields = fields.filter(f => f.required);
  const filledRequiredFields = requiredFields.filter(f => {
    const value = formData[f.name];
    return value !== undefined && value !== null && value !== "";
  });
  const completionPercentage = requiredFields.length > 0
    ? Math.round((filledRequiredFields.length / requiredFields.length) * 100)
    : 100;

  return (
    <div className="space-y-4">
      {/* Compact Header with Status and Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">{formDoc.document.title}</CardTitle>
                  {template && (
                    <CardDescription className="mt-0.5">{template.name}</CardDescription>
                  )}
                </div>
              </div>
              {/* Progress Bar */}
              {formDoc.status !== "completed" && (
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Form Completion</span>
                    <span className="font-medium">{completionPercentage}%</span>
                  </div>
                  <Progress 
                    value={completionPercentage} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {filledRequiredFields.length} of {requiredFields.length} required fields completed
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Badge variant={statusBadge.variant} className="text-sm">
                <StatusIcon className="h-3 w-3 mr-1.5" />
                {statusBadge.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              onClick={handleSave} 
              disabled={saving || formDoc.status === "completed"}
              size="sm"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Save Form
                </>
              )}
            </Button>

            {formDoc.status === "awaiting_signatures" && pendingSignatures.length > 0 && (
              <Button 
                variant="default" 
                onClick={() => handleSign(pendingSignatures[0])}
                size="sm"
              >
                <PenTool className="h-4 w-4 mr-2" />
                Sign ({pendingSignatures.length} pending)
              </Button>
            )}

            {(formDoc.status === "draft" || formDoc.status === "in_progress") && !formDoc.signature_workflow && (
              <Button 
                variant="outline" 
                onClick={() => setShowSignatureWorkflow(true)}
                size="sm"
              >
                <PenTool className="h-4 w-4 mr-2" />
                Route for Signatures
              </Button>
            )}

            {formDoc.status === "completed" && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleGeneratePdf} 
                  disabled={saving}
                  size="sm"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Generate PDF
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowLinkCorrespondence(true)}
                  size="sm"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Link Correspondence
                </Button>
              </>
            )}

            {formDoc.status !== "completed" && workflow && workflow.status === "completed" && (
              <Button 
                onClick={handleMarkCompleted} 
                disabled={saving}
                size="sm"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
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
            <TabsList className="grid w-full max-w-xl grid-cols-4">
              <TabsTrigger value="form" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Form Fields
              </TabsTrigger>
              <TabsTrigger value="signatures" className="flex items-center gap-2">
                <PenTool className="h-4 w-4" />
                Signatures
                {pendingSignatures.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                    {pendingSignatures.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="attachments" className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Supporting Documents
                {supportingDocuments.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                    {supportingDocuments.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent>
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
            <TabsContent value="signatures" className="mt-0 space-y-4">
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
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">All signatures have been completed</p>
                  <p className="text-xs mt-1">View the Timeline tab for signature history</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <PenTool className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No signature workflow initiated</p>
                  <p className="text-xs mt-1">Route the form for signatures to begin the workflow</p>
                </div>
              )}
            </TabsContent>

            {/* Supporting Documents Tab */}
            <TabsContent value="attachments" className="mt-0 space-y-4">
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
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => window.open(generatedPdf.fileUrl, '_blank')}
                              className="gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Download PDF
                            </Button>
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
                      <strong>Note:</strong> Form versions are used to store the final PDF (auto-generated when all signatures complete) and supporting documents. The PDF is saved as a version and can be linked to correspondence for dispatch.
                    </p>
                  </div>
                  {formDoc.status !== "completed" && (
                    <label className="cursor-pointer">
                      <Input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length === 0) return;

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
                          } catch (error) {
                            console.error('Error uploading attachment:', error);
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
                    </label>
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(doc.fileUrl, '_blank')}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
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
            <TabsContent value="timeline" className="mt-0">
              {workflow && allSignatures.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Signature Workflow Timeline</h3>
                    <Badge variant="outline">
                      {allSignatures.filter(s => s.status === "signed").length} / {allSignatures.length} completed
                    </Badge>
                  </div>
                  <div className="max-h-[600px] overflow-y-auto pr-2">
                    <ol className="relative border-s-2 border-border ml-4 space-y-6">
                      {allSignatures
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
                                  <CheckCircle className="w-4 h-4 text-white" />
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
                                          <p><span className="font-medium">Date:</span> {new Date(signature.signed_date).toLocaleDateString()}</p>
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
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No signature workflow timeline available</p>
                  <p className="text-xs mt-1">Start a signature workflow to see the timeline</p>
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
            } catch (error) {
              console.error("Error linking workflow:", error);
              toast.error("Failed to link signature workflow");
            }
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
    </div>
  );
}

