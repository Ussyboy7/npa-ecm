"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Clock, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatDateTime } from "@/lib/datetime";
import { fetchSLATargets } from "@/lib/sla-client";
import type { Correspondence, Minute } from "@/lib/npa-structure";

type ContextCorrespondence = Pick<
  Correspondence,
  | "subject"
  | "referenceNumber"
  | "senderName"
  | "priority"
  | "currentOfficeName"
  | "currentApproverName"
>;

interface CorrespondenceContextCardProps {
  correspondence: ContextCorrespondence;
  divisionName?: string;
}

export function CorrespondenceContextCard({
  correspondence,
  divisionName,
}: CorrespondenceContextCardProps) {
  const [slaHours, setSlaHours] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchSLATargets()
      .then((targets) => {
        if (active) setSlaHours(targets[correspondence.priority] ?? null);
      })
      .catch(() => {
        if (active) setSlaHours(null);
      });
    return () => {
      active = false;
    };
  }, [correspondence.priority]);

  const currentHolder =
    correspondence.currentOfficeName?.trim() || correspondence.currentApproverName?.trim();

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug">{correspondence.subject}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {[
            correspondence.referenceNumber ? `Ref: ${correspondence.referenceNumber}` : null,
            correspondence.senderName?.trim() ? `From: ${correspondence.senderName}` : null,
            divisionName ?? null,
          ]
            .filter((item): item is string => Boolean(item))
            .map((item) => (
              <span key={item} className="break-words">
                {item}
              </span>
            ))}
        </div>
        {currentHolder && (
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">Currently with</span>{" "}
            <span className="break-words">{currentHolder}</span>
          </p>
        )}
      </div>
      <div className="order-4 flex w-full shrink-0 items-center gap-2 pl-7 sm:order-3 sm:w-auto sm:pl-0">
        <Badge
          variant={
            correspondence.priority === "urgent"
              ? "destructive"
              : correspondence.priority === "high"
                ? "default"
                : "secondary"
          }
          className="rounded-full text-[11px]"
        >
          {correspondence.priority}
        </Badge>
        {slaHours !== null && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span>
              {slaHours} hour{slaHours !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

type PreviousMinute = Pick<Minute, "minuteText" | "timestamp">;

interface PreviousMinuteLineProps {
  minute: PreviousMinute;
  authorName: string;
  authorRole?: string;
}

export function PreviousMinuteLine({
  minute,
  authorName,
  authorRole,
}: PreviousMinuteLineProps) {
  const [open, setOpen] = useState(false);
  const initials = authorName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="overflow-hidden rounded-2xl border border-border/60 bg-background/40"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 motion-reduce:transition-none"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium">
              Previous minute · {authorName}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {minute.minuteText}
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 border-t border-border/60 px-4 py-3">
        <p className="text-sm leading-relaxed text-foreground">{minute.minuteText}</p>
        <p className="text-xs text-muted-foreground">
          {[authorRole, formatDateTime(minute.timestamp)].filter(Boolean).join(" · ")}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
