/**
 * API client for SLA Configuration and Escalation Rules
 */

import { apiFetch } from './api-client';
import { logError } from './client-logger';
import { isRecord, asString } from '@/lib/type-utils';

// =============================================================================
// Types
// =============================================================================

export interface SLAConfiguration {
  id: string;
  name: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  priorityDisplay: string;
  correspondenceType: 'all' | 'incoming' | 'outgoing' | 'internal' | 'memo';
  correspondenceTypeDisplay: string;
  targetDays: number;
  warningThresholdPercent: number;
  criticalThresholdPercent: number;
  division: string | null;
  divisionDetail: {
    id: string;
    name: string;
    code: string;
  } | null;
  isActive: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface SLAConfigurationInput {
  name: string;
  priority: string;
  correspondenceType?: string;
  targetDays: number;
  warningThresholdPercent?: number;
  criticalThresholdPercent?: number;
  division?: string | null;
  isActive?: boolean;
  description?: string;
}

export interface SLATargets {
  urgent: number;
  high: number;
  medium: number;
  low: number;
}

export interface SLAChoices {
  priorities: { value: string; label: string }[];
  correspondenceTypes: { value: string; label: string }[];
}

export interface EscalationRule {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  triggerTypeDisplay: string;
  triggerConditions: Record<string, unknown>;
  actionType: string;
  actionTypeDisplay: string;
  actionConfig: Record<string, unknown>;
  emailSubjectTemplate: string;
  emailBodyTemplate: string;
  isActive: boolean;
  priorityOrder: number;
  cooldownHours: number;
  divisions: string[];
  divisionsDetail: { id: string; name: string; code: string }[];
  escalationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EscalationRuleInput {
  name: string;
  description?: string;
  triggerType: string;
  triggerConditions?: Record<string, unknown>;
  actionType: string;
  actionConfig?: Record<string, unknown>;
  emailSubjectTemplate?: string;
  emailBodyTemplate?: string;
  isActive?: boolean;
  priorityOrder?: number;
  cooldownHours?: number;
  divisions?: string[];
}

export interface EscalationRuleChoices {
  triggerTypes: { value: string; label: string }[];
  actionTypes: { value: string; label: string }[];
}

export interface EscalationRuleTestResult {
  ruleId: string;
  ruleName: string;
  matchesCount: number;
  matches: {
    id: string;
    reference: string;
    subject: string;
    priority: string;
    division: string | null;
  }[];
}

export interface Escalation {
  id: string;
  correspondence: string;
  correspondenceReference: string;
  correspondenceSubject: string;
  rule: string | null;
  ruleName: string | null;
  triggeredAt: string;
  triggerReason: string;
  actionTaken: string;
  actionDetails: Record<string, unknown>;
  notifiedEmails: string[];
  status: 'pending' | 'sent' | 'acknowledged' | 'resolved' | 'failed';
  statusDisplay: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  acknowledgedByName: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolvedByName: string | null;
  resolutionNotes: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EscalationSummary {
  total: number;
  pending: number;
  sent: number;
  acknowledged: number;
  resolvedToday: number;
  triggeredThisWeek: number;
  active: number;
}

export interface EnhancedSLAAnalytics {
  metadata: {
    rangeDays: number;
    generatedAt: string;
    divisionId?: string;
  };
  summary: {
    total: number;
    compliant: number;
    breached: number;
    atRisk: number;
    complianceRate: number;
    avgDaysToBreach: number;
  };
  byPriority: {
    priority: string;
    label: string;
    total: number;
    compliant: number;
    breached: number;
    atRisk: number;
    complianceRate: number;
  }[];
  byDivision: {
    id: string | null;
    name: string;
    total: number;
    compliant: number;
    breached: number;
    atRisk: number;
    complianceRate: number;
  }[];
  slaTargets: Record<string, number>;
}

export interface DivisionPerformanceRow {
    id: string | null;
    name: string;
    fullName: string;
    directorateId?: string | null;
    directorateName?: string | null;
    workload: number;
    completed: number;
    pending: number;
    completionRate: number;
    avgTurnaround: number;
    p50Turnaround: number;
    p90Turnaround: number;
    slaCompliant: number;
    slaBreached: number;
    slaAtRisk: number;
    slaComplianceRate: number;
    efficiency: number;
    throughput: number;
    backlog: number;
    priorityBreakdown: {
      urgent: number;
      high: number;
      medium: number;
      low: number;
    };
  }

export interface EnhancedDivisionPerformance {
  metadata: {
    rangeDays: number;
    generatedAt: string;
  };
  summary: {
    totalDivisions: number;
    totalWorkload: number;
    totalCompleted: number;
    avgCompletionRate: number;
    avgSlaCompliance: number;
  };
  divisions: DivisionPerformanceRow[];
  topPerformers: DivisionPerformanceRow[];
  needsAttention: DivisionPerformanceRow[];
}

export interface EfficiencyAnalysis {
  metadata: {
    rangeDays: number;
    generatedAt: string;
    divisionId?: string;
  };
  processEfficiency: {
    avgHandoffs: number;
    firstTouchResolutionRate: number;
    totalCorrespondence: number;
    totalCompleted: number;
  };
  timeAnalysis: {
    avgProcessingHours: number;
    peakActivityHours: number[];
    weekendActivityPercent: number;
  };
  staffMetrics: {
    activeStaff: number;
    avgItemsPerStaff: number;
    utilizationRate: number;
    topPerformers: {
      userId: string;
      name: string;
      itemsHandled: number;
      itemsCompleted: number;
      avgResponseDays: number;
    }[];
  };
  bottlenecks: {
    divisionId: string | null;
    divisionName: string;
    pendingCount: number;
    avgPendingDays: number;
  }[];
}

// =============================================================================
// Helper
// =============================================================================

const buildQuery = (params: Record<string, string | number | boolean | undefined | null>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  return query.toString();
};

const asStringOrNull = (value: unknown): string | null => {
  if (value === null) return null;
  if (value === undefined) return null;
  return asString(value);
};

const asBoolean = (value: unknown, fallback = false): boolean => (typeof value === 'boolean' ? value : fallback);

const asNumber = (value: unknown, fallback = 0): number => (typeof value === 'number' ? value : fallback);

const asOneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => {
  if (typeof value !== 'string') return fallback;
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
};

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

const asDivisionDetailOrNull = (value: unknown): SLAConfiguration['divisionDetail'] => {
  if (!isRecord(value)) return null;
  return {
    id: asString(value.id),
    name: asString(value.name),
    code: asString(value.code),
  };
};

const asDivisionsDetailArray = (value: unknown): { id: string; name: string; code: string }[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((v) => ({ id: asString(v.id), name: asString(v.name), code: asString(v.code) }));
};

// Transform snake_case API response to camelCase
const mapSLAConfiguration = (data: Record<string, unknown>): SLAConfiguration => ({
  id: asString(data.id),
  name: asString(data.name),
  priority: asOneOf(data.priority, ['urgent', 'high', 'medium', 'low'] as const, 'medium'),
  priorityDisplay: asString(data.priority_display),
  correspondenceType: asOneOf(
    data.correspondence_type,
    ['all', 'incoming', 'outgoing', 'internal', 'memo'] as const,
    'all'
  ),
  correspondenceTypeDisplay: asString(data.correspondence_type_display),
  targetDays: asNumber(data.target_days, 0),
  warningThresholdPercent: asNumber(data.warning_threshold_percent, 75),
  criticalThresholdPercent: asNumber(data.critical_threshold_percent, 90),
  division: (() => {
    if (data.division === null) return null;
    if (isRecord(data.division)) return asString(data.division.id);
    return asStringOrNull(data.division);
  })(),
  divisionDetail: data.division_detail ? asDivisionDetailOrNull(data.division_detail) : null,
  isActive: asBoolean(data.is_active, true),
  description: asString(data.description),
  createdAt: asString(data.created_at),
  updatedAt: asString(data.updated_at),
});

const mapEscalationRule = (data: Record<string, unknown>): EscalationRule => ({
  id: asString(data.id),
  name: asString(data.name),
  description: asString(data.description),
  triggerType: asString(data.trigger_type),
  triggerTypeDisplay: asString(data.trigger_type_display),
  triggerConditions: isRecord(data.trigger_conditions) ? data.trigger_conditions : {},
  actionType: asString(data.action_type),
  actionTypeDisplay: asString(data.action_type_display),
  actionConfig: isRecord(data.action_config) ? data.action_config : {},
  emailSubjectTemplate: asString(data.email_subject_template),
  emailBodyTemplate: asString(data.email_body_template),
  isActive: asBoolean(data.is_active, true),
  priorityOrder: asNumber(data.priority_order, 0),
  cooldownHours: asNumber(data.cooldown_hours, 0),
  divisions: asStringArray(data.divisions),
  divisionsDetail: asDivisionsDetailArray(data.divisions_detail),
  escalationCount: asNumber(data.escalation_count, 0),
  createdAt: asString(data.created_at),
  updatedAt: asString(data.updated_at),
});

const mapEscalation = (data: Record<string, unknown>): Escalation => ({
  id: asString(data.id),
  correspondence: asString(data.correspondence),
  correspondenceReference: asString(data.correspondence_reference),
  correspondenceSubject: asString(data.correspondence_subject),
  rule: data.rule === null ? null : asStringOrNull(data.rule),
  ruleName: data.rule_name === null ? null : asStringOrNull(data.rule_name),
  triggeredAt: asString(data.triggered_at),
  triggerReason: asString(data.trigger_reason),
  actionTaken: asString(data.action_taken),
  actionDetails: isRecord(data.action_details) ? data.action_details : {},
  notifiedEmails: asStringArray(data.notified_emails),
  status: asOneOf(data.status, ['pending', 'resolved', 'failed', 'sent', 'acknowledged'] as const, 'pending'),
  statusDisplay: asString(data.status_display),
  acknowledgedAt: asStringOrNull(data.acknowledged_at),
  acknowledgedBy: asStringOrNull(data.acknowledged_by),
  acknowledgedByName: asStringOrNull(data.acknowledged_by_name),
  resolvedAt: asStringOrNull(data.resolved_at),
  resolvedBy: asStringOrNull(data.resolved_by),
  resolvedByName: asStringOrNull(data.resolved_by_name),
  resolutionNotes: asStringOrNull(data.resolution_notes),
  errorMessage: asStringOrNull(data.error_message),
  createdAt: asString(data.created_at),
  updatedAt: asString(data.updated_at),
});

// =============================================================================
// SLA Configuration API
// =============================================================================

export const fetchSLAConfigurations = async (params?: {
  priority?: string;
  correspondenceType?: string;
  isActive?: boolean;
}): Promise<SLAConfiguration[]> => {
  const query = buildQuery({
    priority: params?.priority,
    correspondence_type: params?.correspondenceType,
    is_active: params?.isActive,
  });
  const response = await apiFetch<unknown>(`/analytics/sla-config/?${query}`);
  const rows = Array.isArray(response) ? response : [];
  return rows.filter(isRecord).map(mapSLAConfiguration);
};

export const fetchSLAConfiguration = async (id: string): Promise<SLAConfiguration> => {
  const response = await apiFetch<Record<string, unknown>>(`/analytics/sla-config/${id}/`);
  return mapSLAConfiguration(response);
};

export const createSLAConfiguration = async (data: SLAConfigurationInput): Promise<SLAConfiguration> => {
  const response = await apiFetch<Record<string, unknown>>('/analytics/sla-config/', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      priority: data.priority,
      correspondence_type: data.correspondenceType || 'all',
      target_days: data.targetDays,
      warning_threshold_percent: data.warningThresholdPercent || 75,
      critical_threshold_percent: data.criticalThresholdPercent || 90,
      division: data.division,
      is_active: data.isActive ?? true,
      description: data.description || '',
    }),
  });
  return mapSLAConfiguration(response);
};

export const updateSLAConfiguration = async (
  id: string,
  data: Partial<SLAConfigurationInput>
): Promise<SLAConfiguration> => {
  const body: Record<string, unknown> = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.priority !== undefined) body.priority = data.priority;
  if (data.correspondenceType !== undefined) body.correspondence_type = data.correspondenceType;
  if (data.targetDays !== undefined) body.target_days = data.targetDays;
  if (data.warningThresholdPercent !== undefined) body.warning_threshold_percent = data.warningThresholdPercent;
  if (data.criticalThresholdPercent !== undefined) body.critical_threshold_percent = data.criticalThresholdPercent;
  if (data.division !== undefined) body.division = data.division;
  if (data.isActive !== undefined) body.is_active = data.isActive;
  if (data.description !== undefined) body.description = data.description;

  const response = await apiFetch<Record<string, unknown>>(`/analytics/sla-config/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return mapSLAConfiguration(response);
};

export const deleteSLAConfiguration = async (id: string): Promise<void> => {
  await apiFetch(`/analytics/sla-config/${id}/`, { method: 'DELETE' });
};

const SLA_TARGETS_CACHE_TTL_MS = 5 * 60 * 1000;
let slaTargetsCache: SLATargets | null = null;
let slaTargetsCachedAt = 0;
let slaTargetsPromise: Promise<SLATargets> | null = null;

export const invalidateSLATargetsCache = (): void => {
  slaTargetsCache = null;
  slaTargetsCachedAt = 0;
  slaTargetsPromise = null;
};

export const DEFAULT_SLA_TARGETS: SLATargets = {
  urgent: 48,
  high: 72,
  medium: 120,
  low: 168,
};

export const fetchSLATargets = async (force = false): Promise<SLATargets> => {
  const now = Date.now();
  if (!force && slaTargetsCache && now - slaTargetsCachedAt < SLA_TARGETS_CACHE_TTL_MS) {
    return slaTargetsCache;
  }
  if (!force && slaTargetsPromise) {
    return slaTargetsPromise;
  }

  const request = (async () => {
    try {
      const response = await apiFetch<Record<string, unknown>>('/analytics/sla-config/targets/');
      const targets = {
        urgent: asNumber(response.urgent, DEFAULT_SLA_TARGETS.urgent),
        high: asNumber(response.high, DEFAULT_SLA_TARGETS.high),
        medium: asNumber(response.medium, DEFAULT_SLA_TARGETS.medium),
        low: asNumber(response.low, DEFAULT_SLA_TARGETS.low),
      };
      slaTargetsCache = targets;
      slaTargetsCachedAt = Date.now();
      return targets;
    } catch (err) {
      logError('Failed to fetch SLA targets, using defaults', err);
      return DEFAULT_SLA_TARGETS;
    }
  })();
  slaTargetsPromise = request;
  request.then(
    () => {
      if (slaTargetsPromise === request) slaTargetsPromise = null;
    },
    () => {
      if (slaTargetsPromise === request) slaTargetsPromise = null;
    },
  );

  return request;
};

export const updateSLATargets = async (targets: SLATargets): Promise<{ updated: SLAConfiguration[] }> => {
  const response = await apiFetch<{ updated: unknown[] }>('/analytics/sla-config/bulk_update/', {
    method: 'POST',
    body: JSON.stringify(targets),
  });
  invalidateSLATargetsCache();
  return {
    updated: (Array.isArray(response.updated) ? response.updated : []).filter(isRecord).map(mapSLAConfiguration),
  };
};

export const fetchSLAChoices = async (): Promise<SLAChoices> => {
  const response = await apiFetch<Record<string, unknown>>('/analytics/sla-config/choices/');
  return {
    priorities: Array.isArray(response.priorities) ? (response.priorities as SLAChoices['priorities']) : [],
    correspondenceTypes: Array.isArray(response.correspondence_types)
      ? (response.correspondence_types as SLAChoices['correspondenceTypes'])
      : [],
  };
};

// =============================================================================
// Escalation Rules API
// =============================================================================

export const fetchEscalationRules = async (params?: {
  triggerType?: string;
  actionType?: string;
  isActive?: boolean;
}): Promise<EscalationRule[]> => {
  const query = buildQuery({
    trigger_type: params?.triggerType,
    action_type: params?.actionType,
    is_active: params?.isActive,
  });
  const response = await apiFetch<unknown>(`/analytics/escalation-rules/?${query}`);
  const rows = Array.isArray(response) ? response : [];
  return rows.filter(isRecord).map(mapEscalationRule);
};

export const fetchEscalationRule = async (id: string): Promise<EscalationRule> => {
  const response = await apiFetch<Record<string, unknown>>(`/analytics/escalation-rules/${id}/`);
  return mapEscalationRule(response);
};

export const createEscalationRule = async (data: EscalationRuleInput): Promise<EscalationRule> => {
  const response = await apiFetch<Record<string, unknown>>('/analytics/escalation-rules/', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      description: data.description || '',
      trigger_type: data.triggerType,
      trigger_conditions: data.triggerConditions || {},
      action_type: data.actionType,
      action_config: data.actionConfig || {},
      email_subject_template: data.emailSubjectTemplate || '',
      email_body_template: data.emailBodyTemplate || '',
      is_active: data.isActive ?? true,
      priority_order: data.priorityOrder || 100,
      cooldown_hours: data.cooldownHours || 24,
      divisions: data.divisions || [],
    }),
  });
  return mapEscalationRule(response);
};

export const updateEscalationRule = async (
  id: string,
  data: Partial<EscalationRuleInput>
): Promise<EscalationRule> => {
  const body: Record<string, unknown> = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.description !== undefined) body.description = data.description;
  if (data.triggerType !== undefined) body.trigger_type = data.triggerType;
  if (data.triggerConditions !== undefined) body.trigger_conditions = data.triggerConditions;
  if (data.actionType !== undefined) body.action_type = data.actionType;
  if (data.actionConfig !== undefined) body.action_config = data.actionConfig;
  if (data.emailSubjectTemplate !== undefined) body.email_subject_template = data.emailSubjectTemplate;
  if (data.emailBodyTemplate !== undefined) body.email_body_template = data.emailBodyTemplate;
  if (data.isActive !== undefined) body.is_active = data.isActive;
  if (data.priorityOrder !== undefined) body.priority_order = data.priorityOrder;
  if (data.cooldownHours !== undefined) body.cooldown_hours = data.cooldownHours;
  if (data.divisions !== undefined) body.divisions = data.divisions;

  const response = await apiFetch<Record<string, unknown>>(`/analytics/escalation-rules/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return mapEscalationRule(response);
};

export const deleteEscalationRule = async (id: string): Promise<void> => {
  await apiFetch(`/analytics/escalation-rules/${id}/`, { method: 'DELETE' });
};

export const toggleEscalationRule = async (id: string): Promise<EscalationRule> => {
  const response = await apiFetch<Record<string, unknown>>(`/analytics/escalation-rules/${id}/toggle/`, {
    method: 'POST',
  });
  return mapEscalationRule(response);
};

export const testEscalationRule = async (id: string): Promise<EscalationRuleTestResult> => {
  const response = await apiFetch<Record<string, unknown>>(`/analytics/escalation-rules/${id}/test/`, {
    method: 'POST',
  });
  const matches = Array.isArray(response.matches)
    ? response.matches
        .filter(isRecord)
        .map((m) => ({
          id: asString(m.id),
          reference: asString(m.reference),
          subject: asString(m.subject),
          priority: asString(m.priority),
          division: m.division === null ? null : asStringOrNull(m.division),
        }))
    : [];
  return {
    ruleId: asString(response.rule_id),
    ruleName: asString(response.rule_name),
    matchesCount: asNumber(response.matches_count, matches.length),
    matches,
  };
};

export const fetchEscalationRuleChoices = async (): Promise<EscalationRuleChoices> => {
  const response = await apiFetch<Record<string, unknown>>('/analytics/escalation-rules/choices/');
  return {
    triggerTypes: Array.isArray(response.trigger_types) ? (response.trigger_types as EscalationRuleChoices['triggerTypes']) : [],
    actionTypes: Array.isArray(response.action_types) ? (response.action_types as EscalationRuleChoices['actionTypes']) : [],
  };
};

// =============================================================================
// Escalations API
// =============================================================================

export const fetchEscalations = async (params?: {
  status?: string;
  rule?: string;
  correspondence?: string;
}): Promise<Escalation[]> => {
  const query = buildQuery(params || {});
  const response = await apiFetch<unknown>(`/analytics/escalations/?${query}`);
  const rows = Array.isArray(response) ? response : [];
  return rows.filter(isRecord).map(mapEscalation);
};

export const fetchEscalation = async (id: string): Promise<Escalation> => {
  const response = await apiFetch<Record<string, unknown>>(`/analytics/escalations/${id}/`);
  return mapEscalation(response);
};

export const acknowledgeEscalation = async (id: string): Promise<Escalation> => {
  const response = await apiFetch<Record<string, unknown>>(`/analytics/escalations/${id}/acknowledge/`, {
    method: 'POST',
  });
  return mapEscalation(response);
};

export const resolveEscalation = async (id: string, resolutionNotes?: string): Promise<Escalation> => {
  const response = await apiFetch<Record<string, unknown>>(`/analytics/escalations/${id}/resolve/`, {
    method: 'POST',
    body: JSON.stringify({ resolution_notes: resolutionNotes || '' }),
  });
  return mapEscalation(response);
};

export const fetchEscalationSummary = async (): Promise<EscalationSummary> => {
  const response = await apiFetch<Record<string, unknown>>('/analytics/escalations/summary/');
  return {
    total: asNumber(response.total, 0),
    pending: asNumber(response.pending, 0),
    sent: asNumber(response.sent, 0),
    acknowledged: asNumber(response.acknowledged, 0),
    resolvedToday: asNumber(response.resolved_today, 0),
    triggeredThisWeek: asNumber(response.triggered_this_week, 0),
    active: asNumber(response.active, 0),
  };
};

// =============================================================================
// Enhanced Analytics API
// =============================================================================

export const fetchEnhancedSLAAnalytics = async (params?: {
  range?: number;
  divisionId?: string;
}): Promise<EnhancedSLAAnalytics> => {
  const query = buildQuery({
    range: params?.range || 30,
    division_id: params?.divisionId,
  });
  return apiFetch<EnhancedSLAAnalytics>(`/analytics/sla/?${query}`);
};

export const fetchEnhancedDivisionPerformance = async (params?: {
  range?: number;
  directorateId?: string;
}): Promise<EnhancedDivisionPerformance> => {
  const query = buildQuery({
    range: params?.range || 30,
    directorate_id: params?.directorateId && params.directorateId !== 'all' ? params.directorateId : undefined,
  });
  return apiFetch<EnhancedDivisionPerformance>(`/analytics/division-performance/?${query}`);
};

export const fetchEfficiencyAnalysis = async (params?: {
  range?: number;
  divisionId?: string;
}): Promise<EfficiencyAnalysis> => {
  const query = buildQuery({
    range: params?.range || 30,
    division_id: params?.divisionId,
  });
  return apiFetch<EfficiencyAnalysis>(`/analytics/efficiency/?${query}`);
};

