"use client";

import { type NotificationPreferences as NotificationPreferencesType } from '@/lib/notifications-storage';

const MAX_SIGNATURE_SIZE_MB = 2;
const MAX_PHOTO_SIZE_MB = 5;

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Validation helpers
const validateEmail = (email: string): string | null => {
  if (!email) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  return null;
};

const validatePhone = (phone: string): string | null => {
  if (!phone) return null;
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  if (!phoneRegex.test(phone)) return 'Please enter a valid phone number';
  return null;
};

const validatePassword = (password: string): string | null => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
  return null;
};

// Generate mock backup codes
const generateBackupCodes = (): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                 Math.random().toString(36).substring(2, 6).toUpperCase();
    codes.push(code);
  }
  return codes;
};

// Helper to convert backend snake_case to frontend camelCase
const convertBackendToFrontend = (backend: Record<string, unknown>): NotificationPreferencesType | null => {
  if (!backend) return null;
  return {
    id: backend.id as string,
    user: backend.user as string,
    inAppEnabled: backend.in_app_enabled as boolean ?? backend.inAppEnabled as boolean ?? true,
    inAppUrgentOnly: backend.in_app_urgent_only as boolean ?? backend.inAppUrgentOnly as boolean ?? false,
    emailEnabled: backend.email_enabled as boolean ?? backend.emailEnabled as boolean ?? true,
    emailUrgentOnly: backend.email_urgent_only as boolean ?? backend.emailUrgentOnly as boolean ?? false,
    emailDigest: backend.email_digest as boolean ?? backend.emailDigest as boolean ?? false,
    emailDigestTime: backend.email_digest_time as string ?? backend.emailDigestTime as string,
    moduleDms: backend.module_dms as boolean ?? backend.moduleDms as boolean ?? true,
    moduleCorrespondence: backend.module_correspondence as boolean ?? backend.moduleCorrespondence as boolean ?? true,
    moduleWorkflow: backend.module_workflow as boolean ?? backend.moduleWorkflow as boolean ?? true,
    moduleSystem: backend.module_system as boolean ?? backend.moduleSystem as boolean ?? true,
    priorityLow: backend.priority_low as boolean ?? backend.priorityLow as boolean ?? true,
    priorityNormal: backend.priority_normal as boolean ?? backend.priorityNormal as boolean ?? true,
    priorityHigh: backend.priority_high as boolean ?? backend.priorityHigh as boolean ?? true,
    priorityUrgent: backend.priority_urgent as boolean ?? backend.priorityUrgent as boolean ?? true,
    typeWorkflow: backend.type_workflow as boolean ?? backend.typeWorkflow as boolean ?? true,
    typeDocument: backend.type_document as boolean ?? backend.typeDocument as boolean ?? true,
    typeCorrespondence: backend.type_correspondence as boolean ?? backend.typeCorrespondence as boolean ?? true,
    typeSystem: backend.type_system as boolean ?? backend.typeSystem as boolean ?? true,
    typeAlert: backend.type_alert as boolean ?? backend.typeAlert as boolean ?? true,
    typeReminder: backend.type_reminder as boolean ?? backend.typeReminder as boolean ?? true,
    quietHoursEnabled: backend.quiet_hours_enabled as boolean ?? backend.quietHoursEnabled as boolean ?? false,
    quietHoursStart: backend.quiet_hours_start as string ?? backend.quietHoursStart as string ?? '22:00',
    quietHoursEnd: backend.quiet_hours_end as string ?? backend.quietHoursEnd as string ?? '07:00',
    autoArchiveDays: backend.auto_archive_days as number ?? backend.autoArchiveDays as number ?? 30,
    soundEnabled: backend.sound_enabled as boolean ?? backend.soundEnabled as boolean ?? true,
    createdAt: backend.created_at as string ?? backend.createdAt as string ?? new Date().toISOString(),
    updatedAt: backend.updated_at as string ?? backend.updatedAt as string ?? new Date().toISOString(),
  };
};

// Helper to convert frontend camelCase to backend snake_case
const convertFrontendToBackend = (frontend: NotificationPreferencesType): Record<string, unknown> => {
  return {
    in_app_enabled: frontend.inAppEnabled,
    in_app_urgent_only: frontend.inAppUrgentOnly,
    email_enabled: frontend.emailEnabled,
    email_urgent_only: frontend.emailUrgentOnly,
    email_digest: frontend.emailDigest,
    email_digest_time: frontend.emailDigestTime,
    module_dms: frontend.moduleDms,
    module_correspondence: frontend.moduleCorrespondence,
    module_workflow: frontend.moduleWorkflow,
    module_system: frontend.moduleSystem,
    priority_low: frontend.priorityLow,
    priority_normal: frontend.priorityNormal,
    priority_high: frontend.priorityHigh,
    priority_urgent: frontend.priorityUrgent,
    type_workflow: frontend.typeWorkflow,
    type_document: frontend.typeDocument,
    type_correspondence: frontend.typeCorrespondence,
    type_system: frontend.typeSystem,
    type_alert: frontend.typeAlert,
    type_reminder: frontend.typeReminder,
    quiet_hours_enabled: frontend.quietHoursEnabled,
    quiet_hours_start: frontend.quietHoursStart,
    quiet_hours_end: frontend.quietHoursEnd,
    auto_archive_days: frontend.autoArchiveDays,
    sound_enabled: frontend.soundEnabled,
  };
};

export {
  MAX_SIGNATURE_SIZE_MB,
  MAX_PHOTO_SIZE_MB,
  fileToBase64,
  validateEmail,
  validatePhone,
  validatePassword,
  generateBackupCodes,
  convertBackendToFrontend,
  convertFrontendToBackend,
};
