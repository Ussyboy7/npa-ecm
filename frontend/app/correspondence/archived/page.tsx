"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Archive,
  Search,
  Calendar,
  User as UserIcon,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  FileArchive,
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Correspondence } from '@/lib/npa-structure';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { useCurrentUser } from '@/hooks/use-current-user';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { cn } from '@/lib/utils';
import {
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from '@/components/shared/registry-queue-styles';
import { DateRangePicker } from '@/components/shared/DateRangePicker';

const ArchivedCorrespondence = () => {
  const router = useRouter();
  const { divisions, departments } = useOrganization();
  const { currentUser } = useCurrentUser();

  const [records, setRecords] = useState<Correspondence[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [summary, setSummary] = useState({ total: 0, downward: 0, upward: 0, thisYear: 0 });
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use pagination hook
  const pagination = usePagination({
    initialPage: 1,
    totalCount: count,
  });

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStatus) count++;
    if (selectedPriority) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [selectedStatus, selectedPriority, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('');
    setSelectedPriority('');
    setDateFrom('');
    setDateTo('');
  };

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    pagination.goToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedStatus, selectedPriority, sortBy, sortOrder, dateFrom, dateTo, pagination.pageSize]);

  useEffect(() => {
    let ignore = false;
    const fetchArchive = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(pagination.page), page_size: String(pagination.pageSize) });
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (selectedStatus) params.append('status', selectedStatus);
        if (selectedPriority) params.append('priority', selectedPriority);
        if (dateFrom) params.append('from_date', dateFrom);
        if (dateTo) params.append('to_date', dateTo);
        params.append('sort_by', sortBy);
        params.append('sort_order', sortOrder);

        const response = await apiFetch<Record<string, unknown>>(`/correspondence/items/archive-records/?${params.toString()}`);
        if (ignore) return;

        const results = Array.isArray(response.results) ? response.results : [];
        setRecords(results.map(mapApiCorrespondence));
        setCount((response && typeof response === 'object' && 'count' in response && typeof response.count === 'number') ? response.count as number : results.length);
        const responseObj = response as Record<string, unknown>;
        const summaryObj = responseObj.summary as Record<string, unknown> | undefined;
        setSummary({
          total: (summaryObj && typeof summaryObj.total === 'number') ? summaryObj.total : ((responseObj && typeof responseObj.count === 'number') ? responseObj.count : results.length),
          downward: (summaryObj && typeof summaryObj.downward === 'number') ? summaryObj.downward : 0,
          upward: (summaryObj && typeof summaryObj.upward === 'number') ? summaryObj.upward : 0,
          thisYear: (summaryObj && typeof summaryObj.this_year === 'number') ? summaryObj.this_year : 0,
        });

      } catch {
        if (!ignore) {
          setError('Unable to load archived correspondence. Please try again.');
          setRecords([]);
          setCount(0);
          setSummary({ total: 0, downward: 0, upward: 0, thisYear: 0 });
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchArchive();
    return () => { ignore = true; };
  }, [pagination.page, pagination.pageSize, debouncedSearch, selectedStatus, selectedPriority, sortBy, sortOrder, dateFrom, dateTo]);

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  if (!currentUser) return null;

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Archived Correspondence</h1>
            <p className="text-muted-foreground mt-1">View completed/archived correspondence scoped to your archive access tier</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-lg px-4 py-2">{summary.total} records</Badge>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-2">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search archived correspondence..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 pl-8 text-xs" />
            </div>
            <Select value={selectedStatus || 'all'} onValueChange={(v) => { setSelectedStatus(v === 'all' ? '' : v); pagination.goToFirstPage(); }}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
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
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => { const [by, order] = value.split('-'); setSortBy(by); setSortOrder(order as 'asc' | 'desc'); }}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="updated_at-desc">Last Updated</SelectItem>
                <SelectItem value="created_at-desc">Newest First</SelectItem>
                <SelectItem value="created_at-asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
            {activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">Clear</Button>}
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Total Archived', value: summary.total, icon: Archive, bgClass: 'bg-muted', iconClass: 'text-muted-foreground' },
            { label: 'Downward', value: summary.downward, icon: ArrowDown, bgClass: 'bg-info/10', iconClass: 'text-info' },
            { label: 'Upward', value: summary.upward, icon: ArrowUp, bgClass: 'bg-emerald-500/10', iconClass: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'This Year', value: summary.thisYear, icon: Calendar, bgClass: 'bg-primary/10', iconClass: 'text-primary' },
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

        {loading ? (
          <LoadingState message="Loading archived records…" />
        ) : error ? (
          <ErrorState message={error} variant="inline" />
        ) : records.length === 0 ? (
          <EmptyState
            icon="inbox"
            title={debouncedSearch || activeFilterCount > 0 ? 'No archived records match your filters' : 'No archived records found'}
            message={debouncedSearch || activeFilterCount > 0 ? 'Try adjusting your search or filters' : 'When correspondence is archived, it will appear here.'}
            actionLabel={debouncedSearch || activeFilterCount > 0 ? 'Clear Filters' : undefined}
            onAction={debouncedSearch || activeFilterCount > 0 ? clearFilters : undefined}
          />
        ) : (
          <div className="space-y-3">
            {records.map((corr) => {
              const division = corr.divisionId ? divisions.find((item) => item.id as string === corr.divisionId) : null;
              const department = corr.departmentId ? departments.find((item) => item.id as string === corr.departmentId) : null;
              const archiveLevel = corr.archiveLevel || 'department';
              const levelLabel = archiveLevel === 'directorate' ? 'Directorate Archive' : archiveLevel === 'division' ? 'Division Archive' : 'Department Archive';

              return (
                <div key={corr.id} onClick={() => router.push(`/correspondence/archived/${corr.id}`)} className="p-4 border border-border rounded-lg hover:bg-muted/50 hover:shadow-soft transition-all cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-muted"><FileArchive className="h-5 w-5 text-muted-foreground" /></div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <h4 className="font-semibold text-foreground truncate">{corr.subject}</h4>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant={getPriorityBadgeVariant(corr.priority)}>{corr.priority.toUpperCase()}</Badge>
                            <Badge variant="outline" className="gap-1">{corr.direction === 'downward' ? (<><ArrowDown className="h-3 w-3 text-info" />Downward</>) : (<><ArrowUp className="h-3 w-3 text-success" />Upward</>)}</Badge>
                            <Badge variant="secondary" className="gap-1 text-success bg-success/10"><CheckCircle2 className="h-3 w-3" />{corr.status === 'archived' ? 'Archived' : 'Completed'}</Badge>
                            <Badge variant="outline">{levelLabel}</Badge>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateShort(corr.receivedDate)}</span>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2"><UserIcon className="h-3.5 w-3.5" /><span>From: {corr.senderName || 'Unknown'}</span></div>
                        <div className="flex items-center gap-2"><FileArchive className="h-3.5 w-3.5" /><span>Ref: {corr.referenceNumber || 'N/A'}</span></div>
                        {division && <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /><span>{division.name}{department && ` • ${department.name}`}</span></div>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
      </div>
    </>
  );
};

export default ArchivedCorrespondence;
