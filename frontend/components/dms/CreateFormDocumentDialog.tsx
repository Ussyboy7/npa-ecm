"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { logError, logInfo } from '@/lib/client-logger';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getFormTemplates } from "@/lib/api/forms";
import { createFormDocument } from "@/lib/api/dms-forms";
import { queryDocuments } from "@/lib/dms-storage";
import { toast } from "sonner";
import { FileText, Loader2, FileCheck } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { FormTemplate } from "@/lib/types/forms";

interface CreateFormDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (documentId: string) => void;
  initialTemplate?: FormTemplate | null;
}

export function CreateFormDocumentDialog({
  open,
  onOpenChange,
  onComplete,
  initialTemplate,
}: CreateFormDocumentDialogProps) {
  const { currentUser } = useCurrentUser();
  const { divisions, departments } = useOrganization();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [divisionId, setDivisionId] = useState<string | undefined>(currentUser?.division);
  const [departmentId, setDepartmentId] = useState<string | undefined>(currentUser?.department);
  const [checkingReferenceNumber, setCheckingReferenceNumber] = useState(false);
  const [referenceNumberExists, setReferenceNumberExists] = useState(false);
  const titleTouchedRef = useRef(false);
  
  // Filter departments based on selected division
  const filteredDepartments = useMemo(() => {
    if (!divisionId) return departments.filter((d) => d.isActive);
    return departments.filter((d) => d.isActive && d.divisionId === divisionId);
  }, [divisionId, departments]);
  
  // Clear department when division changes
  useEffect(() => {
    if (divisionId && departmentId) {
      const dept = departments.find((d) => d.id === departmentId);
      if (dept && dept.divisionId !== divisionId) {
        setDepartmentId(undefined);
      }
    }
  }, [divisionId, departmentId, departments]);
  
  // Check for duplicate reference numbers
  useEffect(() => {
    if (!referenceNumber.trim()) {
      setReferenceNumberExists(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCheckingReferenceNumber(true);
      try {
        const result = await queryDocuments({ 
          page: 1, 
          pageSize: 100,
          search: referenceNumber.trim(),
        });
        const exists = result.results.some((doc) => 
          doc.referenceNumber?.toLowerCase() === referenceNumber.trim().toLowerCase()
        );
        setReferenceNumberExists(exists);
      } catch (_error: unknown) {
        // Silently fail - duplicate check is optional
      } finally {
        setCheckingReferenceNumber(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [referenceNumber]);

  useEffect(() => {
    if (open) {
      loadTemplates();
      setDivisionId(currentUser?.division);
      setDepartmentId(currentUser?.department);
      // If an initial template is provided, pre-select it
      if (initialTemplate) {
        setSelectedTemplateId(initialTemplate.id);
        setTitle(initialTemplate.name);
      }
    }
    // Don't reset state in useEffect - it causes blocking
    // State will be reset when dialog opens next time if needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialTemplate, currentUser?.division, currentUser?.department]);
  
  // Reset state only when dialog closes, with a delay
  useEffect(() => {
    if (!open) {
      // Reset state after dialog is fully closed
      const timer = setTimeout(() => {
        setSelectedTemplateId("");
        setTitle("");
        setDescription("");
        setReferenceNumber("");
        setReferenceNumberExists(false);
        setCheckingReferenceNumber(false);
        setDivisionId(currentUser?.division);
        setDepartmentId(currentUser?.department);
        titleTouchedRef.current = false;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open, currentUser?.division, currentUser?.department]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getFormTemplates({ is_active: true });
      setTemplates(data);
      // Only auto-select first template if no initial template is provided
      if (data.length > 0 && !selectedTemplateId && !initialTemplate) {
        setSelectedTemplateId(data[0].id);
        setTitle(data[0].name);
      }
      } catch (error: unknown) {
      logError("Error loading templates:", error);
      toast.error("Failed to load form templates");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedTemplateId) {
      toast.error("Please select a form template");
      return;
    }

    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (referenceNumberExists) {
      toast.error("This reference number already exists. Please use a unique reference number.");
      return;
    }

    try {
      logInfo('[FormDialog] Creating form document...', { selectedTemplateId, title, divisionId, departmentId });
      setCreating(true);
      
      const formDoc = await createFormDocument({
        template_id: selectedTemplateId,
        title: title.trim(),
        description: description.trim() || undefined,
        reference_number: referenceNumber.trim() || undefined,
        division_id: divisionId,
        department_id: departmentId,
        status: "draft",
      });

      logInfo('[FormDialog] Form document created successfully:', formDoc);
      toast.success("Form document created successfully");
      onComplete(formDoc.document.id);
      onOpenChange(false);
      
      // Reset form
      setTitle("");
      setDescription("");
      setReferenceNumber("");
      setSelectedTemplateId("");
    } catch (error: unknown) {
      logError("[FormDialog] Error creating form document:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'object' &&
              error !== null &&
              'error' in error &&
              typeof (error as { error?: unknown }).error === 'string'
            ? (error as { error: string }).error
            : "Failed to create form document";
      logError("[FormDialog] Error details:", { error, errorMessage });
      toast.error(errorMessage);
    } finally {
      logInfo('[FormDialog] Finished creating form document');
      setCreating(false);
    }
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" height="fill">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Start Form
          </DialogTitle>
          <DialogDescription>
            Start a new form from a template. Fill in the details below to begin.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-200px)] sm:max-h-[60vh] pr-2 sm:pr-4">
          <div className="space-y-4 sm:space-y-6">
            {/* Template Selection */}
            <div className="space-y-2">
              <Label htmlFor="template" className="text-sm font-medium">
                Form Template <span className="text-destructive">*</span>
              </Label>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading templates...
                </div>
              ) : (
                <Select
                  value={selectedTemplateId}
                  onValueChange={(value) => {
                    setSelectedTemplateId(value);
                    const template = templates.find((t) => t.id === value);
                    if (template && !titleTouchedRef.current) {
                      setTitle(template.name);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a form template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <span className="font-medium">{template.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedTemplate && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedTemplate.description || "No description available"}
                </p>
              )}
            </div>

            <Separator />

            {/* Document Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">Document Details</h3>
              
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => {
                    titleTouchedRef.current = true;
                    setTitle(e.target.value);
                  }}
                  placeholder="Enter form document title"
                  aria-required="true"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={3}
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground">
                  {description.length}/2000 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference" className="text-sm font-medium">Reference Number</Label>
                <div className="relative">
                  <Input
                    id="reference"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Optional reference (e.g. NPA/MOPS/2024/045)"
                    className={referenceNumberExists ? "border-destructive" : ""}
                    maxLength={100}
                  />
                  {checkingReferenceNumber && (
                    <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {referenceNumberExists && (
                  <p className="text-xs text-destructive" role="alert">
                    This reference number already exists. Please use a unique reference number.
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Organization */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">Organization</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="division" className="text-sm font-medium">Division</Label>
                  <Select 
                    value={divisionId || "__none__"} 
                    onValueChange={(v) => {
                      setDivisionId(v === "__none__" ? undefined : v);
                      // Clear department when division changes
                      if (v === "__none__") {
                        setDepartmentId(undefined);
                      } else {
                        if (departmentId) {
                          const dept = departments.find((d) => d.id === departmentId);
                          if (dept && dept.divisionId !== v) {
                            setDepartmentId(undefined);
                          }
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {divisions
                        .filter((d) => d.isActive)
                        .map((division) => (
                          <SelectItem key={division.id} value={division.id}>
                            {division.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="text-sm font-medium">Department</Label>
                  <Select
                    value={departmentId || "__none__"}
                    onValueChange={(v) => setDepartmentId(v === "__none__" ? undefined : v)}
                    disabled={!divisionId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={divisionId ? "Select department" : "Select division first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {filteredDepartments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!divisionId && (
                    <p className="text-xs text-muted-foreground">
                      Select a division first to choose a department
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || checkingReferenceNumber || referenceNumberExists || !selectedTemplateId || !title.trim()}
            className="w-full sm:w-auto"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">Creating...</span>
                <span className="sm:hidden">Creating...</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Start Form</span>
                <span className="sm:hidden">Start</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
