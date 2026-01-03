"use client";

import { useState, useEffect } from "react";
import { logError, logWarn, logInfo } from '@/lib/client-logger';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { HierarchySelector } from "./HierarchySelector";
import { OfficeSelector } from "./OfficeSelector";
import { useOrganization } from "@/contexts/OrganizationContext";
import { getGradeLevels } from "@/lib/npa-structure";
import type { WorkflowStep, WorkflowStepFormData, StepSelectionMode } from "@/lib/types/workflow";

interface WorkflowStepFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step?: WorkflowStep | null;
  templateId: string;
  order: number;
  onSave: (data: WorkflowStepFormData) => Promise<void>;
}

export function WorkflowStepForm({
  open,
  onOpenChange,
  step,
  templateId,
  order,
  onSave,
}: WorkflowStepFormProps) {
  const { roles } = useOrganization();
  const [formData, setFormData] = useState<WorkflowStepFormData>({
    template: templateId,
    order,
    title: "",
    required_role: "",
    required_grade_level: "",
    selection_mode: "hierarchy",
    directorate: null,
    division: null,
    department: null,
    office: null,
    requires_all_assistants: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const gradeLevels = getGradeLevels();

  useEffect(() => {
    if (step && open) {
      // Determine selection mode based on step data
      const selectionMode: StepSelectionMode = step.office ? "office" : "hierarchy";
      
      setFormData({
        template: templateId,
        order: step.order,
        title: step.title,
        required_role: step.required_role || "",
        required_grade_level: step.required_grade_level || "",
        selection_mode: selectionMode,
        directorate: step.directorate || null,
        division: step.division || null,
        department: step.department || null,
        office: step.office || null,
        requires_all_assistants: step.requires_all_assistants,
      });
    } else if (open) {
      // New step
      setFormData({
        template: templateId,
        order,
        title: "",
        required_role: "",
        required_grade_level: "",
        selection_mode: "hierarchy",
        directorate: null,
        division: null,
        department: null,
        office: null,
        requires_all_assistants: false,
      });
    }
    setErrors({});
  }, [step, open, templateId, order]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Step title is required";
    }

    // Validate that at least one selection method is chosen
    if (formData.selection_mode === "hierarchy") {
      if (!formData.directorate && !formData.division && !formData.department) {
        newErrors.selection = "Please select at least one hierarchy level (directorate, division, or department)";
      }
    } else if (formData.selection_mode === "office") {
      if (!formData.office) {
        newErrors.office = "Please select an office";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error: unknown) {
      logError("Error saving step:", error);
      setErrors({ submit: error instanceof Error ? error.message : "Failed to save step" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectionModeChange = (mode: StepSelectionMode) => {
    setFormData((prev) => ({
      ...prev,
      selection_mode: mode,
      // Clear the other selection when switching modes
      directorate: mode === "office" ? null : prev.directorate,
      division: mode === "office" ? null : prev.division,
      department: mode === "office" ? null : prev.department,
      office: mode === "hierarchy" ? null : prev.office,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{step ? "Edit Workflow Step" : "Add Workflow Step"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">
              Step Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Registry Review, GM Approval"
              className={errors.title ? "border-destructive" : ""}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label>Selection Method</Label>
            <RadioGroup
              value={formData.selection_mode}
              onValueChange={(value) => handleSelectionModeChange(value as StepSelectionMode)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hierarchy" id="hierarchy" />
                <Label htmlFor="hierarchy" className="font-normal cursor-pointer">
                  Hierarchy Level (Directorate → Division → Department)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="office" id="office" />
                <Label htmlFor="office" className="font-normal cursor-pointer">
                  Specific Office
                </Label>
              </div>
            </RadioGroup>
          </div>

          {formData.selection_mode === "hierarchy" ? (
            <div className="space-y-2">
              <Label>Hierarchy Selection</Label>
              <HierarchySelector
                directorateId={formData.directorate || null}
                divisionId={formData.division || null}
                departmentId={formData.department || null}
                onDirectorateChange={(id) =>
                  setFormData((prev) => ({ ...prev, directorate: id || undefined }))
                }
                onDivisionChange={(id) =>
                  setFormData((prev) => ({ ...prev, division: id || undefined }))
                }
                onDepartmentChange={(id) =>
                  setFormData((prev) => ({ ...prev, department: id || undefined }))
                }
              />
              {errors.selection && (
                <p className="text-sm text-destructive">{errors.selection}</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <OfficeSelector
                officeId={formData.office || null}
                onOfficeChange={(id) =>
                  setFormData((prev) => ({ ...prev, office: id || undefined }))
                }
              />
              {errors.office && <p className="text-sm text-destructive">{errors.office}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="required_role">Required Role (Optional)</Label>
              <Select
                value={formData.required_role || undefined}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, required_role: value || undefined }))
                }
              >
                <SelectTrigger id="required_role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles
                    .filter((r) => r.isActive)
                    .map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="required_grade_level">Required Grade Level (Optional)</Label>
              <Select
                value={formData.required_grade_level || undefined}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, required_grade_level: value || undefined }))
                }
              >
                <SelectTrigger id="required_grade_level">
                  <SelectValue placeholder="Select grade level" />
                </SelectTrigger>
                <SelectContent>
                  {gradeLevels.map((grade) => (
                    <SelectItem key={grade.code} value={grade.code}>
                      {grade.name} ({grade.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="requires_all_assistants"
              checked={formData.requires_all_assistants}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, requires_all_assistants: checked === true }))
              }
            />
            <Label htmlFor="requires_all_assistants" className="font-normal cursor-pointer">
              Requires all assistants to approve
            </Label>
          </div>

          {errors.submit && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {errors.submit}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : step ? "Update Step" : "Add Step"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

