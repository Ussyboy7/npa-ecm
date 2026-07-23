# Administration

## Overview
System administration modules for user management, organization structure, roles, records governance, DRM policies, and system settings.

## Modules
| Module | Path | Description |
|--------|------|-------------|
| Admin hub | `/admin` | Landing for admin functions |
| Organization | `/admin/organization` | Directorates, Divisions, Departments, Offices, Locations, Roles |
| Users & Roles | `/admin/users-roles` | User management, role assignment, permissions |
| Workflow & SLA | `/admin/workflow-sla` | SLA config, escalation rules, templates |
| Templates Hub | `/admin/templates-hub` | Document/correspondence/workflow/form templates |
| Records governance | `/admin/records-governance` | Retention schedules, legal holds, eDiscovery export |
| DRM policies | `/admin/drm-policies` | Document rights policies (table layout, view/edit/delete dialogs, inline active toggle) |
| Legacy import | `/admin/legacy-import` | Bulk legacy record import UI |
| External entities | `/admin/external-entities` | Ministries/agencies directory |
| System Health | `/admin/system-health` | Service status (ICT) |
| Support Queue | `/admin/helpdesk` | Helpdesk ticket queue (ICT) |
| Audit & Compliance | `/audit` | Activity logs, compliance export bundles |

## Key Models
- `organization/` — `Directorate`, `Division`, `Department`, `Office` (has `location` FK), `Role`, `OfficeMembership`, `Location`
- `accounts/` — `User`, `ExecutiveSignature`, `SignatureTemplate`, `UserSignaturePreferences`
- `audit/` — `ActivityLog`
- `records/` — `RetentionSchedule`, `LegalHold`, `DisposalRequest`
- `dms/` — `DocumentRightsPolicy`

## Key Features
- Hierarchical organization (Directorate → Division → Department → Office) with Locations
- Role-based permissions with `system_role`, `grade_level`, and permission presets
- Executive signature/seal management
- Audit trail with tamper-evident compliance export
- Records retention, legal hold, eDiscovery ZIP export
- DRM policy assignment and download enforcement
- Office CRUD with location assignment
- Locations CRUD tab on `/admin/organization`
- Templates hub with inline create dialog (Documents, Minutes, Workflows, Forms tabs; preview modals)

## Key Services
- `organization/services.py` — Hierarchy management
- `accounts/services.py` — `SealGenerationService`
- `audit/services.py` — `AuditService`
- `records/ediscovery_export.py` — Legal hold bundle builder

## Deploy commands
- `setup_role_permissions` — run on every deploy (CI + `docker-entrypoint.sh`)
- `check_environment_parity --strict` — env/config drift check
- `import_legacy_records` — CLI for legacy migration batches
- `ensure_dev_login_users` — local Docker dev login bootstrap only

## Recent Changes
- **DRM Policies**: Complete UI rewrite — table layout, view/edit/delete dialogs (consistent `sm:max-w-lg`), inline active toggle, unused import cleanup
- **Organization**: Office now has `location` FK to `correspondence.Location`; Locations CRUD tab on org page; Office edit dialog with location dropdown
- **Templates Hub**: Form/workflow preview panels changed from inline cards to modals; "Create form" changed from navigation to inline dialog with name/category/description
- **Role presets**: Added "Assistant General Manager" and "Principal Manager" permission presets
- **Dev login users**: `ensure_dev_login_users` now assigns hardcoded organizational unit UUIDs for test users
