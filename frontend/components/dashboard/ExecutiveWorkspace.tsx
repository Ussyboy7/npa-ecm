"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, Loader2, Users } from 'lucide-react';
import { StatStrip } from '@/components/shared/StatStrip';
import { appType } from '@/lib/app-type';
import type { ExecutivePortfolio } from '@/lib/analytics-client';

interface ExecutiveWorkspaceProps {
  portfolio: ExecutivePortfolio | null;
  loading: boolean;
  error: string | null;
}

export function ExecutiveWorkspace({ portfolio, loading, error }: ExecutiveWorkspaceProps) {
  const router = useRouter();
  const summary = portfolio?.summary;
  const escalationCount = portfolio?.escalations?.length ?? 0;
  const approvalCount = portfolio?.approvals?.length ?? 0;
  const actNowCount = escalationCount + approvalCount;
  const offices = portfolio?.offices ?? [];
  const delegations = portfolio?.delegations ?? [];

  const actNowItems = [
    {
      key: 'escalations',
      label: 'Escalations',
      value: escalationCount,
      href: '/correspondence/inbox?priority=urgent',
      tone: escalationCount > 0 ? ('destructive' as const) : ('default' as const),
    },
    {
      key: 'approvals',
      label: 'Approvals',
      value: approvalCount,
      href: '/approvals',
      tone: 'default' as const,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60">
        <div className="flex flex-row flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div className="space-y-1">
            <h2 className={appType.panelTitle}>Office workload</h2>
            {!loading && summary && (
              <p className={appType.caption}>
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
        </div>
        <div className="space-y-4 p-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {loading && !summary ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <>
              <StatStrip
                items={actNowItems.map((item) => ({
                  key: item.key,
                  label: item.label,
                  value:
                    item.tone === 'destructive' ? (
                      <span className="text-destructive">{item.value}</span>
                    ) : (
                      item.value
                    ),
                  onClick: () => router.push(item.href),
                  hint: `Open ${item.label}`,
                }))}
              />
              {actNowCount === 0 && !loading && (
                <p className="text-sm text-muted-foreground">No escalations or approvals need you right now.</p>
              )}
            </>
          )}

          {offices.length > 0 && (
            <div className="space-y-2 border-t border-border/60 pt-4">
              <p className={appType.sectionLabel}>By office</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {offices.map((office) => (
                  <Link
                    key={office.id}
                    href={`/correspondence/inbox?office=${office.id}`}
                    className="rounded-xl border border-border/60 bg-muted/20 p-3 text-sm transition-colors hover:bg-muted/40"
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
        </div>
      </div>

      {delegations.length > 0 && (
        <Collapsible>
          <div className="rounded-xl border border-border/60">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Delegation ({delegations.length} office{delegations.length === 1 ? '' : 's'})
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-3 border-t border-border/60 p-4">
                {delegations.map((entry) => (
                  <div key={entry.officeId} className="text-sm">
                    <p className="font-medium">{entry.officeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.members.map((m) => `${m.name} · ${m.role}`).join(' · ')}
                    </p>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}
    </div>
  );
}
