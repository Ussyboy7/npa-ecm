/** Types for forms and templates. */

export type FormCategory = "procurement" | "audit" | "finance" | "general";

export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "datetime"
  | "select"
  | "multiselect"
  | "checkbox"
  | "radio"
  | "file"
  | "email"
  | "url"
  | "currency";

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  workflow_collected?: boolean;
  is_signature_field?: boolean;
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  options?: FormFieldOption[];
}

export interface FormTemplate {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category: FormCategory;
  category_display?: string;
  is_active: boolean;
  structure: {
    fields: FormField[];
    sections?: Array<{
      id: string;
      title: string;
      fields: string[]; // field IDs
    }>;
    layout?: "single" | "multi-column";
  };
  created_by?: {
    id: string;
    name: string;
    email: string;
  };
  usage_count?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FormSubmission {
  id: string;
  template: FormTemplate;
  template_id?: string;
  correspondence?: string;
  correspondence_id?: string;
  data: Record<string, unknown>;
  is_draft: boolean;
  submitted_at?: string;
  submitted_by?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FormSubmissionListItem {
  id: string;
  template_name: string;
  template_category: FormCategory;
  is_draft: boolean;
  submitted_at?: string;
  submitted_by_name?: string;
  createdAt: string;
}

export interface FormSignature {
  id: string;
  workflow: string;
  field_name: string;
  field_label: string;
  assigned_to_office?: string;
  assigned_to_office_name?: string;
  assigned_to_department?: string;
  assigned_to_department_name?: string;
  assigned_to_division?: string;
  assigned_to_division_name?: string;
  signer_name: string;
  signer_pn: string;
  signer_designation: string;
  signature_file?: string;
  signature_file_url?: string;
  signed_date?: string;
  status: "pending" | "signed" | "rejected" | "skipped";
  order: number;
  assigned_to_user?: string;
  signed_by?: string;
  signed_by_name?: string;
  signed_at?: string;
  notes?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface FormSignatureWorkflow {
  id: string;
  submission: string;
  submission_template_name: string;
  submission_reference?: string;
  status: "pending" | "in_progress" | "completed" | "rejected";
  current_step: number;
  total_steps: number;
  routing_mode: "sequential" | "parallel";
  initiated_by: string;
  initiated_by_name: string;
  completed_at?: string;
  notes?: string;
  signatures: FormSignature[];
  pending_signatures_count: number;
  completed_signatures_count: number;
  created_at: string;
  updated_at: string;
}
