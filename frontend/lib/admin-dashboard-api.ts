import { apiFetch, hasTokens } from "@/lib/api-client";
import { ERROR_AUTHENTICATION_REQUIRED } from "@/lib/constants";

export interface DashboardOverview {
  status: "healthy" | "degraded";
  online_users: number;
  services_degraded: string[];
  last_updated: string;
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

export interface BackupStatus {
  status: "healthy" | "warning" | "missing";
  last_backup: string | null;
  file_size_mb: number;
  age_hours: number | null;
  filename: string | null;
}

export interface DashboardAlerts {
  backup: BackupStatus;
  pending_escalations: number;
  integration_failures_24h: number;
  celery_beat_disabled: number;
  degraded_services: string[];
}

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  return apiFetch<DashboardOverview>("/platform/admin-dashboard/overview/");
}

export async function fetchUsersByRole(): Promise<UsersByRoleResponse> {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  return apiFetch<UsersByRoleResponse>("/platform/admin-dashboard/users-by-role/");
}

export async function fetchDashboardAlerts(): Promise<DashboardAlerts> {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  return apiFetch<DashboardAlerts>("/platform/admin-dashboard/alerts/");
}
