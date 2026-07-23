export { DEFAULT_LIST_PAGE_SIZE as DEFAULT_PAGE_SIZE } from '@/lib/pagination-constants';

export const NOTIFICATION_WS_PING_INTERVAL_MS = 30_000;
export const NOTIFICATION_WS_RECONNECT_DELAY_MS = 3_000;
export const NOTIFICATION_WS_MAX_RECONNECT_ATTEMPTS = 5;

export const SYSTEM_ROLE_SUPER_ADMIN = "Super Admin";

export const ERROR_UNKNOWN = "Unknown error";
export const ERROR_AUTHENTICATION_REQUIRED = "Authentication required";

// Shared filter/option values
export const PRIORITY_VALUES = ["urgent", "high", "medium", "low"] as const;
export const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;

export const CORRESPONDENCE_STATUS_VALUES = [
  "all",
  "pending",
  "in-progress",
  "completed",
  "dispatched",
  "acknowledged",
  "archived",
  "withdrawn",
] as const;

export const CORRESPONDENCE_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "dispatched", label: "Dispatched" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "archived", label: "Archived" },
  { value: "withdrawn", label: "Withdrawn" },
] as const;

export const CASE_STATUS_VALUES = [
  "in_progress",
  "completed",
  "pending",
] as const;

export const CASE_STATUS_OPTIONS = [
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
] as const;

export const SENSITIVITY_VALUES = [
  "public",
  "internal",
  "confidential",
  "restricted",
] as const;

export const SENSITIVITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "internal", label: "Internal" },
  { value: "confidential", label: "Confidential" },
  { value: "restricted", label: "Restricted" },
] as const;

export const SENSITIVITY_DETAILS: Record<
  (typeof SENSITIVITY_OPTIONS)[number]["value"],
  { label: string; description: string }
> = {
  public: { label: "Public", description: "All authenticated users • May be shareable externally" },
  internal: { label: "Internal", description: "Shared with specific departments/divisions/units" },
  confidential: { label: "Confidential", description: "MSS2+ (MSS2, MSS3, MSS4, MSS5, MSS1, EDCS, MDCS)" },
  restricted: { label: "Restricted", description: "MSS1, EDCS, MDCS only" },
};

