"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save } from "lucide-react";
import {
  getFormTemplate,
  createFormTemplate,
  updateFormTemplate,
} from "@/lib/api/forms";
import { toast } from "sonner";
import type { FormTemplate, FormField } from "@/lib/types/forms";
import { FormBuilder } from "@/components/forms/FormBuilder";
import { logError } from "@/lib/client-logger";

export default function FormTemplateEditorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    category: "general" as FormTemplate["category"],
    is_active: true,
    structure: {
      fields: [] as FormField[],
    },
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isNew) {
      loadTemplate();
    }
  }, [id, isNew]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const data = await getFormTemplate(id);
      setTemplate(data);
      setFormData({
        name: data.name,
        slug: data.slug,
        description: data.description || "",
        category: data.category,
        is_active: data.is_active,
        structure: data.structure || { fields: [] },
      });
      } catch (error: unknown) {
      logError("Error loading template:", error);
      toast.error("Failed to load form template");
      router.push("/admin/form-templates");
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Template name is required";
    }

    if (!formData.slug.trim() && !isNew) {
      newErrors.slug = "Slug is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setSaving(true);
    try {
      const templateData = {
        ...formData,
        slug: formData.slug || generateSlug(formData.name),
      };

      if (isNew) {
        const newTemplate = await createFormTemplate(templateData);
        toast.success("Form template created successfully");
        router.replace(`/admin/form-templates/${newTemplate.id}`);
        // Don't call loadTemplate here as it will fail - just update the state
        setTemplate(newTemplate);
        setFormData({
          name: newTemplate.name,
          slug: newTemplate.slug,
          description: newTemplate.description || "",
          category: newTemplate.category,
          is_active: newTemplate.is_active,
          structure: newTemplate.structure || { fields: [] },
        });
      } else {
        await updateFormTemplate(id, templateData);
        toast.success("Form template updated successfully");
        loadTemplate();
      }
      } catch (error: unknown) {
      logError("Error saving template:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Loading form template...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin/form-templates")}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {isNew ? "Create Form Template" : "Edit Form Template"}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                {isNew
                  ? "Create a new reusable form template"
                  : "Edit form template details and structure"}
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} size="lg" className="shrink-0">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : isNew ? "Create Template" : "Save Changes"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Configure the basic information for this form template
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                Template Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    name,
                    slug: isNew ? generateSlug(name) : prev.slug,
                  }));
                }}
                placeholder="e.g., Procurement Request Form"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="auto-generated-from-name"
                disabled={!isNew}
                className={errors.slug ? "border-destructive" : ""}
              />
              {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier. Auto-generated from name for new templates.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this form template is used for..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value as FormTemplate["category"] }))
                }
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="procurement">Procurement</SelectItem>
                  <SelectItem value="audit">Audit</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Only active templates can be used in forms
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_active: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Form Structure</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Define the fields and structure for this form template
            </p>
          </CardHeader>
          <CardContent>
            <FormBuilder
              fields={formData.structure?.fields || []}
              onChange={(fields) =>
                setFormData((prev) => ({
                  ...prev,
                  structure: { ...prev.structure, fields },
                }))
              }
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

