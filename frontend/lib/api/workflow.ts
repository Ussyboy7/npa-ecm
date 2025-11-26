"use client";

import { apiFetch } from "@/lib/api-client";
import type { WorkflowStep, WorkflowTemplate, WorkflowStepFormData, WorkflowTemplateFormData } from "@/lib/types/workflow";

const BASE_PATH = "/workflow";

/**
 * Get all workflow templates
 */
export async function getWorkflowTemplates(params?: {
  applies_to?: "document" | "correspondence";
  is_active?: boolean;
  search?: string;
}): Promise<WorkflowTemplate[]> {
  const queryParams = new URLSearchParams();
  if (params?.applies_to) queryParams.append("applies_to", params.applies_to);
  if (params?.is_active !== undefined) queryParams.append("is_active", String(params.is_active));
  if (params?.search) queryParams.append("search", params.search);

  const queryString = queryParams.toString();
  const path = queryString ? `${BASE_PATH}/templates/?${queryString}` : `${BASE_PATH}/templates/`;
  
  return apiFetch<WorkflowTemplate[]>(path);
}

/**
 * Get a single workflow template by ID
 */
export async function getWorkflowTemplate(id: string): Promise<WorkflowTemplate> {
  return apiFetch<WorkflowTemplate>(`${BASE_PATH}/templates/${id}/`);
}

/**
 * Create a new workflow template
 */
export async function createWorkflowTemplate(data: WorkflowTemplateFormData): Promise<WorkflowTemplate> {
  return apiFetch<WorkflowTemplate>(`${BASE_PATH}/templates/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing workflow template
 */
export async function updateWorkflowTemplate(id: string, data: Partial<WorkflowTemplateFormData>): Promise<WorkflowTemplate> {
  return apiFetch<WorkflowTemplate>(`${BASE_PATH}/templates/${id}/`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Delete a workflow template
 */
export async function deleteWorkflowTemplate(id: string): Promise<void> {
  return apiFetch<void>(`${BASE_PATH}/templates/${id}/`, {
    method: "DELETE",
  });
}

/**
 * Get all workflow steps for a template
 */
export async function getWorkflowSteps(templateId: string): Promise<WorkflowStep[]> {
  return apiFetch<WorkflowStep[]>(`${BASE_PATH}/steps/?template=${templateId}`);
}

/**
 * Create a new workflow step
 */
export async function createWorkflowStep(data: WorkflowStepFormData): Promise<WorkflowStep> {
  // Convert selection_mode to actual fields
  const stepData: Record<string, unknown> = {
    template: data.template,
    order: data.order,
    title: data.title,
    required_role: data.required_role || null,
    required_grade_level: data.required_grade_level || null,
    requires_all_assistants: data.requires_all_assistants,
  };

  if (data.selection_mode === "hierarchy") {
    stepData.directorate = data.directorate || null;
    stepData.division = data.division || null;
    stepData.department = data.department || null;
    stepData.office = null;
  } else if (data.selection_mode === "office") {
    stepData.office = data.office || null;
    stepData.directorate = null;
    stepData.division = null;
    stepData.department = null;
  }

  return apiFetch<WorkflowStep>(`${BASE_PATH}/steps/`, {
    method: "POST",
    body: JSON.stringify(stepData),
  });
}

/**
 * Update an existing workflow step
 */
export async function updateWorkflowStep(id: string, data: Partial<WorkflowStepFormData>): Promise<WorkflowStep> {
  // Convert selection_mode to actual fields
  const stepData: Record<string, unknown> = {};

  if (data.order !== undefined) stepData.order = data.order;
  if (data.title !== undefined) stepData.title = data.title;
  if (data.required_role !== undefined) stepData.required_role = data.required_role || null;
  if (data.required_grade_level !== undefined) stepData.required_grade_level = data.required_grade_level || null;
  if (data.requires_all_assistants !== undefined) stepData.requires_all_assistants = data.requires_all_assistants;

  if (data.selection_mode === "hierarchy") {
    stepData.directorate = data.directorate || null;
    stepData.division = data.division || null;
    stepData.department = data.department || null;
    stepData.office = null;
  } else if (data.selection_mode === "office") {
    stepData.office = data.office || null;
    stepData.directorate = null;
    stepData.division = null;
    stepData.department = null;
  }

  return apiFetch<WorkflowStep>(`${BASE_PATH}/steps/${id}/`, {
    method: "PUT",
    body: JSON.stringify(stepData),
  });
}

/**
 * Delete a workflow step
 */
export async function deleteWorkflowStep(id: string): Promise<void> {
  return apiFetch<void>(`${BASE_PATH}/steps/${id}/`, {
    method: "DELETE",
  });
}

/**
 * Reorder workflow steps (updates multiple steps' order fields)
 */
export async function reorderWorkflowSteps(templateId: string, stepIds: string[]): Promise<WorkflowStep[]> {
  // Fetch all steps for the template
  const steps = await getWorkflowSteps(templateId);
  
  // Update each step's order based on the new order
  const updatePromises = stepIds.map((stepId, index) => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return Promise.resolve(null);
    
    return updateWorkflowStep(stepId, {
      order: index + 1,
      selection_mode: step.office ? "office" : "hierarchy",
      title: step.title,
      required_role: step.required_role || undefined,
      required_grade_level: step.required_grade_level || undefined,
      requires_all_assistants: step.requires_all_assistants,
      directorate: step.directorate || undefined,
      division: step.division || undefined,
      department: step.department || undefined,
      office: step.office || undefined,
    });
  });

  const results = await Promise.all(updatePromises);
  return results.filter((step): step is WorkflowStep => step !== null);
}

