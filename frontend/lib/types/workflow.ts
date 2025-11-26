/** TypeScript types for workflow templates and steps. */

export type AppliesTo = "document" | "correspondence";

export type StepSelectionMode = "hierarchy" | "office";

export interface WorkflowStep {
  id: string;
  template: string;
  order: number;
  title: string;
  required_role: string | null;
  required_grade_level: string | null;
  directorate: string | null;
  division: string | null;
  department: string | null;
  office: string | null;
  requires_all_assistants: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  applies_to: AppliesTo;
  is_active: boolean;
  created_by: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
  steps: WorkflowStep[];
  usage_count?: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStepFormData {
  template?: string;
  order: number;
  title: string;
  required_role?: string;
  required_grade_level?: string;
  selection_mode: StepSelectionMode;
  directorate?: string | null;
  division?: string | null;
  department?: string | null;
  office?: string | null;
  requires_all_assistants: boolean;
}

export interface WorkflowTemplateFormData {
  name: string;
  slug?: string;
  description: string;
  applies_to: AppliesTo;
  is_active: boolean;
}

