/**
 * API client for SLA Configuration and Escalation Rules
 */

import { apiFetch } from './api-client';

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
  triggerConditions: Record<string, any>;
  actionType: string;
  actionTypeDisplay: string;
  actionConfig: Record<string, any>;
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
  triggerConditions?: Record<string, any>;
  actionType: string;
  actionConfig?: Record<string, any>;
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
  actionDetails: Record<string, any>;
  notifiedEmails: string[];
  status: 'pending' | 'sent' | 'acknowledged' | 'resolved' | 'failed';
  statusDisplay: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  acknowledgedByName: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolvedByName: string | null;
  resolutionNotes: string;
  errorMessage: string;
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
  divisions: {
    id: string | null;
    name: string;
    fullName: string;
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
  }[];
  topPerformers: any[];
  needsAttention: any[];
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

// Transform snake_case API response to camelCase
const mapSLAConfiguration = (data: any): SLAConfiguration => ({
  id: data.id,
  name: data.name,
  priority: data.priority,
  priorityDisplay: data.priority_display,
  correspondenceType: data.correspondence_type,
  correspondenceTypeDisplay: data.correspondence_type_display,
  targetDays: data.target_days,
  warningThresholdPercent: data.warning_threshold_percent,
  criticalThresholdPercent: data.critical_threshold_percent,
  division: data.division,
  divisionDetail: data.division_detail,
  isActive: data.is_active,
  description: data.description,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

const mapEscalationRule = (data: any): EscalationRule => ({
  id: data.id,
  name: data.name,
  description: data.description,
  triggerType: data.trigger_type,
  triggerTypeDisplay: data.trigger_type_display,
  triggerConditions: data.trigger_conditions || {},
  actionType: data.action_type,
  actionTypeDisplay: data.action_type_display,
  actionConfig: data.action_config || {},
  emailSubjectTemplate: data.email_subject_template,
  emailBodyTemplate: data.email_body_template,
  isActive: data.is_active,
  priorityOrder: data.priority_order,
  cooldownHours: data.cooldown_hours,
  divisions: data.divisions || [],
  divisionsDetail: data.divisions_detail || [],
  escalationCount: data.escalation_count || 0,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

const mapEscalation = (data: any): Escalation => ({
  id: data.id,
  correspondence: data.correspondence,
  correspondenceReference: data.correspondence_reference,
  correspondenceSubject: data.correspondence_subject,
  rule: data.rule,
  ruleName: data.rule_name,
  triggeredAt: data.triggered_at,
  triggerReason: data.trigger_reason,
  actionTaken: data.action_taken,
  actionDetails: data.action_details || {},
  notifiedEmails: data.notified_emails || [],
  status: data.status,
  statusDisplay: data.status_display,
  acknowledgedAt: data.acknowledged_at,
  acknowledgedBy: data.acknowledged_by,
  acknowledgedByName: data.acknowledged_by_name,
  resolvedAt: data.resolved_at,
  resolvedBy: data.resolved_by,
  resolvedByName: data.resolved_by_name,
  resolutionNotes: data.resolution_notes,
  errorMessage: data.error_message,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
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
  const response = await apiFetch<any[]>(`/analytics/sla-config/?${query}`);
  return response.map(mapSLAConfiguration);
};

export const fetchSLAConfiguration = async (id: string): Promise<SLAConfiguration> => {
  const response = await apiFetch<any>(`/analytics/sla-config/${id}/`);
  return mapSLAConfiguration(response);
};

export const createSLAConfiguration = async (data: SLAConfigurationInput): Promise<SLAConfiguration> => {
  const response = await apiFetch<any>('/analytics/sla-config/', {
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
  const body: Record<string, any> = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.priority !== undefined) body.priority = data.priority;
  if (data.correspondenceType !== undefined) body.correspondence_type = data.correspondenceType;
  if (data.targetDays !== undefined) body.target_days = data.targetDays;
  if (data.warningThresholdPercent !== undefined) body.warning_threshold_percent = data.warningThresholdPercent;
  if (data.criticalThresholdPercent !== undefined) body.critical_threshold_percent = data.criticalThresholdPercent;
  if (data.division !== undefined) body.division = data.division;
  if (data.isActive !== undefined) body.is_active = data.isActive;
  if (data.description !== undefined) body.description = data.description;

  const response = await apiFetch<any>(`/analytics/sla-config/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return mapSLAConfiguration(response);
};

export const deleteSLAConfiguration = async (id: string): Promise<void> => {
  await apiFetch(`/analytics/sla-config/${id}/`, { method: 'DELETE' });
};

export const fetchSLATargets = async (): Promise<SLATargets> => {
  try {
    const response = await apiFetch<any>('/analytics/sla-config/targets/');
    return {
      urgent: response.urgent ?? 2,
      high: response.high ?? 3,
      medium: response.medium ?? 5,
      low: response.low ?? 7,
    };
  } catch {
    // Return defaults if API fails
    return { urgent: 2, high: 3, medium: 5, low: 7 };
  }
};

export const updateSLATargets = async (targets: SLATargets): Promise<{ updated: SLAConfiguration[] }> => {
  const response = await apiFetch<{ updated: any[] }>('/analytics/sla-config/bulk_update/', {
    method: 'POST',
    body: JSON.stringify(targets),
  });
  return {
    updated: response.updated.map(mapSLAConfiguration),
  };
};

export const fetchSLAChoices = async (): Promise<SLAChoices> => {
  const response = await apiFetch<any>('/analytics/sla-config/choices/');
  return {
    priorities: response.priorities || [],
    correspondenceTypes: response.correspondence_types || [],
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
  const response = await apiFetch<any[]>(`/analytics/escalation-rules/?${query}`);
  return response.map(mapEscalationRule);
};

export const fetchEscalationRule = async (id: string): Promise<EscalationRule> => {
  const response = await apiFetch<any>(`/analytics/escalation-rules/${id}/`);
  return mapEscalationRule(response);
};

export const createEscalationRule = async (data: EscalationRuleInput): Promise<EscalationRule> => {
  const response = await apiFetch<any>('/analytics/escalation-rules/', {
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
  const body: Record<string, any> = {};
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

  const response = await apiFetch<any>(`/analytics/escalation-rules/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return mapEscalationRule(response);
};

export const deleteEscalationRule = async (id: string): Promise<void> => {
  await apiFetch(`/analytics/escalation-rules/${id}/`, { method: 'DELETE' });
};

export const toggleEscalationRule = async (id: string): Promise<EscalationRule> => {
  const response = await apiFetch<any>(`/analytics/escalation-rules/${id}/toggle/`, {
    method: 'POST',
  });
  return mapEscalationRule(response);
};

export const testEscalationRule = async (id: string): Promise<EscalationRuleTestResult> => {
  const response = await apiFetch<any>(`/analytics/escalation-rules/${id}/test/`, {
    method: 'POST',
  });
  return {
    ruleId: response.rule_id,
    ruleName: response.rule_name,
    matchesCount: response.matches_count,
    matches: response.matches,
  };
};

export const fetchEscalationRuleChoices = async (): Promise<EscalationRuleChoices> => {
  const response = await apiFetch<any>('/analytics/escalation-rules/choices/');
  return {
    triggerTypes: response.trigger_types || [],
    actionTypes: response.action_types || [],
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
  const response = await apiFetch<any[]>(`/analytics/escalations/?${query}`);
  return response.map(mapEscalation);
};

export const fetchEscalation = async (id: string): Promise<Escalation> => {
  const response = await apiFetch<any>(`/analytics/escalations/${id}/`);
  return mapEscalation(response);
};

export const acknowledgeEscalation = async (id: string): Promise<Escalation> => {
  const response = await apiFetch<any>(`/analytics/escalations/${id}/acknowledge/`, {
    method: 'POST',
  });
  return mapEscalation(response);
};

export const resolveEscalation = async (id: string, resolutionNotes?: string): Promise<Escalation> => {
  const response = await apiFetch<any>(`/analytics/escalations/${id}/resolve/`, {
    method: 'POST',
    body: JSON.stringify({ resolution_notes: resolutionNotes || '' }),
  });
  return mapEscalation(response);
};

export const fetchEscalationSummary = async (): Promise<EscalationSummary> => {
  const response = await apiFetch<any>('/analytics/escalations/summary/');
  return {
    total: response.total,
    pending: response.pending,
    sent: response.sent,
    acknowledged: response.acknowledged,
    resolvedToday: response.resolved_today,
    triggeredThisWeek: response.triggered_this_week,
    active: response.active,
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
}): Promise<EnhancedDivisionPerformance> => {
  const query = buildQuery({ range: params?.range || 30 });
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

