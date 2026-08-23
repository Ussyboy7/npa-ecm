"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QueuePageShell } from "@/components/shared/QueuePageShell";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatStrip } from "@/components/shared/StatStrip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InboxSummaryCards } from "@/app/inbox/components/InboxSummaryCards";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useRoleChecks } from "@/hooks/use-role-checks";
import { apiFetch } from "@/lib/api-client";
import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/pagination-constants";
import { mapApiCorrespondence } from '@/lib/api/correspondence-mappers';
import type { Correspondence } from "@/lib/npa-structure";
import { InboxItemCard } from "@/app/inbox/components/InboxItemCard";
import { InboxApprovalCard } from "@/app/inbox/components/InboxApprovalCard";
import { fetchSLATargets, DEFAULT_SLA_TARGETS } from "@/lib/sla-client";
import { calculateSLAStatus } from "@/lib/inbox-sla";
import SecretaryDashboardContent from "./components/SecretaryDashboardContent";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Inbox,
} from "lucide-react";

const calculateDaysPending = (item: Correspondence): number => {
  if (!item.receivedDate) return 0;
  const received = new Date(item.receivedDate).getTime();
  return Math.floor((Date.now() - received) / (1000 * 60 * 60 * 24));
};

interface PendingApproval {
  id: string;
  correspondenceId?: string;
  correspondence?: {
    id: string;
    subject: string;
    reference_number: string;
  };
  due_date?: string;
  created_at: string;
}

const Dashboard = () => {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const { divisions } = useOrganization();
  const { isSecretary } = useRoleChecks();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({ total: 0, urgent: 0, overdue: 0, dueSoon: 0 });
  const [priorityItems, setPriorityItems] = useState<Correspondence[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [myCasesCount, setMyCasesCount] = useState(0);
  const [slaTargets, setSlaTargets] = useState<{ urgent: number; high: number; medium: number; low: number } | null>(null);

  const division = useMemo(() => {
    if (!currentUser?.division) return undefined;
    return divisions.find((item) => item.id as string === currentUser.division);
  }, [currentUser?.division, divisions]);

  const roleDisplay = useMemo(() => {
    if (!currentUser) return 'User';
    if (typeof currentUser.systemRole === 'string') return currentUser.systemRole;
    const o = currentUser.systemRole as Record<string, unknown> | undefined;
    return o && typeof o.name === 'string' ? o.name : 'User';
  }, [currentUser]);

  const subtitle = useMemo(() => {
    const parts = [roleDisplay, division?.name].filter(Boolean);
    return `Welcome back, ${currentUser?.name ?? 'User'}${parts.length ? ` · ${parts.join(' · ')}` : ''}`;
  }, [currentUser?.name, roleDisplay, division?.name]);

  useEffect(() => {
    let ignore = false;
    const loadTargets = async () => {
      try {
        const targets = await fetchSLATargets();
        if (!ignore) setSlaTargets(targets);
      } catch {
        if (!ignore) setSlaTargets(DEFAULT_SLA_TARGETS);
      }
    };
    void loadTargets();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    let ignore = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: "1",
          page_size: String(DEFAULT_LIST_PAGE_SIZE),
          sort_by: "priority",
          sort_order: "desc",
        });

        const [inboxResponse, approvalsResponse, casesResponse] = await Promise.all([
          apiFetch<Record<string, unknown>>(`/correspondence/items/my-inbox/?${params}`),
          apiFetch<Record<string, unknown>>(`/correspondence/minutes/pending-approvals/?page_size=5`).catch(() => ({ results: [] })),
          apiFetch<Record<string, unknown>>("/correspondence/cases/?assigned_to_me=true&page_size=1").catch(() => ({ count: 0 })),
        ]);

        const results = Array.isArray(inboxResponse.results) ? inboxResponse.results : [];
        const mapped = results.map(mapApiCorrespondence);
        const summaryData = inboxResponse.summary as Record<string, unknown> | undefined;

        if (!ignore) {
          setSummary({
            total: typeof summaryData?.total === "number" ? summaryData.total : (inboxResponse.count as number) ?? mapped.length,
            urgent: typeof summaryData?.urgent === "number" ? summaryData.urgent : 0,
            overdue: typeof summaryData?.overdue === "number" ? summaryData.overdue : 0,
            dueSoon: typeof summaryData?.due_soon === "number" ? summaryData.due_soon : 0,
          });

          const actionable = mapped
            .filter((item) => {
              if (!slaTargets) return true;
              const sla = calculateSLAStatus(item, slaTargets);
              return sla.status === "overdue" || sla.status === "due-soon" || item.priority === "urgent";
            })
            .slice(0, 5);
          setPriorityItems(actionable.length > 0 ? actionable : mapped.slice(0, 5));

          const approvals = Array.isArray(approvalsResponse.results) ? approvalsResponse.results : [];
          setPendingApprovals(approvals as PendingApproval[]);
          setMyCasesCount(typeof casesResponse.count === "number" ? casesResponse.count : 0);
        }
      } catch {
        if (!ignore) {
          setError("Failed to load your work queue.");
          setSummary({ total: 0, urgent: 0, overdue: 0, dueSoon: 0 });
          setPriorityItems([]);
          setPendingApprovals([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void load();
    return () => { ignore = true; };
  }, [currentUser?.id, slaTargets]);

  const quickLinks = useMemo(
    () => [
      { label: "Overdue items", count: summary.overdue, href: "/inbox", icon: AlertCircle, tone: "text-destructive", bg: "bg-destructive/10" },
      { label: "Due soon", count: summary.dueSoon, href: "/inbox", icon: Clock, tone: "text-orange-600", bg: "bg-orange-500/10" },
      { label: "Pending approvals", count: pendingApprovals.length, href: "/approvals", icon: CheckCircle2, tone: "text-primary", bg: "bg-primary/10" },
      { label: "My cases", count: myCasesCount, href: "/cases/my", icon: Briefcase, tone: "text-blue-600", bg: "bg-blue-500/10" },
    ],
    [summary.overdue, summary.dueSoon, pendingApprovals.length, myCasesCount],
  );

  if (!currentUser) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="sr-only">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Use the Role Switcher in Settings to choose a user context after signing in.
        </p>
      </div>
    );
  }

  return (
    <QueuePageShell
      title="Dashboard"
      subtitle={subtitle}
      actions={(
        <Badge variant="secondary" className="px-3 py-1.5 font-mono text-xs">
          {currentUser.employeeId}
        </Badge>
      )}
    >
      {isSecretary ? <SecretaryDashboardContent /> : null}

      {error ? (
        <ErrorState message={error} onRetry={() => router.refresh()} />
      ) : (
        <div className="space-y-6">
          <InboxSummaryCards summary={summary} />

          <StatStrip
            items={quickLinks.map((link) => ({
              key: link.label,
              label: link.label,
              value: link.count,
              onClick: () => router.push(link.href),
              hint: `Open ${link.label}`,
            }))}
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4 space-y-3 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold tracking-tight flex items-center gap-2">
                    <Inbox className="h-4 w-4" /> Priority Inbox
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Overdue, due soon, and urgent
                  </p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/inbox">View all</Link>
                </Button>
              </div>
              <div className="space-y-2">
                {priorityItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No priority items right now.</p>
                ) : (
                  priorityItems.map((item) => (
                    <InboxItemCard
                      key={item.id}
                      corr={item}
                      slaStatus={slaTargets ? calculateSLAStatus(item, slaTargets) : null}
                      daysPending={calculateDaysPending(item)}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/15 p-4 space-y-3 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold tracking-tight flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Pending Approvals
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Awaiting your sign-off
                  </p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/approvals">View all</Link>
                </Button>
              </div>
              <div className="space-y-2">
                {pendingApprovals.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No pending approvals.</p>
                ) : (
                  pendingApprovals.map((approval) => (
                    <InboxApprovalCard
                      key={approval.id}
                      approval={approval}
                      taskStatus={approval.due_date ? calculateTaskStatus(approval.due_date) : { status: "pending" }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{summary.total} total inbox items</Badge>
            <Badge variant="outline">{summary.urgent} urgent</Badge>
            <Button variant="outline" size="sm" asChild>
              <Link href="/inbox">
                Open full inbox <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </QueuePageShell>
  );
};

const calculateTaskStatus = (dueDate: string): { status: "overdue" | "due-soon" | "pending"; daysOverdue?: number; daysUntilDue?: number } => {
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { status: "overdue", daysOverdue: Math.abs(diffDays) };
  if (diffDays <= 2) return { status: "due-soon", daysUntilDue: diffDays };
  return { status: "pending", daysUntilDue: diffDays };
};

export default Dashboard;
