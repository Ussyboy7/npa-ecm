"use client";

import React, { forwardRef, useId } from "react";
import { AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  variant?: "outlined" | "filled" | "standard";
  as?: "input" | "textarea" | "select";
  options?: { value: string; label: string }[];
  showPasswordToggle?: boolean;
}

const FormField = forwardRef<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  FormFieldProps
>(({
  label,
  error,
  success,
  helperText,
  required,
  fullWidth = true,
  variant = "outlined",
  as = "input",
  options = [],
  showPasswordToggle = false,
  className = "",
  id,
  type = "text",
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const generatedId = useId();
  const fieldId = id || `field-${generatedId}`;
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;

  const baseClasses = `
    block w-full transition-colors duration-200
    ${variant === "outlined"
      ? "border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      : variant === "filled"
      ? "border-0 border-b-2 border-gray-300 rounded-t-md bg-gray-50 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500"
      : "border-0 border-b-2 border-gray-300 bg-transparent focus:border-blue-500 focus:ring-0"
    }
    ${error
      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
      : success
      ? "border-green-300 focus:border-green-500 focus:ring-green-500"
      : ""
    }
    ${fullWidth ? "w-full" : ""}
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const paddingClasses = variant === "standard" ? "px-0 py-2" : "px-3 py-2";

  const inputElement = (() => {
    const commonProps = {
      id: fieldId,
      className: `${baseClasses} ${paddingClasses} ${className}`,
      "aria-invalid": !!error,
      "aria-describedby": error ? errorId : helperText ? helperId : undefined,
      ...props
    };

    switch (as) {
      case "textarea":
        return (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            {...(commonProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        );

      case "select":
        return (
          <select
            ref={ref as React.Ref<HTMLSelectElement>}
            {...(commonProps as React.SelectHTMLAttributes<HTMLSelectElement>)}
          >
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        const inputType = showPasswordToggle && showPassword ? "text" : type;
        return (
          <div className="relative">
            <input
              ref={ref as React.Ref<HTMLInputElement>}
              type={inputType}
              {...(commonProps as React.InputHTMLAttributes<HTMLInputElement>)}
            />
            {showPasswordToggle && (
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            )}
          </div>
        );
    }
  })();

  return (
    <div className={`mb-4 ${fullWidth ? "w-full" : ""}`}>
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {inputElement}

        {/* Success/Error icons */}
        {(error || success) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {error && <AlertCircle className="h-5 w-5 text-red-500" />}
            {success && <CheckCircle className="h-5 w-5 text-green-500" />}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p
          id={errorId}
          className="mt-1 text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}

      {/* Helper text */}
      {helperText && !error && (
        <p
          id={helperId}
          className="mt-1 text-sm text-gray-500"
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

FormField.displayName = "FormField";

export default FormField;
