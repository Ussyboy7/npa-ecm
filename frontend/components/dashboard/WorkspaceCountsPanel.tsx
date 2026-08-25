"use client";

import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { StatStrip } from '@/components/shared/StatStrip';
import { appType } from '@/lib/app-type';

interface CountLink {
  key: string;
  label: string;
  value: number;
  href: string;
  tone?: 'default' | 'destructive' | 'warning';
}

interface WorkspaceCountsPanelProps {
  inboxTotal: number;
  overdue: number;
  urgent: number;
  sentToday: number;
  loading: boolean;
}

export function WorkspaceCountsPanel({
  inboxTotal,
  overdue,
  urgent,
  sentToday,
  loading,
}: WorkspaceCountsPanelProps) {
  const router = useRouter();

  const items: CountLink[] = [
    {
      key: 'inbox',
      label: 'Inbox',
      value: inboxTotal,
      href: '/inbox',
    },
    {
      key: 'overdue',
      label: 'Overdue',
      value: overdue,
      href: '/inbox?sla=overdue',
      tone: overdue > 0 ? 'destructive' : 'default',
    },
    {
      key: 'urgent',
      label: 'Urgent',
      value: urgent,
      href: '/inbox?priority=urgent',
      tone: urgent > 0 ? 'warning' : 'default',
    },
    {
      key: 'sent-today',
      label: 'Sent today',
      value: sentToday,
      href: '/correspondence/my-sent',
    },
  ];

  return (
    <div className="rounded-xl border border-border/60">
      <div className="border-b border-border/60 px-4 py-3">
        <h2 className={appType.panelTitle}>My workload</h2>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : (
          <StatStrip
            items={items.map((item) => ({
              key: item.key,
              label: item.label,
              value:
                item.tone === 'destructive' ? (
                  <span className="text-destructive">{item.value}</span>
                ) : item.tone === 'warning' ? (
                  <span className="text-amber-600">{item.value}</span>
                ) : (
                  item.value
                ),
              onClick: () => router.push(item.href),
              hint: `Open ${item.label}`,
            }))}
          />
        )}
      </div>
    </div>
  );
}
