/** Canonical page identifiers and routes for client authorization. */

// Keep these keys in sync with backend/organization/permissions_catalog.py.
// The PageId union makes a typo in a sidebar access check a compile error.
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
  dashboard: "/dashboard",
  my_sent: "/correspondence/my-sent",
  my_inbox: "/inbox",
  approvals: "/approvals",
  approvals_executive: "/approvals",
  approvals_departmental: "/approvals",
  cases: "/cases?tab=my",
  cases_my: "/cases?tab=my",
  cases_office: "/cases/office",
  cases_all: "/cases/all",
  case_templates: "/admin/templates-hub",
  registered: "/correspondence/registered",
  physical_records: "/physical-documents",
  documents: "/dms",
  forms: "/forms",
  audit: "/audit",
  templates: "/admin/templates-hub",
  records: "/correspondence/records",
  records_governance: "/admin/records-governance",
  administration: "/admin",
  analytics: "/analytics",
  platform: "/admin",
  office_inbox: "/correspondence/inbox",
  admin_overview: "/admin",
};

export const APP_ROUTES = {
  login: "/login",
  dashboard: "/dashboard",
  actingWorkspace: "/acting",
  adminActingAppointments: "/admin/organization/acting",
  correspondenceInbox: "/correspondence/inbox",
  casesMy: "/cases/my",
  documents: "/documents",
} as const;

export const isPageId = (value: string): value is PageId =>
  (PAGE_ACCESS_KEYS as readonly string[]).includes(value);