"use client";

import React, { forwardRef } from "react";
import { useFormValidation, UseFormValidationOptions } from "@/lib/validation/useFormValidation";
import FormField, { FormFieldProps } from "./FormField";
import { ValidationRule } from "@/lib/validation/validationRules";
import AccessibleButton from "@/components/ui/accessible/AccessibleButton";

export interface FormFieldConfig extends Omit<FormFieldProps, "error" | "onChange" | "onBlur" | "value"> {
  name: string;
  validation?: ValidationRule[];
}

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  fields: FormFieldConfig[];
  validationOptions: UseFormValidationOptions;
  onSubmit: (data: Record<string, string | number | boolean | File | null>) => Promise<void> | void;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  isLoading?: boolean;
  showCancelButton?: boolean;
  className?: string;
}

const Form = forwardRef<HTMLFormElement, FormProps>(({
  fields,
  validationOptions,
  onSubmit,
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  onCancel,
  isLoading = false,
  showCancelButton = false,
  className = "",
  ...formProps
}, ref) => {
  const {
    formData,
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
    getFieldError,
    hasFieldError,
    isFormValid,
    isSubmitting,
    fieldStates
  } = useFormValidation(validationOptions);

  // Don't render until fieldStates are initialized
  if (!fieldStates || Object.keys(fieldStates).length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.name} className="mb-4 w-full">
              <div className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </div>
              <div className="animate-pulse bg-gray-200 h-10 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit(onSubmit);
  };

  return (
    <form
      ref={ref}
      onSubmit={handleFormSubmit}
      className={`space-y-6 ${className}`}
      noValidate
      {...formProps}
    >
      <div className="space-y-4">
        {fields.map((field) => (
          <FormField
            key={field.name}
            {...field}
            value={formData[field.name] || ""}
            error={getFieldError(field.name)}
            success={!hasFieldError(field.name) && formData[field.name]}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            onBlur={() => handleFieldBlur(field.name)}
          />
        ))}
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-3 space-y-reverse sm:space-y-0">
        {showCancelButton && onCancel && (
          <AccessibleButton
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting || isLoading}
            fullWidth
          >
            {cancelLabel}
          </AccessibleButton>
        )}

        <AccessibleButton
          type="submit"
          variant="primary"
          disabled={!isFormValid || isSubmitting || isLoading}
          loading={isSubmitting || isLoading}
          loadingText={isSubmitting ? "Submitting..." : "Loading..."}
          fullWidth
        >
          {submitLabel}
        </AccessibleButton>
      </div>
    </form>
  );
});

Form.displayName = "Form";

export default Form;
