"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ListRowCard } from '@/components/shared/ListRowCard';
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
  ArrowDown,
  ArrowUp,
  Clock,
  AlertCircle,
  Building2,
  Inbox,
  Copy,
} from 'lucide-react';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { cn } from '@/lib/utils';
import {
  correspondenceQueueBadgeClass,
  correspondenceQueueDateClass,
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueMetaIconClass,
  correspondenceQueueMetaItemClass,
  correspondenceQueueMetaRowClass,
  correspondenceQueueListStackClass,
  correspondenceQueueSubjectClass,
  registryQueueEmptyIconClass,
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from '@/components/shared/registry-queue-styles';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Correspondence } from '@/lib/npa-structure';
import { apiFetch } from '@/lib/api-client';
import { CorrespondenceProvider, mapApiCorrespondence, useCorrespondence } from '@/contexts/CorrespondenceContext';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { DateRangePicker } from '@/components/shared/DateRangePicker';

const STORAGE_KEY = 'office-inbox-selection';

const SLA_THRESHOLDS: Record<string, number> = {
  urgent: 2,
  high: 5,
  medium: 10,
  low: 14,
  default: 10,
};

const isOverdue = (item: Correspondence): boolean => {
  if (!item.receivedDate) return false;
  const priority = item.priority ?? 'default';
  const threshold = SLA_THRESHOLDS[priority] ?? SLA_THRESHOLDS.default;
  const received = new Date(item.receivedDate).getTime();
  const daysOpen = (Date.now() - received) / (1000 * 60 * 60 * 24);
  return daysOpen > threshold && item.status as string !== 'completed';
};

const calculateDaysPending = (item: Correspondence): number => {
  if (!item.receivedDate) return 0;
  const received = new Date(item.receivedDate).getTime();
  return Math.floor((Date.now() - received) / (1000 * 60 * 60 * 24));
};

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
  const { divisions, users: organizationUsers, offices, officeMemberships } = useOrganization();
  const { dataVersion } = useCorrespondence();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('all');
  
  // Use pagination hook
  const [count, setCount] = useState(0);
  const pagination = usePagination({
    initialPage: 1,
    initialPageSize: 25,
    totalCount: count,
  });
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<string>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

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

  // Helper to check if user is a CC recipient and get the purpose
  const getCCInfo = (corr: Correspondence): { isCC: boolean; purpose?: string } => {
    if (!corr.distribution || corr.distribution.length === 0) {
      return { isCC: false };
    }

    for (const recipient of corr.distribution) {
      // Check if user's org matches this distribution entry
      if (recipient.type === 'office' && recipient.officeId && userOrgIds.officeIds.has(recipient.officeId)) {
        return { isCC: true, purpose: recipient.purpose };
      }
      if (recipient.type === 'division' && recipient.divisionId && userOrgIds.divisionIds.has(recipient.divisionId)) {
        return { isCC: true, purpose: recipient.purpose };
      }
      if (recipient.type === 'department' && recipient.departmentId && userOrgIds.departmentIds.has(recipient.departmentId)) {
        return { isCC: true, purpose: recipient.purpose };
      }
      if (recipient.type === 'directorate' && recipient.directorateId && userOrgIds.directorateIds.has(recipient.directorateId)) {
        return { isCC: true, purpose: recipient.purpose };
      }
    }

    return { isCC: false };
  };

  // Count active filters for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStatus !== 'all') count++;
    if (selectedPriority !== 'all') count++;
    if (assignedOnly) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (selectedOfficeId !== 'all') count++;
    return count;
  }, [selectedStatus, selectedPriority, assignedOnly, dateFrom, dateTo, selectedOfficeId]);


  const clearFilters = () => {
    setSelectedStatus('');
    setSelectedPriority('');
    setAssignedOnly(false);
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
    setSelectedOfficeId('all');
  };

  useEffect(() => {
    if (!hasCorrespondenceAccess) return;
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'all' || userOfficeIds.includes(saved) || (isSuperuser && selectableOffices.some((office) => office.id === saved)))) {
        setSelectedOfficeId(saved);
        return;
      }
    }
    if (userOfficeIds.length > 0) {
      setSelectedOfficeId(userOfficeIds[0]);
    } else if (isSuperuser) {
      setSelectedOfficeId('all');
    }
  }, [hasCorrespondenceAccess, userOfficeIds, isSuperuser, selectableOffices]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, selectedOfficeId);
    }
  }, [selectedOfficeId]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

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
    // Fetch data immediately if user has correspondence access (don't wait for currentUser hydration)
    if (!hasCorrespondenceAccess) return;

    const fetchInbox = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
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
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (selectedStatus !== 'all') {
          params.append('status', selectedStatus);
        }
        if (selectedPriority !== 'all') {
          params.append('priority', selectedPriority);
        }
        if (assignedOnly) params.append('assigned_only', 'true');
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        params.append('sort_by', sortBy);
        params.append('sort_order', sortOrder);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-warning bg-warning/10';
      case 'in-progress': return 'text-info bg-info/10';
      case 'completed': return 'text-success bg-success/10';
      case 'archived': return 'text-muted-foreground bg-muted';
      default: return 'text-foreground bg-muted';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const CorrespondenceCard = ({ corr }: { corr: Correspondence }) => {
    const division = corr.divisionId ? divisions.find((div) => div.id === corr.divisionId) : undefined;
    const currentApprover = corr.currentApproverId ? organizationUsers.find((user) => user.id === corr.currentApproverId) : undefined;
    const overdue = isOverdue(corr);
    const daysPending = calculateDaysPending(corr);
    const daysPendingColor = daysPending > 5 ? 'destructive' : daysPending > 2 ? 'default' : 'secondary';
    const ccInfo = getCCInfo(corr);

    const getPurposeLabel = (purpose?: string) => {
      switch (purpose) {
        case 'action': return 'For Action';
        case 'information': return 'For Info';
        case 'comment': return 'For Comment';
        default: return 'CC';
      }
    };

    const getPurposeColor = (purpose?: string) => {
      switch (purpose) {
        case 'action': return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
        case 'information': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
        case 'comment': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
        default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
      }
    };

    return (
      <ListRowCard
        density="compact"
        href={`/correspondence/${corr.id}`}
        leading={(
          <div
            className={cn(
              correspondenceQueueLeadingBoxClass,
              corr.priority === 'urgent'
                ? 'bg-destructive/10'
                : corr.priority === 'high'
                  ? 'bg-warning/10'
                  : 'bg-primary/10',
            )}
          >
            <Mail
              className={cn(
                correspondenceQueueLeadingIconClass,
                corr.priority === 'urgent'
                  ? 'text-destructive'
                  : corr.priority === 'high'
                    ? 'text-warning'
                    : 'text-primary',
              )}
            />
            {ccInfo.isCC && (
              <div className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-blue-500">
                <Copy className="h-2 w-2 text-white" />
              </div>
            )}
          </div>
        )}
      >
        <h4 className={correspondenceQueueSubjectClass}>{corr.subject}</h4>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {ccInfo.isCC && (
              <Badge
                variant="outline"
                className={cn(correspondenceQueueBadgeClass, getPurposeColor(ccInfo.purpose))}
              >
                <Copy className="h-2.5 w-2.5" />
                {getPurposeLabel(ccInfo.purpose)}
              </Badge>
            )}
            <Badge variant={getPriorityColor(corr.priority)} className={correspondenceQueueBadgeClass}>
              {corr.priority.toUpperCase()}
            </Badge>
            <Badge variant="outline" className={cn(correspondenceQueueBadgeClass, 'gap-0.5')}>
              {corr.direction === 'downward' ? (
                <><ArrowDown className="h-2.5 w-2.5 text-info" />Downward</>
              ) : (
                <><ArrowUp className="h-2.5 w-2.5 text-success" />Upward</>
              )}
            </Badge>
            <Badge variant="secondary" className={cn(correspondenceQueueBadgeClass, getStatusColor(corr.status))}>
              {corr.status.replace('-', ' ')}
            </Badge>
            {overdue && (
              <Badge variant="destructive" className={correspondenceQueueBadgeClass}>
                SLA Breach
              </Badge>
            )}
            {daysPending > 0 && (
              <Badge variant={daysPendingColor} className={cn(correspondenceQueueBadgeClass, 'gap-0.5')}>
                <Clock className="h-2.5 w-2.5" />
                {daysPending} day{daysPending !== 1 ? 's' : ''} pending
              </Badge>
            )}
          </div>
          <span className={correspondenceQueueDateClass}>{formatDateShort(corr.receivedDate)}</span>
        </div>
        <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
          <span className={correspondenceQueueMetaItemClass}>
            <UserIcon className={correspondenceQueueMetaIconClass} />
            <span className="truncate">From: {corr.senderName}</span>
          </span>
          <span className={correspondenceQueueMetaItemClass}>
            <Mail className={correspondenceQueueMetaIconClass} />
            <span className="truncate">Ref: {corr.referenceNumber}</span>
          </span>
          {division && (
            <span className={correspondenceQueueMetaItemClass}>
              <AlertCircle className={correspondenceQueueMetaIconClass} />
              <span className="truncate">Division: {division.name}</span>
            </span>
          )}
          {currentApprover && (
            <span className={correspondenceQueueMetaItemClass}>
              <Clock className={correspondenceQueueMetaIconClass} />
              <span className="truncate">Current: {currentApprover.name}</span>
            </span>
          )}
          {corr.currentOfficeName && (
            <span className={correspondenceQueueMetaItemClass}>
              <Building2 className={correspondenceQueueMetaIconClass} />
              <span className="truncate">Office: {corr.currentOfficeName}</span>
            </span>
          )}
        </div>
      </ListRowCard>
    );
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {!currentUser ? (
          <LoadingState message="Loading office inbox…" />
        ) : !hasCorrespondenceAccess ? (
          <Card><CardContent className="py-12 text-center"><p className="text-lg font-semibold">No office inbox available</p><p className="text-sm text-muted-foreground mt-2">This persona does not have registry or routing permissions. Redirecting you to your personal inbox…</p></CardContent></Card>
        ) : (
          <>
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Office Inbox</h1>
            <p className="text-muted-foreground mt-1">Monitor work queued in your offices and prioritize urgent escalations</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => router.push('/correspondence/register')}>
              <Mail className="h-4 w-4 mr-2" /> Register New
            </Button>
            <ContextualHelp
              title="How to triage correspondence"
              description="Pick one of your offices, tackle urgent/SLA breaches first, and then work through the remaining approvals."
              steps={['Select the office you are acting for.', 'Use search to find specific references or senders.', 'Open a record to minute, approve, delegate, or archive.']}
            />
          </div>
        </div>

        <HelpGuideCard
          title="Office Queue Basics"
          description="Department files, archives, and outgoing dispatch now live in their dedicated sections. This view is focused solely on items currently sitting with your office."
          links={[{ label: 'Department Files', href: '/correspondence/department-files' }, { label: 'Outbox', href: '/correspondence/outbox' }]}
        />

        {/* Search + filters bar */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-2">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by subject, reference, sender..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="All Priorities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedOfficeId} onValueChange={setSelectedOfficeId}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder={isSuperuser ? 'All Offices' : 'All My Offices'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isSuperuser ? 'All Offices' : 'All My Offices'}</SelectItem>
                {selectableOffices.map((office) => (
                  <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
            <Button variant={assignedOnly?'default':'outline'} size="sm" onClick={()=>setAssignedOnly(!assignedOnly)} className="h-8 text-xs"><UserIcon className="h-3.5 w-3.5 mr-1" /> Assigned</Button>
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => { const [by, order] = value.split('-'); setSortBy(by); setSortOrder(order as 'asc' | 'desc'); }}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="priority-desc">Priority (Urgent First)</SelectItem>
                <SelectItem value="days_pending-desc">Days Pending (Oldest)</SelectItem>
                <SelectItem value="updated-desc">Last Updated (Newest)</SelectItem>
                <SelectItem value="updated-asc">Last Updated (Oldest)</SelectItem>
                <SelectItem value="reference-asc">Reference (A-Z)</SelectItem>
              </SelectContent>
            </Select>
            {activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">Clear</Button>}
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total in Queue', value: summary.total, icon: Inbox, bgClass: 'bg-primary/10', iconClass: 'text-primary' },
            { label: 'Urgent Items', value: summary.urgent, icon: AlertCircle, bgClass: 'bg-destructive/10', iconClass: 'text-destructive' },
            { label: 'SLA Breaches', value: summary.overdue, icon: Clock, bgClass: 'bg-warning/10', iconClass: 'text-warning' },
            { label: 'Assigned to You', value: summary.assigned_to_user, icon: UserIcon, bgClass: 'bg-info/10', iconClass: 'text-info' },
          ].map(({ label, value, icon: Icon, bgClass, iconClass }) => (
            <Card key={label}>
              <CardContent className={registryQueueStatCardContentClass}>
                <div className="flex items-center gap-4">
                  <div className={cn(registryQueueStatIconBoxClass, bgClass)}>
                    <Icon className={cn(registryQueueStatIconClass, iconClass)} />
                  </div>
                  <div>
                    <p className={registryQueueStatLabelClass}>{label}</p>
                    <p className={registryQueueStatValueClass}>{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

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
          <div className={correspondenceQueueListStackClass}>
            {inboxItems.map((corr) => (
              <CorrespondenceCard key={corr.id} corr={corr} />
            ))}
          </div>
        )}

        {/* Pagination */}
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

const CorrespondenceInbox = () => (
  <CorrespondenceProvider>
    <CorrespondenceInboxContent />
  </CorrespondenceProvider>
);

export default CorrespondenceInbox;
