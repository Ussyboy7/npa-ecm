"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { FormTemplate, FormField } from "@/lib/types/forms";
import { cn } from "@/lib/utils";

interface DynamicFormRendererProps {
  template: FormTemplate;
  initialData?: Record<string, unknown>;
  onChange?: (data: Record<string, unknown>) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export function DynamicFormRenderer({
  template,
  initialData = {},
  onChange,
  errors = {},
  disabled = false,
}: DynamicFormRendererProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  // Validate form fields
  useEffect(() => {
    const newErrors: Record<string, string> = {};
    const fields = template.structure?.fields || [];
    
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
  }, [formData, template]);

  const handleFieldChange = (fieldName: string, value: unknown) => {
    const newData = { ...formData, [fieldName]: value };
    setFormData(newData);
    onChange?.(newData);
  };

  const renderField = (field: FormField) => {
    const fieldValue = formData[field.name];
    const fieldError = errors[field.name] || validationErrors[field.name];
    const isRequired = field.required ?? false;
    const isFilled = fieldValue !== undefined && fieldValue !== null && fieldValue !== "";
    const showValidation = !disabled && (fieldError || (isRequired && !isFilled));

    // Check if this field is part of signature workflow (signature-related fields)
    const isSignatureRelatedField = 
      field.name.toLowerCase().includes("signature") ||
      field.name.toLowerCase().includes("_name") && (
        field.name.toLowerCase().includes("pm_") ||
        field.name.toLowerCase().includes("procurement_") ||
        field.name.toLowerCase().includes("audit_")
      ) ||
      field.name.toLowerCase().includes("_pn") ||
      field.name.toLowerCase().includes("_designation") ||
      field.name.toLowerCase().includes("personnel");

    const baseProps = {
      id: field.id,
      disabled,
      className: fieldError ? "border-destructive" : "",
    };

    // If this is a signature-related field, show message instead of input
    if (isSignatureRelatedField && field.type !== "file") {
      return (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={field.id}>
            {field.label}
            {isRequired && <span className="text-destructive ml-1">*</span>}
          </Label>
          <div className="border rounded-md p-4 bg-muted/30">
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
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              {...baseProps}
              type={field.type}
              value={(fieldValue as string) || ""}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
            />
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
          </div>
        );

      case "textarea":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              {...baseProps}
              value={(fieldValue as string) || ""}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              rows={4}
            />
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
          </div>
        );

      case "number":
      case "currency":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
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
              placeholder={field.placeholder}
              min={field.validation?.min}
              max={field.validation?.max}
            />
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
          </div>
        );

      case "date":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              {...baseProps}
              type="date"
              value={(fieldValue as string) || ""}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            />
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
          </div>
        );

      case "datetime":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              {...baseProps}
              type="datetime-local"
              value={(fieldValue as string) || ""}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            />
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
          </div>
        );

      case "select":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={(fieldValue as string) || undefined}
              onValueChange={(value) => handleFieldChange(field.name, value)}
              disabled={disabled}
            >
              <SelectTrigger id={field.id} className={fieldError ? "border-destructive" : ""}>
                <SelectValue placeholder={field.placeholder || "Select an option"} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
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
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={Array.isArray(fieldValue) ? fieldValue.join(",") : undefined}
              onValueChange={(value) => {
                const values = value ? value.split(",") : [];
                handleFieldChange(field.name, values);
              }}
              disabled={disabled}
            >
              <SelectTrigger id={field.id} className={fieldError ? "border-destructive" : ""}>
                <SelectValue placeholder={field.placeholder || "Select options"} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
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
          <div key={field.id} className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={(fieldValue as boolean) || false}
              onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
              disabled={disabled}
            />
            <Label
              htmlFor={field.id}
              className={cn("font-normal", isRequired && "after:content-['*'] after:text-destructive after:ml-1")}
            >
              {field.label}
            </Label>
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
          </div>
        );

      case "radio":
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <RadioGroup
              value={(fieldValue as string) || undefined}
              onValueChange={(value) => handleFieldChange(field.name, value)}
              disabled={disabled}
            >
              {field.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
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
        // Check if this is a signature field
        const isSignatureField = field.name.toLowerCase().includes("signature");
        
        if (isSignatureField) {
          // For signature fields, show a message instead of file upload
          // Signatures will be collected through the workflow system
          return (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id}>
                {field.label}
                {isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              <div className="border rounded-md p-4 bg-muted/30">
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
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              {...baseProps}
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                handleFieldChange(field.name, file);
              }}
            />
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  const fields = template.structure?.fields || [];
  const sections = template.structure?.sections || [];
  const layout = template.structure?.layout || "single";

  // Create a map of field names to field objects for quick lookup
  const fieldMap = new Map(fields.map((f) => [f.name, f]));

  // If sections are defined, render by sections
  if (sections.length > 0) {
    return (
      <div className="space-y-8">
        {sections.map((section) => {
          // Get fields for this section
          const sectionFields = section.fields
            .map((fieldName) => fieldMap.get(fieldName))
            .filter((field): field is FormField => field !== undefined);

          if (sectionFields.length === 0 && section.id !== "certification") {
            return null;
          }

          return (
            <div key={section.id} className="space-y-4">
              {/* Section Header */}
              {section.title && (
                <div className="border-b pb-2">
                  <h3 className="text-lg font-semibold text-foreground">{section.title}</h3>
                </div>
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
                  "space-y-4",
                  layout === "multi-column" && "grid grid-cols-1 md:grid-cols-2 gap-4"
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
    <div className={cn("space-y-6", layout === "multi-column" && "grid grid-cols-1 md:grid-cols-2 gap-6")}>
      {fields.map((field) => renderField(field))}
    </div>
  );
}

