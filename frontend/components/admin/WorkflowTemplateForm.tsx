"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { WorkflowTemplateFormData, AppliesTo } from "@/lib/types/workflow";

interface WorkflowTemplateFormProps {
  template?: {
    id: string;
    name: string;
    slug: string;
    description: string;
    applies_to: AppliesTo;
    is_active: boolean;
    created_by: { id: string; username: string; email: string; first_name: string; last_name: string } | null;
  } | null;
  onChange: (data: WorkflowTemplateFormData) => void;
  errors?: Record<string, string>;
}

export function WorkflowTemplateForm({ template, onChange, errors = {} }: WorkflowTemplateFormProps) {
  const [formData, setFormData] = useState<WorkflowTemplateFormData>({
    name: "",
    slug: "",
    description: "",
    applies_to: "correspondence",
    is_active: true,
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        slug: template.slug,
        description: template.description,
        applies_to: template.applies_to,
        is_active: template.is_active,
      });
    } else {
      setFormData({
        name: "",
        slug: "",
        description: "",
        applies_to: "correspondence",
        is_active: true,
      });
    }
  }, [template]);

  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => {
      const newSlug = prev.slug || generateSlug(name);
      return { ...prev, name, slug: template ? prev.slug : newSlug };
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">
          Template Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g., Contract Approval Workflow"
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
          disabled={!!template}
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
          placeholder="Describe what this workflow template is used for..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="applies_to">
          Applies To <span className="text-destructive">*</span>
        </Label>
        <Select
          value={formData.applies_to}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, applies_to: value as AppliesTo }))
          }
        >
          <SelectTrigger id="applies_to">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="correspondence">Correspondence</SelectItem>
            <SelectItem value="document">Document</SelectItem>
          </SelectContent>
        </Select>
        {errors.applies_to && <p className="text-sm text-destructive">{errors.applies_to}</p>}
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="is_active">Active</Label>
          <p className="text-xs text-muted-foreground">
            Only active templates can be used in new workflows
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

      {template?.created_by && (
        <div className="text-sm text-muted-foreground">
          Created by: {template.created_by.first_name} {template.created_by.last_name} (
          {template.created_by.email})
        </div>
      )}
    </div>
  );
}

