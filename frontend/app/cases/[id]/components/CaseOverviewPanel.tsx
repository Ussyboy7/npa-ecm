"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { appType } from "@/lib/app-type";
import { detailType } from "@/lib/detail-type";
import type { CaseDetail } from "@/lib/npa-structure";
import { cn } from "@/lib/utils";
import {
  FileCheck,
  FileText,
  Link as LinkIcon,
  Mail,
  Maximize2,
  Minimize2,
  Package,
} from "lucide-react";
import {
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  registryQueueEmptyIconClass,
} from "@/components/shared/registry-queue-styles";
import { downloadCaseCompletionPackage } from "@/lib/api/cases";
import { toast } from "@/components/ui/sonner";
import { logError } from "@/lib/client-logger";

interface CaseOverviewPanelProps {
  caseData: CaseDetail;
  overviewFocus?: boolean;
  onToggleOverviewFocus?: () => void;
  onLinkCorrespondence: () => void;
  onLinkDocument: () => void;
  onLinkForm: () => void;
}

export function CaseOverviewPanel({
  caseData,
  overviewFocus = false,
  onToggleOverviewFocus,
  onLinkCorrespondence,
  onLinkDocument,
  onLinkForm,
}: CaseOverviewPanelProps) {
  const corrCount = caseData.correspondence?.length ?? 0;
  const docCount = caseData.documents?.length ?? 0;
  const formCount = caseData.forms?.length ?? 0;
  const totalLinks = corrCount + docCount + formCount;
  const primary =
    caseData.correspondence?.find((l) => l.isPrimary)?.correspondence ??
    caseData.correspondence?.[0]?.correspondence;

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border/50 flex-shrink-0">
        <p className={cn(detailType.panelTitle, "truncate")}>Case file</p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onLinkCorrespondence}>
            <LinkIcon className="h-3.5 w-3.5 mr-1" />
            Link
          </Button>
          {onToggleOverviewFocus ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={onToggleOverviewFocus}
              title={overviewFocus ? "Show details" : "Focus case file"}
              aria-label={overviewFocus ? "Show details panel" : "Focus case file"}
            >
              {overviewFocus ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="p-4 md:p-6 space-y-5 max-w-3xl">
          {caseData.description ? (
            <section className="rounded-xl bg-muted/30 border border-border/40 px-4 py-3 space-y-2">
              <h3 className={detailType.panelTitle}>Description</h3>
              <p className={cn(appType.body, "whitespace-pre-wrap text-muted-foreground")}>
                {caseData.description}
              </p>
            </section>
          ) : null}

          <section className="grid grid-cols-3 gap-2">
            <StatPill
              icon={<Mail className="h-3.5 w-3.5 text-primary" />}
              label="Correspondence"
              count={corrCount}
            />
            <StatPill
              icon={<FileText className="h-3.5 w-3.5 text-primary" />}
              label="Documents"
              count={docCount}
            />
            <StatPill
              icon={<FileCheck className="h-3.5 w-3.5 text-primary" />}
              label="Forms"
              count={formCount}
            />
          </section>

          {primary ? (
            <section className="rounded-xl bg-muted/30 border border-border/40 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className={detailType.panelTitle}>Primary correspondence</h3>
                <Badge variant="outline" className="text-[10px] h-5 font-mono">
                  {primary.referenceNumber || "—"}
                </Badge>
              </div>
              <p className={cn(appType.subject, "line-clamp-2")}>{primary.subject || "—"}</p>
              <Button variant="ghost" size="sm" asChild className="h-7 px-2 -ml-2 text-xs">
                <Link href={`/correspondence/${primary.id}`}>Open correspondence</Link>
              </Button>
            </section>
          ) : null}

          {caseData.completionPackage ? (
            <section className="rounded-xl bg-muted/30 border border-border/40 px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn(correspondenceQueueLeadingBoxClass, "bg-primary/10")}>
                  <Package className={cn(correspondenceQueueLeadingIconClass, "text-primary")} />
                </div>
                <div className="min-w-0">
                  <p className={detailType.panelTitle}>Completion package</p>
                  <p className={cn(detailType.caption, "truncate")}>
                    {caseData.completionPackage.title}
                  </p>
                </div>
              </div>
              <Button
                  size="compact"
                  onClick={() => {
                    void downloadCaseCompletionPackage(
                      caseData.id,
                      `${caseData.completionPackage?.title || 'completion-package'}.pdf`,
                    ).catch((err: unknown) => {
                      logError('Case completion package download failed', err);
                      toast.error(err instanceof Error ? err.message : 'Download failed');
                    });
                  }}
                >
                  Download
                </Button>
            </section>
          ) : null}

          {totalLinks === 0 ? (
            <EmptyState
              icon={<LinkIcon className={registryQueueEmptyIconClass} />}
              title="No records linked yet"
              message="Link correspondence, documents, or forms to build this case file."
              actionLabel="Link correspondence"
              onAction={onLinkCorrespondence}
            />
          ) : (
            <section className="flex flex-wrap gap-2">
              <Button variant="outline" size="compact" onClick={onLinkCorrespondence}>
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                Correspondence
              </Button>
              <Button variant="outline" size="compact" onClick={onLinkDocument}>
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Document
              </Button>
              <Button variant="outline" size="compact" onClick={onLinkForm}>
                <FileCheck className="h-3.5 w-3.5 mr-1.5" />
                Form
              </Button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function StatPill({
  icon,
  label,
  count,
}: {
  icon: ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div className="rounded-xl bg-muted/30 border border-border/40 px-3 py-2.5 min-w-0">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className={cn(detailType.caption, "truncate")}>{label}</span>
      </div>
      <p className="text-xl font-semibold tracking-tight tabular-nums">{count}</p>
    </div>
  );
}
