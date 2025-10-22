// Validation rules and utilities

export interface ValidationRule {
  validate: (value: unknown, formData?: Record<string, unknown>) => boolean;
  message: string;
  required?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}

// Common validation rules
export const validationRules = {
  required: (message = "This field is required"): ValidationRule => ({
    validate: (value) => value !== null && value !== undefined && String(value).trim() !== "",
    message,
    required: true
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => !value || String(value).length >= min,
    message: message || `Must be at least ${min} characters long`
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => !value || String(value).length <= max,
    message: message || `Must be no more than ${max} characters long`
  }),

  email: (message = "Please enter a valid email address"): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(String(value));
    },
    message
  }),

  phone: (message = "Please enter a valid phone number"): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      const cleanValue = String(value).replace(/[\s\-\(\)]/g, "");
      return phoneRegex.test(cleanValue);
    },
    message
  }),

  numeric: (message = "Please enter a valid number"): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return !isNaN(Number(value)) && !isNaN(parseFloat(String(value)));
    },
    message
  }),

  min: (min: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return Number(value) >= min;
    },
    message: message || `Must be at least ${min}`
  }),

  max: (max: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return Number(value) <= max;
    },
    message: message || `Must be no more than ${max}`
  }),

  pattern: (regex: RegExp, message: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return regex.test(String(value));
    },
    message
  }),

  oneOf: (options: unknown[], message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return options.includes(value);
    },
    message: message || "Please select a valid option"
  }),

  date: (message = "Please enter a valid date"): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      const date = new Date(value);
      return date instanceof Date && !isNaN(date.getTime());
    },
    message
  }),

  dateAfter: (compareDate: Date | string, message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      const inputDate = new Date(value);
      const compare = new Date(compareDate);
      return inputDate > compare;
    },
    message: message || "Date must be after the specified date"
  }),

  dateBefore: (compareDate: Date | string, message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      const inputDate = new Date(value);
      const compare = new Date(compareDate);
      return inputDate < compare;
    },
    message: message || "Date must be before the specified date"
  }),

  url: (message = "Please enter a valid URL"): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      try {
        new URL(String(value));
        return true;
      } catch {
        return false;
      }
    },
    message
  }),

  matches: (fieldName: string, message?: string): ValidationRule => ({
    validate: (value, formData) => {
      if (!value || !formData) return true;
      return value === formData[fieldName];
    },
    message: message || "Fields do not match"
  }),

  custom: (validator: (value: unknown, formData?: Record<string, unknown>) => boolean, message: string): ValidationRule => ({
    validate: validator,
    message
  })
};

// Validation utilities
export const validateField = (value: unknown, rules: ValidationRule[], formData?: Record<string, unknown>): string[] => {
  const errors: string[] = [];

  for (const rule of rules) {
    if (!rule.validate(value, formData)) {
      errors.push(rule.message);
    }
  }

  return errors;
};

export const validateForm = (
  formData: Record<string, any>,
  validationSchema: Record<string, ValidationRule[]>
): ValidationResult => {
  const errors: Record<string, string[]> = {};
  let isValid = true;

  for (const [fieldName, rules] of Object.entries(validationSchema)) {
    const fieldErrors = validateField(formData[fieldName], rules, formData);
    if (fieldErrors.length > 0) {
      errors[fieldName] = fieldErrors;
      isValid = false;
    }
  }

  return { isValid, errors };
};

// Common validation schemas
export const validationSchemas = {
  memo: {
    title: [
      validationRules.required("Memo title is required"),
      validationRules.minLength(5, "Title must be at least 5 characters"),
      validationRules.maxLength(200, "Title must be no more than 200 characters")
    ],
    department: [
      validationRules.required("Department is required"),
      validationRules.oneOf([
        "Finance & Accounts", "Human Resources", "Operations", "ICT",
        "Legal", "Procurement", "Marine", "Engineering", "Security"
      ], "Please select a valid department")
    ],
    priority: [
      validationRules.required("Priority is required"),
      validationRules.oneOf(["low", "medium", "high", "urgent"], "Please select a valid priority")
    ],
    content: [
      validationRules.required("Memo content is required"),
      validationRules.minLength(50, "Content must be at least 50 characters")
    ]
  },

  correspondence: {
    subject: [
      validationRules.required("Subject is required"),
      validationRules.minLength(10, "Subject must be at least 10 characters"),
      validationRules.maxLength(200, "Subject must be no more than 200 characters")
    ],
    sender: [
      validationRules.required("Sender is required"),
      validationRules.minLength(2, "Sender must be at least 2 characters")
    ],
    referenceNumber: [
      validationRules.required("Reference number is required"),
      validationRules.pattern(/^[A-Z]{2,4}\/\d{4}\/\d{3,4}$/, "Reference number must be in format: DEPT/YYYY/NNN")
    ],
    receivedDate: [
      validationRules.required("Received date is required"),
      validationRules.date("Please enter a valid date")
    ]
  },

  user: {
    username: [
      validationRules.required("Username is required"),
      validationRules.minLength(3, "Username must be at least 3 characters"),
      validationRules.maxLength(50, "Username must be no more than 50 characters"),
      validationRules.pattern(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    ],
    email: [
      validationRules.required("Email is required"),
      validationRules.email("Please enter a valid email address")
    ],
    firstName: [
      validationRules.required("First name is required"),
      validationRules.minLength(2, "First name must be at least 2 characters"),
      validationRules.maxLength(50, "First name must be no more than 50 characters")
    ],
    lastName: [
      validationRules.required("Last name is required"),
      validationRules.minLength(2, "Last name must be at least 2 characters"),
      validationRules.maxLength(50, "Last name must be no more than 50 characters")
    ],
    department: [
      validationRules.required("Department is required")
    ],
    role: [
      validationRules.required("Role is required")
    ]
  }
};
