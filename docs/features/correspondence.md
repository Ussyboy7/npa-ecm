# Correspondence Management

## Overview
Handles letters, memos, official communications with approval workflows, digital signatures, and executive seals.

## Key Features
- Letter/memo creation and routing
- Multi-step approval workflows
- Digital signatures (user) and executive seals (MD/ED/GM)
- Parallel and sequential routing
- Delegation and recall

## Architecture
- **Backend**: `correspondence/` app with `Correspondence`, `Minute`, `Case`, `Delegation`, `Distribution` models
- **Frontend**: `app/correspondence/`, `components/correspondence/`
- **Seal Flow**: `architecture/signature-seal-flow.md`

## Key Components
- `CorrespondenceRegisterForm` - Multi-step registration wizard
- `MinuteModal` / `MinuteDetailModal` - Approval with signature/seal
- `ActionsPanel` - Context-aware actions
- `TreatmentModal` / `MinuteDetailModal` - Minute management
- `DistributionSelector` - Routing with parallel branches

## Key Services
- `correspondence/services.py` - `CorrespondenceService`, `SealGenerationService`
- `lib/correspondence-helpers.ts` - Frontend helpers
- `lib/correspondence-storage.ts` - API client

## Seal Flow
See `architecture/signature-seal-flow.md` for complete flow:
1. Executive configures signature/seal in Settings
2. Executive approves minute → backend generates seal via `SealGenerationService`
3. Seal stored in `DocumentSeal`, linked to `Minute.seal_applied`
4. Executive Approvals page shows only sealed approvals

## Key Models
- `Correspondence` - Core letter/memo
- `Minute` - Approval/rejection with `signature_payload` or `seal_applied`
- `Case` - Case management linked to correspondence
- `Delegation` - Temporary authority delegation

## Recent Changes
- Consolidated permission checks in `common/permissions.py` (`IsSystemAdminRole`, `IsExecutiveGrade`)
- Centralized grade/role constants in `common/grade_utils.py`
- Removed unused management commands (backfill, seed, diagnose)
