/**
 * Form Validation Schemas for Admin Pages
 * Using Zod for runtime type checking and validation
 */

import { z } from 'zod';

// ============================================================================
// User Validation Schemas
// ============================================================================

export const userSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(150, 'Username must be less than 150 characters')
    .regex(/^[\w.@+-]+$/, 'Username can only contain letters, numbers, and @/./+/-/_ characters'),
  
  email: z.string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  
  first_name: z.string()
    .max(150, 'First name must be less than 150 characters')
    .optional(),
  
  last_name: z.string()
    .max(150, 'Last name must be less than 150 characters')
    .optional(),
  
  employee_id: z.string()
    .max(50, 'Employee ID must be less than 50 characters')
    .optional(),
  
  grade_level: z.string()
    .max(50, 'Grade level must be less than 50 characters')
    .optional(),
  
  system_role: z.string().uuid('Invalid role ID').optional().nullable(),
  
  directorate: z.string().uuid('Invalid directorate ID').optional().nullable(),
  
  division: z.string().uuid('Invalid division ID').optional().nullable(),
  
  department: z.string().uuid('Invalid department ID').optional().nullable(),
  
  is_active: z.boolean().default(true),
  
  is_management: z.boolean().default(false),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .optional(),
});

export type UserFormData = z.infer<typeof userSchema>;

// ============================================================================
// Role Validation Schemas
// ============================================================================

export const roleSchema = z.object({
  name: z.string()
    .min(2, 'Role name must be at least 2 characters')
    .max(100, 'Role name must be less than 100 characters'),
  
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  
  is_active: z.boolean().default(true),
  
  permissions: z.record(z.array(z.string())).default({}),
});

export type RoleFormData = z.infer<typeof roleSchema>;

// ============================================================================
// Organization Validation Schemas
// ============================================================================

export const directorateSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must be less than 255 characters'),
  
  code: z.string()
    .min(2, 'Code must be at least 2 characters')
    .max(50, 'Code must be less than 50 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase letters, numbers, underscores, or hyphens'),
  
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  
  is_active: z.boolean().default(true),
  
  executive_director: z.string().uuid('Invalid user ID').optional().nullable(),
});

export type DirectorateFormData = z.infer<typeof directorateSchema>;

export const divisionSchema = z.object({
  directorate: z.string().uuid('Invalid directorate ID'),
  
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must be less than 255 characters'),
  
  code: z.string()
    .min(2, 'Code must be at least 2 characters')
    .max(50, 'Code must be less than 50 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase letters, numbers, underscores, or hyphens'),
  
  is_active: z.boolean().default(true),
  
  general_manager: z.string().uuid('Invalid user ID').optional().nullable(),
});

export type DivisionFormData = z.infer<typeof divisionSchema>;

export const departmentSchema = z.object({
  division: z.string().uuid('Invalid division ID'),
  
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must be less than 255 characters'),
  
  code: z.string()
    .min(2, 'Code must be at least 2 characters')
    .max(50, 'Code must be less than 50 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase letters, numbers, underscores, or hyphens'),
  
  is_active: z.boolean().default(true),
  
  head_of_department: z.string().uuid('Invalid user ID').optional().nullable(),
});

export type DepartmentFormData = z.infer<typeof departmentSchema>;

// ============================================================================
// Bulk Operation Validation
// ============================================================================

export const bulkOperationSchema = z.object({
  user_ids: z.array(z.string().uuid())
    .min(1, 'At least one user must be selected')
    .max(100, 'Cannot process more than 100 users at once'),
  
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must be less than 500 characters')
    .optional(),
});

export type BulkOperationData = z.infer<typeof bulkOperationSchema>;

// ============================================================================
// Import Validation
// ============================================================================

export const importFileSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, 'File size must be less than 5MB')
    .refine((file) => file.name.endsWith('.csv'), 'File must be a CSV'),
});

export type ImportFileData = z.infer<typeof importFileSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate data against a schema and return errors
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((error) => {
    const path = error.path.join('.');
    errors[path] = error.message;
  });
  
  return { success: false, errors };
}

/**
 * Get error message for a field
 */
export function getFieldError(
  errors: Record<string, string>,
  field: string
): string | undefined {
  return errors[field];
}

/**
 * Check if form has errors
 */
export function hasErrors(errors: Record<string, string>): boolean {
  return Object.keys(errors).length > 0;
}

