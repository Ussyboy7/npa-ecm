import { apiFetch } from './api-client';

const buildQuery = (params: Record<string, string | number | undefined | null>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  return query.toString();
};

export interface AnalyticsMetadata {
  rangeDays: number;
  generatedAt: string;
  divisionId?: string;
}

export interface DivisionMetric {
  id: string | null;
  name: string;
  fullName: string;
  total: number;
  workload: number;
  completed: number;
  avgTurnaround: number;
  avgDays: number;
  completionRate: number;
  efficiency: number;
  highPriority: number;
  backlog: number;
}

export interface PerformanceAnalytics {
  metadata: AnalyticsMetadata;
  sla: {
    total: number;
    compliant: number;
    breached: number;
    complianceRate: number;
  };
  turnaround: {
    average: number;
    fastest: number;
    slowest: number;
  };
  divisionPerformance: DivisionMetric[];
  responseDistribution: { name: string; label: string; count: number }[];
  rolePerformance: { role: string; actions: number; avgResponseTime: number }[];
  stageDurations: {
    definition: "Observed timestamp gaps";
    registrationToRouting: { count: number; averageHours: number | null };
    routingToApproval: { count: number; averageHours: number | null };
    approvalToCompletion: { count: number; averageHours: number | null };
    endToEnd: { count: number; averageHours: number | null };
  };
}

export interface ExecutiveAnalytics {
  metadata: AnalyticsMetadata;
  divisionMetrics: DivisionMetric[];
  departmentActivity: { id: string; name: string; total: number }[];
  delayedApprovals: {
    id: string;
    referenceNumber: string;
    subject: string;
    priority: string;
    divisionName?: string;
    daysPending: number;
    currentApprover?: string | null;
    lastActionAt?: string | null;
  }[];
  pendingLeadership: {
    id: string;
    referenceNumber: string;
    subject: string;
    approverName?: string;
    priority: string;
    divisionName?: string;
    receivedDate?: string | null;
    daysPending: number;
  }[];
  weeklyTrend: { week: string; completed: number; pending: number }[];
  sensitivityBreakdown: { sensitivity: string; label: string; count: number; avgTurnaround: number }[];
}

export const fetchPerformanceAnalytics = async (range: string | number = '30') => {
  const query = buildQuery({ range });
  return apiFetch<PerformanceAnalytics>(`/analytics/performance/?${query}`);
};

export const fetchExecutiveAnalytics = async (range: string | number = '30') => {
  const query = buildQuery({ range });
  return apiFetch<ExecutiveAnalytics>(`/analytics/executive/?${query}`);
};
