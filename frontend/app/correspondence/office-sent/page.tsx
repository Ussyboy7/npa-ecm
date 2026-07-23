"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { QueuePageShell } from '@/components/shared/QueuePageShell';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { usePagination } from '@/hooks/use-pagination';
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
  Send,
  Building2,
  Loader2,
  Download,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { formatDateShort } from '@/lib/correspondence-helpers';
import type { Correspondence } from '@/lib/npa-structure';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { exportToCSV } from '@/lib/admin-export';
import { toast } from 'sonner';
import { logError } from '@/lib/client-logger';
import { cn } from '@/lib/utils';
import {
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueListStackClass,
  registryQueueEmptyIconClass,
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from '@/components/shared/registry-queue-styles';
import { FlowTypeBadge } from '@/components/correspondence/FlowTypeBadge';

type DispatchFilter = 'all' | 'internal' | 'external';

const getStatusBadgeVariant = (status: string): 'destructive' | 'secondary' | 'default' | 'outline' => {
  if (status === 'dispatched') return 'secondary';
  if (status === 'acknowledged') return 'default';
  return 'outline';
};

const OfficeDispatchedPage = () => {
  const { currentUser } = useCurrentUser();
  const systemRole = typeof currentUser?.systemRole === 'string' ? currentUser.systemRole.toLowerCase() : '';
  const { officeMemberships, offices, divisions } = useOrganization();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [dispatchFilter, setDispatchFilter] = useState<DispatchFilter>('all');
  const [sortBy, setSortBy] = useState<string>('dispatch_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [items, setItems] = useState<Correspondence[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    dispatched: 0,
    acknowledged: 0,
    internal: 0,
    external: 0,
  });
  const [count, setCount] = useState(0);
  const pagination = usePagination({ initialPage: 1, totalCount: count });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const isSuperAdmin = currentUser?.isSuperuser === true || systemRole === 'super admin' || systemRole === 'admin';

  const userOfficeIds = useMemo(() => {
    if (!currentUser) return [];
    return officeMemberships
      .filter((membership) => membership.userId === currentUser.id && membership.isActive)
      .map((membership) => membership.officeId);
  }, [currentUser, officeMemberships]);

  const hasOfficeAccess = isSuperAdmin || userOfficeIds.length > 0;

  const selectableOffices = useMemo(() => {
    if (isSuperAdmin) return offices;
    if (!userOfficeIds.length) return [];
    const idSet = new Set(userOfficeIds);
    return offices.filter((office) => idSet.has(office.id));
  }, [offices, userOfficeIds, isSuperAdmin]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (selectedOfficeId !== 'all') n++;
    if (selectedStatus) n++;
    if (dispatchFilter !== 'all') n++;
    if (dateFrom) n++;
    if (dateTo) n++;
    return n;
  }, [selectedOfficeId, selectedStatus, dispatchFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setSelectedOfficeId('all');
    setSelectedStatus('');
    setDispatchFilter('all');
    setDateFrom('');
    setDateTo('');
    setQuery('');
  };

  const getFilterParams = useCallback((): URLSearchParams => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.append('search', debouncedQuery);
    if (selectedOfficeId !== 'all') {
      params.append('office', selectedOfficeId);
    } else if (userOfficeIds.length > 0) {
      userOfficeIds.forEach((officeId) => params.append('office', officeId));
    }
    if (selectedStatus) params.append('status', selectedStatus);
    if (dispatchFilter !== 'all') params.append('dispatch_type', dispatchFilter);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    params.append('date_field', 'dispatch_date');
    return params;
  }, [debouncedQuery, selectedOfficeId, userOfficeIds, selectedStatus, dispatchFilter, dateFrom, dateTo]);

  const handleExport = async () => {
    if (items.length === 0) {
      toast.error('No items to export');
      return;
    }
    setExporting(true);
    try {
      const params = getFilterParams();
      params.append('page_size', '1000');
      const response = await apiFetch<Record<string, unknown>>(
        `/correspondence/items/office-sent/?${params.toString()}`
      );
      const allItems = Array.isArray(response.results) ? response.results.map(mapApiCorrespondence) : [];
      const exportData = allItems.map((item: Correspondence) => ({
        'Reference Number': item.referenceNumber || '',
        Subject: item.subject || '',
        Status: item.status || '',
        'Dispatch Date': item.dispatchDate ? formatDateShort(item.dispatchDate) : '',
        Office: offices.find((o) => o.id === item.owningOfficeId)?.name || '',
        'Recipient': item.senderOrganization || item.senderName || '',
      }));
      exportToCSV(
        exportData,
        [
          { key: 'Reference Number', label: 'Reference Number' },
          { key: 'Subject', label: 'Subject' },
          { key: 'Status', label: 'Status' },
          { key: 'Dispatch Date', label: 'Dispatch Date' },
          { key: 'Office', label: 'Office' },
          { key: 'Recipient', label: 'Recipient' },
        ],
        { filename: `office-sent-export-${new Date().toISOString().split('T')[0]}.csv` }
      );
      toast.success(`Exported ${exportData.length} items successfully`);
    } catch (err: unknown) {
      toast.error('Failed to export items. Please try again.');
      logError('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    pagination.goToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, selectedOfficeId, selectedStatus, dispatchFilter, sortBy, sortOrder, dateFrom, dateTo]);

  useEffect(() => {
    if (!hasOfficeAccess) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchDispatched = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = getFilterParams();
        params.append('sort_by', sortBy);
        params.append('sort_order', sortOrder);
        params.append('page', String(pagination.page));
        params.append('page_size', String(pagination.pageSize));

        const response = await apiFetch<{
          results?: Record<string, unknown>[];
          count?: number;
          summary?: {
            total?: number;
            dispatched?: number;
            acknowledged?: number;
            internal?: number;
            external?: number;
          };
        }>(`/correspondence/items/office-sent/?${params}`, { signal: controller.signal });

        const results = response.results ?? [];
        const s = response.summary;
        setItems(results.map(mapApiCorrespondence));
        setSummary({
          total: s?.total ?? results.length,
          dispatched: s?.dispatched ?? 0,
          acknowledged: s?.acknowledged ?? 0,
          internal: s?.internal ?? 0,
          external: s?.external ?? 0,
        });
        setCount(response.count ?? results.length);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError('Failed to load dispatched items. Please try again.');
        setItems([]);
        setSummary({ total: 0, dispatched: 0, acknowledged: 0, internal: 0, external: 0 });
        setCount(0);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void fetchDispatched();
    return () => controller.abort();
  }, [
    hasOfficeAccess,
    pagination.page,
    pagination.pageSize,
    debouncedQuery,
    selectedOfficeId,
    selectedStatus,
    dispatchFilter,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    getFilterParams,
  ]);

  return (
    <>
      {!currentUser ? (
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        </div>
      ) : !hasOfficeAccess ? (
        <div className="container mx-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Office Dispatched</h1>
            <p className="text-muted-foreground mt-1">
              Correspondence dispatched from your office(s)
            </p>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                You are not a member of any office. Office dispatched is only available to office members.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <ErrorBoundary>
          <QueuePageShell
            title="Office Dispatched"
            subtitle="Correspondence dispatched from your office — with date, recipient, and delivery method."
            actions={(
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={exporting || items.length === 0 || loading}
                  aria-label="Export to CSV"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exporting ? 'Exporting...' : 'Export'}
                </Button>
                <ContextualHelp
                  title="Office Dispatched"
                  description="Use this log to verify what has already left your office."
                  steps={[
                    'Filter by office, dispatch type, or date range.',
                    'Open a record to review dispatch details and tracking.',
                    'Export filtered results for audit or reporting.',
                  ]}
                />
              </>
            )}
          >
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              {[
                { label: 'Total dispatched', value: summary.total, icon: Package, bgClass: 'bg-primary/10', iconClass: 'text-primary' },
                { label: 'Awaiting acknowledgment', value: summary.dispatched, icon: Send, bgClass: 'bg-warning/10', iconClass: 'text-warning' },
                { label: 'Acknowledged', value: summary.acknowledged, icon: CheckCircle2, bgClass: 'bg-emerald-500/10', iconClass: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'External dispatch', value: summary.external, icon: Mail, bgClass: 'bg-blue-500/10', iconClass: 'text-blue-600 dark:text-blue-400' },
              ].map(({ label, value, icon: Icon, bgClass, iconClass }) => (
                <Card key={label} aria-label={label}>
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
                    placeholder="Search by subject, reference..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-8 pl-8 text-xs"
                    aria-label="Search correspondence"
                  />
                </div>
                <Select value={selectedOfficeId} onValueChange={(v) => { setSelectedOfficeId(v); pagination.goToFirstPage(); }}>
                  <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Filter by office"><SelectValue placeholder="All Offices" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Offices</SelectItem>
                    {selectableOffices.map((office) => (
                      <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedStatus || 'all'} onValueChange={(v) => { setSelectedStatus(v === 'all' ? '' : v); pagination.goToFirstPage(); }}>
                  <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Filter by status"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="dispatched">Dispatched</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dispatchFilter} onValueChange={(v) => setDispatchFilter(v as DispatchFilter)}>
                  <SelectTrigger className="h-8 w-[170px] text-xs" aria-label="Filter by dispatch type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All dispatch types</SelectItem>
                    <SelectItem value="internal">Routed internally</SelectItem>
                    <SelectItem value="external">Dispatched externally</SelectItem>
                  </SelectContent>
                </Select>
                <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
                <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => { const [by, order] = value.split('-'); setSortBy(by); setSortOrder(order as 'asc' | 'desc'); }}>
                  <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Sort by"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dispatch_date-desc">Dispatch (Newest)</SelectItem>
                    <SelectItem value="dispatch_date-asc">Dispatch (Oldest)</SelectItem>
                    <SelectItem value="updated-desc">Last Updated</SelectItem>
                  </SelectContent>
                </Select>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">Clear</Button>
                )}
                </div>
              </CardContent>
            </Card>

            <div aria-live="polite">
            {loading ? (
              <LoadingState message="Loading dispatched items…" />
            ) : error ? (
              <ErrorState message={error} variant="inline" />
            ) : items.length === 0 ? (
              <EmptyState
                icon={<Send className={registryQueueEmptyIconClass} />}
                title={debouncedQuery || activeFilterCount > 0 ? 'No items match your filters' : 'No dispatched correspondence yet'}
                message={
                  debouncedQuery || activeFilterCount > 0
                    ? 'Try adjusting your search or filters.'
                    : 'When your office formally dispatches correspondence, it will appear here.'
                }
                actionLabel={debouncedQuery || activeFilterCount > 0 ? 'Clear Filters' : undefined}
                onAction={debouncedQuery || activeFilterCount > 0 ? clearFilters : undefined}
              />
            ) : (
              <div className={correspondenceQueueListStackClass} role="list">
                {items.map((item) => {
                  const owningOffice = item.owningOfficeId
                    ? offices.find((office) => office.id === item.owningOfficeId)
                    : undefined;
                  const division = item.divisionId ? divisions.find((div) => div.id === item.divisionId) : undefined;
                  const latestDispatch = item.dispatchRecords?.[0];

                  return (
                    <div key={item.id as string} role="listitem">
                    <ListRowCard
                      density="compact"
                      href={`/correspondence/${item.id as string}`}
                      leading={(
                        <div className={cn(correspondenceQueueLeadingBoxClass, 'bg-emerald-500/10')}>
                          <Send className={cn(correspondenceQueueLeadingIconClass, 'text-emerald-600 dark:text-emerald-400')} />
                        </div>
                      )}
                    >
                      <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{item.subject}</h3>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                          <FlowTypeBadge
                            flowType={item.flowType}
                            isInward={item.isInward}
                            isOutward={item.isOutward}
                            isInternal={item.isInternal}
                            isExternal={item.isExternal}
                            compact
                            className="h-5 gap-0.5 rounded-md border px-1.5 py-0 text-[10px] font-semibold leading-none"
                          />
                          <Badge
                            variant={getStatusBadgeVariant(item.status as string)}
                            className="h-5 rounded-md border px-1.5 py-0 text-[10px] font-semibold leading-none"
                          >
                            {(item.status as string).replace('-', ' ')}
                          </Badge>
                          {latestDispatch?.dispatchMode && (
                            <Badge variant="outline" className="h-5 rounded-md border px-1.5 py-0 text-[10px] font-semibold leading-none">
                              {latestDispatch.dispatchMode.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                          {item.dispatchDate ? formatDateShort(item.dispatchDate) : '—'}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 border-t border-border/60 pt-1.5 text-[11px] leading-tight text-muted-foreground">
                        <span className="inline-flex max-w-full items-center gap-1">
                          <Mail className="h-3 w-3 shrink-0 opacity-80" />
                          <span className="truncate">Ref: {item.referenceNumber}</span>
                        </span>
                        {owningOffice && (
                          <span className="inline-flex max-w-full items-center gap-1">
                            <Building2 className="h-3 w-3 shrink-0 opacity-80" />
                            <span className="truncate">{owningOffice.name}</span>
                          </span>
                        )}
                        {division && (
                          <span className="inline-flex max-w-full items-center gap-1">
                            <span className="truncate">Division: {division.name}</span>
                          </span>
                        )}
                        {latestDispatch?.dispatchedByName && (
                          <span className="inline-flex max-w-full items-center gap-1">
                            <span className="truncate">By: {latestDispatch.dispatchedByName}</span>
                          </span>
                        )}
                        {latestDispatch?.trackingNumber && (
                          <span className="inline-flex max-w-full items-center gap-1">
                            <span className="truncate">Tracking: {latestDispatch.trackingNumber}</span>
                          </span>
                        )}
                      </div>
                    </ListRowCard>
                    </div>
                  );
                })}
              </div>
            )}
            </div>

            {count > 0 && (
              <PaginationControls
                pagination={pagination}
                showPageSizeSelector
                showGoToPage
                className="border-t border-border/60 pt-4"
              />
            )}
          </QueuePageShell>
        </ErrorBoundary>
      )}
    </>
  );
};

export default OfficeDispatchedPage;
