# Administration

## Overview
System administration modules for user management, organization structure, roles, and system settings.

## Modules
| Module | Path | Description |
|--------|------|-------------|
| Organization | `/admin/organization` | Directorates, Divisions, Departments, Offices, Roles |
| Users & Roles | `/admin/users-roles` | User management, role assignment, permissions |
| Workflow & SLA | `/admin/workflow-sla` | SLA config, escalation rules, templates |
| Templates Hub | `/admin/templates-hub` | Document/correspondence templates |
| Audit & Compliance | `/audit` | Activity logs, compliance reports |

## Key Models
- `organization/` - `Directorate`, `Division`, `Department`, `Office`, `Role`, `OfficeMembership`
- `accounts/` - `User`, `ExecutiveSignature`, `SignatureTemplate`, `UserSignaturePreferences`
- `audit/` - `ActivityLog`

## Key Features
- Hierarchical organization (Directorate → Division → Department → Office)
- Role-based permissions with `system_role` and `grade_level`
- Executive signature/seal management
- Audit trail with `ActivityLog`

## Key Services
- `organization/services.py` - Hierarchy management
- `accounts/services.py` - `SealGenerationService`
- `audit/services.py` - `AuditService`

## Recent Changes
- Consolidated admin grade checks in `common/grade_utils.py` (`DIRECTORATE_GRADES`, `DIVISION_GRADES`, `DEPARTMENT_GRADES`)
- Removed unused management commands (`fix_office_names`, `setup_role_permissions`)
- Centralized sidebar constants in `docs/architecture/sidebar-restructure.md`
