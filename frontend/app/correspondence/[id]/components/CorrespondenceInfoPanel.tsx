"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccessActivityCard } from "@/components/dms/AccessActivityCard";
import { corrType } from "../correspondence-type";
import { cn } from "@/lib/utils";
import { formatDate, formatRoutingDateTime } from "@/lib/datetime";
import type { Correspondence, Minute, User } from "@/lib/npa-structure";
import type { DocumentAccessLog, DocumentRecord } from "@/lib/api/dms";
import {
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  Building2,
  CheckCircle2,
  FileText,
  FolderTree,
  History,
  Info,
  Send,
  Users,
} from "lucide-react";

interface CorrespondenceInfoPanelProps {
  correspondence: Correspondence;
  minutes: Minute[];
  linkedDocuments: DocumentRecord[];
  primaryLinkedDocId: string | null;
  accessLogs: DocumentAccessLog[];
  logsLoading: boolean;
  userLookup: Map<string, User>;
  getUserInitials: (userId: string) => string;
  onRefreshAccessLogs: () => Promise<void>;
  onOpenLinkDocument: () => void;
  onViewThread?: () => void;
  isCompleted?: boolean;
}

const DIRECTION_LABEL: Record<string, string> = {
  upward: "Inward",
  downward: "Outward",
  lateral: "Lateral",
};

function Section({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/60 bg-background min-w-0">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5">
        <h4 className="flex items-center gap-1.5 text-[13px] font-semibold tracking-tight min-w-0">
          <Icon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
          <span className="truncate">{title}</span>
        </h4>
        {action}
      </div>
      <div className="px-3 py-3 min-w-0">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className={cn(corrType.caption, "text-muted-foreground")}>{label}</dt>
      <dd className="text-[12px] leading-snug break-words min-w-0">{children}</dd>
    </>
  );
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function formatAmount(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric =
    typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function CorrespondenceInfoPanel({
  correspondence,
  minutes,
  linkedDocuments,
  primaryLinkedDocId,
  accessLogs,
  logsLoading,
  userLookup,
  getUserInitials,
  onRefreshAccessLogs,
  onOpenLinkDocument,
  onViewThread,
  isCompleted = false,
}: CorrespondenceInfoPanelProps) {
  const attachments = correspondence.attachments ?? [];
  const distribution = (correspondence.distribution ?? []).filter(
    (recipient) => recipient.is_active !== false,
  );
  const amount = formatAmount(correspondence.amount);

  // Custody is only meaningful from the last routing action, not from the
  // original receipt date on an item that has since moved.
  const lastRoutedAt = minutes
    .filter((minute) => !minute.isRecalled)
    .reduce<string | undefined>((latest, minute) => {
      if (!minute.timestamp) return latest;
      if (!latest) return minute.timestamp;
      return new Date(minute.timestamp).getTime() > new Date(latest).getTime()
        ? minute.timestamp
        : latest;
    }, undefined);
  const withSince = lastRoutedAt ?? correspondence.receivedDate;
  const holderOffice = correspondence.currentOfficeName?.trim();
  const holderPerson = correspondence.currentApproverName?.trim();

  const registeredAt = correspondence.createdAt ?? correspondence.receivedDate;

  const events: Array<{ id: string; at: string; label: string; detail?: string }> = [];
  if (registeredAt) {
    events.push({
      id: "registered",
      at: registeredAt,
      label: `Registered${correspondence.createdByName ? ` by ${correspondence.createdByName}` : ""}`,
      detail: correspondence.receivedDate
        ? `Received ${formatDate(correspondence.receivedDate)}`
        : undefined,
    });
  }
  // Minutes are deliberately excluded: Thread is the single place minute events
  // are rendered. Info points at it instead of repeating them.
  const minuteCount = minutes.filter((minute) => !minute.isRecalled).length;
  (correspondence.dispatchRecords ?? []).forEach((record) => {
    if (record.dispatchedDate) {
      events.push({
        id: `dispatch-${record.id}`,
        at: record.dispatchedDate,
        label: `Dispatched via ${record.dispatchMode}`,
        detail: record.recipientName
          ? `To ${record.recipientName}${record.trackingNumber ? ` · ${record.trackingNumber}` : ""}`
          : record.trackingNumber,
      });
    }
    if (record.acknowledgedDate) {
      events.push({
        id: `dispatch-ack-${record.id}`,
        at: record.acknowledgedDate,
        label: `Dispatch acknowledged${record.acknowledgedByName ? ` by ${record.acknowledgedByName}` : ""}`,
      });
    }
  });
  distribution.forEach((recipient) => {
    if (recipient.readAt) {
      events.push({
        id: `read-${recipient.id}`,
        at: recipient.readAt,
        label: `${recipient.name ?? "Recipient"} read this`,
        detail:
          recipient.purpose === "information" ? "For information" : "For action",
      });
    }
  });
  if (correspondence.completionPackage?.generatedAt || correspondence.completedAt) {
    events.push({
      id: "completed",
      at: (correspondence.completionPackage?.generatedAt ??
        correspondence.completedAt) as string,
      label: "Marked complete",
    });
  }

  const sortedEvents = events
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);
  const hiddenEventCount = Math.max(events.length - sortedEvents.length, 0);

  const DirectionIcon =
    correspondence.direction === "lateral"
      ? ArrowRightLeft
      : correspondence.direction === "upward"
        ? ArrowUp
        : ArrowDown;

  return (
    <div className="space-y-3 min-w-0">
      <Section icon={Info} title="What this is">
        <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-2 gap-y-2">
          <Row label="Type">
            <span className="inline-flex items-center gap-1.5">
              <DirectionIcon className="h-3 w-3 text-muted-foreground" />
              {correspondence.documentType
                ? capitalize(correspondence.documentType)
                : DIRECTION_LABEL[correspondence.direction] || "Correspondence"}
            </span>
          </Row>
          {correspondence.senderName || correspondence.senderOrganization ? (
            <Row label="From">
              {[correspondence.senderName, correspondence.senderOrganization]
                .filter(Boolean)
                .join(" · ")}
            </Row>
          ) : null}
          {correspondence.senderReference ? (
            <Row label="Sender ref">{correspondence.senderReference}</Row>
          ) : null}
          {correspondence.letterDate ? (
            <Row label="Letter date">{formatDate(correspondence.letterDate)}</Row>
          ) : null}
          {correspondence.receivedDate ? (
            <Row label="Received">{formatDate(correspondence.receivedDate)}</Row>
          ) : null}
          {correspondence.createdAt ? (
            <Row label="Registered">{formatDate(correspondence.createdAt)}</Row>
          ) : null}
          {correspondence.owningOfficeName ? (
            <Row label="Owning office">
              <span className="inline-flex items-start gap-1.5">
                <Building2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />
                {correspondence.owningOfficeName}
              </span>
            </Row>
          ) : null}
          {correspondence.divisionName ? (
            <Row label="Division">{correspondence.divisionName}</Row>
          ) : null}
          {correspondence.departmentName ? (
            <Row label="Department">{correspondence.departmentName}</Row>
          ) : null}
          {amount ? <Row label="Amount">{amount}</Row> : null}
          {correspondence.requiredApprovalLevel ? (
            <Row label="Approval">
              <span className="capitalize">
                {correspondence.requiredApprovalLevel}
              </span>
            </Row>
          ) : null}
          {correspondence.archiveLevel ? (
            <Row label="Archive level">
              <span className="capitalize">{correspondence.archiveLevel}</span>
            </Row>
          ) : null}
          {correspondence.caseId ? (
            <Row label="Case">
              <Link
                href={`/cases/${correspondence.caseId}`}
                className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
              >
                <FolderTree className="h-3 w-3" />
                {correspondence.caseId.slice(0, 8)}
              </Link>
            </Row>
          ) : null}
          {correspondence.parentCorrespondence ? (
            <Row label="In response to">
              <Link
                href={`/correspondence/${correspondence.parentCorrespondence.id}`}
                className="font-medium text-primary hover:underline"
              >
                {correspondence.parentCorrespondence.reference_number}
              </Link>
            </Row>
          ) : null}
          {correspondence.tags && correspondence.tags.length > 0 ? (
            <Row label="Tags">
              <span className="flex flex-wrap gap-1">
                {correspondence.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </span>
            </Row>
          ) : null}
          {correspondence.remarks?.trim() ? (
            <Row label="Remarks">
              <span className="line-clamp-3">{correspondence.remarks}</span>
            </Row>
          ) : null}
        </dl>
      </Section>

      <Section icon={Users} title="Who has it">
        <div className="space-y-3">
          <div className="rounded-lg bg-muted/40 px-2.5 py-2">
            <p className="text-[11px] text-muted-foreground">Currently with</p>
            <p className="text-[13px] font-medium leading-snug">
              {holderOffice || holderPerson || "Unassigned"}
            </p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {holderOffice
                ? [
                    holderPerson || "No individual assignee",
                    withSince ? `since ${formatDate(withSince)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : [
                    holderPerson ? "Individual assignee" : "No current holder",
                    withSince ? `since ${formatDate(withSince)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </p>
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Send className="h-3 w-3" />
              Circulation
              {distribution.length > 0 ? (
                <span className="tabular-nums">· {distribution.length}</span>
              ) : null}
            </p>
            {distribution.length === 0 ? (
              <p className={corrType.caption}>
                Not circulated — no recipients were added.
              </p>
            ) : (
              <ul className="space-y-1">
                {distribution.map((recipient) => (
                  <li
                    key={recipient.id}
                    className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40 min-w-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium leading-snug truncate">
                        {recipient.name ?? "Unknown recipient"}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1">
                        <Badge
                          variant="outline"
                          className="h-4 px-1 text-[10px] capitalize"
                        >
                          {recipient.type}
                        </Badge>
                        <Badge
                          variant={
                            recipient.purpose === "action" ? "default" : "secondary"
                          }
                          className="h-4 px-1 text-[10px]"
                        >
                          {recipient.purpose === "information"
                            ? "For info"
                            : "For action"}
                        </Badge>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "flex-shrink-0 text-[10px]",
                        recipient.readAt
                          ? "text-success"
                          : "text-muted-foreground/80",
                      )}
                    >
                      {recipient.readAt
                        ? `Read ${formatDate(recipient.readAt)}`
                        : "Unread"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>

      <Section
        icon={FileText}
        title="Files"
        action={
          !isCompleted && linkedDocuments.length + attachments.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={onOpenLinkDocument}
            >
              Link
            </Button>
          ) : null
        }
      >
        {linkedDocuments.length === 0 && attachments.length === 0 ? (
          <div className="space-y-2">
            <p className={corrType.caption}>No documents linked yet.</p>
            {!isCompleted ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full justify-start text-xs"
                onClick={onOpenLinkDocument}
              >
                <FolderTree className="mr-2 h-3.5 w-3.5 opacity-70" />
                Link a DMS document
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-[11px] leading-snug text-muted-foreground">
            {linkedDocuments.length > 0 ? (
              <>
                {linkedDocuments.length} linked document
                {linkedDocuments.length === 1 ? "" : "s"}
              </>
            ) : null}
            {linkedDocuments.length > 0 && attachments.length > 0 ? " · " : null}
            {attachments.length > 0 ? (
              <>
                {attachments.length} attachment
                {attachments.length === 1 ? "" : "s"}
              </>
            ) : null}
            {" — manage in Document."}
          </p>
        )}
      </Section>

      <Section icon={History} title="What happened">
        {sortedEvents.length === 0 && minuteCount === 0 && !primaryLinkedDocId ? (
          <p className={corrType.caption}>No activity recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {sortedEvents.length > 0 ? (
              <ol className="space-y-2.5">
                {sortedEvents.map((event) => (
                  <li key={event.id} className="flex gap-2 min-w-0">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/60" />
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium leading-snug break-words">
                        {event.label}
                      </p>
                      {event.detail ? (
                        <p className="text-[11px] leading-snug break-words text-muted-foreground">
                          {event.detail}
                        </p>
                      ) : null}
                      <p className="text-[11px] tabular-nums text-muted-foreground/80">
                        {formatRoutingDateTime(event.at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}

            {hiddenEventCount > 0 ? (
              <p className="text-[11px] text-muted-foreground">
                +{hiddenEventCount} earlier{" "}
                {hiddenEventCount === 1 ? "event" : "events"}.
              </p>
            ) : null}

            {minuteCount > 0 ? (
              <div
                className={cn(
                  "flex items-center justify-between gap-2",
                  sortedEvents.length > 0 && "border-t border-border/40 pt-2",
                )}
              >
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {minuteCount} routing minute{minuteCount === 1 ? "" : "s"} —
                  detail in Thread.
                </p>
                {onViewThread ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 flex-shrink-0 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={onViewThread}
                  >
                    Open Thread
                  </Button>
                ) : null}
              </div>
            ) : null}

            {primaryLinkedDocId ? (
              <div
                className={cn(
                  "pt-2",
                  (sortedEvents.length > 0 || minuteCount > 0) &&
                    "border-t border-border/40",
                )}
              >
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                  Document access
                </p>
                <AccessActivityCard
                  documentId={primaryLinkedDocId}
                  accessLogs={accessLogs}
                  userLookup={userLookup}
                  getUserInitials={getUserInitials}
                  onRefresh={onRefreshAccessLogs}
                  isLoading={logsLoading}
                  compact
                />
              </div>
            ) : null}
          </div>
        )}
      </Section>

      {correspondence.status === "completed" ||
      correspondence.completedAt ||
      correspondence.completionPackage ? (
        <p className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
          <CheckCircle2 className="h-3 w-3 text-success" />
          {correspondence.completedAt
            ? `Completed ${formatDate(correspondence.completedAt)}`
            : "Completion summary available"}
        </p>
      ) : null}
    </div>
  );
}
