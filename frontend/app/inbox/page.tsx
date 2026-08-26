"use client";

import { useMemo, useState, useEffect } from 'react';
import { fetchSLATargets, DEFAULT_SLA_TARGETS } from '@/lib/sla-client';
import { logError } from '@/lib/client-logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Users2,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useSidebarCounts } from '@/hooks/use-sidebar-counts';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Correspondence } from '@/lib/npa-structure';
import { apiFetch } from '@/lib/api-client';
import { DEFAULT_LIST_PAGE_SIZE } from '@/lib/pagination-constants';
import { mapApiCorrespondence } from '@/lib/api/correspondence-mappers';
import { getSharedDocuments } from '@/lib/api/dms';
import { calculateSLAStatus, slaSortPriority } from '@/lib/inbox-sla';
import { usePagination } from '@/hooks/use-pagination';
import { useCorrespondenceQueueFilters } from '@/hooks/use-correspondence-queue-filters';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { QueuePageShell } from '@/components/shared/QueuePageShell';
import { correspondenceQueueListStackClass } from '@/components/shared/registry-queue-styles';
import { InboxSummaryCards } from './components/InboxSummaryCards';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { InboxItemCard } from './components/InboxItemCard';
import { InboxApprovalCard } from './components/InboxApprovalCard';
import { getMyActingAppointments, type ActingAppointment } from '@/lib/api/acting-appointments';
import { hasRolePermission } from '@/lib/permissions';
import { formatDateShort } from '@/lib/datetime';

const calculateDaysPending = (item: Correspondence): number => {
  if (!item.receivedDate) return 0;
  const received = new Date(item.receivedDate).getTime();
  return Math.floor((Date.now() - received) / (1000 * 60 * 60 * 24));
};

const calculateTaskStatus = (dueDate: string): { status: 'overdue' | 'due-soon' | 'pending'; daysOverdue?: number; daysUntilDue?: number } => {
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { status: 'overdue', daysOverdue: Math.abs(diffDays) };
  }
  if (diffDays <= 2) {
    return { status: 'due-soon', daysUntilDue: diffDays };
  }
  return { status: 'pending', daysUntilDue: diffDays };
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

const ExecutiveInbox = () => {
  const { currentUser } = useCurrentUser();
  const {
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    selectedStatus,
    setSelectedStatus,
    selectedPriority,
    setSelectedPriority,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    sortBy,
    sortOrder,
    hasActiveFilters,
    clearFilters,
    handleSortChange,
    appendQueueParams,
  } = useCorrespondenceQueueFilters();

  const [count, setCount] = useState(0);
  const [_sharedDocumentsCount, setSharedDocumentsCount] = useState(0);
  const pagination = usePagination({
    initialPage: 1,
    totalCount: count,
  });

  const [inboxItems, setInboxItems] = useState<Correspondence[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [summary, setSummary] = useState({ total: 0, urgent: 0, overdue: 0, pending: 0, inProgress: 0, dueSoon: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slaTargets, setSlaTargets] = useState<{ urgent: number; high: number; medium: number; low: number } | null>(null);
  const counts = useSidebarCounts();
  const { officeMemberships } = useOrganization();
  const [actingAppointments, setActingAppointments] = useState<ActingAppointment[]>([]);

  const isOfficePrincipal = useMemo(
    () =>
      officeMemberships.some(
        (m) =>
          m.isActive &&
          m.assignmentRole === 'principal' &&
          String(m.userId) === String(currentUser?.id ?? '')
      ),
    [officeMemberships, currentUser?.id]
  );

  const isOfficeMember = useMemo(
    () =>
      officeMemberships.some(
        (m) => m.isActive && String(m.userId) === String(currentUser?.id ?? '')
      ),
    [officeMemberships, currentUser?.id]
  );

  const canManageActingAppointments =
    Boolean(currentUser?.isSuperuser) ||
    hasRolePermission(currentUser, 'can_manage_org_structure') ||
    hasRolePermission(currentUser, 'can_manage_users');

  useEffect(() => {
    if (!currentUser?.id) {
      setActingAppointments([]);
      return;
    }
    let ignore = false;
    const loadActing = async () => {
      try {
        const mine = await getMyActingAppointments();
        if (!ignore) setActingAppointments(mine.filter((a) => a.isCurrentlyEffective));
      } catch (err) {
        logError('Failed to load acting appointments', err);
        if (!ignore) setActingAppointments([]);
      }
    };
    void loadActing();
    return () => {
      ignore = true;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    pagination.goToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedStatus, selectedPriority, dateFrom, dateTo, sortBy, sortOrder, pagination.pageSize]);

  useEffect(() => {
    let ignore = false;
    const loadSLATargets = async () => {
      try {
        const targets = await fetchSLATargets();
        if (!ignore) setSlaTargets(targets);
      } catch (err) {
        logError('Failed to load SLA targets', err);
        if (!ignore) setSlaTargets(DEFAULT_SLA_TARGETS);
      }
    };
    void loadSLATargets();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchInbox = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = appendQueueParams(new URLSearchParams());
        params.append('page', String(pagination.page));
        params.append('page_size', String(pagination.pageSize));

        const [corrResponse, docsResponse, approvalsResponse] = await Promise.all([
          apiFetch<Record<string, unknown>>(`/correspondence/items/my-inbox/?${params.toString()}`),
          getSharedDocuments(currentUser.id, {
            search: debouncedSearch || undefined,
            page: 1,
            pageSize: 1,
          }),
          apiFetch<Record<string, unknown>>(`/correspondence/minutes/pending-approvals/?page_size=${pagination.pageSize || DEFAULT_LIST_PAGE_SIZE}`).catch(() => ({ results: [] })),
        ]);

        const corrResults = Array.isArray(corrResponse.results) ? corrResponse.results : [];
        const mappedItems = corrResults.map(mapApiCorrespondence);
        setInboxItems(mappedItems);

        const summaryData = corrResponse.summary as Record<string, unknown> | undefined;
        setSummary({
          total: typeof summaryData?.total === 'number' ? summaryData.total : (corrResponse.count as number ?? corrResults.length),
          urgent: typeof summaryData?.urgent === 'number' ? summaryData.urgent : 0,
          overdue: typeof summaryData?.overdue === 'number' ? summaryData.overdue : 0,
          pending: typeof summaryData?.pending === 'number' ? summaryData.pending : 0,
          inProgress: typeof summaryData?.in_progress === 'number' ? summaryData.in_progress : 0,
          dueSoon: typeof summaryData?.due_soon === 'number' ? summaryData.due_soon : 0,
        });
        setCount((corrResponse.count as number) ?? corrResults.length);

        setSharedDocumentsCount(docsResponse.count ?? 0);

        const approvals = Array.isArray(approvalsResponse.results) ? approvalsResponse.results : [];
        setPendingApprovals(approvals);
      } catch {
        setError('Failed to load inbox. Please try again.');
        setInboxItems([]);
        setPendingApprovals([]);
        setSummary({ total: 0, urgent: 0, overdue: 0, pending: 0, inProgress: 0, dueSoon: 0 });
        setCount(0);
        setSharedDocumentsCount(0);
      } finally {
        setLoading(false);
      }
    };

    void fetchInbox();
  }, [
    currentUser?.id,
    debouncedSearch,
    selectedStatus,
    selectedPriority,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    pagination.page,
    pagination.pageSize,
  ]);

  const sortedItems = useMemo(() => {
    return [...inboxItems].sort((a, b) => {
      const aStatus = calculateSLAStatus(a, slaTargets).status;
      const bStatus = calculateSLAStatus(b, slaTargets).status;
      return slaSortPriority(aStatus) - slaSortPriority(bStatus);
    });
  }, [inboxItems, slaTargets]);

  return (
    <QueuePageShell
      title="My Inbox"
      subtitle="Correspondence and documents that need your action"
    >
      <InboxSummaryCards summary={summary} />

      {actingAppointments.map((appt) => (
        <div
          key={appt.id}
          className="flex items-center gap-3 rounded-lg border border-sky-200 bg-sky-50/60 px-4 py-2.5 text-sm dark:border-sky-800/40 dark:bg-sky-950/20"
        >
          <UserCheck className="h-4 w-4 text-sky-700 dark:text-sky-400" />
          <span className="flex-1 text-sky-900 dark:text-sky-200">
            You are acting as <span className="font-semibold">{appt.principalName}</span>
            {appt.officeName ? ` (${appt.officeName})` : ''}
            {appt.endsAt
              ? ` until ${formatDateShort(appt.endsAt)}`
              : ' until further notice'}
            . Seat items appear in this inbox with an Acting badge.
          </span>
        </div>
      ))}

      {(isOfficePrincipal || isOfficeMember) && (
        <a
          href="/acting"
          className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <UserCheck className="h-4 w-4" />
          <span className="flex-1">
            {isOfficePrincipal
              ? 'Appoint an acting officer for your seat (or request help)'
              : 'Request an acting appointment if your office seat holder is away'}
          </span>
          <ArrowRight className="h-3 w-3" />
        </a>
      )}

      {(canManageActingAppointments) && (
        <a
          href="/admin/organization/acting"
          className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <UserCheck className="h-4 w-4" />
          <span className="flex-1">Admin: manage acting appointments & requests</span>
          <ArrowRight className="h-3 w-3" />
        </a>
      )}

      {counts.delegated > 0 && (
        <a
          href="/inbox/delegated"
          className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-2.5 text-sm transition-colors hover:bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
        >
          <Users2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="flex-1 text-amber-800 dark:text-amber-300">
            <span className="font-semibold">{counts.delegated}</span> item{counts.delegated === 1 ? '' : 's'} delegated to you
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
            View <ArrowRight className="h-3 w-3" />
          </span>
        </a>
      )}

      <div className="rounded-xl bg-muted/30 p-2" role="search" aria-label="Inbox filters">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-[12rem] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
              aria-label="Search inbox"
            />
          </div>
          <Select value={selectedStatus || 'all'} onValueChange={(v) => { setSelectedStatus(v === 'all' ? '' : v); pagination.goToFirstPage(); }}>
            <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Filter by status"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedPriority || 'all'} onValueChange={(v) => { setSelectedPriority(v === 'all' ? '' : v); pagination.goToFirstPage(); }}>
            <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Filter by priority"><SelectValue placeholder="All Priorities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
          <Select value={`${sortBy}-${sortOrder}`} onValueChange={handleSortChange}>
            <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Sort inbox"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="priority-desc">Priority (Urgent First)</SelectItem>
              <SelectItem value="days_pending-desc">Days Pending (Oldest)</SelectItem>
              <SelectItem value="updated-desc">Last Updated (Newest)</SelectItem>
              <SelectItem value="updated-asc">Last Updated (Oldest)</SelectItem>
              <SelectItem value="reference-asc">Reference (A-Z)</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">Clear</Button>
          )}
        </div>
      </div>

      {error ? (
        <ErrorState message={error} variant="inline" />
      ) : sortedItems.length === 0 && pendingApprovals.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="No correspondence"
          message={debouncedSearch || hasActiveFilters
            ? 'No correspondence matches your filters.'
            : 'No correspondence is waiting on you right now.'}
          actionLabel={debouncedSearch || hasActiveFilters ? 'Clear Filters' : undefined}
          onAction={debouncedSearch || hasActiveFilters ? clearFilters : undefined}
        />
      ) : (
        <div className="space-y-6">
          {pendingApprovals.length > 0 && (
            <div className={correspondenceQueueListStackClass}>
              {pendingApprovals.map((approval) => (
                <InboxApprovalCard
                  key={approval.id}
                  approval={approval}
                  taskStatus={approval.due_date ? calculateTaskStatus(approval.due_date) : { status: 'pending' }}
                />
              ))}
            </div>
          )}
          {sortedItems.length > 0 && (
            <>
              <div className={correspondenceQueueListStackClass}>
                {sortedItems.map((corr) => (
                  <InboxItemCard
                    key={corr.id}
                    corr={corr}
                    slaStatus={calculateSLAStatus(corr, slaTargets)}
                    daysPending={calculateDaysPending(corr)}
                  />
                ))}
              </div>
              {count > 0 && (
                <PaginationControls
                  pagination={pagination}
                  showPageSizeSelector
                  showGoToPage
                  className="border-t border-border/60 pt-4"
                />
              )}
            </>
          )}
        </div>
      )}
    </QueuePageShell>
  );
};

export default ExecutiveInbox;
