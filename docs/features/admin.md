# Administration

## Overview
System administration modules for user management, organization structure, roles, records governance, DRM, and system settings.

## Modules
| Module | Path | Description |
|--------|------|-------------|
| Admin hub | `/admin` | Landing for admin functions |
| Organization | `/admin/organization` | Directorates, Divisions, Departments, Offices, Roles |
| Users & Roles | `/admin/users-roles` | User management, role assignment, permissions |
| Workflow & SLA | `/admin/workflow-sla` | SLA config, escalation rules, templates |
| Templates Hub | `/admin/templates-hub` | Document/correspondence templates |
| Records governance | `/admin/records-governance` | Retention schedules, legal holds, eDiscovery export |
| DRM policies | `/admin/drm-policies` | Document rights policies |
| Legacy import | `/admin/legacy-import` | Bulk legacy record import UI |
| External entities | `/admin/external-entities` | Ministries/agencies directory |
| System Health | `/admin/system-health` | Service status (ICT) |
| Support Queue | `/admin/helpdesk` | Helpdesk ticket queue (ICT) |
| Audit & Compliance | `/audit` | Activity logs, compliance export bundles |

## Key Models
- `organization/` - `Directorate`, `Division`, `Department`, `Office`, `Role`, `OfficeMembership`
- `accounts/` - `User`, `ExecutiveSignature`, `SignatureTemplate`, `UserSignaturePreferences`
- `audit/` - `ActivityLog`
- `records/` - `RetentionSchedule`, `LegalHold`, `DisposalRequest`
- `dms/` - `DocumentRightsPolicy`

## Key Features
- Hierarchical organization (Directorate → Division → Department → Office)
- Role-based permissions with `system_role` and `grade_level`
- Executive signature/seal management
- Audit trail with tamper-evident compliance export
- Records retention, legal hold, eDiscovery ZIP export
- DRM policy assignment and download enforcement

## Key Services
- `organization/services.py` - Hierarchy management
- `accounts/services.py` - `SealGenerationService`
- `audit/services.py` - `AuditService`
- `records/ediscovery_export.py` - Legal hold bundle builder

## Deploy commands
- `setup_role_permissions` — run on every deploy (CI + `docker-entrypoint.sh`)
- `check_environment_parity --strict` — env/config drift check
- `import_legacy_records` — CLI for legacy migration batches
- `ensure_dev_login_users` — local Docker dev login bootstrap only

## Recent Changes
- Consolidated admin grade checks in `common/grade_utils.py`
- Sidebar IA: admin sub-groups (Org & access, Policy & compliance, Operations)
- ICT-only visibility for System Health, DRM, Legacy Import, Support Queue
