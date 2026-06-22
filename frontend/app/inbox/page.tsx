"use client";

import { useMemo, useState, useEffect } from 'react';
import { fetchSLATargets } from '@/lib/sla-client';
import { logError } from '@/lib/client-logger';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import {
  Inbox,
  Search,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { Correspondence } from '@/lib/npa-structure';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';
import { getSharedDocuments, type DocumentRecord } from '@/lib/dms-storage';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { correspondenceQueueListStackClass } from '@/components/shared/registry-queue-styles';
import { InboxSummaryCards } from './components/InboxSummaryCards';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { InboxItemCard } from './components/InboxItemCard';
import { InboxApprovalCard } from './components/InboxApprovalCard';
import { InboxDocumentCard } from './components/InboxDocumentCard';

const calculateDaysPending = (item: Correspondence, _slaTargets?: { urgent: number; high: number; medium: number; low: number }): number => {
  if (!item.receivedDate) return 0;
  const received = new Date(item.receivedDate).getTime();
  return Math.floor((Date.now() - received) / (1000 * 60 * 60 * 24));
};

const calculateSLAStatus = (
  item: Correspondence,
  slaTargets?: { urgent: number; high: number; medium: number; low: number }
): { status: 'overdue' | 'due-soon' | 'pending'; daysOverdue?: number; daysUntilDue?: number } => {
  if (!item.receivedDate || !slaTargets) {
    return { status: 'pending' };
  }
  const received = new Date(item.receivedDate).getTime();
  const now = Date.now();
  const priority = item.priority?.toLowerCase() || 'medium';
  const targetHours = slaTargets[priority as keyof typeof slaTargets] || slaTargets.medium;
  const dueDate = received + (targetHours * 60 * 60 * 1000);
  const diffHours = (dueDate - now) / (1000 * 60 * 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 0) {
    return { status: 'overdue', daysOverdue: Math.abs(diffDays) };
  } else if (diffDays <= 2) {
    return { status: 'due-soon', daysUntilDue: diffDays };
  } else {
    return { status: 'pending', daysUntilDue: diffDays };
  }
};

const calculateTaskStatus = (dueDate: string): { status: 'overdue' | 'due-soon' | 'pending'; daysOverdue?: number; daysUntilDue?: number } => {
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { status: 'overdue', daysOverdue: Math.abs(diffDays) };
  } else if (diffDays <= 2) {
    return { status: 'due-soon', daysUntilDue: diffDays };
  } else {
    return { status: 'pending', daysUntilDue: diffDays };
  }
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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [count, setCount] = useState(0);
  const pagination = usePagination({
    initialPage: 1,
    initialPageSize: 25,
    totalCount: count,
  });

  const [inboxItems, setInboxItems] = useState<Correspondence[]>([]);
  const [sharedDocuments, setSharedDocuments] = useState<DocumentRecord[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [summary, setSummary] = useState({ total: 0, urgent: 0, overdue: 0, pending: 0, inProgress: 0, dueSoon: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slaTargets, setSlaTargets] = useState<{ urgent: number; high: number; medium: number; low: number } | null>(null);
  const [focusOnTasks, setFocusOnTasks] = useState(false);

  const hasActiveFilters = useMemo(() => {
    return !!(selectedStatus || selectedPriority || dateFrom || dateTo);
  }, [selectedStatus, selectedPriority, dateFrom, dateTo]);

  const clearFilters = () => {
    setSelectedStatus('');
    setSelectedPriority('');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  };

  const handleSortChange = (value: string) => {
    const [by, order] = value.split('-');
    setSortBy(by);
    setSortOrder(order as 'asc' | 'desc');
  };

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    pagination.goToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedStatus, selectedPriority, dateFrom, dateTo, sortBy, sortOrder, pagination.pageSize]);

  useEffect(() => {
    const loadSLATargets = async () => {
      try {
        const targets = await fetchSLATargets();
        setSlaTargets(targets);
      } catch (err) {
        logError('Failed to load SLA targets', err);
        setSlaTargets({ urgent: 2, high: 3, medium: 5, low: 7 });
      }
    };
    void loadSLATargets();
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchInbox = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (selectedStatus) params.append('status', selectedStatus);
        if (selectedPriority) params.append('priority', selectedPriority);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        params.append('sort_by', sortBy);
        params.append('sort_order', sortOrder);
        params.append('page', String(pagination.page));
        params.append('page_size', String(pagination.pageSize));

        const [corrResponse, docsResponse, approvalsResponse] = await Promise.all([
          apiFetch<Record<string, unknown>>(`/correspondence/items/my-inbox/?${params.toString()}`),
          getSharedDocuments(currentUser.id, {
            search: debouncedSearch || undefined,
            pageSize: 50,
          }),
          apiFetch<Record<string, unknown>>('/correspondence/minutes/pending-approvals/?page_size=100').catch(() => ({ results: [] })),
        ]);

        const corrResults = Array.isArray(corrResponse.results) ? corrResponse.results : [];
        const mappedItems = corrResults.map(mapApiCorrespondence);
        setInboxItems(mappedItems);

        const slaStats = mappedItems.reduce((acc, item) => {
          const slaStatus = calculateSLAStatus(item, slaTargets || undefined);
          if (slaStatus.status === 'overdue') acc.overdue++;
          if (slaStatus.status === 'due-soon') acc.dueSoon++;
          return acc;
        }, { overdue: 0, dueSoon: 0 });

        const summaryData = corrResponse.summary as Record<string, unknown> | undefined;
        setSummary({
          total: (summaryData && typeof summaryData.total === 'number') ? summaryData.total : (corrResponse.count as number ?? corrResults.length),
          urgent: (summaryData && typeof summaryData.urgent === 'number') ? summaryData.urgent : 0,
          overdue: slaStats.overdue,
          pending: (summaryData && typeof summaryData.pending === 'number') ? summaryData.pending : 0,
          inProgress: (summaryData && typeof summaryData.in_progress === 'number') ? summaryData.in_progress : 0,
          dueSoon: slaStats.dueSoon,
        });
        setCount((corrResponse.count as number) ?? corrResults.length);

        setSharedDocuments(docsResponse.results || []);

        const approvals = Array.isArray(approvalsResponse.results) ? approvalsResponse.results : [];
        setPendingApprovals(approvals);
      } catch {
        setError('Failed to load inbox. Please try again.');
        setInboxItems([]);
        setSharedDocuments([]);
        setPendingApprovals([]);
        setSummary({ total: 0, urgent: 0, overdue: 0, pending: 0, inProgress: 0, dueSoon: 0 });
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    void fetchInbox();
  }, [currentUser?.id, debouncedSearch, selectedStatus, selectedPriority, dateFrom, dateTo, sortBy, sortOrder, pagination.page, pagination.pageSize, slaTargets]);

  const slaPriority = (s: 'overdue' | 'due-soon' | 'pending') =>
    s === 'overdue' ? 0 : s === 'due-soon' ? 1 : 2;

  const sortedItems = useMemo(() => {
    return [...inboxItems].sort((a, b) => {
      const aStatus = calculateSLAStatus(a, slaTargets || undefined).status;
      const bStatus = calculateSLAStatus(b, slaTargets || undefined).status;
      return slaPriority(aStatus) - slaPriority(bStatus);
    });
  }, [inboxItems, slaTargets]);

  const shouldShowDocuments = !focusOnTasks && sharedDocuments.length > 0;
  const totalDisplayCount = sortedItems.length + (shouldShowDocuments ? sharedDocuments.length : 0);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {!currentUser ? (
          <HelpGuideCard
            title="Select a persona"
            description="Use the Role Switcher to choose a user context before viewing your inbox."
            links={[{ label: 'Role Switcher', href: '/settings' }]}
          />
        ) : (
          <>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">My Inbox</h1>
            <p className="text-muted-foreground mt-1">
              {focusOnTasks ? 'Tasks requiring your attention' : 'Correspondence and documents shared with you'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={focusOnTasks ? "default" : "outline"}
              size="sm"
              onClick={() => setFocusOnTasks(!focusOnTasks)}
            >
              {focusOnTasks ? (
                <><Inbox className="h-4 w-4 mr-2" /> Show All</>
              ) : (
                <><AlertCircle className="h-4 w-4 mr-2" /> Focus on Tasks</>
              )}
            </Button>
          </div>
        </div>

        <HelpGuideCard
          title="Your Personal Inbox"
          description="Items requiring your attention: correspondence routed to you and documents shared with you. Click any item to view details and take action."
          links={[{ label: 'My Documents', href: '/documents' }, { label: 'Help & Guides', href: '/help' }]}
        />

        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-2">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 pl-8 text-xs" />
            </div>
            <Select value={selectedStatus || 'all'} onValueChange={(v) => { setSelectedStatus(v === 'all' ? '' : v); pagination.goToFirstPage(); }}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPriority || 'all'} onValueChange={(v) => { setSelectedPriority(v === 'all' ? '' : v); pagination.goToFirstPage(); }}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="All Priorities" /></SelectTrigger>
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
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="priority-desc">Priority (Urgent First)</SelectItem>
                <SelectItem value="days_pending-desc">Days Pending (Oldest)</SelectItem>
                <SelectItem value="updated-desc">Last Updated (Newest)</SelectItem>
                <SelectItem value="updated-asc">Last Updated (Oldest)</SelectItem>
                <SelectItem value="reference-asc">Reference (A-Z)</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">Clear</Button>}
          </CardContent>
        </Card>

        <InboxSummaryCards summary={summary} />

        {error && <ErrorState message={error} variant="inline" />}

        {loading ? (
          <LoadingState message="Loading inbox…" />
        ) : inboxItems.length === 0 && sharedDocuments.length === 0 && pendingApprovals.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="No items in your inbox"
            message={debouncedSearch || hasActiveFilters
              ? 'No items match your current filters. Try adjusting your search or filter criteria.'
              : 'All caught up! No correspondence or documents require your attention.'}
            actionLabel={debouncedSearch || hasActiveFilters ? 'Clear Filters' : undefined}
            onAction={debouncedSearch || hasActiveFilters ? clearFilters : undefined}
          />
        ) : (
          <div className="space-y-6">
            {pendingApprovals.length > 0 && (
              <div className={correspondenceQueueListStackClass}>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <h2 className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                    Pending Approvals ({pendingApprovals.length})
                  </h2>
                </div>
                {pendingApprovals.map((approval) => (
                  <InboxApprovalCard
                    key={approval.id}
                    approval={approval}
                    taskStatus={approval.due_date ? calculateTaskStatus(approval.due_date) : { status: 'pending' }}
                  />
                ))}
              </div>
            )}

            {(sortedItems.length > 0 || shouldShowDocuments) && (
              <div className={correspondenceQueueListStackClass}>
                <div className="flex items-center gap-2">
                  <Inbox className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">
                    {focusOnTasks ? 'Pending Items' : 'All Items'} ({totalDisplayCount})
                  </h2>
                </div>
                {sortedItems.map((corr) => (
                  <InboxItemCard
                    key={corr.id}
                    corr={corr}
                    slaStatus={calculateSLAStatus(corr, slaTargets || undefined)}
                    daysPending={calculateDaysPending(corr, slaTargets || undefined)}
                  />
                ))}
                {shouldShowDocuments && sharedDocuments.map((doc) => (
                  <InboxDocumentCard key={doc.id} doc={doc} />
                ))}
              </div>
            )}
          </div>
        )}

        {count > 0 && (
          <PaginationControls
            pagination={pagination}
            showPageSizeSelector={true}
            showGoToPage={true}
            className="border-t border-border/60 pt-4"
          />
        )}
        </>
      )}
      </div>
    </DashboardLayout>
  );
};

export default ExecutiveInbox;