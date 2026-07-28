"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InboxCorrespondenceCard } from './components/InboxCorrespondenceCard';
import type { UserOrgIds } from './components/InboxCorrespondenceCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mail,
  Search,
  User as UserIcon,
  Inbox,
} from 'lucide-react';
import {
  correspondenceQueueListStackClass,
  registryQueueEmptyIconClass,
} from '@/components/shared/registry-queue-styles';
import { QueuePageShell } from '@/components/shared/QueuePageShell';
import { StatStrip } from '@/components/shared/StatStrip';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Correspondence } from '@/lib/npa-structure';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence } from '@/lib/api/correspondence-mappers';
import { CorrespondenceProvider, useCorrespondence } from '@/contexts/CorrespondenceContext';
import { usePagination } from '@/hooks/use-pagination';
import { useCorrespondenceQueueFilters } from '@/hooks/use-correspondence-queue-filters';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { DateRangePicker } from '@/components/shared/DateRangePicker';

const STORAGE_KEY = 'office-inbox-selection';

type InboxSummary = {
  total: number;
  urgent: number;
  overdue: number;
  assigned_to_user: number;
};

const DEFAULT_SUMMARY: InboxSummary = {
  total: 0,
  urgent: 0,
  overdue: 0,
  assigned_to_user: 0,
};

const CorrespondenceInboxContent = () => {
  const router = useRouter();
  const {currentUser, hydrated: _hydrated } = useCurrentUser();
  const { offices, officeMemberships } = useOrganization();
  const { dataVersion } = useCorrespondence();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null);
  
  const [count, setCount] = useState(0);
  const pagination = usePagination({
    totalCount: count,
  });
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
    clearFilters: clearQueueFilters,
    handleSortChange,
    appendQueueParams,
  } = useCorrespondenceQueueFilters({ defaultStatus: 'all', defaultPriority: 'all' });
  const [assignedOnly, setAssignedOnly] = useState(false);

  const [inboxItems, setInboxItems] = useState<Correspondence[]>([]);
  const [summary, setSummary] = useState<InboxSummary>(DEFAULT_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userOfficeMemberships = useMemo(() => {
    if (!currentUser) return [];
    return officeMemberships.filter(
      (membership) => membership.userId === currentUser.id && membership.isActive,
    );
  }, [currentUser, officeMemberships]);

  const userOfficeIds = useMemo(
    () => userOfficeMemberships.map((membership) => membership.officeId),
    [userOfficeMemberships],
  );

  const isSuperuser = Boolean(currentUser?.isSuperuser);
  const hasCorrespondenceAccess = userOfficeIds.length > 0 || isSuperuser;

  const selectableOffices = useMemo(() => {
    if (isSuperuser) return offices;
    const membershipOfficeIds = new Set(userOfficeIds);
    return offices.filter((office) => membershipOfficeIds.has(office.id));
  }, [isSuperuser, offices, userOfficeIds]);

  // Get user's organizational unit IDs for CC/distribution matching
  const userOrgIds = useMemo(() => {
    const officeIds = new Set<string>();
    const divisionIds = new Set<string>();
    const departmentIds = new Set<string>();
    const directorateIds = new Set<string>();

    // Get from user's offices
    userOfficeMemberships.forEach((membership) => {
      const office = offices.find((o) => o.id === membership.officeId);
      if (office) {
        officeIds.add(office.id);
        if (office.divisionId) divisionIds.add(office.divisionId);
        if (office.departmentId) departmentIds.add(office.departmentId);
        if (office.directorateId) directorateIds.add(office.directorateId);
      }
    });

    // Note: User type has division/department/directorate as names, not IDs
    // The office memberships above already capture the user's organizational units

    return { officeIds, divisionIds, departmentIds, directorateIds };
  }, [userOfficeMemberships, offices]);

  // Count active filters for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStatus !== 'all') count++;
    if (selectedPriority !== 'all') count++;
    if (assignedOnly) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (selectedOfficeId && selectedOfficeId !== 'all') count++;
    return count;
  }, [selectedStatus, selectedPriority, assignedOnly, dateFrom, dateTo, selectedOfficeId]);

  const clearFilters = () => {
    clearQueueFilters();
    setAssignedOnly(false);
    setSelectedOfficeId('all');
  };

  useEffect(() => {
    if (!hasCorrespondenceAccess) {
      setSelectedOfficeId(null);
      return;
    }
    if (selectedOfficeId !== null) return;

    let nextOffice = 'all';
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (
        saved &&
        (saved === 'all' ||
          userOfficeIds.includes(saved) ||
          (isSuperuser && selectableOffices.some((office) => office.id === saved)))
      ) {
        nextOffice = saved;
      } else if (userOfficeIds.length > 0) {
        nextOffice = userOfficeIds[0];
      }
    } else if (userOfficeIds.length > 0) {
      nextOffice = userOfficeIds[0];
    }
    setSelectedOfficeId(nextOffice);
  }, [hasCorrespondenceAccess, selectedOfficeId, userOfficeIds, isSuperuser, selectableOffices]);

  useEffect(() => {
    if (selectedOfficeId === null) return;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, selectedOfficeId);
    }
  }, [selectedOfficeId]);

  useEffect(() => {
    pagination.goToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOfficeId, debouncedSearch, selectedStatus, selectedPriority, assignedOnly, sortBy, sortOrder, dateFrom, dateTo]);

  useEffect(() => {
    // Redirect if access is denied (don't wait for hydration)
    if (!hasCorrespondenceAccess) {
      router.replace('/inbox');
    }
  }, [hasCorrespondenceAccess, router]);

  useEffect(() => {
    if (!hasCorrespondenceAccess || selectedOfficeId === null) return;

    const fetchInbox = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = appendQueueParams(new URLSearchParams(), { assigned_only: assignedOnly });
        let appendedOffice = false;
        if (selectedOfficeId && selectedOfficeId !== 'all') {
          params.append('office', selectedOfficeId);
          appendedOffice = true;
        } else if (userOfficeIds.length > 0) {
          userOfficeIds.forEach((officeId) => params.append('office', officeId));
          appendedOffice = true;
        }

        if (!appendedOffice && isSuperuser) {
          params.append('include_all_offices', 'true');
        }
        params.append('page', String(pagination.page));
        params.append('page_size', String(pagination.pageSize));

        const response = await apiFetch<Record<string, unknown>>(`/correspondence/items/office-inbox/?${params.toString()}`);
        const results = Array.isArray(response.results) ? response.results : [];
        setInboxItems(results.map(mapApiCorrespondence));
        const responseObj = response as Record<string, unknown>;
        const summaryObj = responseObj.summary as Record<string, unknown> | undefined;
        setSummary({
          total: (summaryObj && typeof summaryObj.total === 'number') ? summaryObj.total : ((responseObj && typeof responseObj.count === 'number') ? responseObj.count : results.length),
          urgent: (summaryObj && typeof summaryObj.urgent === 'number') ? summaryObj.urgent : 0,
          overdue: (summaryObj && typeof summaryObj.overdue === 'number') ? summaryObj.overdue : 0,
          assigned_to_user: (summaryObj && typeof summaryObj.assigned_to_user === 'number') ? summaryObj.assigned_to_user : 0,
        });
        setCount((responseObj && typeof responseObj.count === 'number') ? responseObj.count : results.length);
      } catch (_err) {
        setError('Failed to load office inbox. Please try again.');
        setInboxItems([]);
        setSummary(DEFAULT_SUMMARY);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    void fetchInbox();
  }, [hasCorrespondenceAccess, selectedOfficeId, debouncedSearch, pagination.page, pagination.pageSize, userOfficeIds, isSuperuser, selectedStatus, selectedPriority, assignedOnly, sortBy, sortOrder, dateFrom, dateTo, dataVersion]);

  return (
    <>
      {!currentUser ? (
        <QueuePageShell
          title="Office Inbox"
          subtitle="Monitor work queued in your offices and prioritize urgent escalations"
        >
          <LoadingState message="Loading office inbox…" />
        </QueuePageShell>
      ) : !hasCorrespondenceAccess ? (
        <QueuePageShell
          title="Office Inbox"
          subtitle="Monitor work queued in your offices and prioritize urgent escalations"
        >
          <Card><CardContent className="py-12 text-center"><p className="text-lg font-semibold">No office inbox available</p><p className="text-sm text-muted-foreground mt-2">This persona does not have registry or routing permissions. Redirecting you to your personal inbox…</p></CardContent></Card>
        </QueuePageShell>
      ) : (
        <QueuePageShell
          title="Office Inbox"
          subtitle="Monitor work queued in your offices and prioritize urgent escalations"
          actions={(
            <>
              <Button size="sm" onClick={() => router.push('/correspondence/register')}>
                <Mail className="h-4 w-4 mr-2" /> Register New
              </Button>
              <ContextualHelp
                title="How to triage correspondence"
                description="Work urgent and overdue items first, then clear the rest of the queue."
                steps={['Select the office you are acting for.', 'Use filters/search to find priority or SLA-risk items.', 'Open a record to minute, approve, delegate, or archive.']}
              />
            </>
          )}
          stats={(
            <StatStrip
              items={[
                { key: 'total', label: 'In queue', value: summary.total },
                { key: 'urgent', label: 'Urgent', value: summary.urgent },
                { key: 'overdue', label: 'SLA breach', value: summary.overdue },
                { key: 'assigned', label: 'Assigned to you', value: summary.assigned_to_user },
              ]}
            />
          )}
        >
        {/* Search + filters bar */}
        <Card>
          <CardContent className="p-2">
            <div className="md:hidden mb-2">
              <Button variant="outline" size="sm" onClick={() => setFiltersOpen(!filtersOpen)} className="w-full justify-between">
                <span className="flex items-center"><Search className="h-3.5 w-3.5 mr-2" /> Filters</span>
                {activeFilterCount > 0 && <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">{activeFilterCount}</span>}
              </Button>
            </div>
            <div className={`flex-wrap items-center gap-2${filtersOpen ? ' flex' : ' hidden'} md:flex`}>
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by subject, reference, sender..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
                aria-label="Search correspondence"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Filter by status"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Filter by priority"><SelectValue placeholder="All Priorities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedOfficeId ?? 'all'} onValueChange={setSelectedOfficeId}>
              <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Filter by office"><SelectValue placeholder={isSuperuser ? 'All Offices' : 'All My Offices'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isSuperuser ? 'All Offices' : 'All My Offices'}</SelectItem>
                {selectableOffices.map((office) => (
                  <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
            <Button variant={assignedOnly?'default':'outline'} size="sm" onClick={()=>setAssignedOnly(!assignedOnly)} className="h-8 text-xs"><UserIcon className="h-3.5 w-3.5 mr-1" /> Assigned</Button>
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={handleSortChange}>
              <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Sort by"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="priority-desc">Priority (Urgent First)</SelectItem>
                <SelectItem value="days_pending-desc">Days Pending (Oldest)</SelectItem>
                <SelectItem value="updated-desc">Last Updated (Newest)</SelectItem>
                <SelectItem value="updated-asc">Last Updated (Oldest)</SelectItem>
                <SelectItem value="reference-asc">Reference (A-Z)</SelectItem>
              </SelectContent>
            </Select>
            {activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">Clear</Button>}
            </div>
          </CardContent>
        </Card>

        <div aria-live="polite">
        {error && <ErrorState message={error} variant="inline" />}

        {loading ? (
          <LoadingState message="Loading office queue…" />
        ) : inboxItems.length === 0 ? (
          <EmptyState
            icon={<Inbox className={registryQueueEmptyIconClass} />}
            title={debouncedSearch || activeFilterCount > 0 ? 'No items match your filters' : 'No correspondence routed to your office yet'}
            message={debouncedSearch || activeFilterCount > 0 ? 'Try adjusting your search or filters' : 'When correspondence is routed to your office, it will appear here.'}
            actionLabel={debouncedSearch || activeFilterCount > 0 ? 'Clear Filters' : undefined}
            onAction={debouncedSearch || activeFilterCount > 0 ? clearFilters : undefined}
          />
        ) : (
          <div className={correspondenceQueueListStackClass} role="list">
            {inboxItems.map((corr) => (
              <div key={corr.id} role="listitem">
                <InboxCorrespondenceCard corr={corr} userOrgIds={userOrgIds as UserOrgIds} />
              </div>
            ))}
          </div>
        )}
        </div>

        {/* Pagination */}
        {count > 0 && (
          <PaginationControls
            pagination={pagination}
            showPageSizeSelector={true}
            showGoToPage={true}
            className="border-t border-border/60 pt-4"
          />
        )}
        </QueuePageShell>
      )}
    </>
  );
};

const CorrespondenceInbox = () => (
  <CorrespondenceProvider>
    <CorrespondenceInboxContent />
  </CorrespondenceProvider>
);

export default CorrespondenceInbox;
