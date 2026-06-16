import { useMemo } from 'react';
import { useCurrentUser } from './use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useRoleChecks } from './use-role-checks';
import { useScopeChecks } from './use-scope-checks';

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
  showTemplates: boolean;
  showAuditCompliance: boolean;

  // Integration
  showIntegration: boolean;
  showIntegrationHub: boolean;

  // System
  showSettings: boolean;
  showHelpGuides: boolean;
}

/**
 * Hook to determine sidebar visibility based on user role, scope, and permissions
 */
export function useSidebarVisibility(): SidebarVisibility {
  const { currentUser } = useCurrentUser();
  const { officeMemberships, assistantAssignments, roles } = useOrganization();
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
        showMyCases: false,
        showOfficeCases: false,
        showAllCases: false,
        showSearchDocuments: false,
        showContentCapture: false,
        showFormsLibrary: false,
        showVerifySeal: false,
        showRecordsArchives: false,
        showAnalyticsReports: false,
        showExecutiveDashboard: false,
        showPerformanceAnalytics: false,
        showReportsIntelligence: false,
        showAdministration: false,
        showOrganizationOffices: false,
        showUsersRoles: false,
        showWorkflowSLA: false,
        showTemplates: false,
        showAuditCompliance: false,
        showIntegration: false,
        showIntegrationHub: false,
        showSettings: false,
        showHelpGuides: false,
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
        showMyCases: true,
        showOfficeCases: true,
        showAllCases: true,
        showSearchDocuments: true,
        showContentCapture: true,
        showFormsLibrary: true,
        showVerifySeal: true,
        showRecordsArchives: true,
        showAnalyticsReports: true,
        showExecutiveDashboard: true,
        showPerformanceAnalytics: true,
        showReportsIntelligence: true,
        showAdministration: true,
        showOrganizationOffices: true,
        showUsersRoles: true,
        showWorkflowSLA: true,
        showTemplates: true,
        showAuditCompliance: true,
        showIntegration: true,
        showIntegrationHub: true,
        showSettings: true,
        showHelpGuides: true,
      };
    }

    // Check if user's role has custom sidebar visibility configuration
    const userRole = roles.find(r => r.id === currentUser.systemRole || r.name === currentUser.systemRole);
    const rolePermissions = userRole?.permissions || {};
    const hasSidebarPermissions = Object.keys(rolePermissions).some(key => key.startsWith('sidebar_show_'));
    
    // Continue with default logic first, then override with role permissions if they exist

    // Get user's office IDs
    const userOfficeIds = officeMemberships
      .filter((m) => m.userId === currentUser.id && m.isActive)
      .map((m) => m.officeId);

    const hasOfficeMembership = userOfficeIds.length > 0;

    // Check if secretary has executive assignment
    const hasExecutiveAssignment =
      roleChecks.isSecretary &&
      assistantAssignments.some((a) => String(a.assistantId) === String(currentUser.id));

    // Check if user has division/department (for Records & Archives)
    const hasOrgUnit = Boolean(
      currentUser.division || currentUser.department || currentUser.directorate
    );

    // My Workspace - All users can see
    const showDashboard = true;
    const showMyInbox = true;
    const showMyOutbox = true;
    const showMyTasksAlerts = true;

    // Executive Approvals - Management grades + Secretary (when assigned)
    const showExecutiveApprovals =
      roleChecks.isManagement ||
      (roleChecks.isSecretary && hasExecutiveAssignment);

    // Offices & Registry
    const showOfficeInbox = hasOfficeMembership;
    const showOfficeOutbox = hasOfficeMembership;
    
    // Register Correspondence - Management + Secretary + Registry
    const showRegisterCorrespondence =
      roleChecks.isManagement ||
      roleChecks.isSecretary ||
      roleChecks.isRegistry;

    // Case Management
    const showMyCases = true; // All users
    const showOfficeCases = hasOfficeMembership;
    // All Cases - Based on scope (AGM→GM→ED→MD) + Secretary (when assigned)
    const showAllCases =
      scopeChecks.caseScope !== 'personal' ||
      (roleChecks.isSecretary && hasExecutiveAssignment);

    // Documents & Records - All users can see
    const showSearchDocuments = true;
    const showContentCapture = true;
    const showFormsLibrary = true;
    const showVerifySeal = true;
    // Records & Archives - Office membership or org unit membership
    const showRecordsArchives = hasOfficeMembership || hasOrgUnit;

    // Analytics & Reports
    const showAnalyticsReports =
      roleChecks.isMD ||
      roleChecks.isED ||
      roleChecks.isGM ||
      roleChecks.isAGM ||
      (roleChecks.isSecretary && hasExecutiveAssignment);

    // Executive Dashboard - MD, ED only
    const showExecutiveDashboard = roleChecks.isMD || roleChecks.isED;

    // Performance Analytics & Reports - Management + Secretary (when assigned)
    const showPerformanceAnalytics = showAnalyticsReports;
    const showReportsIntelligence = showAnalyticsReports;

    // Administration
    const showAdministration =
      roleChecks.isMD ||
      roleChecks.isED ||
      roleChecks.isGM ||
      roleChecks.isAGM;

    // Organization & Offices - MD, ED, GM only
    const showOrganizationOffices =
      roleChecks.isMD ||
      roleChecks.isED ||
      roleChecks.isGM;

    // Users & Roles - MD, ED, GM, AGM (department scope)
    const showUsersRoles =
      roleChecks.isMD ||
      roleChecks.isED ||
      roleChecks.isGM ||
      roleChecks.isAGM;

    // Workflow & SLA - MD, ED, GM only
    const showWorkflowSLA =
      roleChecks.isMD ||
      roleChecks.isED ||
      roleChecks.isGM;

    // Templates - All users
    const showTemplates = true;

    // Audit & Compliance - MD, ED, GM, AGM (department scope)
    const showAuditCompliance =
      roleChecks.isMD ||
      roleChecks.isED ||
      roleChecks.isGM ||
      roleChecks.isAGM;

    // Integration
    const showIntegration =
      roleChecks.isMD ||
      roleChecks.isED ||
      roleChecks.isGM ||
      roleChecks.isAGM ||
      roleChecks.isSystemAdmin;

    const showIntegrationHub = showIntegration;

    // System - All users
    const showSettings = true;
    const showHelpGuides = true;

    // Build default visibility
    const defaultVisibility: SidebarVisibility = {
      showDashboard,
      showMyInbox,
      showMyOutbox,
      showExecutiveApprovals,
      showMyTasksAlerts,
      showOfficeInbox,
      showRegisterCorrespondence,
      showOfficeOutbox,
      showMyCases,
      showOfficeCases,
      showAllCases,
      showSearchDocuments,
      showContentCapture,
      showFormsLibrary,
      showVerifySeal,
      showRecordsArchives,
      showAnalyticsReports,
      showExecutiveDashboard,
      showPerformanceAnalytics,
      showReportsIntelligence,
      showAdministration,
      showOrganizationOffices,
      showUsersRoles,
      showWorkflowSLA,
      showTemplates,
      showAuditCompliance,
      showIntegration,
      showIntegrationHub,
      showSettings,
      showHelpGuides,
    };

    // If role has sidebar permissions configured, override defaults
    if (hasSidebarPermissions) {
      // Override with role-based sidebar visibility
      if (rolePermissions.sidebar_show_my_workspace === true) {
        defaultVisibility.showDashboard = true;
        defaultVisibility.showMyInbox = true;
        defaultVisibility.showMyOutbox = true;
        defaultVisibility.showExecutiveApprovals = true;
        defaultVisibility.showMyTasksAlerts = true;
      } else if (rolePermissions.sidebar_show_my_workspace === false) {
        defaultVisibility.showDashboard = false;
        defaultVisibility.showMyInbox = false;
        defaultVisibility.showMyOutbox = false;
        defaultVisibility.showExecutiveApprovals = false;
        defaultVisibility.showMyTasksAlerts = false;
      }

      if (rolePermissions.sidebar_show_offices_registry === true) {
        defaultVisibility.showOfficeInbox = hasOfficeMembership; // Still need office membership
        defaultVisibility.showRegisterCorrespondence = true;
        defaultVisibility.showOfficeOutbox = hasOfficeMembership; // Still need office membership
      } else if (rolePermissions.sidebar_show_offices_registry === false) {
        defaultVisibility.showOfficeInbox = false;
        defaultVisibility.showRegisterCorrespondence = false;
        defaultVisibility.showOfficeOutbox = false;
      }

      if (rolePermissions.sidebar_show_case_management === true) {
        defaultVisibility.showMyCases = true;
        defaultVisibility.showOfficeCases = hasOfficeMembership; // Still need office membership
        defaultVisibility.showAllCases = true;
      } else if (rolePermissions.sidebar_show_case_management === false) {
        defaultVisibility.showMyCases = false;
        defaultVisibility.showOfficeCases = false;
        defaultVisibility.showAllCases = false;
      }

      if (rolePermissions.sidebar_show_documents_records === true) {
        defaultVisibility.showSearchDocuments = true;
        defaultVisibility.showContentCapture = true;
        defaultVisibility.showFormsLibrary = true;
        defaultVisibility.showVerifySeal = true;
        defaultVisibility.showRecordsArchives = true;
      } else if (rolePermissions.sidebar_show_documents_records === false) {
        defaultVisibility.showSearchDocuments = false;
        defaultVisibility.showContentCapture = false;
        defaultVisibility.showFormsLibrary = false;
        defaultVisibility.showVerifySeal = false;
        defaultVisibility.showRecordsArchives = false;
      }

      if (rolePermissions.sidebar_show_analytics_reports === true) {
        defaultVisibility.showAnalyticsReports = true;
        defaultVisibility.showExecutiveDashboard = true;
        defaultVisibility.showPerformanceAnalytics = true;
        defaultVisibility.showReportsIntelligence = true;
      } else if (rolePermissions.sidebar_show_analytics_reports === false) {
        defaultVisibility.showAnalyticsReports = false;
        defaultVisibility.showExecutiveDashboard = false;
        defaultVisibility.showPerformanceAnalytics = false;
        defaultVisibility.showReportsIntelligence = false;
      }

      if (rolePermissions.sidebar_show_administration === true) {
        defaultVisibility.showAdministration = true;
        defaultVisibility.showOrganizationOffices = true;
        defaultVisibility.showUsersRoles = true;
        defaultVisibility.showWorkflowSLA = true;
        defaultVisibility.showTemplates = true;
        defaultVisibility.showAuditCompliance = true;
      } else if (rolePermissions.sidebar_show_administration === false) {
        defaultVisibility.showAdministration = false;
        defaultVisibility.showOrganizationOffices = false;
        defaultVisibility.showUsersRoles = false;
        defaultVisibility.showWorkflowSLA = false;
        defaultVisibility.showTemplates = false;
        defaultVisibility.showAuditCompliance = false;
      }

      if (rolePermissions.sidebar_show_integration === true) {
        defaultVisibility.showIntegration = true;
        defaultVisibility.showIntegrationHub = true;
      } else if (rolePermissions.sidebar_show_integration === false) {
        defaultVisibility.showIntegration = false;
        defaultVisibility.showIntegrationHub = false;
      }
    }

    return defaultVisibility;
  }, [currentUser, officeMemberships, assistantAssignments, roleChecks, scopeChecks, roles]);
}

