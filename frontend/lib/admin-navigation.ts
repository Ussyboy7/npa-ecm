import type { SidebarVisibility } from "@/hooks/use-sidebar-visibility";

/** First admin destination the current user is allowed to see. */
export function getAdminHomePath(visibility: SidebarVisibility): string {
  if (
    visibility.showAdminDashboard ||
    visibility.showSystemHealth ||
    visibility.showHelpdeskQueue ||
    visibility.showLegacyImport ||
    visibility.showIntegrationHub
  ) {
    return "/admin";
  }
  if (visibility.showOrganizationOffices || visibility.showExternalEntities) {
    return "/admin/organization";
  }
  if (visibility.showUsersRoles) return "/admin/organization?tab=people";
  if (visibility.showWorkflowSLA) return "/admin/workflow-sla";
  if (visibility.showRecordsGovernance || visibility.showDrmPolicies) {
    return "/admin/records-governance";
  }
  if (visibility.showTemplates) return "/admin/templates-hub";
  if (visibility.showAuditCompliance || visibility.showAuditForms) return "/audit";
  return "/dashboard";
}
