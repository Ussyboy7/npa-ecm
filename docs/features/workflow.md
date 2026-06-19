# Workflow Engine

## Overview
Multi-step approval workflows with parallel/sequential routing, SLA tracking, and escalation.

## Key Models
- `workflow/` - `WorkflowTemplate`, `WorkflowStep`, `ApprovalTask`, `TaskAction`
- `WorkflowStep` - Sequential or parallel, with role/grade-based assignment

## Key Features
- Visual workflow designer (templates hub)
- Parallel and sequential routing
- SLA tracking with escalation
- Task delegation and reassignment
- Digital signature integration

## Key Services
- `workflow/services.py` - Workflow execution, task assignment
- `analytics/services.py` - SLA metrics

## SLA Configuration
- `SLAConfiguration` model with targets by priority/grade
- `EscalationRule` for automatic escalation
- `SLAConfiguration` targets by priority and grade level

## Constants
- `SLA_TARGETS` in `analytics/services.py`
- `LEADERSHIP_GRADES` in `common/grade_utils.py`
