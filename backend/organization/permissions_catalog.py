"""Canonical role permission keys shared by API, admin UI, and enforcement."""

from __future__ import annotations

from typing import Any

# Keys match frontend/lib/role-permissions.ts
PERMISSION_KEYS: tuple[str, ...] = (
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
    "can_manage_integration",
    "sidebar_show_my_workspace",
    "sidebar_show_offices_registry",
    "sidebar_show_case_management",
    "sidebar_show_documents_records",
    "sidebar_show_analytics_reports",
    "sidebar_show_administration",
    "sidebar_show_integration",
)

PERMISSION_LABELS: dict[str, str] = {
    "can_register_correspondence": "Register Correspondence",
    "can_minute_correspondence": "Minute & Forward",
    "can_treat_correspondence": "Treat & Respond",
    "can_distribute": "Add Distribution (CC)",
    "can_archive": "Archive Correspondence",
    "can_archive_department": "Archive at Department Level",
    "can_archive_division": "Archive at Division Level",
    "can_archive_directorate": "Archive at Directorate Level",
    "can_view_all_correspondence": "View All Correspondence",
    "can_view_registry": "View Correspondence Registry",
    "can_classify_approval": "Classify Approval Level",
    "can_access_document_management": "Access Document Management",
    "can_create_documents": "Create Documents",
    "can_edit_documents": "Edit Documents",
    "can_delete_documents": "Delete Documents",
    "can_share_documents": "Share Documents",
    "can_access_approvals": "Access Approvals",
    "can_approve": "Approve Documents",
    "can_reject": "Reject Documents",
    "can_access_administration": "Access Administration",
    "can_manage_users": "Manage Users",
    "can_manage_roles": "Manage Roles",
    "can_manage_org_structure": "Manage Organization Structure",
    "can_access_analytics": "Access Analytics",
    "can_access_reports": "Access Reports",
    "can_access_executive_dashboard": "Access Executive Dashboard",
    "can_access_system_health": "Access System Health (ICT)",
    "can_manage_drm_policies": "Manage DRM Policies",
    "can_access_records_governance": "Access Records Governance",
    "can_access_audit_compliance": "Access Audit & Compliance Export",
    "can_manage_integration": "Manage Integration Hub",
    "sidebar_show_my_workspace": "Show My Workspace Section",
    "sidebar_show_offices_registry": "Show Offices & Registry Section",
    "sidebar_show_case_management": "Show Case Management Section",
    "sidebar_show_documents_records": "Show Documents & Records Section",
    "sidebar_show_analytics_reports": "Show Analytics & Reports Section",
    "sidebar_show_administration": "Show Administration Section",
    "sidebar_show_integration": "Show Integration Hub",
}

ROLE_PERMISSION_PRESETS: dict[str, dict[str, bool]] = {
    "Super Admin": {key: True for key in PERMISSION_KEYS},
    "Secretary": {
        "can_register_correspondence": True,
        "can_minute_correspondence": True,
        "can_treat_correspondence": True,
        "can_distribute": True,
        "can_archive": True,
        "can_archive_department": True,
        "can_archive_division": True,
        "can_archive_directorate": True,
        "can_view_all_correspondence": True,
        "can_view_registry": True,
        "can_access_document_management": True,
        "can_create_documents": True,
        "can_edit_documents": True,
        "can_share_documents": True,
        "can_access_approvals": True,
        "can_reject": True,
        "can_access_analytics": True,
        "can_access_reports": True,
    },
    "Personal Assistant": {
        "can_minute_correspondence": True,
        "can_treat_correspondence": True,
        "can_distribute": True,
        "can_archive": True,
        "can_archive_department": True,
        "can_view_all_correspondence": True,
        "can_access_document_management": True,
        "can_create_documents": True,
        "can_edit_documents": True,
        "can_share_documents": True,
        "can_access_approvals": True,
        "can_reject": True,
    },
    "Managing Director": {
        "can_minute_correspondence": True,
        "can_treat_correspondence": True,
        "can_distribute": True,
        "can_archive": True,
        "can_archive_department": True,
        "can_archive_division": True,
        "can_archive_directorate": True,
        "can_view_all_correspondence": True,
        "can_view_registry": True,
        "can_classify_approval": True,
        "can_access_document_management": True,
        "can_create_documents": True,
        "can_edit_documents": True,
        "can_share_documents": True,
        "can_access_approvals": True,
        "can_approve": True,
        "can_reject": True,
        "can_access_administration": True,
        "can_manage_users": True,
        "can_manage_roles": True,
        "can_manage_org_structure": True,
        "can_access_analytics": True,
        "can_access_reports": True,
        "can_access_executive_dashboard": True,
        "can_access_records_governance": True,
        "can_access_audit_compliance": True,
        "can_manage_integration": True,
    },
    "Executive Director": {
        "can_minute_correspondence": True,
        "can_treat_correspondence": True,
        "can_distribute": True,
        "can_archive": True,
        "can_archive_department": True,
        "can_archive_division": True,
        "can_archive_directorate": True,
        "can_view_all_correspondence": True,
        "can_view_registry": True,
        "can_classify_approval": True,
        "can_access_document_management": True,
        "can_create_documents": True,
        "can_edit_documents": True,
        "can_share_documents": True,
        "can_access_approvals": True,
        "can_reject": True,
        "can_access_administration": True,
        "can_manage_users": True,
        "can_manage_roles": True,
        "can_manage_org_structure": True,
        "can_access_analytics": True,
        "can_access_reports": True,
        "can_access_executive_dashboard": True,
        "can_access_records_governance": True,
        "can_access_audit_compliance": True,
        "can_manage_integration": True,
    },
    "General Manager": {
        "can_minute_correspondence": True,
        "can_treat_correspondence": True,
        "can_distribute": True,
        "can_archive": True,
        "can_archive_department": True,
        "can_archive_division": True,
        "can_view_registry": True,
        "can_classify_approval": True,
        "can_access_document_management": True,
        "can_create_documents": True,
        "can_edit_documents": True,
        "can_share_documents": True,
        "can_access_approvals": True,
        "can_reject": True,
        "can_access_administration": True,
        "can_manage_users": True,
        "can_manage_roles": True,
        "can_manage_org_structure": True,
        "can_access_analytics": True,
        "can_access_reports": True,
        "can_access_records_governance": True,
        "can_manage_integration": True,
    },
    "Assistant General Manager": {
        "can_minute_correspondence": True,
        "can_treat_correspondence": True,
        "can_distribute": True,
        "can_archive": True,
        "can_archive_department": True,
        "can_archive_division": True,
        "can_view_registry": True,
        "can_classify_approval": True,
        "can_access_document_management": True,
        "can_create_documents": True,
        "can_edit_documents": True,
        "can_share_documents": True,
        "can_access_approvals": True,
        "can_reject": True,
        "can_access_administration": True,
        "can_manage_users": True,
        "can_manage_roles": True,
        "can_manage_org_structure": True,
        "can_access_analytics": True,
        "can_access_reports": True,
        "can_access_records_governance": True,
        "can_manage_integration": True,
    },
    "Principal Manager": {
        "can_minute_correspondence": True,
        "can_treat_correspondence": True,
        "can_distribute": True,
        "can_archive": True,
        "can_archive_department": True,
        "can_archive_division": True,
        "can_view_registry": True,
        "can_access_document_management": True,
        "can_create_documents": True,
        "can_edit_documents": True,
        "can_share_documents": True,
        "can_access_approvals": True,
        "can_reject": True,
        "can_access_administration": True,
        "can_manage_users": True,
        "can_manage_roles": True,
        "can_manage_org_structure": True,
        "can_access_analytics": True,
        "can_access_reports": True,
        "can_access_records_governance": True,
        "can_manage_integration": True,
    },
    "Senior Manager": {
        "can_minute_correspondence": True,
        "can_treat_correspondence": True,
        "can_distribute": True,
        "can_archive": True,
        "can_archive_department": True,
        "can_archive_division": True,
        "can_view_registry": True,
        "can_access_document_management": True,
        "can_create_documents": True,
        "can_edit_documents": True,
        "can_share_documents": True,
        "can_access_approvals": True,
        "can_reject": True,
        "can_access_administration": True,
        "can_manage_users": True,
        "can_manage_roles": True,
        "can_manage_org_structure": True,
        "can_access_analytics": True,
        "can_access_reports": True,
        "can_access_records_governance": True,
        "can_manage_integration": True,
    },
    "Manager": {
        "can_minute_correspondence": True,
        "can_treat_correspondence": True,
        "can_distribute": True,
        "can_archive": True,
        "can_archive_department": True,
        "can_archive_division": True,
        "can_view_registry": True,
        "can_access_document_management": True,
        "can_create_documents": True,
        "can_edit_documents": True,
        "can_share_documents": True,
        "can_access_approvals": True,
        "can_reject": True,
        "can_access_administration": True,
        "can_manage_users": True,
        "can_manage_roles": True,
        "can_manage_org_structure": True,
        "can_access_analytics": True,
        "can_access_reports": True,
        "can_access_records_governance": True,
        "can_manage_integration": True,
    },
    "Assistant Manager": {
        "can_register_correspondence": True,
        "can_treat_correspondence": True,
        "can_access_document_management": True,
        "can_create_documents": True,
        "can_edit_documents": True,
    },
    "Senior Officer": {
        "can_register_correspondence": True,
        "can_treat_correspondence": True,
        "can_access_document_management": True,
        "can_create_documents": True,
        "can_edit_documents": True,
    },
    "Officer I": {
        "can_register_correspondence": True,
        "can_treat_correspondence": True,
        "can_access_document_management": True,
        "can_create_documents": True,
        "can_edit_documents": True,
    },
    "Officer II": {
        "can_register_correspondence": True,
        "can_treat_correspondence": True,
        "can_access_document_management": True,
        "can_create_documents": True,
        "can_edit_documents": True,
    },
    "Assistant": {
        "can_minute_correspondence": True,
        "can_treat_correspondence": True,
        "can_distribute": True,
        "can_archive": True,
        "can_archive_department": True,
        "can_view_all_correspondence": True,
        "can_access_document_management": True,
        "can_create_documents": True,
        "can_edit_documents": True,
        "can_share_documents": True,
        "can_access_approvals": True,
        "can_reject": True,
    },
    "Officer": {
        "can_register_correspondence": True,
        "can_treat_correspondence": True,
        "can_access_document_management": True,
        "can_create_documents": True,
        "can_edit_documents": True,
    },
    "Registry Officer": {
        "can_register_correspondence": True,
        "can_minute_correspondence": True,
        "can_treat_correspondence": True,
        "can_distribute": True,
        "can_view_registry": True,
        "can_access_document_management": True,
        "can_create_documents": True,
        "can_edit_documents": True,
    },
    "System Administrator": {
        "can_access_document_management": True,
        "can_create_documents": True,
        "can_edit_documents": True,
        "can_access_administration": True,
        "can_manage_users": True,
        "can_manage_roles": True,
        "can_manage_org_structure": True,
        "can_access_system_health": True,
        "can_manage_drm_policies": True,
        "can_access_records_governance": True,
        "can_access_audit_compliance": True,
        "can_manage_integration": True,
    },
}


SIDEBAR_PERMISSION_KEYS: frozenset[str] = frozenset(
    key for key in PERMISSION_KEYS if key.startswith("sidebar_show_")
)


def normalize_permissions(raw: dict[str, Any] | None) -> dict[str, bool]:
    """Return a dict with all known keys as booleans.

    Sidebar visibility keys default to True when unset so management roles are not
    hidden behind section toggles that were never configured in a preset. Individual
    nav items remain gated by functional permissions (e.g. can_access_analytics).
    """
    source = raw if isinstance(raw, dict) else {}
    result: dict[str, bool] = {}
    for key in PERMISSION_KEYS:
        if key in SIDEBAR_PERMISSION_KEYS:
            result[key] = bool(source.get(key, True))
        else:
            result[key] = bool(source.get(key, False))
    return result


def merge_superuser_permissions(perms: dict[str, bool]) -> dict[str, bool]:
    return {key: True for key in PERMISSION_KEYS}


def get_permission_catalog() -> list[dict[str, str]]:
    def category_for(permission_key: str) -> str:
        if permission_key.startswith("sidebar_show_"):
            return "sidebar"
        if permission_key.startswith("can_access_analytics") or permission_key.startswith("can_access_reports") or permission_key.startswith("can_access_executive_dashboard"):
            return "analytics"
        if permission_key.startswith("can_access_document_management") or permission_key.startswith("can_create_documents") or permission_key.startswith("can_edit_documents") or permission_key.startswith("can_delete_documents") or permission_key.startswith("can_share_documents"):
            return "documents"
        if permission_key.startswith("can_access_approvals") or permission_key.startswith("can_approve") or permission_key.startswith("can_reject") or permission_key.startswith("can_classify"):
            return "workflow"
        if permission_key.startswith("can_register_correspondence") or permission_key.startswith("can_minute_correspondence") or permission_key.startswith("can_treat_correspondence") or permission_key.startswith("can_distribute") or permission_key.startswith("can_archive") or permission_key.startswith("can_view_") or permission_key.startswith("can_classify"):
            return "correspondence"
        return "administration"

    return [
        {
            "id": key,
            "label": PERMISSION_LABELS.get(key, key.replace("_", " ").title()),
            "description": PERMISSION_LABELS.get(key, key.replace("_", " ").title()),
            "category": category_for(key),
        }
        for key in PERMISSION_KEYS
    ]


def get_permission_presets() -> list[dict[str, object]]:
    return [
        {
            "name": role_name,
            "description": f"Canonical preset for {role_name}",
            "permissions": normalize_permissions(raw_permissions),
        }
        for role_name, raw_permissions in ROLE_PERMISSION_PRESETS.items()
    ]
