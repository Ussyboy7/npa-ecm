type NotificationType = 'workflow' | 'document' | 'correspondence' | 'system' | 'alert' | 'reminder';
type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
type NotificationStatus = 'unread' | 'read' | 'archived';

export interface ApiNotification {
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

export interface Notification {
  id: string;
  recipient: string;
  recipientName: string;
  sender?: string;
  senderName?: string;
  senderEmail?: string;
  title: string;
  message: string;
  notificationType: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
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

export const mapApiNotification = (api: ApiNotification): Notification => ({
  id: api.id,
  recipient: api.recipient,
  recipientName: api.recipient_name,
  sender: api.sender,
  senderName: api.sender_name,
  senderEmail: api.sender_email,
  title: api.title,
  message: api.message,
  notificationType: api.notification_type as NotificationType,
  priority: api.priority as NotificationPriority,
  status: api.status as NotificationStatus,
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
