"use client";

import { StatStrip } from "@/components/shared/StatStrip";

interface SummaryData {
  total: number;
  urgent: number;
  overdue: number;
  dueSoon: number;
}

interface InboxSummaryCardsProps {
  summary: SummaryData;
}

/** Quiet inbox metrics — StatStrip replaces heavy icon Cards. */
export const InboxSummaryCards = ({ summary }: InboxSummaryCardsProps) => (
  <StatStrip
    items={[
      { key: "total", label: "In queue", value: summary.total },
      { key: "urgent", label: "Urgent", value: summary.urgent },
      { key: "overdue", label: "SLA breach", value: summary.overdue },
      { key: "dueSoon", label: "Due soon", value: summary.dueSoon },
    ]}
  />
);
