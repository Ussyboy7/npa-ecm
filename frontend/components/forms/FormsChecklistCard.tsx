"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Plus, Eye, Download, CheckCircle2, Clock, FileDown, Send } from "lucide-react";
import {
  getFormSubmissionsByCorrespondence,
  getFormTemplates,
  createFormSubmission,
  submitFormSubmission,
  getFormSubmissionPdfUrl,
} from "@/lib/api/forms";
import { DynamicFormRenderer } from "./DynamicFormRenderer";
import { SignatureWorkflowDialog } from "./SignatureWorkflowDialog";
import { toast } from "sonner";
import type { FormTemplate, FormSubmission } from "@/lib/types/forms";
import { formatDateTime } from "@/lib/correspondence-helpers";

interface FormsChecklistCardProps {
  correspondenceId: string;
}

export function FormsChecklistCard({ correspondenceId }: FormsChecklistCardProps) {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [viewingSubmission, setViewingSubmission] = useState<FormSubmission | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showSignatureWorkflow, setShowSignatureWorkflow] = useState(false);
  const [selectedSubmissionForWorkflow, setSelectedSubmissionForWorkflow] = useState<FormSubmission | null>(null);

  useEffect(() => {
    loadData();
  }, [correspondenceId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesData, submissionsData] = await Promise.all([
        getFormTemplates({ is_active: true }),
        getFormSubmissionsByCorrespondence(correspondenceId),
      ]);
      // Ensure data is always an array
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      setSubmissions(Array.isArray(submissionsData) ? submissionsData : []);
    } catch (error) {
      console.error("Error loading forms data:", error);
      toast.error("Failed to load forms and checklists");
      setTemplates([]);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setFormData({});
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    if (!selectedTemplate) return false;

    const errors: Record<string, string> = {};
    const fields = selectedTemplate.structure?.fields || [];

    for (const field of fields) {
      // Skip validation for signature-related fields - they'll be collected through workflow
      const isSignatureRelatedField = 
        field.type === "file" && field.name.toLowerCase().includes("signature") ||
        field.name.toLowerCase().includes("signature") ||
        (field.name.toLowerCase().includes("_name") && (
          field.name.toLowerCase().includes("pm_") ||
          field.name.toLowerCase().includes("procurement_") ||
          field.name.toLowerCase().includes("audit_")
        )) ||
        field.name.toLowerCase().includes("_pn") ||
        field.name.toLowerCase().includes("_designation") ||
        field.name.toLowerCase().includes("personnel");
      
      if (isSignatureRelatedField) {
        continue;
      }
      
      if (field.required && !formData[field.name]) {
        errors[field.name] = `${field.label} is required`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitForm = async (asDraft = false) => {
    if (!selectedTemplate) return;

    if (!asDraft && !validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSubmitting(true);
      const submission = await createFormSubmission({
        template_id: selectedTemplate.id,
        correspondence_id: correspondenceId,
        data: formData,
        is_draft: asDraft,
      });

      // If form was created as draft, we don't need to do anything
      // If form was created as submitted (is_draft: false), it's already submitted
      // Only call submitFormSubmission if we need to convert a draft to submitted
      // But in this case, we create it directly as submitted, so no need to call submit

      toast.success(asDraft ? "Form saved as draft" : "Form submitted successfully");
      setSelectedTemplate(null);
      setFormData({});
      loadData(); // Reload submissions
    } catch (error) {
      console.error("Error submitting form:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to submit form";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewSubmission = (submission: FormSubmission) => {
    setViewingSubmission(submission);
  };

  const handleSubmitDraft = async (submissionId: string) => {
    try {
      await submitFormSubmission(submissionId);
      toast.success("Form submitted successfully");
      setViewingSubmission(null);
      loadData();
    } catch (error) {
      console.error("Error submitting draft:", error);
      toast.error("Failed to submit form");
    }
  };

  const getSubmissionStatus = (submission: FormSubmission) => {
    if (submission.is_draft) {
      return { label: "Draft", variant: "outline" as const, icon: Clock };
    }
    return { label: "Submitted", variant: "default" as const, icon: CheckCircle2 };
  };

  const availableTemplates = templates.filter(
    (template) => !submissions.some((s) => s.template.id === template.id && !s.is_draft)
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Forms & Checklists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Forms & Checklists
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Submitted Forms */}
          {submissions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Attached Forms</h4>
              <div className="space-y-2">
                {submissions.map((submission) => {
                  const status = getSubmissionStatus(submission);
                  const StatusIcon = status.icon;
                  return (
                    <div
                      key={submission.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <StatusIcon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{submission.template.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {submission.is_draft
                              ? "Draft"
                              : submission.submitted_at
                              ? `Submitted ${formatDateTime(submission.submitted_at)}`
                              : "Submitted"}
                          </div>
                        </div>
                        <Badge variant={status.variant} className="text-xs">
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        {!submission.is_draft && submission.template.slug === "project-monitoring-report-audit" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSubmissionForWorkflow(submission);
                                setShowSignatureWorkflow(true);
                              }}
                              title="Route for signatures"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const pdfUrl = getFormSubmissionPdfUrl(submission.id);
                                window.open(pdfUrl, "_blank");
                              }}
                              title="View PDF"
                            >
                              <FileDown className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewSubmission(submission)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available Templates */}
          {availableTemplates.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Available Forms</h4>
              <div className="space-y-2">
                {availableTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{template.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {template.description}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs mr-2">
                      {template.category_display || template.category}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {submissions.length === 0 && availableTemplates.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No forms or checklists available.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Submission Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[95vh]">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedTemplate?.name}</DialogTitle>
            {selectedTemplate?.description && (
              <p className="text-sm text-muted-foreground mt-1">{selectedTemplate.description}</p>
            )}
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="p-1">
              {selectedTemplate && (
                <DynamicFormRenderer
                  template={selectedTemplate}
                  initialData={formData}
                  onChange={setFormData}
                  errors={formErrors}
                />
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedTemplate(null);
                setFormData({});
                setFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSubmitForm(true)}
              disabled={submitting}
            >
              Save Draft
            </Button>
            <Button onClick={() => handleSubmitForm(false)} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Form"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Submission Dialog */}
      <Dialog
        open={!!viewingSubmission}
        onOpenChange={(open) => !open && setViewingSubmission(null)}
      >
        <DialogContent className="max-w-4xl max-h-[95vh]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {viewingSubmission?.template.name}
              {viewingSubmission?.is_draft && (
                <Badge variant="outline" className="ml-2">Draft</Badge>
              )}
            </DialogTitle>
            {viewingSubmission?.template.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {viewingSubmission.template.description}
              </p>
            )}
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="p-1">
              {viewingSubmission && (
                <DynamicFormRenderer
                  template={viewingSubmission.template}
                  initialData={viewingSubmission.data}
                  disabled={true}
                />
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingSubmission(null)}>
              Close
            </Button>
            {viewingSubmission?.is_draft && (
              <Button onClick={() => handleSubmitDraft(viewingSubmission.id)}>
                Submit Form
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signature Workflow Dialog */}
      {selectedSubmissionForWorkflow && (
        <SignatureWorkflowDialog
          open={showSignatureWorkflow}
          onOpenChange={setShowSignatureWorkflow}
          submission={selectedSubmissionForWorkflow}
          onWorkflowCreated={() => {
            loadData();
            setShowSignatureWorkflow(false);
            setSelectedSubmissionForWorkflow(null);
          }}
        />
      )}
    </>
  );
}

