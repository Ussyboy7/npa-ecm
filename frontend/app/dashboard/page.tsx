"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QueuePageShell } from "@/components/shared/QueuePageShell";
import { StatStrip } from "@/components/shared/StatStrip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";
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
import { ExecutiveDashboardTab } from "@/components/analytics/ExecutiveDashboardTab";
import {
  CheckCircle2,
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

interface InboxSummary {
  total: number;
  urgent: number;
  overdue: number;
  dueSoon: number;
}

const Dashboard = () => {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const { divisions } = useOrganization();
  const { isSecretary } = useRoleChecks();
  const { showExecutiveDashboard } = useSidebarVisibility();
  const [dashboardView, setDashboardView] = useState<'work' | 'executive'>('work');

  const [inboxLoading, setInboxLoading] = useState(true);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [inboxRefreshToken, setInboxRefreshToken] = useState(0);
  const [summary, setSummary] = useState<InboxSummary | null>(null);
  const [priorityItems, setPriorityItems] = useState<Correspondence[] | null>(null);

  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const [approvalsError, setApprovalsError] = useState<string | null>(null);
  const [approvalsRefreshToken, setApprovalsRefreshToken] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[] | null>(null);

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

  // Inbox summary and priority list are one independent dashboard section.
  useEffect(() => {
    if (!currentUser?.id) return;
    let ignore = false;

    const loadInbox = async () => {
      setInboxLoading(true);
      setInboxError(null);
      try {
        const params = new URLSearchParams({
          page: "1",
          page_size: String(DEFAULT_LIST_PAGE_SIZE),
          sort_by: "priority",
          sort_order: "desc",
        });

        const inboxResponse = await apiFetch<Record<string, unknown>>(
          `/correspondence/items/my-inbox/?${params}`,
        );
        if (ignore) return;

        const results = Array.isArray(inboxResponse.results) ? inboxResponse.results : [];
        const mapped = results.map(mapApiCorrespondence);
        const summaryData = inboxResponse.summary as Record<string, unknown> | undefined;

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
      } catch {
        if (!ignore) setInboxError("Failed to load your inbox.");
      } finally {
        if (!ignore) setInboxLoading(false);
      }
    };

    void loadInbox();
    return () => { ignore = true; };
  }, [currentUser?.id, slaTargets, inboxRefreshToken]);

  // Approvals are independent: a failure here must not blank the queue summary
  // or the priority inbox.
  useEffect(() => {
    if (!currentUser?.id) return;
    let ignore = false;

    const loadApprovals = async () => {
      setApprovalsLoading(true);
      setApprovalsError(null);
      try {
        const approvalsResponse = await apiFetch<Record<string, unknown>>(
          `/correspondence/minutes/pending-approvals/?page_size=5`,
        );
        if (ignore) return;
        const approvals = Array.isArray(approvalsResponse.results)
          ? (approvalsResponse.results as PendingApproval[])
          : [];
        setPendingApprovals(approvals);
      } catch {
        if (!ignore) setApprovalsError("Failed to load pending approvals.");
      } finally {
        if (!ignore) setApprovalsLoading(false);
      }
    };

    void loadApprovals();
    return () => { ignore = true; };
  }, [currentUser?.id, approvalsRefreshToken]);

  const retryInbox = () => setInboxRefreshToken((token) => token + 1);
  const retryApprovals = () => setApprovalsRefreshToken((token) => token + 1);

  return (
    <QueuePageShell
      title="Dashboard"
      subtitle={subtitle}
      actions={
        currentUser?.employeeId ? (
          <Badge variant="secondary" className="px-3 py-1.5 font-mono text-xs">
            {currentUser.employeeId}
          </Badge>
        ) : undefined
      }
    >
      {isSecretary ? <SecretaryDashboardContent /> : null}

      <Tabs
        value={dashboardView}
        onValueChange={(value) => setDashboardView(value as 'work' | 'executive')}
      >
        {showExecutiveDashboard ? (
          <TabsList className="h-9 rounded-lg bg-muted/60 p-1">
            <TabsTrigger value="work" className="h-7 px-3 text-xs">
              My work
            </TabsTrigger>
            <TabsTrigger value="executive" className="h-7 px-3 text-xs">
              Executive overview
            </TabsTrigger>
          </TabsList>
        ) : null}

        <TabsContent value="work" className="mt-4">
          <div className="space-y-6">
            <StatStrip
              items={[
                {
                  key: "inQueue",
                  label: "In queue",
                  value:
                    inboxLoading && summary === null ? (
                      <StatValueSkeleton />
                    ) : (
                      summary?.total ?? "—"
                    ),
                },
                {
                  key: "urgent",
                  label: "Urgent",
                  value:
                    inboxLoading && summary === null ? (
                      <StatValueSkeleton />
                    ) : (
                      summary?.urgent ?? "—"
                    ),
                },
                {
                  key: "dueSoon",
                  label: "Due soon",
                  value:
                    inboxLoading && summary === null ? (
                      <StatValueSkeleton />
                    ) : (
                      summary?.dueSoon ?? "—"
                    ),
                },
                {
                  key: "approvals",
                  label: "Pending approvals",
                  value:
                    approvalsLoading && pendingApprovals === null ? (
                      <StatValueSkeleton />
                    ) : (
                      pendingApprovals?.length ?? "—"
                    ),
                  onClick: () => router.push("/approvals"),
                  hint: "Open Pending approvals",
                },
              ]}
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

                {inboxLoading && priorityItems === null ? (
                  <div className="space-y-2" aria-busy="true" aria-live="polite">
                    {[0, 1, 2].map((index) => (
                      <Skeleton key={index} className="h-16 rounded-lg" />
                    ))}
                    <span className="sr-only">Loading priority inbox…</span>
                  </div>
                ) : inboxError && priorityItems === null ? (
                  <SectionError
                    message="Couldn’t load your priority inbox."
                    onRetry={retryInbox}
                  />
                ) : (
                  <>
                    {inboxError ? (
                      <SectionError
                        message="Couldn’t refresh your priority inbox."
                        onRetry={retryInbox}
                      />
                    ) : null}
                    {priorityItems && priorityItems.length > 0 ? (
                      <div className="space-y-2">
                        {priorityItems.map((item) => (
                          <InboxItemCard
                            key={item.id}
                            corr={item}
                            slaStatus={slaTargets ? calculateSLAStatus(item, slaTargets) : null}
                            daysPending={calculateDaysPending(item)}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No priority items right now.
                      </p>
                    )}
                  </>
                )}
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

                {approvalsLoading && pendingApprovals === null ? (
                  <div className="space-y-2" aria-busy="true" aria-live="polite">
                    {[0, 1].map((index) => (
                      <Skeleton key={index} className="h-16 rounded-lg" />
                    ))}
                    <span className="sr-only">Loading pending approvals…</span>
                  </div>
                ) : approvalsError && pendingApprovals === null ? (
                  <SectionError
                    message="Couldn’t load pending approvals."
                    onRetry={retryApprovals}
                  />
                ) : (
                  <>
                    {approvalsError ? (
                      <SectionError
                        message="Couldn’t refresh pending approvals."
                        onRetry={retryApprovals}
                      />
                    ) : null}
                    {pendingApprovals && pendingApprovals.length > 0 ? (
                      <div className="space-y-2">
                        {pendingApprovals.map((approval) => (
                          <InboxApprovalCard
                            key={approval.id}
                            approval={approval}
                            taskStatus={approval.due_date ? calculateTaskStatus(approval.due_date) : { status: "pending" }}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No pending approvals.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {showExecutiveDashboard ? (
          <TabsContent value="executive" className="mt-4">
            <ExecutiveDashboardTab />
          </TabsContent>
        ) : null}
      </Tabs>
    </QueuePageShell>
  );
};

const StatValueSkeleton = () => (
  <span
    className="mt-0.5 block h-5 w-8 animate-pulse rounded bg-muted"
    aria-hidden="true"
  />
);

const SectionError = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div
    className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm"
    role="alert"
  >
    <span className="text-destructive">{message}</span>
    <Button
      type="button"
      variant="link"
      size="sm"
      className="h-auto p-0 text-xs"
      onClick={onRetry}
    >
      Retry
    </Button>
  </div>
);

const calculateTaskStatus = (dueDate: string): { status: "overdue" | "due-soon" | "pending"; daysOverdue?: number; daysUntilDue?: number } => {
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { status: "overdue", daysOverdue: Math.abs(diffDays) };
  if (diffDays <= 2) return { status: "due-soon", daysUntilDue: diffDays };
  return { status: "pending", daysUntilDue: diffDays };
};

export default Dashboard;
