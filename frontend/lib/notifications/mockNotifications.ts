import { NPA_ROLES } from "@/lib/npa-structure";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'urgent';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  read: boolean;
  actionRequired: boolean;
  category: 'memo' | 'document' | 'correspondence' | 'workflow' | 'system' | 'approval' | 'deadline';
  relatedId?: string;
  relatedType?: string;
  sender?: {
    name: string;
    role: string;
    department: string;
  };
  expiresAt?: Date;
}

export interface RoleNotifications {
  [role: string]: {
    general: Notification[];
    pageSpecific: {
      [page: string]: Notification[];
    };
  };
}

// Mock notification data for all roles
export const mockNotifications: RoleNotifications = {
  // Managing Director (MD)
  md: {
    general: [
      {
        id: 'md-001',
        title: 'Board Meeting Reminder',
        message: 'Board meeting scheduled for tomorrow at 10:00 AM. Please review the quarterly reports.',
        type: 'urgent',
        priority: 'high',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        read: false,
        actionRequired: true,
        category: 'system',
        expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000), // 22 hours from now
      },
      {
        id: 'md-002',
        title: 'Strategic Plan Approval Required',
        message: 'The 2024 Strategic Plan is ready for your final approval. Review and approve by end of week.',
        type: 'warning',
        priority: 'high',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        read: false,
        actionRequired: true,
        category: 'approval',
        relatedId: 'strat-plan-2024',
        relatedType: 'document',
      },
      {
        id: 'md-003',
        title: 'Port Performance Report',
        message: 'Monthly port performance report is available for review. All KPIs are within target ranges.',
        type: 'info',
        priority: 'medium',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        read: true,
        actionRequired: false,
        category: 'system',
      },
    ],
    pageSpecific: {
      '/dashboard': [
        {
          id: 'md-dash-001',
          title: 'Executive Dashboard Updated',
          message: 'New analytics data available. Port efficiency increased by 3.2% this month.',
          type: 'success',
          priority: 'medium',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
          read: false,
          actionRequired: false,
          category: 'system',
        },
      ],
      '/memos': [
        {
          id: 'md-memo-001',
          title: 'New Memo from GM Operations',
          message: 'GM Operations has submitted a memo regarding port expansion project. Requires your review.',
          type: 'info',
          priority: 'high',
          timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          read: false,
          actionRequired: true,
          category: 'memo',
          relatedId: 'memo-2024-001',
          relatedType: 'memo',
          sender: {
            name: 'Dr. Sarah Johnson',
            role: 'GM Operations',
            department: 'Operations',
          },
        },
      ],
      '/correspondence': [
        {
          id: 'md-corr-001',
          title: 'Ministerial Correspondence',
          message: 'Urgent correspondence from Ministry of Transportation regarding port security protocols.',
          type: 'urgent',
          priority: 'critical',
          timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
          read: false,
          actionRequired: true,
          category: 'correspondence',
          relatedId: 'corr-2024-001',
          relatedType: 'correspondence',
        },
      ],
    },
  },

  // General Manager (GM)
  gm: {
    general: [
      {
        id: 'gm-001',
        title: 'Budget Review Meeting',
        message: 'Q4 budget review meeting scheduled for Friday. Please prepare departmental reports.',
        type: 'warning',
        priority: 'high',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        read: false,
        actionRequired: true,
        category: 'system',
      },
      {
        id: 'gm-002',
        title: 'Port Expansion Project Update',
        message: 'Phase 2 of port expansion is 85% complete. Environmental impact assessment required.',
        type: 'info',
        priority: 'medium',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        read: true,
        actionRequired: false,
        category: 'system',
      },
    ],
    pageSpecific: {
      '/dashboard': [
        {
          id: 'gm-dash-001',
          title: 'Divisional Performance Alert',
          message: 'Operations division exceeded targets by 5%. Review performance metrics.',
          type: 'success',
          priority: 'medium',
          timestamp: new Date(Date.now() - 45 * 60 * 1000),
          read: false,
          actionRequired: false,
          category: 'system',
        },
      ],
      '/memos': [
        {
          id: 'gm-memo-001',
          title: 'Memo Approval Required',
          message: '3 memos from Operations department require your approval.',
          type: 'warning',
          priority: 'medium',
          timestamp: new Date(Date.now() - 20 * 60 * 1000),
          read: false,
          actionRequired: true,
          category: 'approval',
        },
      ],
    },
  },

  // Assistant General Manager (AGM)
  agm: {
    general: [
      {
        id: 'agm-001',
        title: 'Departmental Meeting',
        message: 'Weekly departmental meeting moved to Thursday 2:00 PM.',
        type: 'info',
        priority: 'medium',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        read: false,
        actionRequired: false,
        category: 'system',
      },
    ],
    pageSpecific: {
      '/dashboard': [
        {
          id: 'agm-dash-001',
          title: 'Departmental KPI Update',
          message: 'All departmental KPIs are on track. Finance department needs attention.',
          type: 'warning',
          priority: 'medium',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
          read: false,
          actionRequired: false,
          category: 'system',
        },
      ],
    },
  },

  // Principal Manager (PM)
  pm: {
    general: [
      {
        id: 'pm-001',
        title: 'Team Performance Review',
        message: 'Monthly team performance review due by end of week.',
        type: 'warning',
        priority: 'medium',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        read: false,
        actionRequired: true,
        category: 'system',
      },
    ],
    pageSpecific: {
      '/memos': [
        {
          id: 'pm-memo-001',
          title: 'Team Memo Draft',
          message: 'Draft memo from your team requires review before submission.',
          type: 'info',
          priority: 'medium',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          read: false,
          actionRequired: true,
          category: 'memo',
        },
      ],
    },
  },

  // Officer/Staff
  officer: {
    general: [
      {
        id: 'officer-001',
        title: 'Training Session',
        message: 'Mandatory safety training session scheduled for next Tuesday.',
        type: 'info',
        priority: 'medium',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        read: false,
        actionRequired: false,
        category: 'system',
      },
    ],
    pageSpecific: {
      '/memos': [
        {
          id: 'officer-memo-001',
          title: 'Memo Status Update',
          message: 'Your memo "Port Maintenance Schedule" has been approved by PM.',
          type: 'success',
          priority: 'low',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
          read: false,
          actionRequired: false,
          category: 'memo',
        },
      ],
    },
  },

  // Secretary
  secretary: {
    general: [
      {
        id: 'sec-001',
        title: 'Executive Schedule Update',
        message: 'MD has 3 meetings scheduled for tomorrow. Prepare briefing documents.',
        type: 'warning',
        priority: 'high',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        read: false,
        actionRequired: true,
        category: 'system',
      },
    ],
    pageSpecific: {
      '/secretary/queue': [
        {
          id: 'sec-queue-001',
          title: 'New Items in Queue',
          message: '5 new items added to secretary queue requiring processing.',
          type: 'info',
          priority: 'medium',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          read: false,
          actionRequired: true,
          category: 'workflow',
        },
      ],
    },
  },

  // Registry
  registry: {
    general: [
      {
        id: 'reg-001',
        title: 'Document Archiving',
        message: '500 documents ready for archiving. Process by end of month.',
        type: 'info',
        priority: 'medium',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        read: false,
        actionRequired: true,
        category: 'system',
      },
    ],
    pageSpecific: {
      '/registry/approved': [
        {
          id: 'reg-approved-001',
          title: 'New Approved Documents',
          message: '12 new documents approved and ready for registry processing.',
          type: 'info',
          priority: 'medium',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          read: false,
          actionRequired: true,
          category: 'document',
        },
      ],
    },
  },

  // System Admin
  admin: {
    general: [
      {
        id: 'admin-001',
        title: 'System Maintenance',
        message: 'Scheduled system maintenance tonight from 11 PM to 1 AM.',
        type: 'warning',
        priority: 'high',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        read: false,
        actionRequired: false,
        category: 'system',
      },
    ],
    pageSpecific: {
      '/admin/users': [
        {
          id: 'admin-users-001',
          title: 'New User Registration',
          message: '3 new users registered and pending approval.',
          type: 'info',
          priority: 'medium',
          timestamp: new Date(Date.now() - 45 * 60 * 1000),
          read: false,
          actionRequired: true,
          category: 'system',
        },
      ],
    },
  },
};

// Utility functions
export const getNotificationsForRole = (role: string, page?: string): Notification[] => {
  const roleKey = role.toLowerCase().replace(/\s+/g, '');
  const roleNotifications = mockNotifications[roleKey];
  
  if (!roleNotifications) {
    return [];
  }

  let notifications = [...roleNotifications.general];
  
  if (page && roleNotifications.pageSpecific[page]) {
    notifications = [...notifications, ...roleNotifications.pageSpecific[page]];
  }

  return notifications.sort((a, b) => {
    // Sort by priority (critical > high > medium > low)
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority] || 0;
    const bPriority = priorityOrder[b.priority] || 0;
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    
    // Then by timestamp (newest first)
    return b.timestamp.getTime() - a.timestamp.getTime();
  });
};

export const getUnreadCount = (role: string, page?: string): number => {
  const notifications = getNotificationsForRole(role, page);
  return notifications.filter(n => !n.read).length;
};

export const markAsRead = (notificationId: string, role: string): void => {
  const roleKey = role.toLowerCase().replace(/\s+/g, '');
  const roleNotifications = mockNotifications[roleKey];
  
  if (!roleNotifications) return;

  // Mark in general notifications
  const generalNotification = roleNotifications.general.find(n => n.id === notificationId);
  if (generalNotification) {
    generalNotification.read = true;
    return;
  }

  // Mark in page-specific notifications
  Object.values(roleNotifications.pageSpecific).forEach(pageNotifications => {
    const pageNotification = pageNotifications.find(n => n.id === notificationId);
    if (pageNotification) {
      pageNotification.read = true;
    }
  });
};

export const getNotificationIcon = (type: string): string => {
  switch (type) {
    case 'urgent':
      return '🚨';
    case 'warning':
      return '⚠️';
    case 'error':
      return '❌';
    case 'success':
      return '✅';
    case 'info':
    default:
      return 'ℹ️';
  }
};

export const getNotificationColor = (type: string): string => {
  switch (type) {
    case 'urgent':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'warning':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'error':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'success':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'info':
    default:
      return 'text-blue-600 bg-blue-50 border-blue-200';
  }
};

export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'critical':
      return 'text-red-600 bg-red-100';
    case 'high':
      return 'text-orange-600 bg-orange-100';
    case 'medium':
      return 'text-yellow-600 bg-yellow-100';
    case 'low':
    default:
      return 'text-gray-600 bg-gray-100';
  }
};
