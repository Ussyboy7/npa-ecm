"use client";

import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { FormTemplate, FormField } from "@/lib/types/forms";
import { getWorkflowCollectedFieldNames, isSignatureFileField } from "@/lib/forms/field-classification";
import { cn } from "@/lib/utils";

interface DynamicFormRendererProps {
  template: FormTemplate;
  initialData?: Record<string, unknown>;
  onChange?: (data: Record<string, unknown>) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

type RawOption = unknown;

const normalizeOptions = (field: FormField): Array<{ key: string; value: string; label: string }> => {
  const rawOptions = Array.isArray(field.options) ? (field.options as RawOption[]) : [];

  return rawOptions
    .map((option, index) => {
      if (typeof option === "string") {
        const normalized = option.trim();
        if (!normalized) return null;
        return {
          key: `${field.id}-${normalized}-${index}`,
          value: normalized,
          label: normalized,
        };
      }

      if (option && typeof option === "object") {
        const candidate = option as { value?: unknown; label?: unknown };
        const value = typeof candidate.value === "string" ? candidate.value.trim() : "";
        const label = typeof candidate.label === "string" ? candidate.label.trim() : "";
        const resolvedValue = value || label;
        const resolvedLabel = label || value;
        if (!resolvedValue) return null;
        return {
          key: `${field.id}-${resolvedValue}-${index}`,
          value: resolvedValue,
          label: resolvedLabel || resolvedValue,
        };
      }

      return null;
    })
    .filter((option): option is { key: string; value: string; label: string } => option !== null);
};

export function DynamicFormRenderer({
  template,
  initialData = {},
  onChange,
  errors = {},
  disabled = false,
}: DynamicFormRendererProps) {
  const fields = useMemo(() => template.structure?.fields || [], [template]);
  const layout = useMemo(() => template.structure?.layout || "single", [template]);
  const workflowCollectedFieldNames = getWorkflowCollectedFieldNames(fields);
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setFormData(initialData);
    setTouchedFields({});
  }, [initialData]);

  // Validate form fields
  useEffect(() => {
    const newErrors: Record<string, string> = {};
    
    fields.forEach((field) => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
      }
      
      // Additional validation based on field type
      if (formData[field.name]) {
        const value = formData[field.name];
        
        if (field.type === "email" && typeof value === "string" && !value.includes("@")) {
          newErrors[field.name] = "Please enter a valid email address";
        }
        
        if (field.type === "number" && field.validation) {
          const numValue = Number(value);
          if (field.validation.min !== undefined && numValue < field.validation.min) {
            newErrors[field.name] = `Value must be at least ${field.validation.min}`;
          }
          if (field.validation.max !== undefined && numValue > field.validation.max) {
            newErrors[field.name] = `Value must be at most ${field.validation.max}`;
          }
        }
      }
    });
    
    setValidationErrors(newErrors);
  }, [formData, template, fields]);

  const markFieldTouched = (fieldName: string) => {
    setTouchedFields((prev) => (prev[fieldName] ? prev : { ...prev, [fieldName]: true }));
  };

  const handleFieldChange = (fieldName: string, value: unknown, touch = false) => {
    const newData = { ...formData, [fieldName]: value };
    setFormData(newData);
    if (touch) {
      markFieldTouched(fieldName);
    }
    onChange?.(newData);
  };

  const renderField = (field: FormField) => {
    const fieldValue = formData[field.name];
    const fieldError = errors[field.name] || (touchedFields[field.name] ? validationErrors[field.name] : undefined);
    const isRequired = field.required ?? false;

    const isSignatureField = isSignatureFileField(field);
    const isWorkflowCollectedField = workflowCollectedFieldNames.has(field.name);
    const normalizedOptions = normalizeOptions(field);
    const isWideField =
      field.type === "textarea" || field.type === "file" || field.type === "radio" || field.type === "checkbox";
    const fieldContainerClass = cn(
      "space-y-1.5",
      layout === "multi-column" && isWideField && "md:col-span-2"
    );
    const fieldLabelClass = "text-sm leading-5 min-h-5 inline-flex items-center";

    const baseProps = {
      id: field.id,
      disabled,
      className: fieldError ? "border-destructive" : "",
    };

    // If this is a signature-related field, show message instead of input
    if (isWorkflowCollectedField && !isSignatureField) {
      return (
        <div key={field.id} className={fieldContainerClass}>
          <Label htmlFor={field.id}>
            {field.label}
            {isRequired && <span className="text-destructive ml-1">*</span>}
          </Label>
          <div className="border rounded-md p-3 bg-muted/30">
            <p className="text-sm text-muted-foreground">
              {disabled
                ? "This information will be collected from the signer through the workflow system."
                : "This information will be collected from the signer when they provide their signature through the workflow system. You do not need to fill it here."}
            </p>
          </div>
          {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
        </div>
      );
    }

    switch (field.type) {
      case "text":
      case "email":
      case "url":
        return (
          <div key={field.id} className={fieldContainerClass}>
            <Label htmlFor={field.id} className={fieldLabelClass}>
            {field.label}
            {isRequired && <span className="text-destructive ml-1">*</span>}
          </Label>
            <Input
              {...baseProps}
              type={field.type}
              value={(fieldValue as string) || ""}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => markFieldTouched(field.name)}
              placeholder={field.placeholder}
            />
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
          </div>
        );

      case "textarea":
        return (
          <div key={field.id} className={fieldContainerClass}>
            <Label htmlFor={field.id} className={fieldLabelClass}>
              {field.label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              {...baseProps}
              value={(fieldValue as string) || ""}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => markFieldTouched(field.name)}
              placeholder={field.placeholder}
              rows={4}
            />
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
          </div>
        );

      case "number":
      case "currency":
        return (
          <div key={field.id} className={fieldContainerClass}>
            <Label htmlFor={field.id} className={fieldLabelClass}>
              {field.label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              {...baseProps}
              type="number"
              value={(fieldValue as number) || ""}
              onChange={(e) => {
                const numValue = e.target.value ? parseFloat(e.target.value) : undefined;
                handleFieldChange(field.name, numValue);
              }}
              onBlur={() => markFieldTouched(field.name)}
              placeholder={field.placeholder}
              min={field.validation?.min}
              max={field.validation?.max}
            />
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
          </div>
        );

      case "date":
        return (
          <div key={field.id} className={fieldContainerClass}>
            <Label htmlFor={field.id} className={fieldLabelClass}>
              {field.label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              {...baseProps}
              type="date"
              value={(fieldValue as string) || ""}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => markFieldTouched(field.name)}
            />
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
          </div>
        );

      case "datetime":
        return (
          <div key={field.id} className={fieldContainerClass}>
            <Label htmlFor={field.id} className={fieldLabelClass}>
              {field.label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              {...baseProps}
              type="datetime-local"
              value={(fieldValue as string) || ""}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => markFieldTouched(field.name)}
            />
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
          </div>
        );

      case "select":
        return (
          <div key={field.id} className={fieldContainerClass}>
            <Label htmlFor={field.id} className={fieldLabelClass}>
              {field.label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={(fieldValue as string) || undefined}
              onValueChange={(value) => handleFieldChange(field.name, value, true)}
              disabled={disabled}
            >
              <SelectTrigger id={field.id} className={fieldError ? "border-destructive" : ""}>
                <SelectValue placeholder={field.placeholder || "Select an option"} />
              </SelectTrigger>
              <SelectContent>
                {normalizedOptions.map((option) => (
                  <SelectItem key={option.key} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
          </div>
        );

      case "multiselect":
        return (
          <div key={field.id} className={fieldContainerClass}>
            <Label htmlFor={field.id} className={fieldLabelClass}>
              {field.label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={Array.isArray(fieldValue) ? fieldValue.join(",") : undefined}
              onValueChange={(value) => {
                const values = value ? value.split(",") : [];
                handleFieldChange(field.name, values, true);
              }}
              disabled={disabled}
            >
              <SelectTrigger id={field.id} className={fieldError ? "border-destructive" : ""}>
                <SelectValue placeholder={field.placeholder || "Select options"} />
              </SelectTrigger>
              <SelectContent>
                {normalizedOptions.map((option) => (
                  <SelectItem key={option.key} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
          </div>
        );

      case "checkbox":
        return (
          <div key={field.id} className={fieldContainerClass}>
            <div className="flex items-center space-x-2 min-h-9 rounded-md border border-border/60 bg-muted/20 px-3">
            <Checkbox
              id={field.id}
              checked={(fieldValue as boolean) || false}
              onCheckedChange={(checked) => handleFieldChange(field.name, checked, true)}
              disabled={disabled}
            />
            <Label
              htmlFor={field.id}
              className={cn("font-normal text-sm", isRequired && "after:content-['*'] after:text-destructive after:ml-1")}
            >
              {field.label}
            </Label>
            </div>
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
          </div>
        );

      case "radio":
        return (
          <div key={field.id} className={fieldContainerClass}>
            <Label className={fieldLabelClass}>
              {field.label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <RadioGroup
              value={(fieldValue as string) || undefined}
              onValueChange={(value) => handleFieldChange(field.name, value, true)}
              disabled={disabled}
            >
              {normalizedOptions.map((option) => (
                <div key={option.key} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`${field.id}_${option.value}`} />
                  <Label htmlFor={`${field.id}_${option.value}`} className="font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
          </div>
        );

      case "file":
        if (isSignatureField) {
          // For signature fields, show a message instead of file upload
          // Signatures will be collected through the workflow system
          return (
            <div key={field.id} className={fieldContainerClass}>
              <Label htmlFor={field.id} className={fieldLabelClass}>
                {field.label}
                {isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              <div className="border rounded-md p-3 bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  {disabled 
                    ? "Signature will be collected through the workflow system after form submission."
                    : "This signature will be collected through the workflow system after you submit this form. You do not need to upload it here."}
                </p>
              </div>
              {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
            </div>
          );
        }
        
        // For non-signature file fields, show normal file upload
        return (
          <div key={field.id} className={fieldContainerClass}>
            <Label htmlFor={field.id} className={fieldLabelClass}>
              {field.label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              {...baseProps}
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                handleFieldChange(field.name, file, true);
              }}
              onBlur={() => markFieldTouched(field.name)}
            />
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
          </div>
        );

      default:
        return null;
    }
  };
  const sections = template.structure?.sections || [];

  // Resolve section field references by both field ID and field name.
  const fieldMap = new Map<string, FormField>();
  fields.forEach((field) => {
    fieldMap.set(field.id, field);
    fieldMap.set(field.name, field);
  });

  // If sections are defined, render by sections
  if (sections.length > 0) {
    return (
      <div className="space-y-5">
        {sections.map((section) => {
          // Get fields for this section
          const sectionFields = section.fields
            .map((fieldName) => fieldMap.get(fieldName))
            .filter((field): field is FormField => field !== undefined);

          if (sectionFields.length === 0 && section.id !== "certification") {
            return null;
          }

          return (
            <div key={section.id} className="rounded-lg border bg-card/60 p-4 space-y-4">
              {/* Section Header */}
              {section.title && (
                <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
              )}

              {/* Certification Statement (special handling) */}
              {section.id === "certification" && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground italic">
                    We hereby certified that the Project was executed in accordance with the terms
                    of the Letter of Award of the Contract.
                  </p>
                </div>
              )}

              {/* Section Fields */}
              <div
                className={cn(
                  layout === "multi-column"
                    ? "grid grid-cols-1 md:grid-cols-2 gap-3"
                    : "space-y-3"
                )}
              >
                {sectionFields.map((field) => renderField(field))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback: render all fields if no sections defined
  return (
    <div
      className={cn(
        layout === "multi-column"
          ? "grid grid-cols-1 md:grid-cols-2 gap-3"
          : "space-y-3"
      )}
    >
      {fields.map((field) => renderField(field))}
    </div>
  );
}
