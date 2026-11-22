/**
 * Single source of truth for the app's routes.
 *
 * `APP_ROUTE_ROOTS` mirrors the top-level route directories under `app/`.
 * A contract test compares the two, so adding a page without registering its
 * root fails locally instead of silently breaking deep links such as the
 * post-login redirect.
 *
 * Public and auth flows live in `PUBLIC_ROUTE_PATHS` instead: they are served
 * without a session and are never post-login destinations.
 */
export const APP_ROUTE_ROOTS = [
  "acting",
  "admin",
  "analytics",
  "approvals",
  "archives",
  "assistant",
  "audit",
  "capture",
  "cases",
  "correspondence",
  "dashboard",
  "dms",
  "documents",
  "foia",
  "forms",
  "help",
  "helpdesk",
  "inbox",
  "integrations",
  "notifications",
  "physical-documents",
  "search",
  "settings",
  "workspaces",
] as const;

/** Paths served without a session, including the landing page and auth flows. */
export const PUBLIC_ROUTE_PATHS = [
  "/",
  "/login",
  "/set-password",
  "/verify",
  "/auth/callback",
  "/foia/public",
] as const;

/** True for a public route and anything nested under it. */
export const isPublicRoute = (pathname: string): boolean =>
  PUBLIC_ROUTE_PATHS.some((route) =>
    route === "/" ? pathname === "/" : pathname === route || pathname.startsWith(`${route}/`),
  );

export const DEFAULT_APP_ROUTE = "/dashboard";

export const APP_ROUTES = {
  login: "/login",
  dashboard: "/dashboard",
  myInbox: "/inbox",
  mySent: "/correspondence/my-sent",
  cases: "/cases?tab=my",
  casesMy: "/cases/my",
  casesOffice: "/cases/office",
  casesAll: "/cases/all",
  casesBase: "/cases",
  documents: "/documents",
  dms: "/dms",
  documentsForms: "/dms?tab=forms",
  approvals: "/approvals",
  analytics: "/analytics",
  audit: "/audit",
  forms: "/forms",
  notifications: "/notifications",
  officeInbox: "/correspondence/inbox",
  officeSent: "/correspondence/office-sent",
  registered: "/correspondence/registered",
  physicalRecords: "/physical-documents",
  records: "/correspondence/records",
  search: "/search",
  foia: "/foia",
  verify: "/verify",
  actingWorkspace: "/acting",
  admin: "/admin",
  adminOrganization: "/admin/organization",
  adminOrganizationEntities: "/admin/organization/entities",
  adminActingAppointments: "/admin/organization/acting",
  adminWorkflowSla: "/admin/workflow-sla",
  adminTemplates: "/admin/templates-hub",
  adminRecordsGovernance: "/admin/records-governance",
  settings: "/settings",
  help: "/help",
  helpdesk: "/helpdesk",
} as const;
