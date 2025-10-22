"use client";

import { useState, useCallback, useEffect } from "react";
import { ValidationRule, ValidationResult, validateForm } from "./validationRules";

export interface UseFormValidationOptions {
  validationSchema: Record<string, ValidationRule[]>;
  onValidationChange?: (result: ValidationResult) => void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export interface FieldValidationResult {
  errors: string[];
  isValid: boolean;
  isDirty: boolean;
  isTouched: boolean;
}

export const useFormValidation = (options: UseFormValidationOptions) => {
  const {
    validationSchema,
    onValidationChange,
    validateOnChange = false,
    validateOnBlur = true
  } = options;

  // Initialize field states synchronously
  const initialFieldStates: Record<string, FieldValidationResult> = React.useMemo(() => {
    const states: Record<string, FieldValidationResult> = {};
    for (const fieldName of Object.keys(validationSchema)) {
      states[fieldName] = {
        errors: [],
        isValid: true,
        isDirty: false,
        isTouched: false
      };
    }
    return states;
  }, [validationSchema]);

  const [formData, setFormData] = useState<Record<string, string | number | boolean | Date | File | null>>({});
  const [fieldStates, setFieldStates] = useState<Record<string, FieldValidationResult>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set initial field states
  React.useEffect(() => {
    setFieldStates(initialFieldStates);
  }, [initialFieldStates]);

  // Validate entire form
  const validateAllFields = useCallback(() => {
    const result = validateForm(formData, validationSchema);
    setFormErrors(result.errors);
    setIsFormValid(result.isValid);
    onValidationChange?.(result);
    return result;
  }, [formData, validationSchema, onValidationChange]);

  // Validate single field
  const validateField = useCallback((fieldName: string, value: string | number | boolean | Date | File | null) => {
    const rules = validationSchema[fieldName];
    if (!rules) return { errors: [], isValid: true };

    const errors = rules
      .filter(rule => !rule.validate(value, formData))
      .map(rule => rule.message);

    const fieldState: FieldValidationResult = {
      errors,
      isValid: errors.length === 0,
      isDirty: true,
      isTouched: fieldStates[fieldName]?.isTouched || false
    };

    setFieldStates(prev => ({
      ...prev,
      [fieldName]: fieldState
    }));

    return fieldState;
  }, [formData, validationSchema, fieldStates]);

  // Handle field change
  const handleFieldChange = useCallback((fieldName: string, value: string | number | boolean | Date | File | null) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    if (validateOnChange) {
      validateField(fieldName, value);
    } else {
      // Mark field as dirty
      setFieldStates(prev => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          isDirty: true
        }
      }));
    }
  }, [validateOnChange, validateField]);

  // Handle field blur
  const handleFieldBlur = useCallback((fieldName: string) => {
    setFieldStates(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        isTouched: true
      }
    }));

    if (validateOnBlur) {
      validateField(fieldName, formData[fieldName]);
    }
  }, [validateOnBlur, validateField, formData]);

  // Handle form submission
  const handleSubmit = useCallback(async (submitFn: (data: Record<string, any>) => Promise<void> | void) => {
    setIsSubmitting(true);

    try {
      // Validate all fields before submission
      const validationResult = validateAllFields();

      if (!validationResult.isValid) {
        // Focus first field with error
        const firstErrorField = Object.keys(validationResult.errors)[0];
        const errorElement = document.getElementById(firstErrorField);
        errorElement?.focus();

        return { success: false, errors: validationResult.errors };
      }

      await submitFn(formData);
      return { success: true };
    } catch (error) {
      console.error("Form submission error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Submission failed" };
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateAllFields]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({});
    setFormErrors({});
    setIsFormValid(false);
    setIsSubmitting(false);

    // Reset field states
    const resetStates: Record<string, FieldValidationResult> = {};
    for (const fieldName of Object.keys(validationSchema)) {
      resetStates[fieldName] = {
        errors: [],
        isValid: true,
        isDirty: false,
        isTouched: false
      };
    }
    setFieldStates(resetStates);
  }, [validationSchema]);

  // Set form data (useful for editing existing data)
  const setFormValues = useCallback((values: Record<string, any>) => {
    setFormData(values);
  }, []);

  // Get field error message
  const getFieldError = useCallback((fieldName: string): string | undefined => {
    // Check form-level errors first
    if (formErrors && formErrors[fieldName] && formErrors[fieldName].length > 0) {
      return formErrors[fieldName][0];
    }

    // Check field-level errors
    if (fieldStates && fieldStates[fieldName] && fieldStates[fieldName].errors && fieldStates[fieldName].errors.length > 0) {
      return fieldStates[fieldName].errors[0];
    }

    return undefined;
  }, [formErrors, fieldStates]);

  // Check if field has errors
  const hasFieldError = useCallback((fieldName: string): boolean => {
    return Boolean(getFieldError(fieldName));
  }, [getFieldError]);

  return {
    // Form state
    formData,
    isFormValid,
    isSubmitting,
    formErrors,

    // Field state
    fieldStates,

    // Handlers
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
    resetForm,
    setFormValues,

    // Utilities
    getFieldError,
    hasFieldError,
    validateField,
    validateAllFields
  };
};

export default useFormValidation;
