# Analytics & Reporting

## Overview
System analytics for correspondence, cases, SLA performance, and division performance.

## Modules
| Module | Path | Description |
|--------|------|-------------|
| Cases Analytics | `/analytics/cases` | Case volume, turnaround, completion rates |
| Executive Dashboard | `/analytics/executive` | High-level KPIs for leadership |
| Performance | `/analytics/performance` | SLA compliance, turnaround times |
| Reports | `/analytics/reports` | Custom report builder |

## Key Models
- `analytics/` - `ReportSnapshot`, `UsageMetric`, `DivisionPerformanceSnapshot`, `StaffPerformanceSnapshot`

## Key Services
- `analytics/services.py` - `AnalyticsService` with metrics computation
- `analytics/tasks.py` - Scheduled report generation

## Key Features
- SLA tracking with `SLAConfiguration` and `EscalationRule`
- Division performance comparison
- Executive portfolio view
- Export to CSV/PDF

## Constants
Centralized in `common/grade_utils.py`:
- `LEADERSHIP_GRADES` - MDCS, EDCS, MSS1, MSS2
- `SENIOR_MANAGEMENT_GRADES` - MSS1-MSS3 + EDCS, MDCS

## Recent Changes
- Consolidated leadership grade constants
- Removed unused management commands
- Centralized SLA constants
