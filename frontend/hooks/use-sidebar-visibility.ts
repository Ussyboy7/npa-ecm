import { useMemo } from 'react';
import { useCurrentUser } from './use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useRoleChecks } from './use-role-checks';
import { useScopeChecks } from './use-scope-checks';
import { shouldUseWorkspaceHomeForUser } from '@/lib/home-route';

export interface SidebarVisibility {
  // My Workspace
  showDashboard: boolean;
  showMyInbox: boolean;
  showMyOutbox: boolean;
  showExecutiveApprovals: boolean;
  showMyTasksAlerts: boolean;

  // Offices & Registry
  showOfficeInbox: boolean;
  showRegisterCorrespondence: boolean;
  showOfficeOutbox: boolean;
  showOfficeDispatched: boolean;

  // Case Management
  showMyCases: boolean;
  showOfficeCases: boolean;
  showAllCases: boolean;

  // Documents & Records
  showSearchDocuments: boolean;
  showContentCapture: boolean;
  showFormsLibrary: boolean;
  showVerifySeal: boolean;
  showRecordsArchives: boolean;
  showPhysicalRecords: boolean;
  showAssistantCalendar: boolean;

  // Analytics & Reports
  showAnalyticsReports: boolean;
  showExecutiveDashboard: boolean;
  showPerformanceAnalytics: boolean;
  showReportsIntelligence: boolean;

  // Administration
  showAdministration: boolean;
  showOrganizationOffices: boolean;
  showUsersRoles: boolean;
  showWorkflowSLA: boolean;
  showRecordsGovernance: boolean;
  showTemplates: boolean;
  showAuditCompliance: boolean;
  showSystemHealth: boolean;
  showExternalEntities: boolean;
  showDivisionAnalytics: boolean;

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
  const { officeMemberships, assistantAssignments, roles, offices } = useOrganization();
  const roleChecks = useRoleChecks();
  const scopeChecks = useScopeChecks();

  return useMemo(() => {
    if (!currentUser) {
      return {
        showDashboard: false,
        showMyInbox: false,
        showMyOutbox: false,
        showExecutiveApprovals: false,
        showMyTasksAlerts: false,
        showOfficeInbox: false,
        showRegisterCorrespondence: false,
        showOfficeOutbox: false,
        showOfficeDispatched: false,
        showMyCases: false,
        showOfficeCases: false,
        showAllCases: false,
        showSearchDocuments: false,
        showContentCapture: false,
        showFormsLibrary: false,
        showVerifySeal: false,
        showRecordsArchives: false,
        showPhysicalRecords: false,
        showAssistantCalendar: false,
        showAnalyticsReports: false,
        showExecutiveDashboard: false,
        showPerformanceAnalytics: false,
        showReportsIntelligence: false,
        showAdministration: false,
        showOrganizationOffices: false,
        showUsersRoles: false,
        showWorkflowSLA: false,
        showRecordsGovernance: false,
        showTemplates: false,
        showAuditCompliance: false,
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

    // Super Admin should see EVERYTHING - check this first
    const isSuperAdmin = roleChecks.isSuperAdmin;
    
    if (isSuperAdmin) {
      return {
        showDashboard: true,
        showMyInbox: true,
        showMyOutbox: true,
        showExecutiveApprovals: true,
        showMyTasksAlerts: true,
        showOfficeInbox: true,
        showRegisterCorrespondence: true,
        showOfficeOutbox: true,
        showOfficeDispatched: true,
        showMyCases: true,
        showOfficeCases: true,
        showAllCases: true,
        showSearchDocuments: true,
        showContentCapture: true,
        showFormsLibrary: true,
        showVerifySeal: true,
        showRecordsArchives: true,
        showPhysicalRecords: true,
        showAssistantCalendar: true,
        showAnalyticsReports: true,
        showExecutiveDashboard: true,
        showPerformanceAnalytics: true,
        showReportsIntelligence: true,
        showAdministration: true,
        showOrganizationOffices: true,
        showUsersRoles: true,
        showWorkflowSLA: true,
        showRecordsGovernance: true,
        showTemplates: true,
        showAuditCompliance: true,
        showSystemHealth: true,
        showExternalEntities: true,
        showDivisionAnalytics: true,
        showIntegration: true,
        showIntegrationHub: true,
        showSettings: true,
        showHelpGuides: true,
        showHelpdeskSubmit: true,
        showHelpdeskQueue: true,
        showDrmPolicies: true,
        showLegacyImport: true,
      };
    }

    const perms: Record<string, boolean> = {
      ...(roles.find((r) => r.id === currentUser.systemRole || r.name === currentUser.systemRole)?.permissions ?? {}),
      ...(currentUser.rolePermissions ?? {}),
    };
    const has = (key: string) => Boolean(perms[key]);
    const section = (sidebarKey: string, defaultOn: boolean) =>
      sidebarKey in perms ? Boolean(perms[sidebarKey]) : defaultOn;

    const userOfficeIds = officeMemberships
      .filter((m) => m.userId === currentUser.id && m.isActive)
      .map((m) => m.officeId);
    const hasOfficeMembership = userOfficeIds.length > 0;
    const hasExecutiveAssignment =
      roleChecks.isSecretary &&
      assistantAssignments.some((a) => String(a.assistantId) === String(currentUser.id));
    const hasOrgUnit = Boolean(
      currentUser.division || currentUser.department || currentUser.directorate,
    );
    const userOfficeTypes = userOfficeIds
      .map((officeId) => offices.find((office) => office.id === officeId)?.officeType)
      .filter((officeType): officeType is string => Boolean(officeType));

    const workspaceOn = section("sidebar_show_my_workspace", true);
    const registryOn = section("sidebar_show_offices_registry", true);
    const casesOn = section("sidebar_show_case_management", true);
    const documentsOn = section("sidebar_show_documents_records", true);
    const analyticsOn = section("sidebar_show_analytics_reports", has("can_access_analytics"));
    const adminOn = section("sidebar_show_administration", has("can_access_administration"));
    const integrationOn = section("sidebar_show_integration", has("can_manage_integration"));

    const showDashboard =
      workspaceOn && shouldUseWorkspaceHomeForUser(currentUser, userOfficeTypes);
    const showMyInbox = workspaceOn;
    const showMyOutbox = workspaceOn;
    const showMyTasksAlerts = workspaceOn;
    const showExecutiveApprovals =
      workspaceOn &&
      (has("can_access_approvals") || (roleChecks.isSecretary && hasExecutiveAssignment));

    const showOfficeInbox = registryOn && hasOfficeMembership;
    const showOfficeOutbox = registryOn && hasOfficeMembership;
    const showOfficeDispatched = registryOn && hasOfficeMembership;
    const showRegisterCorrespondence =
      registryOn &&
      has("can_register_correspondence") &&
      (hasOfficeMembership || has("can_view_registry") || roleChecks.isRegistry);

    const showMyCases = casesOn;
    const showOfficeCases = casesOn && hasOfficeMembership;
    const showAllCases =
      casesOn &&
      (scopeChecks.caseScope !== "personal" ||
        (roleChecks.isSecretary && hasExecutiveAssignment) ||
        has("can_view_all_correspondence"));

    const showSearchDocuments = documentsOn && has("can_access_document_management");
    const showContentCapture = documentsOn && has("can_access_document_management");
    const showFormsLibrary = documentsOn;
    const showVerifySeal = documentsOn;
    const showRecordsArchives = documentsOn && (hasOfficeMembership || hasOrgUnit);
    const showPhysicalRecords =
      documentsOn && (has("can_archive") || showRecordsArchives || showRegisterCorrespondence);

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
    const showReportsIntelligence = analyticsOn && has("can_access_reports");
    const showDivisionAnalytics = showAnalyticsReports;

    const showOrganizationOffices = adminOn && has("can_manage_org_structure");
    const showUsersRoles =
      adminOn && (has("can_manage_users") || has("can_manage_roles"));
    const showWorkflowSLA = adminOn && has("can_manage_org_structure");
    const showRecordsGovernance = adminOn && has("can_access_records_governance");
    const showTemplates = adminOn && has("can_access_administration");
    const showAuditCompliance = adminOn && has("can_access_audit_compliance");
    const showSystemHealth = has("can_access_system_health");
    const showDrmPolicies = has("can_manage_drm_policies");
    const showLegacyImport = has("can_access_system_health");
    const showHelpdeskQueue = has("can_access_system_health");
    const showExternalEntities =
      adminOn && (has("can_access_administration") || showRegisterCorrespondence);
    const showIntegration = integrationOn;
    const showIntegrationHub = integrationOn;

    const showSettings = true;
    const showHelpGuides = true;
    const showHelpdeskSubmit = true;

    const showAdministration =
      showOrganizationOffices ||
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
      showDashboard,
      showMyInbox,
      showMyOutbox,
      showExecutiveApprovals,
      showMyTasksAlerts,
      showOfficeInbox,
      showRegisterCorrespondence,
      showOfficeOutbox,
      showOfficeDispatched,
      showMyCases,
      showOfficeCases,
      showAllCases,
      showSearchDocuments,
      showContentCapture,
      showFormsLibrary,
      showVerifySeal,
      showRecordsArchives,
      showPhysicalRecords,
      showAssistantCalendar,
      showAnalyticsReports,
      showExecutiveDashboard,
      showPerformanceAnalytics,
      showReportsIntelligence,
      showAdministration,
      showOrganizationOffices,
      showUsersRoles,
      showWorkflowSLA,
      showRecordsGovernance,
      showTemplates,
      showAuditCompliance,
      showSystemHealth,
      showExternalEntities,
      showDivisionAnalytics,
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
    scopeChecks,
    roles,
    offices,
  ]);
}

