"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Plus, X, CheckCircle2 } from "lucide-react";
import { getFormTemplates, createFormSubmission } from "@/lib/api/forms";
import { DynamicFormRenderer } from "./DynamicFormRenderer";
import { toast } from "sonner";
import type { FormTemplate } from "@/lib/types/forms";

interface FormSelectorProps {
  correspondenceId?: string;
  onFormSubmitted?: (submissionId: string) => void;
}

export function FormSelector({ correspondenceId, onFormSubmitted }: FormSelectorProps) {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedForms, setSubmittedForms] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getFormTemplates({ is_active: true });
      // Ensure data is always an array
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.error("Failed to load form templates");
      setTemplates([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "procurement", label: "Procurement" },
    { value: "audit", label: "Audit" },
    { value: "finance", label: "Finance" },
    { value: "general", label: "General" },
  ];

  const filteredTemplates = selectedCategory === "all"
    ? templates
    : templates.filter((t) => t.category === selectedCategory);

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

      if (!asDraft) {
        setSubmittedForms((prev) => new Set([...prev, selectedTemplate.id]));
        toast.success("Form submitted successfully");
        onFormSubmitted?.(submission.id);
      } else {
        toast.success("Form saved as draft");
      }

      setSelectedTemplate(null);
      setFormData({});
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to submit form");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading form templates...</div>
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
            Forms & Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No form templates available in this category.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{template.name}</h4>
                        {submittedForms.has(template.id) && (
                          <Badge variant="outline" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Submitted
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {template.category_display || template.category}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
    </>
  );
}

