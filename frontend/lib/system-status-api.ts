import { apiFetch } from './api-client';

export interface SystemStatus {
  status: 'healthy' | 'unhealthy';
  services: Record<string, string>;
  uptime_seconds: number;
  generated_at: string;
  users: {
    active_total: number;
    logged_in_last_24h: number;
  };
  correspondence: {
    active: number;
    completed_last_24h: number;
  };
  integrations: {
    last_24h: Record<string, { success: number; failed: number; pending: number }>;
  };
  escalations_pending: number;
  celery_beat: {
    enabled: number;
    total: number;
  };
  recent_activity: {
    id: string;
    action: string;
    module: string;
    description: string;
    object_repr?: string;
    timestamp: string;
    user?: { id: string; username: string; email?: string };
  }[];
}

export const fetchSystemStatus = async (): Promise<SystemStatus> => {
  return apiFetch<SystemStatus>('/platform/system-status/');
};
