import { logError } from '@/lib/client-logger';
/**
 * Frontend API client for notifications.
 */

import { apiFetch, hasTokens } from './api-client';

export interface Notification {
  id: string;
  recipient: string;
  recipientName: string;
  sender?: string;
  senderName?: string;
  senderEmail?: string;
  title: string;
  message: string;
  notificationType: 'workflow' | 'document' | 'correspondence' | 'system' | 'alert' | 'reminder';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'unread' | 'read' | 'archived';
  module: string;
  relatedObjectType?: string;
  relatedObjectId?: string;
  actionUrl?: string;
  actionRequired: boolean;
  emailSent: boolean;
  emailSentAt?: string;
  readAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

// API response uses snake_case, frontend uses camelCase
interface ApiNotification {
  id: string;
  recipient: string;
  recipient_name: string;
  sender?: string;
  sender_name?: string;
  sender_email?: string;
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  status: string;
  module: string;
  related_object_type?: string;
  related_object_id?: string;
  action_url?: string;
  action_required: boolean;
  email_sent: boolean;
  email_sent_at?: string;
  read_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Map API notification (snake_case) to frontend notification (camelCase)
 */
const mapApiNotification = (api: ApiNotification): Notification => ({
  id: api.id,
  recipient: api.recipient,
  recipientName: api.recipient_name,
  sender: api.sender,
  senderName: api.sender_name,
  senderEmail: api.sender_email,
  title: api.title,
  message: api.message,
  notificationType: api.notification_type as Notification['notificationType'],
  priority: api.priority as Notification['priority'],
  status: api.status as Notification['status'],
  module: api.module,
  relatedObjectType: api.related_object_type,
  relatedObjectId: api.related_object_id,
  actionUrl: api.action_url,
  actionRequired: api.action_required,
  emailSent: api.email_sent,
  emailSentAt: api.email_sent_at,
  readAt: api.read_at,
  expiresAt: api.expires_at,
  createdAt: api.created_at,
  updatedAt: api.updated_at,
});

export interface NotificationPreferences {
  id: string;
  user: string;
  inAppEnabled: boolean;
  inAppUrgentOnly: boolean;
  emailEnabled: boolean;
  emailUrgentOnly: boolean;
  emailDigest: boolean;
  emailDigestTime?: string;
  moduleDms: boolean;
  moduleCorrespondence: boolean;
  moduleWorkflow: boolean;
  moduleSystem: boolean;
  priorityLow: boolean;
  priorityNormal: boolean;
  priorityHigh: boolean;
  soundEnabled?: boolean;
  priorityUrgent: boolean;
  typeWorkflow: boolean;
  typeDocument: boolean;
  typeCorrespondence: boolean;
  typeSystem: boolean;
  typeAlert: boolean;
  typeReminder: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  autoArchiveDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationPayload {
  recipient: string;
  title: string;
  message: string;
  notificationType?: Notification['notificationType'];
  priority?: Notification['priority'];
  sender?: string;
  module?: string;
  relatedObjectType?: string;
  relatedObjectId?: string;
  actionUrl?: string;
  actionRequired?: boolean;
  expiresInHours?: number;
}

/**
 * Get all notifications for the current user.
 */
export const getNotifications = async (params?: {
  status?: string;
  notificationType?: string;
  priority?: string;
  module?: string;
}): Promise<Notification[]> => {
  if (!hasTokens()) return [];

  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.notificationType) queryParams.append('notification_type', params.notificationType);
  if (params?.priority) queryParams.append('priority', params.priority);
  if (params?.module) queryParams.append('module', params.module);

  const query = queryParams.toString();
  // The router registers 'notifications' under api/notifications/, and the viewset is also 'notifications'
  // So the full path is /api/notifications/notifications/
  // apiFetch adds /api/v1/ prefix, so we need /notifications/notifications/
  const url = `/notifications/notifications/${query ? `?${query}` : ''}`;
  console.log('[notifications-storage] Fetching notifications from:', url);
  try {
    const response = await apiFetch<any>(url);
    console.log('[notifications-storage] Received response:', response, 'Type:', typeof response, 'IsArray:', Array.isArray(response));
    
    // Handle paginated response (DRF returns {count, next, previous, results: [...]})
    let apiNotifications: ApiNotification[] = [];
    if (response && typeof response === 'object' && 'results' in response && Array.isArray(response.results)) {
      apiNotifications = response.results;
    } else if (Array.isArray(response)) {
      apiNotifications = response;
    }
    
    // Map snake_case API response to camelCase frontend model
    return apiNotifications.map(mapApiNotification);
  } catch (error) {
    console.error('[notifications-storage] Error fetching notifications:', error);
    throw error;
  }
};

/**
 * Get unread notification count.
 */
export const getUnreadNotificationCount = async (): Promise<number> => {
  if (!hasTokens()) return 0;

  try {
    // The router registers 'notifications' under api/notifications/, and the viewset is also 'notifications'
    // So the full path is /api/notifications/notifications/unread_count/
    // apiFetch adds /api/v1/ prefix, so we need /notifications/notifications/unread_count/
    const url = '/notifications/notifications/unread_count/';
    console.log('[notifications-storage] Fetching unread count from:', url);
    const response = await apiFetch<{ count: number }>(url);
    console.log('[notifications-storage] Unread count response:', response);
    return response.count || 0;
  } catch (error) {
    // Silently handle authentication errors - they're expected when user is not logged in
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage === 'Authentication required' || errorMessage === 'Authentication expired') {
      return 0;
    }
    console.error('[notifications-storage] Error fetching unread count:', error);
    logError('Failed to get unread count', error);
    return 0;
  }
};

/**
 * Mark a notification as read.
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  if (!hasTokens()) throw new Error('Authentication required');

  await apiFetch(`/notifications/notifications/${notificationId}/mark_read/`, {
    method: 'POST',
  });
};

/**
 * Mark a notification as archived.
 */
export const markNotificationAsArchived = async (notificationId: string): Promise<void> => {
  if (!hasTokens()) throw new Error('Authentication required');

  await apiFetch(`/notifications/notifications/${notificationId}/mark_archived/`, {
    method: 'POST',
  });
};

/**
 * Mark all notifications as read.
 */
export const markAllNotificationsAsRead = async (): Promise<number> => {
  if (!hasTokens()) throw new Error('Authentication required');

  const response = await apiFetch<{ count: number }>('/notifications/notifications/mark_all_read/', {
    method: 'POST',
  });
  return response.count || 0;
};

/**
 * Get notification preferences for the current user.
 */
export const getNotificationPreferences = async (): Promise<NotificationPreferences | null> => {
  if (!hasTokens()) return null;

  try {
    const response = await apiFetch<NotificationPreferences>('/notifications/preferences/');
    return response;
  } catch (error) {
    // Preferences might not exist yet, return null
    return null;
  }
};

/**
 * Update notification preferences.
 */
export const updateNotificationPreferences = async (
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> => {
  if (!hasTokens()) throw new Error('Authentication required');

  const response = await apiFetch<NotificationPreferences>('/notifications/preferences/', {
    method: 'PUT',
    body: JSON.stringify(preferences),
  });
  return response;
};

/**
 * Create a notification (admin/superuser only typically).
 */
export const createNotification = async (
  payload: CreateNotificationPayload
): Promise<Notification> => {
  if (!hasTokens()) throw new Error('Authentication required');

  const response = await apiFetch<Notification>('/notifications/notifications/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response;
};
