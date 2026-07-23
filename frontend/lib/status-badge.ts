import type { BadgeProps } from "@/components/ui/badge";

export type BadgeVariant = NonNullable<BadgeProps["variant"]>;

export type StatusBadgeConfig = {
  label: string;
  variant: BadgeVariant;
  className?: string;
};

const CORRESPONDENCE_STATUS: Record<string, StatusBadgeConfig> = {
  pending: { label: "Pending", variant: "secondary" },
  "in-progress": { label: "In Progress", variant: "default" },
  completed: {
    label: "Completed",
    variant: "outline",
    className:
      "border-emerald-700/40 bg-emerald-50 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-950 dark:text-emerald-100",
  },
  dispatched: {
    label: "Dispatched",
    variant: "outline",
    className:
      "border-sky-700/40 bg-sky-50 text-sky-900 dark:border-sky-400/40 dark:bg-sky-950 dark:text-sky-100",
  },
  acknowledged: {
    label: "Acknowledged",
    variant: "outline",
    className:
      "border-emerald-700/40 bg-emerald-50 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-950 dark:text-emerald-100",
  },
  archived: { label: "Archived", variant: "secondary" },
  withdrawn: { label: "Withdrawn", variant: "destructive" },
};

const DOCUMENT_STATUS: Record<string, StatusBadgeConfig> = {
  draft: { label: "Draft", variant: "outline" },
  published: { label: "Published", variant: "default" },
  archived: { label: "Archived", variant: "secondary" },
};

const CASE_STATUS: Record<string, StatusBadgeConfig> = {
  open: { label: "Open", variant: "default" },
  "in-progress": { label: "In Progress", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "secondary" },
  resolved: { label: "Resolved", variant: "outline" },
  closed: { label: "Closed", variant: "outline" },
  archived: { label: "Archived", variant: "secondary" },
  pending: { label: "Pending", variant: "secondary" },
};

const FOIA_STATUS: Record<string, StatusBadgeConfig> = {
  submitted: { label: "Submitted", variant: "secondary" },
  acknowledged: { label: "Acknowledged", variant: "default" },
  in_processing: { label: "In Processing", variant: "secondary" },
  review: { label: "Under Review", variant: "default" },
  approved: { label: "Approved", variant: "outline" },
  partially_granted: { label: "Partially Granted", variant: "outline" },
  denied: { label: "Denied", variant: "destructive" },
  responded: { label: "Responded", variant: "outline" },
  closed: { label: "Closed", variant: "secondary" },
  awaiting_clarification: { label: "Awaiting Clarification", variant: "secondary" },
  appealed: { label: "Appealed", variant: "default" },
};

/** Badge variant for priority chips. */
export function getPriorityBadgeVariant(
  priority: string | undefined | null,
): BadgeVariant {
  const p = (priority || "").toLowerCase();
  if (p === "urgent") return "destructive";
  if (p === "high") return "default";
  if (p === "low") return "outline";
  return "secondary";
}

export function getCorrespondenceStatusBadge(status: string): StatusBadgeConfig {
  return (
    CORRESPONDENCE_STATUS[status] ?? {
      label: status.replace(/-/g, " "),
      variant: "outline",
    }
  );
}

export function getDocumentStatusBadge(status: string): StatusBadgeConfig {
  return (
    DOCUMENT_STATUS[status] ?? {
      label: status.replace(/-/g, " "),
      variant: "outline",
    }
  );
}

export function getCaseStatusBadge(status: string): StatusBadgeConfig {
  const key = status.toLowerCase();
  return (
    CASE_STATUS[key] ??
    CASE_STATUS[key.replace(/_/g, "-")] ?? {
      label: status.replace(/[_-]/g, " "),
      variant: "outline",
    }
  );
}

export function getFoiaStatusBadge(status: string): StatusBadgeConfig {
  const key = status.toLowerCase();
  return (
    FOIA_STATUS[key] ?? {
      label: status.replace(/[_-]/g, " "),
      variant: "outline",
    }
  );
}

/** Generic status → Badge variant (queues that only need variant). */
export function getStatusBadgeVariant(
  status: string,
): BadgeVariant {
  const key = status.toLowerCase();
  if (CORRESPONDENCE_STATUS[key]) return CORRESPONDENCE_STATUS[key].variant;
  if (DOCUMENT_STATUS[key]) return DOCUMENT_STATUS[key].variant;
  if (CASE_STATUS[key] || CASE_STATUS[key.replace(/_/g, "-")]) {
    return (CASE_STATUS[key] ?? CASE_STATUS[key.replace(/_/g, "-")]).variant;
  }
  if (FOIA_STATUS[key]) return FOIA_STATUS[key].variant;
  if (key === "completed" || key === "approved" || key === "published") return "default";
  if (key === "rejected" || key === "withdrawn" || key === "overdue") return "destructive";
  if (key === "pending" || key === "draft") return "outline";
  return "secondary";
}
