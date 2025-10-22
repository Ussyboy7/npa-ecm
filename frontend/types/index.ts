export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  department: string;
  phone_number: string;
  avatar?: string;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  parent?: string;
  color: string;
  icon: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  subcategories?: Category[];
  document_count?: number;
}

export interface Document {
  id: string;
  title: string;
  description: string;
  file: string;
  file_type: string;
  file_size: number;
  file_url: string;
  category: string;
  category_name?: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'archived';
  access_level: 'public' | 'internal' | 'confidential' | 'restricted';
  version: number;
  parent_document?: string;
  tags: string;
  uploaded_by: string;
  uploaded_by_name?: string;
  approved_by?: string;
  approved_at?: string;
  download_count: number;
  view_count: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentShare {
  id: string;
  document: string;
  document_title?: string;
  shared_with: string;
  shared_with_name?: string;
  permission: 'view' | 'download' | 'edit' | 'full';
  shared_by: string;
  shared_by_name?: string;
  message: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user: string;
  user_name?: string;
  document: string;
  document_title?: string;
  action: 'create' | 'view' | 'download' | 'update' | 'delete' | 'share' | 'approve' | 'reject' | 'comment';
  description: string;
  ip_address?: string;
  created_at: string;
}







