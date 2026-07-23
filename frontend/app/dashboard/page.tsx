"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QueuePageShell } from "@/components/shared/QueuePageShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InboxSummaryCards } from "@/app/inbox/components/InboxSummaryCards";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useRoleChecks } from "@/hooks/use-role-checks";
import { apiFetch } from "@/lib/api-client";
import { MAX_LIST_PAGE_SIZE } from "@/lib/pagination-constants";
import { mapApiCorrespondence } from "@/contexts/CorrespondenceContext";
import type { Correspondence } from "@/lib/npa-structure";
import { InboxItemCard } from "@/app/inbox/components/InboxItemCard";
import { InboxApprovalCard } from "@/app/inbox/components/InboxApprovalCard";
import { fetchSLATargets } from "@/lib/sla-client";
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
import {
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from "@/components/shared/registry-queue-styles";

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
  const { currentUser, hydrated } = useCurrentUser();
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
        if (!ignore) setSlaTargets({ urgent: 2, high: 3, medium: 5, low: 7 });
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
          page_size: String(MAX_LIST_PAGE_SIZE),
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

  if (!hydrated) {
    return <LoadingState message="Loading dashboard…" />;
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto p-6">
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

      {loading ? (
        <LoadingState message="Loading your work queue…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => router.refresh()} />
      ) : (
        <div className="space-y-6">
          <InboxSummaryCards summary={summary} />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {quickLinks.map((link) => (
              <Card key={link.label} className="hover:border-primary/40 transition-colors">
                <CardContent className={registryQueueStatCardContentClass}>
                  <Link href={link.href} className="flex items-center gap-4 w-full">
                    <div className={`${registryQueueStatIconBoxClass} ${link.bg}`}>
                      <link.icon className={`${registryQueueStatIconClass} ${link.tone}`} />
                    </div>
                    <div className="flex-1">
                      <p className={registryQueueStatLabelClass}>{link.label}</p>
                      <p className={registryQueueStatValueClass}>{link.count}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Inbox className="h-5 w-5" /> Priority Inbox
                  </CardTitle>
                  <CardDescription>Overdue, due soon, and urgent correspondence</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/inbox">View all</Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {priorityItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No priority items right now.</p>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" /> Pending Approvals
                  </CardTitle>
                  <CardDescription>Minutes and actions awaiting your sign-off</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/approvals">View all</Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingApprovals.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No pending approvals.</p>
                ) : (
                  pendingApprovals.map((approval) => (
                    <InboxApprovalCard
                      key={approval.id}
                      approval={approval}
                      taskStatus={approval.due_date ? calculateTaskStatus(approval.due_date) : { status: "pending" }}
                    />
                  ))
                )}
              </CardContent>
            </Card>
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
