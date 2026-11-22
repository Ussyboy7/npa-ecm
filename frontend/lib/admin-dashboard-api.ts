import { apiFetch, hasTokens } from "@/lib/api-client";
import { ERROR_AUTHENTICATION_REQUIRED } from "@/lib/constants";

export interface SystemHealthItem {
  name: string;
  status: string;
  icon?: string;
  uptime?: string | null;
  detail?: string;
  diskUsage?: { total_gb: number; free_gb: number; used_pct: number };
}

export interface PerformanceMetrics {
  responseTimeMs: number | null | undefined;
  errorRate: number | null | undefined;
  responseTimeSample: number | null | undefined;
  mediaStorageGb: number;
}

export interface BackupStatus {
  status: "healthy" | "warning" | "missing";
  last_backup: string | null;
  file_size_mb: number;
  age_hours: number | null;
  filename: string | null;
}

export interface DashboardMetrics {
  systemHealth: SystemHealthItem[];
  performance: PerformanceMetrics;
  backup: BackupStatus;
  onlineNow: number;
  presenceWindowSeconds: number;
  uptimeSeconds: number;
}

export interface OnlineUser {
  id: number;
  name: string;
  email: string;
  role: string;
  lastActivity: string | null;
}

export interface OnlineUsersResponse {
  users: OnlineUser[];
  count: number;
  presenceWindowSeconds: number;
}

export interface LiveDashboardResponse {
  onlineNow: number;
  presenceWindowSeconds: number;
  systemHealth: { name: string; status: string }[];
  serverTime: string;
}

export interface UserRoleCount {
  id: string | null;
  name: string;
  count: number;
}

export interface UsersByRoleResponse {
  roles: UserRoleCount[];
  total_users: number;
}

export interface SecuritySummary {
  superusers: number;
  mfa_enabled: number;
  mfa_coverage_pct: number;
  mfa_required_missing: number;
  impersonations_24h: number;
  last_superuser_login: string | null;
}

export interface OrganizationHealth {
  offices_without_principal: number;
  users_without_role: number;
  users_without_office: number;
  open_items_owned_by_inactive: number;
}

export interface WorkloadSummary {
  pending_escalations: number;
  oldest_escalation_hours: number | null;
  pending_approvals: number;
  overdue_approvals: number;
  open_correspondence: number;
}

export interface ActivityEntry {
  id: string;
  user: string;
  action: string;
  description: string;
  timestamp: string;
}

export interface BackupSchedule {
  scheduled: boolean;
  task: string | null;
}

export interface DashboardAlerts {
  backup: BackupStatus;
  pending_escalations: number;
  integration_failures_24h: number;
  celery_beat_disabled: number;
  degraded_services: string[];
  // Optional so a frontend deployed ahead of its backend degrades gracefully
  // instead of crashing on a missing section.
  backup_schedule?: BackupSchedule;
  security?: SecuritySummary;
  organization?: OrganizationHealth;
  workload?: WorkloadSummary;
  recent_activity?: ActivityEntry[];
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  return apiFetch<DashboardMetrics>("/platform/admin-dashboard/metrics/");
}

export async function fetchOnlineUsers(): Promise<OnlineUsersResponse> {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  return apiFetch<OnlineUsersResponse>("/platform/admin-dashboard/online-users/");
}

export async function fetchDashboardLive(): Promise<LiveDashboardResponse> {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  return apiFetch<LiveDashboardResponse>("/platform/admin-dashboard/live/");
}

export async function fetchUsersByRole(): Promise<UsersByRoleResponse> {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  return apiFetch<UsersByRoleResponse>("/platform/admin-dashboard/users-by-role/");
}

export async function fetchDashboardAlerts(): Promise<DashboardAlerts> {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  return apiFetch<DashboardAlerts>("/platform/admin-dashboard/alerts/");
}

export async function downloadLatestBackup(): Promise<Blob> {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  return apiFetch<Blob>("/platform/admin-dashboard/backup/download/", {
    responseType: "blob",
  });
}
