/** Canonical client authorization sources shared by navigation and guards. */

import { APP_ROUTES } from "./app-routes";

// Re-exported so existing `@/lib/authorization` imports keep one source.
export { APP_ROUTES };

// Keep these keys in sync with backend/organization/permissions_catalog.py.
// A contract test compares both lists so drift fails locally.
export const PERMISSION_KEYS = [
  "can_register_correspondence",
  "can_minute_correspondence",
  "can_treat_correspondence",
  "can_distribute",
  "can_archive",
  "can_archive_department",
  "can_archive_division",
  "can_archive_directorate",
  "can_view_all_correspondence",
  "can_view_registry",
  "can_classify_approval",
  "can_access_document_management",
  "can_create_documents",
  "can_edit_documents",
  "can_delete_documents",
  "can_share_documents",
  "can_access_approvals",
  "can_approve",
  "can_reject",
  "can_access_administration",
  "can_manage_users",
  "can_manage_roles",
  "can_manage_org_structure",
  "can_access_analytics",
  "can_access_reports",
  "can_access_executive_dashboard",
  "can_access_system_health",
  "can_manage_drm_policies",
  "can_access_records_governance",
  "can_access_audit_compliance",
  "can_access_forms_library",
  "can_access_cases",
  "can_create_cases",
  "can_access_office_cases",
  "can_access_all_cases",
  "can_manage_integration",
  "sidebar_show_my_workspace",
  "sidebar_show_offices_registry",
  "sidebar_show_case_management",
  "sidebar_show_documents_records",
  "sidebar_show_analytics_reports",
  "sidebar_show_administration",
  "sidebar_show_integration",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const SIDEBAR_PERMISSION_KEYS = [
  "sidebar_show_my_workspace",
  "sidebar_show_offices_registry",
  "sidebar_show_case_management",
  "sidebar_show_documents_records",
  "sidebar_show_analytics_reports",
  "sidebar_show_administration",
  "sidebar_show_integration",
] as const satisfies readonly PermissionKey[];

export type SidebarPermissionKey = (typeof SIDEBAR_PERMISSION_KEYS)[number];

export const PAGE_ACCESS_KEYS = [
  "dashboard",
  "my_sent",
  "my_inbox",
  "approvals",
  "approvals_executive",
  "approvals_departmental",
  "cases",
  "cases_my",
  "cases_office",
  "cases_all",
  "case_templates",
  "registered",
  "physical_records",
  "documents",
  "forms",
  "audit",
  "templates",
  "records",
  "records_governance",
  "administration",
  "analytics",
  "platform",
  "office_inbox",
  "admin_overview",
] as const;

export type PageId = (typeof PAGE_ACCESS_KEYS)[number];

export const PAGE_ROUTES: Record<PageId, string> = {
  dashboard: APP_ROUTES.dashboard,
  my_sent: APP_ROUTES.mySent,
  my_inbox: APP_ROUTES.myInbox,
  approvals: APP_ROUTES.approvals,
  approvals_executive: APP_ROUTES.approvals,
  approvals_departmental: APP_ROUTES.approvals,
  cases: APP_ROUTES.cases,
  cases_my: APP_ROUTES.cases,
  cases_office: APP_ROUTES.casesOffice,
  cases_all: APP_ROUTES.casesAll,
  case_templates: APP_ROUTES.adminTemplates,
  registered: APP_ROUTES.registered,
  physical_records: APP_ROUTES.physicalRecords,
  documents: APP_ROUTES.dms,
  forms: APP_ROUTES.forms,
  audit: APP_ROUTES.audit,
  templates: APP_ROUTES.adminTemplates,
  records: APP_ROUTES.records,
  records_governance: APP_ROUTES.adminRecordsGovernance,
  administration: APP_ROUTES.admin,
  analytics: APP_ROUTES.analytics,
  platform: APP_ROUTES.admin,
  office_inbox: APP_ROUTES.officeInbox,
  admin_overview: APP_ROUTES.admin,
};

export const isPageId = (value: string): value is PageId =>
  (PAGE_ACCESS_KEYS as readonly string[]).includes(value);

export const isPermissionKey = (value: string): value is PermissionKey =>
  (PERMISSION_KEYS as readonly string[]).includes(value);
