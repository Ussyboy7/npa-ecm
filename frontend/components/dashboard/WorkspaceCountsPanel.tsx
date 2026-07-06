"use client";

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, AlertTriangle, Zap, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from '@/components/shared/registry-queue-styles';

interface CountLink {
  label: string;
  value: number;
  href: string;
  icon: typeof Mail;
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
  const items: CountLink[] = [
    {
      label: 'Inbox',
      value: inboxTotal,
      href: '/inbox',
      icon: Mail,
    },
    {
      label: 'Overdue',
      value: overdue,
      href: '/inbox?sla=overdue',
      icon: AlertTriangle,
      tone: overdue > 0 ? 'destructive' : 'default',
    },
    {
      label: 'Urgent',
      value: urgent,
      href: '/inbox?priority=urgent',
      icon: Zap,
      tone: urgent > 0 ? 'warning' : 'default',
    },
    {
      label: 'Sent today',
      value: sentToday,
      href: '/correspondence/outbox?tab=sent',
      icon: Send,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">My workload</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => {
              const Icon = item.icon;
              const valueClass =
                item.tone === 'destructive'
                  ? 'text-destructive'
                  : item.tone === 'warning'
                    ? 'text-amber-600'
                    : 'text-foreground';
              const iconBoxClass =
                item.tone === 'destructive'
                  ? 'bg-destructive/10'
                  : item.tone === 'warning'
                    ? 'bg-amber-500/10'
                    : 'bg-muted/60';
              const iconClass =
                item.tone === 'destructive'
                  ? 'text-destructive'
                  : item.tone === 'warning'
                    ? 'text-amber-600'
                    : 'text-muted-foreground';

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-lg border border-border/60 transition-colors hover:bg-muted/40"
                >
                  <CardContent className={registryQueueStatCardContentClass}>
                    <div className="flex items-center gap-4">
                      <div className={cn(registryQueueStatIconBoxClass, iconBoxClass)}>
                        <Icon className={cn(registryQueueStatIconClass, iconClass)} />
                      </div>
                      <div>
                        <p className={registryQueueStatLabelClass}>{item.label}</p>
                        <p className={cn(registryQueueStatValueClass, valueClass)}>{item.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
