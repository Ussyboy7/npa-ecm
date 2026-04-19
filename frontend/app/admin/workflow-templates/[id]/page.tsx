"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { WorkflowTemplateForm } from "@/components/admin/WorkflowTemplateForm";
import { WorkflowStepsBuilder } from "@/components/admin/WorkflowStepsBuilder";
import {
  getWorkflowTemplate,
  createWorkflowTemplate,
  updateWorkflowTemplate,
} from "@/lib/api/workflow";
import { toast } from "@/hooks/use-toast";
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

  if (loading) {
    return (
      <DashboardLayout>
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
      </DashboardLayout>
    );
  }

  const currentTemplateId = template?.id || (isNew ? undefined : id);

  return (
    <DashboardLayout>
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
                  <h1 className="text-3xl font-bold">
                    {isNew ? "Create Workflow Template" : isClone ? "Clone Workflow Template" : "Edit Workflow Template"}
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1">
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
                size="lg"
                className="shrink-0"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : isNew || isClone ? "Create Template" : "Save Changes"}
              </Button>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Template Form */}
            <Card className="lg:sticky lg:top-6 lg:self-start">
              <CardHeader>
                <CardTitle>Template Details</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure the basic information for this workflow template
                </p>
              </CardHeader>
              <CardContent>
                <WorkflowTemplateForm
                  template={template}
                  onChange={setFormData}
                  errors={errors}
                />
              </CardContent>
            </Card>

            {/* Steps Builder */}
            <Card>
              <CardHeader>
                <CardTitle>Workflow Steps</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Define the sequence of approval steps for this workflow
                </p>
              </CardHeader>
              <CardContent>
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
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Template to Continue
                      </Button>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Workflow Preview Section */}
          {template && template.steps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Workflow Preview</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Visual overview of the complete workflow sequence
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {template.steps
                    .sort((a, b) => a.order - b.order)
                    .map((step, index) => {
                      const isLast = index === template.steps.length - 1;
                      return (
                        <div key={step.id} className="relative">
                          <div className="flex items-start gap-4 p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                              {step.order}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-base mb-1">{step.title}</div>
                              <div className="text-sm text-muted-foreground space-y-1">
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
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {step.required_role && (
                                      <span className="text-xs px-2 py-1 bg-secondary rounded">
                                        Role: {step.required_role}
                                      </span>
                                    )}
                                    {step.required_grade_level && (
                                      <span className="text-xs px-2 py-1 bg-secondary rounded">
                                        Grade: {step.required_grade_level}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {!isLast && (
                            <div className="flex justify-center -my-1">
                              <div className="w-0.5 h-6 bg-border"></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}
      </div>
    </DashboardLayout>
  );
}

// Wrap in Suspense for useSearchParams
export default function WorkflowTemplateEditorPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </DashboardLayout>
    }>
      <WorkflowTemplateEditorPageContent />
    </Suspense>
  );
}

