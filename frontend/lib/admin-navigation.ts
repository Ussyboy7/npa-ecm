import type { SidebarVisibility } from "@/hooks/use-sidebar-visibility";

/** First admin destination the current user is allowed to see (no overview dashboard). */
export function getAdminHomePath(visibility: SidebarVisibility): string {
  if (visibility.showOrganizationOffices) return "/admin/organization";
  if (visibility.showUsersRoles) return "/admin/users-roles";
  if (visibility.showWorkflowSLA) return "/admin/workflow-sla";
  if (visibility.showRecordsGovernance) return "/admin/records-governance";
  if (visibility.showTemplates) return "/admin/templates-hub";
  if (visibility.showAuditCompliance) return "/audit";
  return "/dashboard";
}
