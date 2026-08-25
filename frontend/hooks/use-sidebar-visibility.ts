import { useMemo } from 'react';
import { useCurrentUser } from './use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useRoleChecks } from './use-role-checks';


export interface SidebarVisibility {
  // My Workspace
  showDashboard: boolean;
  showMyInbox: boolean;
  showMySent: boolean;
  showExecutiveApprovals: boolean;
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
  const { officeMemberships, assistantAssignments, roles, offices } = useOrganization();
  const roleChecks = useRoleChecks();

  return useMemo(() => {
    if (!currentUser) {
      return {
        showDashboard: false,
        showMyInbox: false,
        showMySent: false,
        showExecutiveApprovals: false,
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

    // Super Admin should see EVERYTHING - check this first
    const isSuperAdmin = roleChecks.isSuperAdmin;
    
    if (isSuperAdmin) {
      return {
        showDashboard: true,
        showMyInbox: true,
        showMySent: true,
        showExecutiveApprovals: true,
        showNotifications: false,
        showOfficeInbox: true,
        showRegisterCorrespondence: true,
        showRegisteredCorrespondence: true,
        showOfficeSent: true,
        showMyCases: true,
        showOfficeCases: true,
        showAllCases: true,
        showCreateCase: true,
        showCaseTemplates: true,
        showSearchDocuments: true,
        showContentCapture: true,
        showFOIA: true,
        showFormsLibrary: true,
        showVerifySeal: true,
        showRecordsArchives: true,
        showPhysicalRecords: true,
        showDocumentsList: true,
        showNewDocument: true,
        showCaseAnalytics: true,
        showAssistantCalendar: true,
        showAnalyticsReports: true,
        showExecutiveDashboard: true,
        showPerformanceAnalytics: true,
        showAdministration: true,
        showAdminDashboard: true,
        showOrganizationOffices: true,
        showUsersRoles: true,
        showWorkflowSLA: true,
        showRecordsGovernance: true,
        showTemplates: true,
        showAuditCompliance: true,
        showAuditForms: true,
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
    const hasExecutiveAssignment =
      roleChecks.isSecretary &&
      assistantAssignments.some((a) => String(a.assistantId) === String(currentUser.id));
    const hasOrgUnit = Boolean(
      currentUser.division || currentUser.department || currentUser.directorate,
    );
    const registryOn = section("sidebar_show_offices_registry", true);
    const casesOn = section("sidebar_show_case_management", true);
    const documentsOn = section("sidebar_show_documents_records", true);
    const analyticsOn = section("sidebar_show_analytics_reports", has("can_access_analytics"));
    const adminOn = section("sidebar_show_administration", has("can_access_administration"));
    const integrationOn = section("sidebar_show_integration", has("can_manage_integration"));

    const showDashboard = true;
    const canAccessCorrespondence =
      hasOfficeMembership ||
      has("can_minute_correspondence") ||
      has("can_treat_correspondence") ||
      has("can_register_correspondence") ||
      has("can_access_approvals") ||
      has("can_view_all_correspondence") ||
      has("can_view_registry") ||
      has("can_distribute") ||
      has("can_archive");
    const showMyInbox = canAccessCorrespondence;
    const showMySent = canAccessCorrespondence;
    const showNotifications = false;
    const showExecutiveApprovals =
      has("can_access_approvals") || (roleChecks.isSecretary && hasExecutiveAssignment);

    const showOfficeInbox = registryOn && hasOfficeQueueRole;
    const showOfficeSent = registryOn && hasOfficeQueueRole;
    const showRegisterCorrespondence =
      registryOn &&
      has("can_register_correspondence") &&
      (hasOfficeMembership || has("can_view_registry") || roleChecks.isRegistry);
    const showRegisteredCorrespondence =
      registryOn &&
      (has("can_view_registry") || has("can_view_all_correspondence") || has("can_register_correspondence"));

    const showMyCases = casesOn;
    const showOfficeCases = casesOn && hasOfficeQueueRole;
    const showCreateCase = casesOn;
    const showCaseTemplates = casesOn;
    const showAllCases = casesOn && has("can_view_all_correspondence");

    const showSearchDocuments = documentsOn && has("can_access_document_management");
    const showContentCapture = documentsOn && has("can_access_document_management");
    const showFOIA = documentsOn;
    const showFormsLibrary = documentsOn;
    const showVerifySeal = documentsOn;
    const showRecordsArchives = documentsOn && (hasOfficeMembership || hasOrgUnit);
    const showPhysicalRecords =
      documentsOn && (has("can_archive") || showRecordsArchives || showRegisterCorrespondence);
    const showDocumentsList = documentsOn && has("can_access_document_management");
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
    const showUsersRoles =
      adminOn && (has("can_manage_users") || has("can_manage_roles"));
    const showWorkflowSLA = adminOn && has("can_manage_org_structure");
    const showRecordsGovernance = adminOn && has("can_access_records_governance");
    const showTemplates =
      (adminOn && has("can_access_administration")) || casesOn;
    const showAuditCompliance = adminOn && has("can_access_audit_compliance");
    const showAuditForms = adminOn && has("can_access_audit_compliance");
    const showSystemHealth = has("can_access_system_health");
    const showDrmPolicies = has("can_manage_drm_policies");
    const showLegacyImport = has("can_access_system_health");
    const showHelpdeskQueue = has("can_access_system_health");
    const showExternalEntities =
      adminOn && (has("can_access_administration") || showRegisterCorrespondence);
    const showIntegration = integrationOn;
    const showIntegrationHub = integrationOn;

    const showAdminDashboard =
      has("can_access_system_health") || has("can_manage_users");

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
      showMySent,
      showExecutiveApprovals,
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
  ]);
}

