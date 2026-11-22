import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useCurrentUser } from './use-current-user';
import { apiFetch } from '@/lib/api-client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useRoleChecks } from './use-role-checks';
import type { PageId, PermissionKey, SidebarPermissionKey } from '@/lib/authorization';
import {
  getPagePermissionsSnapshot,
  getServerPagePermissionsSnapshot,
  loadPagePermissions,
  subscribePagePermissions,
} from '@/lib/page-permissions-cache';

export { invalidatePagePermissionsCache } from '@/lib/page-permissions-cache';

function usePageAccess(userId: string | null | undefined) {
  const snapshot = useSyncExternalStore(
    subscribePagePermissions,
    getPagePermissionsSnapshot,
    getServerPagePermissionsSnapshot,
  );

  useEffect(() => {
    if (!userId) return;
    void loadPagePermissions(userId, async () => {
      const response = await apiFetch<{ pages: Record<string, { allowed: boolean }> }>(
        "/accounts/auth/permissions/pages/",
      );
      return response.pages ?? {};
    });
  }, [userId, snapshot.version]);

  return snapshot.userId === userId ? snapshot.pages : null;
}


export interface SidebarVisibility {
  /** True once page permissions, role data, and the user's office memberships are available. */
  isVisibilityReady: boolean;

  // My Workspace
  showDashboard: boolean;
  showMyInbox: boolean;
  showMySent: boolean;
  showExecutiveApprovals: boolean;
  showDepartmentalApprovals: boolean;
  showNotifications: boolean;

  // Offices & Registry
  showOfficeInbox: boolean;
  showRegisterCorrespondence: boolean;
  showRegisteredCorrespondence: boolean;
  showOfficeSent: boolean;

    // Case queues (My / Office / All) — section flag still gates them
    showMyCases: boolean;
  showOfficeCases: boolean;
  showAllCases: boolean;
  showCreateCase: boolean;
  showCaseTemplates: boolean;

  // Documents & Records
  showSearchDocuments: boolean;
  showContentCapture: boolean;
  showFOIA: boolean;
  showFormsLibrary: boolean;
  showVerifySeal: boolean;
  showRecordsArchives: boolean;
  showPhysicalRecords: boolean;
  showDocumentsList: boolean;
  showNewDocument: boolean;
  showAssistantCalendar: boolean;


  // Analytics & Reports
  showAnalyticsReports: boolean;
  showExecutiveDashboard: boolean;
  showPerformanceAnalytics: boolean;

  // Administration
  showAdministration: boolean;
  showAdminDashboard: boolean;
  showOrganizationOffices: boolean;
  showOrganizationActing: boolean;
  showUsersRoles: boolean;
  showWorkflowSLA: boolean;
  showRecordsGovernance: boolean;
  showTemplates: boolean;
  showAuditCompliance: boolean;
  showAuditForms: boolean;
  showSystemHealth: boolean;
  showExternalEntities: boolean;
  showDivisionAnalytics: boolean;
  showCaseAnalytics: boolean;

  // Integration
  showIntegration: boolean;
  showIntegrationHub: boolean;

  // System
  showSettings: boolean;
  showHelpGuides: boolean;
  showHelpdeskSubmit: boolean;
  showHelpdeskQueue: boolean;
  showDrmPolicies: boolean;
  showLegacyImport: boolean;
}

/**
 * Hook to determine sidebar visibility based on user role, scope, and permissions
 */
export function useSidebarVisibility(): SidebarVisibility {
  const { currentUser } = useCurrentUser();
  const pageAccess = usePageAccess(currentUser?.id);
  const {
    officeMemberships,
    assistantAssignments,
    roles,
    offices,
    myOfficeMembershipsLoaded,
    isOrganizationReady,
  } = useOrganization();
  const roleChecks = useRoleChecks();

  return useMemo(() => {
    if (!currentUser || !pageAccess || !myOfficeMembershipsLoaded || !isOrganizationReady) {
      return {
        isVisibilityReady: false,
        showDashboard: false,
        showMyInbox: false,
        showMySent: false,
        showExecutiveApprovals: false,
        showDepartmentalApprovals: false,
        showNotifications: false,
        showOfficeInbox: false,
        showRegisterCorrespondence: false,
        showRegisteredCorrespondence: false,
        showOfficeSent: false,
        showMyCases: false,
        showOfficeCases: false,
        showAllCases: false,
        showCreateCase: false,
        showCaseTemplates: false,
        showSearchDocuments: false,
        showContentCapture: false,
        showFOIA: false,
        showFormsLibrary: false,
        showVerifySeal: false,
        showRecordsArchives: false,
        showPhysicalRecords: false,
        showDocumentsList: false,
        showNewDocument: false,
        showCaseAnalytics: false,
        showAssistantCalendar: false,
        showAnalyticsReports: false,
        showExecutiveDashboard: false,
        showPerformanceAnalytics: false,
        showAdministration: false,
        showAdminDashboard: false,
        showOrganizationOffices: false,
        showOrganizationActing: false,
        showUsersRoles: false,
        showWorkflowSLA: false,
        showRecordsGovernance: false,
        showTemplates: false,
        showAuditCompliance: false,
        showAuditForms: false,
        showSystemHealth: false,
        showExternalEntities: false,
        showDivisionAnalytics: false,
        showIntegration: false,
        showIntegrationHub: false,
        showSettings: false,
        showHelpGuides: false,
        showHelpdeskSubmit: false,
        showHelpdeskQueue: false,
        showDrmPolicies: false,
        showLegacyImport: false,
      };
    }

    const allowedPage = (pageId: PageId) => Boolean(pageAccess?.[pageId]?.allowed);
    const isSuperAdmin = roleChecks.isSuperAdmin;
    
    const perms: Record<string, boolean> = {
      ...(roles.find((r) => r.id === currentUser.systemRole || r.name === currentUser.systemRole)?.permissions ?? {}),
      ...(currentUser.rolePermissions ?? {}),
    };
    const has = (key: PermissionKey) => Boolean(perms[key]);
    const section = (sidebarKey: SidebarPermissionKey, defaultOn: boolean) =>
      sidebarKey in perms ? Boolean(perms[sidebarKey]) : defaultOn;

    const QUEUE_ROLES = new Set(['principal', 'acting', 'secretariat']);
    const userOfficeIds = officeMemberships
      .filter((m) => m.userId === currentUser.id && m.isActive)
      .map((m) => m.officeId);
    const hasOfficeMembership = userOfficeIds.length > 0;
    const hasOfficeQueueRole = officeMemberships.some(
      (m) =>
        m.userId === currentUser.id &&
        m.isActive &&
        QUEUE_ROLES.has(String(m.assignmentRole || '').toLowerCase()),
    );
    const registryOn = section("sidebar_show_offices_registry", true);
    const casesOn = section("sidebar_show_case_management", true);
    const documentsOn = section("sidebar_show_documents_records", true);
    const analyticsOn = section("sidebar_show_analytics_reports", has("can_access_analytics"));
    const adminOn = section("sidebar_show_administration", has("can_access_administration"));
    const integrationOn = section("sidebar_show_integration", has("can_manage_integration"));

    const showDashboard = allowedPage("dashboard");
    const canAccessCorrespondence =
      has("can_minute_correspondence") ||
      has("can_treat_correspondence") ||
      has("can_register_correspondence") ||
      has("can_access_approvals") ||
      has("can_view_all_correspondence") ||
      has("can_view_registry") ||
      has("can_distribute") ||
      has("can_archive") ||
      has("can_access_all_cases");
    const showMyInbox = allowedPage("my_inbox") && canAccessCorrespondence;
    const showMySent = allowedPage("my_sent") && canAccessCorrespondence;
    const showNotifications = false;
    const showExecutiveApprovals = allowedPage("approvals_executive");
    const showDepartmentalApprovals = allowedPage("approvals_departmental");

    const showOfficeInbox = registryOn && allowedPage("office_inbox") && hasOfficeQueueRole;
    const showOfficeSent = registryOn && allowedPage("office_inbox") && hasOfficeQueueRole;
    const showRegisterCorrespondence =
      registryOn &&
      has("can_register_correspondence") &&
      (hasOfficeMembership || has("can_view_registry") || roleChecks.isRegistry);
    const showRegisteredCorrespondence = registryOn && allowedPage("registered");

    const showMyCases = casesOn && allowedPage("cases_my");
    // The backend already resolves office-queue scope (seat holders and global
    // case viewers), so trust the page rule rather than re-deriving seats here.
    const showOfficeCases = casesOn && allowedPage("cases_office");
    const showCreateCase = casesOn && has("can_create_cases");
    const showCaseTemplates = adminOn && allowedPage("case_templates");
    const showAllCases = casesOn && allowedPage("cases_all");

    const showSearchDocuments = documentsOn && allowedPage("documents");
    const showContentCapture = documentsOn && has("can_access_document_management");
    const showFOIA = documentsOn;
    const showFormsLibrary = documentsOn && allowedPage("forms");
    const showVerifySeal = documentsOn && has("can_access_document_management");
    const showRecordsArchives = documentsOn && allowedPage("records");
    const showPhysicalRecords = documentsOn && allowedPage("physical_records");
    const showDocumentsList = documentsOn && allowedPage("documents");
    const showNewDocument = documentsOn && has("can_create_documents");

    const isAssistantWithCalendar = assistantAssignments.some(
      (assignment) =>
        assignment.assistantId === currentUser.id &&
        (assignment.permissions.includes("schedule") ||
          assignment.permissions.includes("coordinate")),
    );
    const showAssistantCalendar =
      isAssistantWithCalendar || has("can_access_executive_dashboard");

    const showAnalyticsReports = analyticsOn && has("can_access_analytics");
    const showExecutiveDashboard = analyticsOn && has("can_access_executive_dashboard");
    const showPerformanceAnalytics = showAnalyticsReports;
    const showDivisionAnalytics = showAnalyticsReports;
    const showCaseAnalytics = analyticsOn && has("can_access_analytics");

    const showOrganizationOffices = adminOn && has("can_manage_org_structure");
    const showOrganizationActing =
      hasOfficeMembership ||
      isSuperAdmin ||
      has("can_manage_org_structure") ||
      has("can_manage_users");
    const showUsersRoles =
      adminOn && (has("can_manage_users") || has("can_manage_roles"));
    const showWorkflowSLA = adminOn && has("can_manage_org_structure");
    const showRecordsGovernance = adminOn && allowedPage("records_governance");
    const showTemplates = adminOn && allowedPage("templates");
    const showAuditCompliance = allowedPage("audit");
    const showAuditForms = allowedPage("forms");
    const showSystemHealth = has("can_access_system_health");
    const showDrmPolicies = has("can_manage_drm_policies");
    const showLegacyImport = has("can_access_system_health");
    const showHelpdeskQueue = has("can_access_system_health");
    const showExternalEntities =
      adminOn && (has("can_access_administration") || showRegisterCorrespondence);
    const showIntegration = integrationOn;
    const showIntegrationHub = integrationOn;

    const showAdminDashboard = allowedPage("admin_overview");

    const showSettings = true;
    const showHelpGuides = true;
    const showHelpdeskSubmit = true;

    const showAdministration =
      showOrganizationOffices ||
      showOrganizationActing ||
      showUsersRoles ||
      showWorkflowSLA ||
      showRecordsGovernance ||
      showTemplates ||
      showAuditCompliance ||
      showSystemHealth ||
      showExternalEntities ||
      showDrmPolicies ||
      showLegacyImport ||
      showHelpdeskQueue ||
      showIntegrationHub;

    return {
      isVisibilityReady: true,
      showDashboard,
      showMyInbox,
      showMySent,
      showExecutiveApprovals,
      showDepartmentalApprovals,
      showNotifications,
      showOfficeInbox,
      showRegisterCorrespondence,
      showRegisteredCorrespondence,
      showOfficeSent,
      showMyCases,
      showOfficeCases,
      showAllCases,
      showCreateCase,
      showCaseTemplates,
      showSearchDocuments,
      showContentCapture,
      showFOIA,
      showFormsLibrary,
      showVerifySeal,
      showRecordsArchives,
      showPhysicalRecords,
      showDocumentsList,
      showNewDocument,
      showAssistantCalendar,
      showAnalyticsReports,
      showExecutiveDashboard,
      showPerformanceAnalytics,
      showDivisionAnalytics,
      showCaseAnalytics,
      showAdministration,
      showAdminDashboard,
      showOrganizationOffices,
      showOrganizationActing,
      showUsersRoles,
      showWorkflowSLA,
      showRecordsGovernance,
      showTemplates,
      showAuditCompliance,
      showAuditForms,
      showSystemHealth,
      showExternalEntities,
      showIntegration,
      showIntegrationHub,
      showSettings,
      showHelpGuides,
      showHelpdeskSubmit,
      showHelpdeskQueue,
      showDrmPolicies,
      showLegacyImport,
    };
  }, [
    currentUser,
    officeMemberships,
    assistantAssignments,
    roleChecks,
    roles,
    offices,
    pageAccess,
    myOfficeMembershipsLoaded,
    isOrganizationReady,
  ]);
}

