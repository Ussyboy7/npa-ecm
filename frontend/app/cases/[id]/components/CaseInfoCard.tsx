"use client";

import { Badge } from "@/components/ui/badge";
import { detailType } from "@/lib/detail-type";
import { formatDateShort } from "@/lib/correspondence-helpers";
import type { CaseDetail } from "@/lib/npa-structure";
import { cn } from "@/lib/utils";
import { CaseRailCard } from "./CaseRailCard";

interface CaseInfoCardProps {
  caseData: CaseDetail;
  slaStatus?: {
    status: "ok" | "warning" | "critical" | "breach";
    target_date: string;
    target_days?: number;
  } | null;
  slaError?: string | null;
  owningOfficeName?: string | null;
  assignedToName?: string | null;
  createdByName?: string | null;
}

export function CaseInfoCard({
  caseData,
  slaStatus,
  slaError,
  owningOfficeName,
  assignedToName,
  createdByName,
}: CaseInfoCardProps) {
  const rows: { label: string; value: string }[] = [
    { label: "Type", value: (caseData.caseType || "general").replace(/_/g, " ") },
    { label: "Priority", value: caseData.priority },
    { label: "Opened", value: formatDateShort(caseData.openedAt) },
  ];

  if (caseData.resolvedAt) {
    rows.push({ label: "Resolved", value: formatDateShort(caseData.resolvedAt) });
  }
  if (caseData.closedAt) {
    rows.push({ label: "Closed", value: formatDateShort(caseData.closedAt) });
  }
  if (assignedToName) {
    rows.push({ label: "Assignee", value: assignedToName });
  }
  if (owningOfficeName) {
    rows.push({ label: "Office", value: owningOfficeName });
  }
  if (createdByName) {
    rows.push({ label: "Created by", value: createdByName });
  }
  if (slaStatus && !slaError) {
    rows.push({
      label: "SLA",
      value: `${slaStatus.status}${slaStatus.target_date ? ` · ${formatDateShort(slaStatus.target_date)}` : ""}`,
    });
  } else if (slaError) {
    rows.push({ label: "SLA", value: slaError });
  }

  return (
    <div className="space-y-3 min-w-0">
      <CaseRailCard title="Details">
        <dl className="space-y-2.5">
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 items-start">
              <dt className={cn(detailType.caption, "uppercase tracking-wide pt-0.5")}>
                {row.label}
              </dt>
              <dd
                className={cn(
                  detailType.meta,
                  "text-foreground capitalize break-words [overflow-wrap:anywhere]",
                )}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </CaseRailCard>

      {caseData.tags && caseData.tags.length > 0 ? (
        <CaseRailCard title="Tags">
          <div className="flex flex-wrap gap-1">
            {caseData.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] max-w-full truncate">
                {tag}
              </Badge>
            ))}
          </div>
        </CaseRailCard>
      ) : null}

      {caseData.description ? (
        <CaseRailCard title="Description">
          <p
            className={cn(
              detailType.meta,
              "whitespace-pre-wrap text-muted-foreground break-words [overflow-wrap:anywhere]",
            )}
          >
            {caseData.description}
          </p>
        </CaseRailCard>
      ) : null}
    </div>
  );
}
