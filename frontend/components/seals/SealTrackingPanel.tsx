"use client";

import { Shield, Fingerprint, CheckCircle2, XCircle, Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SealBadge, type SealData } from "./SealBadge";
import type { Minute } from "@/lib/npa-structure";
import { formatDateTime as formatDateTimeShared } from '@/lib/datetime';

interface SealTrackingPanelProps {
  minutes: Minute[];
}

function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return "N/A";
  return formatDateTimeShared(dateString, 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SealTrackingPanel({ minutes }: SealTrackingPanelProps) {
  const sealEntries = minutes
    .filter((m) => m.sealData || m.signature)
    .map((m) => ({
      minuteId: m.id,
      minuteLabel: m.actionType ? `${m.actionType} minute` : "Minute",
      authorName: m.userName ?? "Unknown",
      createdAt: m.timestamp,
      sealData: m.sealData as SealData | undefined,
      signature: m.signature,
      isRecalled: m.isRecalled ?? false,
    }));

  const totalSeals = sealEntries.length;
  const validSeals = sealEntries.filter((e) => e.sealData?.isValid !== false).length;
  const recalledSeals = sealEntries.filter((e) => e.isRecalled).length;

  if (totalSeals === 0) {
    return (
      <div className="p-3 bg-muted/30 border border-border rounded-lg">
        <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          Seals & Signatures
        </h4>
        <p className="text-xs text-muted-foreground">No seals or signatures have been applied yet.</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="p-3 bg-muted/30 border-b border-border">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent" />
          Seals & Signatures
        </h4>
        <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            {validSeals} valid
          </span>
          {recalledSeals > 0 && (
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-destructive" />
              {recalledSeals} invalidated
            </span>
          )}
          <span className="flex items-center gap-1">
            <Fingerprint className="h-3 w-3 text-muted-foreground" />
            {totalSeals} total
          </span>
        </div>
      </div>
      <div className="divide-y divide-border">
        {sealEntries.map((entry) => (
          <div key={entry.minuteId} className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{entry.minuteLabel}</p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <User className="h-3 w-3" />
                  {entry.authorName}
                </p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDateTime(entry.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {entry.isRecalled && (
                  <Badge variant="destructive" className="text-[10px] h-4 px-1">
                    Recalled
                  </Badge>
                )}
                {entry.sealData && (
                  <SealBadge sealData={entry.sealData} size="sm" />
                )}
                {entry.signature && !entry.sealData && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 text-emerald-600 border-emerald-300">
                    Signed
                  </Badge>
                )}
              </div>
            </div>
            {entry.sealData && (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span>Sealed by: {entry.sealData.sealedBy}</span>
                <span>Date: {formatDateTime(entry.sealData.sealedAt)}</span>
                {entry.sealData.serialNumber && (
                  <span className="col-span-2 truncate" title={entry.sealData.serialNumber}>
                    Serial: {entry.sealData.serialNumber}
                  </span>
                )}
                {entry.sealData.officeName && (
                  <span className="col-span-2">{entry.sealData.officeName}</span>
                )}
              </div>
            )}
            {entry.signature && !entry.sealData && (
              <div className="text-[11px] text-muted-foreground">
                <span>Signed by: {entry.authorName}</span>
                <span className="ml-2">at {formatDateTime(entry.signature.appliedAt)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
