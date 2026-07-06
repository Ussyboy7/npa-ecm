"use client";

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Loader2,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExecutivePortfolio } from '@/lib/analytics-client';
import {
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from '@/components/shared/registry-queue-styles';

interface ExecutiveWorkspaceProps {
  portfolio: ExecutivePortfolio | null;
  loading: boolean;
  error: string | null;
}

export function ExecutiveWorkspace({ portfolio, loading, error }: ExecutiveWorkspaceProps) {
  const summary = portfolio?.summary;
  const escalationCount = portfolio?.escalations?.length ?? 0;
  const approvalCount = portfolio?.approvals?.length ?? 0;
  const actNowCount = escalationCount + approvalCount;
  const offices = portfolio?.offices ?? [];
  const delegations = portfolio?.delegations ?? [];

  const actNowItems = [
    {
      label: 'Escalations',
      value: escalationCount,
      href: '/correspondence/inbox?priority=urgent',
      icon: AlertTriangle,
      tone: escalationCount > 0 ? ('destructive' as const) : ('default' as const),
    },
    {
      label: 'Approvals',
      value: approvalCount,
      href: '/approvals',
      icon: CheckCircle,
      tone: 'default' as const,
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-3">
          <div className="space-y-1">
            <CardTitle className="text-lg">Office workload</CardTitle>
            {!loading && summary && (
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{summary.totalQueue}</span> in queue
                {summary.slaBreaches > 0 && (
                  <> · <span className="font-semibold text-destructive">{summary.slaBreaches}</span> SLA breaches</>
                )}
                {summary.urgent > 0 && (
                  <> · <span className="font-semibold text-amber-600">{summary.urgent}</span> urgent</>
                )}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/correspondence/inbox">Office inbox</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/approvals">Approvals</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {loading && !summary ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {actNowItems.map((item) => {
                  const Icon = item.icon;
                  const valueClass =
                    item.tone === 'destructive' ? 'text-destructive' : 'text-foreground';
                  const iconBoxClass =
                    item.tone === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10';
                  const iconClass =
                    item.tone === 'destructive' ? 'text-destructive' : 'text-primary';

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
              {actNowCount === 0 && !loading && (
                <p className="text-sm text-muted-foreground">No escalations or approvals need you right now.</p>
              )}
            </>
          )}

          {offices.length > 0 && (
            <div className="space-y-2 border-t border-border/60 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                By office
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {offices.map((office) => (
                  <Link
                    key={office.id}
                    href={`/correspondence/inbox?office=${office.id}`}
                    className="rounded-lg border border-border/60 px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                  >
                    <p className="font-medium">{office.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {office.total} in queue
                      {office.slaBreaches > 0 && (
                        <span className="text-destructive"> · {office.slaBreaches} breach</span>
                      )}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {delegations.length > 0 && (
        <Collapsible>
          <Card>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-6 py-4 text-left"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Delegation ({delegations.length} office{delegations.length === 1 ? '' : 's'})
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-3 border-t border-border/60 pt-0">
                {delegations.map((entry) => (
                  <div key={entry.officeId} className="text-sm">
                    <p className="font-medium">{entry.officeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.members.map((m) => `${m.name} · ${m.role}`).join(' · ')}
                    </p>
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}
