/**
 * Admin API Client
 * Centralized API functions for admin operations with proper TypeScript types
 */

import { apiFetch, hasTokens } from './api-client';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  grade_level: string;
  system_role: string | null;
  system_role_name?: string;
  directorate: string | null;
  directorate_name?: string;
  division: string | null;
  division_name?: string;
  department: string | null;
  department_name?: string;
  is_active: boolean;
  is_management: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string | null;
  last_activity: string | null;
}

export interface PaginatedUsers {
  count: number;
  next: string | null;
  previous: string | null;
  results: User[];
}

export interface BulkOperationResult {
  message: string;
  archived_count?: number;
  deleted_count?: number;
  activated_count?: number;
  deactivated_count?: number;
  assigned_count?: number;
  skipped_count?: number;
}

export interface UserImportResult {
  message: string;
  created_count: number;
  updated_count: number;
  errors: string[];
  total_errors: number;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  permissions: Record<string, string[]>;
  user_count: number;
  created_at: string;
  updated_at: string;
}

export interface RoleTemplate {
  name: string;
  description: string;
  permissions: Record<string, string[]>;
}

export interface UserQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
  is_management?: boolean;
  grade_level?: string;
  system_role?: string;
  division?: string;
  department?: string;
  date_joined_from?: string;
  date_joined_to?: string;
  last_login_from?: string;
  last_login_to?: string;
  ordering?: string;
  signal?: AbortSignal;
}

// ============================================================================
// User Management API
// ============================================================================

/**
 * Fetch paginated users with filters
 */
export async function fetchUsers(params: UserQueryParams = {}): Promise<PaginatedUsers> {
  if (!hasTokens()) {
    throw new Error('Authentication required');
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });

  const url = searchParams.toString() 
    ? `/accounts/users/?${searchParams.toString()}`
    : '/accounts/users/';

  return apiFetch<PaginatedUsers>(url, {
    signal: params.signal,
  });
}

/**
 * Bulk archive (deactivate) users
 */
export async function bulkArchiveUsers(userIds: string[]): Promise<BulkOperationResult> {
  if (!hasTokens()) throw new Error('Authentication required');
  
  return apiFetch<BulkOperationResult>('/accounts/users/bulk-archive/', {
    method: 'POST',
    body: JSON.stringify({ user_ids: userIds }),
  });
}

/**
 * Bulk delete users
 */
export async function bulkDeleteUsers(userIds: string[]): Promise<BulkOperationResult> {
  if (!hasTokens()) throw new Error('Authentication required');
  
  return apiFetch<BulkOperationResult>('/accounts/users/bulk-delete/', {
    method: 'POST',
    body: JSON.stringify({ user_ids: userIds }),
  });
}

/**
 * Bulk activate users
 */
export async function bulkActivateUsers(userIds: string[]): Promise<BulkOperationResult> {
  if (!hasTokens()) throw new Error('Authentication required');
  
  return apiFetch<BulkOperationResult>('/accounts/users/bulk-activate/', {
    method: 'POST',
    body: JSON.stringify({ user_ids: userIds }),
  });
}

/**
 * Bulk deactivate users
 */
export async function bulkDeactivateUsers(userIds: string[]): Promise<BulkOperationResult> {
  if (!hasTokens()) throw new Error('Authentication required');
  
  return apiFetch<BulkOperationResult>('/accounts/users/bulk-deactivate/', {
    method: 'POST',
    body: JSON.stringify({ user_ids: userIds }),
  });
}

/**
 * Export users to CSV
 */
export async function exportUsers(params: UserQueryParams = {}): Promise<Blob> {
  if (!hasTokens()) throw new Error('Authentication required');

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });

  const url = searchParams.toString()
    ? `/accounts/users/export/?${searchParams.toString()}`
    : '/accounts/users/export/';

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api/v1'}${url}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    },
  });

  if (!response.ok) {
    throw new Error('Export failed');
  }

  return response.blob();
}

/**
 * Import users from CSV
 */
export async function importUsers(file: File): Promise<UserImportResult> {
  if (!hasTokens()) throw new Error('Authentication required');

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api/v1'}/accounts/users/import/`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Import failed');
  }

  return response.json();
}

/**
 * Download user import template
 */
export async function downloadUserTemplate(): Promise<Blob> {
  if (!hasTokens()) throw new Error('Authentication required');

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api/v1'}/accounts/users/export-template/`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Template download failed');
  }

  return response.blob();
}

// ============================================================================
// Role Management API
// ============================================================================

/**
 * Fetch all roles
 */
export async function fetchRoles(): Promise<Role[]> {
  if (!hasTokens()) throw new Error('Authentication required');
  return apiFetch<Role[]>('/organization/roles/');
}

/**
 * Bulk assign role to multiple users
 */
export async function bulkAssignRole(roleId: string, userIds: string[]): Promise<BulkOperationResult> {
  if (!hasTokens()) throw new Error('Authentication required');
  
  return apiFetch<BulkOperationResult>('/organization/roles/bulk-assign/', {
    method: 'POST',
    body: JSON.stringify({ role_id: roleId, user_ids: userIds }),
  });
}

/**
 * Clone an existing role
 */
export async function cloneRole(roleId: string, newName: string, description?: string, isActive?: boolean): Promise<Role> {
  if (!hasTokens()) throw new Error('Authentication required');
  
  return apiFetch<Role>(`/organization/roles/${roleId}/clone/`, {
    method: 'POST',
    body: JSON.stringify({
      name: newName,
      description,
      is_active: isActive,
    }),
  });
}

/**
 * Get role templates
 */
export async function fetchRoleTemplates(): Promise<{ templates: RoleTemplate[] }> {
  if (!hasTokens()) throw new Error('Authentication required');
  return apiFetch<{ templates: RoleTemplate[] }>('/organization/roles/templates/');
}

/**
 * Create role from template
 */
export async function createRoleFromTemplate(templateName: string, customName?: string): Promise<Role> {
  if (!hasTokens()) throw new Error('Authentication required');
  
  return apiFetch<Role>('/organization/roles/create-from-template/', {
    method: 'POST',
    body: JSON.stringify({
      template_name: templateName,
      name: customName,
    }),
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format date for API (YYYY-MM-DD)
 */
export function formatDateForAPI(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

