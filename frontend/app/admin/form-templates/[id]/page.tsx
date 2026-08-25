"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { appType } from "@/lib/app-type";
import {
  getFormTemplate,
  createFormTemplate,
  updateFormTemplate,
} from "@/lib/api/forms";
import { toast } from "@/components/ui/sonner";
import type { FormTemplate, FormField } from "@/lib/types/forms";
import { FormBuilder } from "@/components/forms/FormBuilder";
import { logError } from "@/lib/client-logger";

export default function FormTemplateEditorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [_template, setTemplate] = useState<FormTemplate | null>(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      router.push("/admin/templates-hub");
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

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Loading form template...</p>
            </div>
          </div>
        ) : (
          <>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin/templates-hub")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className={appType.pageTitleList}>
                {isNew ? "Create Form Template" : "Edit Form Template"}
              </h1>
              <p className={cn(appType.pageSubtitle)}>
                {isNew
                  ? "Create a new reusable form template"
                  : "Edit form template details and structure"}
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} size="compact" className="shrink-0">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : isNew ? "Create Template" : "Save Changes"}
          </Button>
        </div>

        <div className="rounded-xl border border-border/60">
          <div className="border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-medium">Template Details</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Configure the basic information for this form template
            </p>
          </div>
          <div className="space-y-6 p-4">
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
          </div>
        </div>

        <div className="rounded-xl border border-border/60">
          <div className="border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-medium">Form Structure</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Define the fields and structure for this form template
            </p>
          </div>
          <div className="p-4">
            <FormBuilder
              fields={formData.structure?.fields || []}
              onChange={(fields) =>
                setFormData((prev) => ({
                  ...prev,
                  structure: { ...prev.structure, fields },
                }))
              }
            />
          </div>
        </div>
          </>
      )}
      </div>
    </>
  );
}

