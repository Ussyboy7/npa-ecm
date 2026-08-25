"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { appType } from "@/lib/app-type";
import { WorkflowTemplateForm } from "@/components/admin/WorkflowTemplateForm";
import { WorkflowStepsBuilder } from "@/components/admin/WorkflowStepsBuilder";
import {
  getWorkflowTemplate,
  createWorkflowTemplate,
  updateWorkflowTemplate,
} from "@/lib/api/workflow";
import { toast } from "@/components/ui/sonner";
import type { WorkflowTemplate, WorkflowTemplateFormData } from "@/lib/types/workflow";
import { logError } from "@/lib/client-logger";

function WorkflowTemplateEditorPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const isNew = id === "new";
  const isClone = searchParams.get("clone") === "true";

  const [template, setTemplate] = useState<WorkflowTemplate | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<WorkflowTemplateFormData>({
    name: "",
    slug: "",
    description: "",
    applies_to: "correspondence",
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isNew && !isClone) {
      loadTemplate();
    } else if (isClone && id !== "new") {
      loadTemplateForClone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew, isClone]);

  const loadTemplate = async (templateId?: string) => {
    const targetId = templateId || id;
    if (!targetId || targetId === "new") return;
    
    try {
      setLoading(true);
      const data = await getWorkflowTemplate(targetId);
      setTemplate(data);
      setFormData({
        name: data.name,
        slug: data.slug,
        description: data.description,
        applies_to: data.applies_to,
        is_active: data.is_active,
      });
      } catch (error: unknown) {
      logError("Error loading template:", error);
      toast({
        title: "Error",
        description: "Failed to load workflow template",
        variant: "destructive",
      });
      if (!isNew && !isClone) {
        router.push("/admin/workflow-templates");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateForClone = async () => {
    try {
      setLoading(true);
      const data = await getWorkflowTemplate(id);
      setTemplate({
        ...data,
        id: "",
        name: `Copy of ${data.name}`,
        slug: "",
      });
      setFormData({
        name: `Copy of ${data.name}`,
        slug: "",
        description: data.description,
        applies_to: data.applies_to,
        is_active: data.is_active,
      });
      } catch (error: unknown) {
      logError("Error loading template for clone:", error);
      toast({
        title: "Error",
        description: "Failed to load template for cloning",
        variant: "destructive",
      });
      router.push("/admin/workflow-templates");
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Template name is required";
    }

    if (!formData.slug?.trim() && !isNew && !isClone) {
      newErrors.slug = "Slug is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (isNew || isClone) {
        const newTemplate = await createWorkflowTemplate(formData);
        toast({
          title: "Success",
          description: "Workflow template created successfully",
        });
        // Update URL and reload with new ID
        router.replace(`/admin/workflow-templates/${newTemplate.id}`);
        // Load the full template with steps
        await loadTemplate(newTemplate.id);
      } else {
        await updateWorkflowTemplate(id, formData);
        toast({
          title: "Success",
          description: "Workflow template updated successfully",
        });
        loadTemplate();
      }
      } catch (error: unknown) {
      logError("Error saving template:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStepsChange = (steps: WorkflowTemplate['steps']) => {
    if (template) {
      setTemplate({ ...template, steps });
    }
  };

  return (
    <>
      {loading ? (
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Loading workflow template...</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="container mx-auto p-6 space-y-6">
          {/* Header Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => router.push("/admin/workflow-templates")}
                  className="shrink-0"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className={appType.pageTitleList}>
                    {isNew ? "Create Workflow Template" : isClone ? "Clone Workflow Template" : "Edit Workflow Template"}
                  </h1>
                  <p className={cn(appType.pageSubtitle)}>
                    {isNew
                      ? "Create a new reusable workflow template"
                      : isClone
                      ? "Clone an existing template"
                      : "Edit workflow template details and steps"}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                size="compact"
                className="shrink-0"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : isNew || isClone ? "Create Template" : "Save Changes"}
              </Button>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border/60 lg:sticky lg:top-6 lg:self-start">
              <div className="border-b border-border/60 px-4 py-3">
                <h2 className="text-sm font-medium">Template Details</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Configure the basic information for this workflow template
                </p>
              </div>
              <div className="p-4">
                <WorkflowTemplateForm
                  template={template}
                  onChange={setFormData}
                  errors={errors}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/60">
              <div className="border-b border-border/60 px-4 py-3">
                <h2 className="text-sm font-medium">Workflow Steps</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Define the sequence of approval steps for this workflow
                </p>
              </div>
              <div className="p-4">
                {template?.id ? (
                  <WorkflowStepsBuilder
                    templateId={template.id}
                    steps={template?.steps || []}
                    onStepsChange={handleStepsChange}
                  />
                ) : (
                  <div className="text-center py-12 space-y-4">
                    <div className="text-muted-foreground">
                      {isNew || isClone
                        ? "Save the template first to add workflow steps"
                        : "Loading template..."}
                    </div>
                    {isNew || isClone ? (
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        variant="outline"
                        size="compact"
                      >
                        <Save className="h-4 w-4" />
                        Save Template to Continue
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>

          {template && template.steps.length > 0 && (
            <div className="rounded-xl border border-border/60">
              <div className="border-b border-border/60 px-4 py-3">
                <h2 className="text-sm font-medium">Workflow Preview</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Visual overview of the complete workflow sequence
                </p>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {template.steps
                    .sort((a, b) => a.order - b.order)
                    .map((step, index) => {
                      const isLast = index === template.steps.length - 1;
                      return (
                        <div key={step.id} className="relative">
                          <div className="flex items-start gap-4 rounded-lg border border-border/60 bg-muted/20 p-4">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                              {step.order}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 text-base font-semibold">{step.title}</div>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <div>
                                  {step.office
                                    ? "Specific Office"
                                    : step.directorate
                                    ? "Directorate Level"
                                    : step.division
                                    ? "Division Level"
                                    : step.department
                                    ? "Department Level"
                                    : "No selection"}
                                </div>
                                {(step.required_role || step.required_grade_level) && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {step.required_role && (
                                      <span className="rounded bg-secondary px-2 py-1 text-xs">
                                        Role: {step.required_role}
                                      </span>
                                    )}
                                    {step.required_grade_level && (
                                      <span className="rounded bg-secondary px-2 py-1 text-xs">
                                        Grade: {step.required_grade_level}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {!isLast && (
                            <div className="-my-1 flex justify-center">
                              <div className="h-6 w-0.5 bg-border"></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
      </div>
      )}
    </>
  );
}

// Wrap in Suspense for useSearchParams
export default function WorkflowTemplateEditorPage() {
  return (
    <Suspense fallback={
      <>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </>
    }>
      <WorkflowTemplateEditorPageContent />
    </Suspense>
  );
}

