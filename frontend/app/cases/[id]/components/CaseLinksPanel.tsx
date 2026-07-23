"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListRowCard } from "@/components/shared/ListRowCard";
import { detailType } from "@/lib/detail-type";
import type { CaseDetail } from "@/lib/npa-structure";
import { cn } from "@/lib/utils";
import { Eye, FileCheck, FileText, Link as LinkIcon, Mail, Trash2 } from "lucide-react";
import { CaseRailCard, CaseRailEmpty } from "./CaseRailCard";
import {
  correspondenceQueueBadgeClass,
  correspondenceQueueListStackClass,
  correspondenceQueueSubjectClass,
} from "@/components/shared/registry-queue-styles";

export interface CaseLinksPanelProps {
  caseData: CaseDetail;
  onLinkCorrespondence: () => void;
  onLinkDocument: () => void;
  onLinkForm: () => void;
  onUnlink: (
    type: "correspondence" | "document" | "form",
    id: string,
    name: string,
  ) => void;
  onPreviewDocument?: (documentId: string) => void;
  onPreviewCorrespondence?: (correspondenceId: string) => void;
  onPreviewForm?: (formDocumentId: string, title?: string) => void;
}

function LinkRowActions({
  href,
  viewLabel,
  onUnlink,
  unlinkLabel,
  canView,
  onPreview,
}: {
  href?: string;
  viewLabel: string;
  onUnlink: () => void;
  unlinkLabel: string;
  canView: boolean;
  onPreview?: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {canView && onPreview ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onPreview}
          title={viewLabel}
          aria-label={viewLabel}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      ) : canView && href ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href={href} title={viewLabel} aria-label={viewLabel}>
            <Eye className="h-3.5 w-3.5" />
          </Link>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          disabled
          title={viewLabel}
          aria-label={viewLabel}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive/80 hover:text-destructive"
        disabled={!canView}
        onClick={onUnlink}
        title={unlinkLabel}
        aria-label={unlinkLabel}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function LeadingIcon({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg bg-primary/10 p-1.5 shrink-0">
      <div className="[&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-primary">{children}</div>
    </div>
  );
}

export function CaseLinksPanel({
  caseData,
  onLinkCorrespondence,
  onLinkDocument,
  onLinkForm,
  onUnlink,
  onPreviewDocument,
  onPreviewCorrespondence,
  onPreviewForm,
}: CaseLinksPanelProps) {
  return (
    <div className="space-y-3 min-w-0">
      <LinkSection
        title="Correspondence"
        count={caseData.correspondence?.length ?? 0}
        onLink={onLinkCorrespondence}
        empty={
          <CaseRailEmpty
            message="No correspondence linked yet."
            actionLabel="Link correspondence"
            onAction={onLinkCorrespondence}
          />
        }
      >
        {(caseData.correspondence ?? []).map((link) => {
          const href = link.correspondence
            ? `/correspondence/${link.correspondence.id}`
            : undefined;
          return (
            <ListRowCard
              key={link.id}
              density="compact"
              className="bg-background/70 border-border/40 shadow-none"
              href={href}
              leading={
                <LeadingIcon>
                  <Mail />
                </LeadingIcon>
              }
              actions={
                <LinkRowActions
                  href={href}
                  canView={Boolean(link.correspondence)}
                  viewLabel="Preview correspondence"
                  unlinkLabel="Unlink correspondence"
                  onPreview={
                    link.correspondence && onPreviewCorrespondence
                      ? () => onPreviewCorrespondence(link.correspondence!.id)
                      : undefined
                  }
                  onUnlink={() =>
                    link.correspondence &&
                    onUnlink(
                      "correspondence",
                      link.correspondence.id,
                      link.correspondence.referenceNumber ||
                        link.correspondence.subject ||
                        "correspondence",
                    )
                  }
                />
              }
            >
              <h4
                className={cn(
                  correspondenceQueueSubjectClass,
                  "text-[13px] break-words [overflow-wrap:anywhere]",
                )}
              >
                {link.correspondence?.subject || "—"}
              </h4>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <Badge
                  variant="outline"
                  className={cn(correspondenceQueueBadgeClass, "font-mono")}
                >
                  {link.correspondence?.referenceNumber || "—"}
                </Badge>
                {link.isPrimary ? (
                  <Badge variant="default" className={correspondenceQueueBadgeClass}>
                    Primary
                  </Badge>
                ) : null}
              </div>
            </ListRowCard>
          );
        })}
      </LinkSection>

      <LinkSection
        title="Documents"
        count={caseData.documents?.length ?? 0}
        onLink={onLinkDocument}
        empty={
          <CaseRailEmpty
            message="No documents linked yet."
            actionLabel="Link document"
            onAction={onLinkDocument}
          />
        }
      >
        {(caseData.documents ?? []).map((link) => {
          const href = link.documentId ? `/dms/${link.documentId}` : undefined;
          return (
            <ListRowCard
              key={link.id}
              density="compact"
              className="bg-background/70 border-border/40 shadow-none"
              href={href}
              leading={
                <LeadingIcon>
                  <FileText />
                </LeadingIcon>
              }
              actions={
                <LinkRowActions
                  href={href}
                  canView={Boolean(link.documentId)}
                  viewLabel="Preview document"
                  unlinkLabel={
                    link.documentId ? "Unlink document" : "Cannot unlink: missing ID"
                  }
                  onPreview={
                    link.documentId && onPreviewDocument
                      ? () => onPreviewDocument(link.documentId)
                      : undefined
                  }
                  onUnlink={() =>
                    link.documentId &&
                    onUnlink("document", link.documentId, link.documentTitle || "document")
                  }
                />
              }
            >
              <h4
                className={cn(
                  correspondenceQueueSubjectClass,
                  "text-[13px] break-words [overflow-wrap:anywhere]",
                )}
              >
                {link.documentTitle || "—"}
              </h4>
              {link.notes ? (
                <p className={cn(detailType.caption, "mt-1 line-clamp-1")}>{link.notes}</p>
              ) : null}
              {!link.documentId ? (
                <Badge variant="destructive" className="mt-1 text-[10px]">
                  Missing ID
                </Badge>
              ) : null}
            </ListRowCard>
          );
        })}
      </LinkSection>

      <LinkSection
        title="Forms"
        count={caseData.forms?.length ?? 0}
        onLink={onLinkForm}
        empty={
          <CaseRailEmpty
            message="No forms linked yet."
            actionLabel="Link form"
            onAction={onLinkForm}
          />
        }
      >
        {(caseData.forms ?? []).map((link) => {
          const href = link.documentId ? `/forms/${link.documentId}` : undefined;
          return (
          <ListRowCard
            key={link.id}
            density="compact"
            className="bg-background/70 border-border/40 shadow-none"
            href={href}
            leading={
              <LeadingIcon>
                <FileCheck />
              </LeadingIcon>
            }
            actions={
              <LinkRowActions
                href={href}
                canView={Boolean(link.formDocumentId)}
                viewLabel="Preview form"
                unlinkLabel={
                  link.formDocumentId ? "Unlink form" : "Cannot unlink: missing ID"
                }
                onPreview={
                  link.formDocumentId && onPreviewForm
                    ? () => onPreviewForm(link.formDocumentId, link.formTitle)
                    : undefined
                }
                onUnlink={() =>
                  link.formDocumentId &&
                  onUnlink("form", link.formDocumentId, link.formTitle || "form")
                }
              />
            }
          >
            <h4
              className={cn(
                correspondenceQueueSubjectClass,
                "text-[13px] break-words [overflow-wrap:anywhere]",
              )}
            >
              {link.formTitle || "—"}
            </h4>
            {link.notes ? (
              <p className={cn(detailType.caption, "mt-1 line-clamp-1")}>{link.notes}</p>
            ) : null}
            {!link.formDocumentId ? (
              <Badge variant="destructive" className="mt-1 text-[10px]">
                Missing ID
              </Badge>
            ) : null}
          </ListRowCard>
          );
        })}
      </LinkSection>
    </div>
  );
}

function LinkSection({
  title,
  count,
  onLink,
  empty,
  children,
}: {
  title: string;
  count: number;
  onLink: () => void;
  empty: ReactNode;
  children: ReactNode;
}) {
  return (
    <CaseRailCard
      title={title}
      action={
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] tabular-nums text-muted-foreground">{count}</span>
          <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0 px-2" onClick={onLink}>
            <LinkIcon className="h-3 w-3 mr-1" />
            Link
          </Button>
        </div>
      }
    >
      {count === 0 ? empty : <div className={correspondenceQueueListStackClass}>{children}</div>}
    </CaseRailCard>
  );
}
