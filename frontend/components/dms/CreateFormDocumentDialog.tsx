"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getFormTemplates } from "@/lib/api/forms";
import { createFormDocument } from "@/lib/api/dms-forms";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";
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

  useEffect(() => {
    if (open) {
      loadTemplates();
      // If an initial template is provided, pre-select it
      if (initialTemplate) {
        setSelectedTemplateId(initialTemplate.id);
        setTitle(initialTemplate.name);
      }
    } else {
      // Reset when dialog closes
      setSelectedTemplateId("");
      setTitle("");
      setDescription("");
      setReferenceNumber("");
    }
  }, [open, initialTemplate]);

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
    } catch (error) {
      console.error("Error loading templates:", error);
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

    try {
      console.log('[FormDialog] Creating form document...', { selectedTemplateId, title, divisionId, departmentId });
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

      console.log('[FormDialog] Form document created successfully:', formDoc);
      toast.success("Form document created successfully");
      onComplete(formDoc.document.id);
      onOpenChange(false);
      
      // Reset form
      setTitle("");
      setDescription("");
      setReferenceNumber("");
      setSelectedTemplateId("");
    } catch (error: any) {
      console.error("[FormDialog] Error creating form document:", error);
      const errorMessage = error?.message || error?.error || "Failed to create form document";
      console.error("[FormDialog] Error details:", { error, errorMessage, stack: error?.stack });
      toast.error(errorMessage);
    } finally {
      console.log('[FormDialog] Finished creating form document');
      setCreating(false);
    }
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Form Document</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template">Form Template *</Label>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading templates...</div>
              ) : (
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a form template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{template.name}</span>
                          {template.description && (
                            <span className="text-xs text-muted-foreground">
                              {template.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedTemplate && (
                <p className="text-xs text-muted-foreground">
                  {selectedTemplate.description || "No description"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter form document title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reference">Reference Number</Label>
                <Input
                  id="reference"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Optional reference"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="division">Division</Label>
                <Select 
                  value={divisionId || "__none__"} 
                  onValueChange={(v) => setDivisionId(v === "__none__" ? undefined : v)}
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
                <Label htmlFor="department">Department</Label>
                <Select
                  value={departmentId || "__none__"}
                  onValueChange={(v) => setDepartmentId(v === "__none__" ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {departments
                      .filter((d) => d.isActive && (!divisionId || d.divisionId === divisionId))
                      .map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !selectedTemplateId || !title.trim()}>
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Create Form
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

