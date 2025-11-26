/**
 * Role permissions definitions and utilities
 */

export interface RolePermission {
  id: string;
  label: string;
  description: string;
  category: 'correspondence' | 'documents' | 'administration' | 'analytics' | 'workflow';
}

export const AVAILABLE_ROLE_PERMISSIONS: RolePermission[] = [
  // Correspondence permissions
  {
    id: 'can_register_correspondence',
    label: 'Register Correspondence',
    description: 'Can register incoming correspondence',
    category: 'correspondence',
  },
  {
    id: 'can_minute_correspondence',
    label: 'Minute & Forward',
    description: 'Can add minutes and forward correspondence',
    category: 'correspondence',
  },
  {
    id: 'can_treat_correspondence',
    label: 'Treat & Respond',
    description: 'Can treat and respond to correspondence',
    category: 'correspondence',
  },
  {
    id: 'can_distribute',
    label: 'Add Distribution (CC)',
    description: 'Can add distribution lists to correspondence',
    category: 'correspondence',
  },
  {
    id: 'can_archive',
    label: 'Archive Correspondence',
    description: 'Can archive completed correspondence',
    category: 'correspondence',
  },
  {
    id: 'can_view_all_correspondence',
    label: 'View All Correspondence',
    description: 'Can view all correspondence regardless of assignment',
    category: 'correspondence',
  },
  {
    id: 'can_view_registry',
    label: 'View Correspondence Registry',
    description: 'Can access the correspondence registry',
    category: 'correspondence',
  },
  
  // Document permissions
  {
    id: 'can_access_document_management',
    label: 'Access Document Management',
    description: 'Can access the document management system',
    category: 'documents',
  },
  {
    id: 'can_create_documents',
    label: 'Create Documents',
    description: 'Can create new documents',
    category: 'documents',
  },
  {
    id: 'can_edit_documents',
    label: 'Edit Documents',
    description: 'Can edit existing documents',
    category: 'documents',
  },
  {
    id: 'can_delete_documents',
    label: 'Delete Documents',
    description: 'Can delete documents',
    category: 'documents',
  },
  {
    id: 'can_share_documents',
    label: 'Share Documents',
    description: 'Can share documents with other users',
    category: 'documents',
  },
  
  // Workflow permissions
  {
    id: 'can_access_approvals',
    label: 'Access Approvals',
    description: 'Can access the approvals inbox',
    category: 'workflow',
  },
  {
    id: 'can_approve',
    label: 'Approve Documents',
    description: 'Can approve documents in workflows',
    category: 'workflow',
  },
  {
    id: 'can_reject',
    label: 'Reject Documents',
    description: 'Can reject documents in workflows',
    category: 'workflow',
  },
  
  // Administration permissions
  {
    id: 'can_access_administration',
    label: 'Access Administration',
    description: 'Can access administration module',
    category: 'administration',
  },
  {
    id: 'can_manage_users',
    label: 'Manage Users',
    description: 'Can create, edit, and delete users',
    category: 'administration',
  },
  {
    id: 'can_manage_roles',
    label: 'Manage Roles',
    description: 'Can create, edit, and delete roles',
    category: 'administration',
  },
  {
    id: 'can_manage_org_structure',
    label: 'Manage Organization Structure',
    description: 'Can manage directorates, divisions, and departments',
    category: 'administration',
  },
  
  // Analytics permissions
  {
    id: 'can_access_analytics',
    label: 'Access Analytics',
    description: 'Can access analytics and reports',
    category: 'analytics',
  },
  {
    id: 'can_access_reports',
    label: 'Access Reports',
    description: 'Can generate and view reports',
    category: 'analytics',
  },
  {
    id: 'can_access_executive_dashboard',
    label: 'Access Executive Dashboard',
    description: 'Can access executive-level dashboard',
    category: 'analytics',
  },
];

export const PERMISSION_PRESETS = [
  {
    name: 'Full Access',
    description: 'All permissions (Super Admin)',
    permissions: AVAILABLE_ROLE_PERMISSIONS.reduce((acc, perm) => {
      acc[perm.id] = true;
      return acc;
    }, {} as Record<string, boolean>),
  },
  {
    name: 'Executive',
    description: 'Executive-level permissions (MD, ED, GM)',
    permissions: {
      can_register_correspondence: false,
      can_minute_correspondence: true,
      can_treat_correspondence: true,
      can_distribute: true,
      can_archive: true,
      can_view_all_correspondence: true,
      can_view_registry: true,
      can_access_document_management: true,
      can_create_documents: true,
      can_edit_documents: true,
      can_delete_documents: false,
      can_share_documents: true,
      can_access_approvals: true,
      can_approve: true,
      can_reject: true,
      can_access_administration: true,
      can_manage_users: false,
      can_manage_roles: false,
      can_manage_org_structure: false,
      can_access_analytics: true,
      can_access_reports: true,
      can_access_executive_dashboard: true,
    },
  },
  {
    name: 'Manager',
    description: 'Management-level permissions (AGM, PM)',
    permissions: {
      can_register_correspondence: false,
      can_minute_correspondence: true,
      can_treat_correspondence: true,
      can_distribute: true,
      can_archive: false,
      can_view_all_correspondence: false,
      can_view_registry: true,
      can_access_document_management: true,
      can_create_documents: true,
      can_edit_documents: true,
      can_delete_documents: false,
      can_share_documents: true,
      can_access_approvals: true,
      can_approve: true,
      can_reject: true,
      can_access_administration: false,
      can_manage_users: false,
      can_manage_roles: false,
      can_manage_org_structure: false,
      can_access_analytics: false,
      can_access_reports: false,
      can_access_executive_dashboard: false,
    },
  },
  {
    name: 'Secretary',
    description: 'Secretary permissions',
    permissions: {
      can_register_correspondence: true,
      can_minute_correspondence: true,
      can_treat_correspondence: true,
      can_distribute: false,
      can_archive: false,
      can_view_all_correspondence: true,
      can_view_registry: true,
      can_access_document_management: true,
      can_create_documents: true,
      can_edit_documents: true,
      can_delete_documents: false,
      can_share_documents: false,
      can_access_approvals: false,
      can_approve: false,
      can_reject: false,
      can_access_administration: false,
      can_manage_users: false,
      can_manage_roles: false,
      can_manage_org_structure: false,
      can_access_analytics: false,
      can_access_reports: false,
      can_access_executive_dashboard: false,
    },
  },
  {
    name: 'Officer',
    description: 'Basic officer permissions',
    permissions: {
      can_register_correspondence: true,
      can_minute_correspondence: false,
      can_treat_correspondence: true,
      can_distribute: false,
      can_archive: false,
      can_view_all_correspondence: false,
      can_view_registry: false,
      can_access_document_management: true,
      can_create_documents: true,
      can_edit_documents: true,
      can_delete_documents: false,
      can_share_documents: false,
      can_access_approvals: false,
      can_approve: false,
      can_reject: false,
      can_access_administration: false,
      can_manage_users: false,
      can_manage_roles: false,
      can_manage_org_structure: false,
      can_access_analytics: false,
      can_access_reports: false,
      can_access_executive_dashboard: false,
    },
  },
  {
    name: 'Read Only',
    description: 'View-only permissions',
    permissions: {
      can_register_correspondence: false,
      can_minute_correspondence: false,
      can_treat_correspondence: false,
      can_distribute: false,
      can_archive: false,
      can_view_all_correspondence: false,
      can_view_registry: false,
      can_access_document_management: true,
      can_create_documents: false,
      can_edit_documents: false,
      can_delete_documents: false,
      can_share_documents: false,
      can_access_approvals: false,
      can_approve: false,
      can_reject: false,
      can_access_administration: false,
      can_manage_users: false,
      can_manage_roles: false,
      can_manage_org_structure: false,
      can_access_analytics: false,
      can_access_reports: false,
      can_access_executive_dashboard: false,
    },
  },
];

export function getPermissionsByCategory(permissions: RolePermission[]) {
  return permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, RolePermission[]>);
}

