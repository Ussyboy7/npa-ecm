"use client";

import { useEffect, useMemo, useState, useCallback, Suspense } from 'react';
import { PageSuspenseFallback } from '@/components/shared/PageSuspenseFallback';
import { useAbortController } from '@/hooks/use-abort-controller';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Archive,
  Search,
  RefreshCw,
  Download,
  MoreVertical,
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Correspondence } from '@/lib/npa-structure';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { useCurrentUser } from '@/hooks/use-current-user';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence } from '@/lib/api/correspondence-mappers';
import { CorrespondenceProvider, useCorrespondence } from '@/contexts/CorrespondenceContext';
import { fetchAllPaginatedResults } from '@/lib/pagination-utils';
import { DEFAULT_LIST_PAGE_SIZE } from '@/lib/pagination-constants';
import { toast } from "@/components/ui/sonner";
import { logError } from '@/lib/client-logger';
import { exportToCSV } from '@/lib/admin-export';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { LoadingState } from '@/components/shared/LoadingState';
import { RecordCard } from './components/RecordCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { QueuePageShell } from '@/components/shared/QueuePageShell';
import { StatStrip } from '@/components/shared/StatStrip';
import {
  correspondenceQueueListStackClass,
  registryQueueEmptyIconClass,
} from '@/components/shared/registry-queue-styles';

// Grade levels that can see directorate-wide records
const DIRECTORATE_GRADES = new Set(['MDCS', 'EDCS', 'MD', 'ED']);
// Grade levels that can see division-wide records
const DIVISION_GRADES = new Set(['MSS1', 'GM', 'GMCS']);
// Grade levels that can see department-wide records
const DEPARTMENT_GRADES = new Set(['MSS2', 'AGM', 'AGMCS']);

type UserScope = {
  level: 'directorate' | 'division' | 'department' | 'office';
  directorateIds: string[];
  divisionIds: string[];
  departmentIds: string[];
  officeIds: string[];
};

const RecordsArchiveForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {currentUser, hydrated: _hydrated } = useCurrentUser();
  const {directorates, divisions, departments, offices: _offices, officeMemberships } = useOrganization();
  const { dataVersion: _dataVersion } = useCorrespondence();
  const { getSignal, reset } = useAbortController();

  // Initialize filters from URL params or localStorage
  useEffect(() => {
    const invalidKeys = ['division', 'department', 'directorate'];
    invalidKeys.forEach(key => {
      const stored = localStorage.getItem(`records_filter_${key}`);
      if (stored && (stored === '""' || stored === '"' || stored === '' || !stored.match(/^[a-f0-9-]+$/i))) {
        localStorage.removeItem(`records_filter_${key}`);
      }
    });
    if (typeof window === 'undefined') return;
    const readFilter = (key: string, setter: (v: string) => void, defaultValue: string, isArray?: boolean) => {
      const urlParam = searchParams.get(key);
      if (urlParam) {
        (setter as (v: string | string[]) => void)(isArray ? urlParam.split(',') : urlParam);
        return;
      }
      const saved = localStorage.getItem(`records_filter_${key}`);
      if (saved) {
        try {
          setter(JSON.parse(saved));
        } catch {
          setter(saved);
        }
      }
    };
    readFilter('search', setSearchQuery, '');
    readFilter('directorate', setSelectedDirectorate, 'all');
    readFilter('division', setSelectedDivision, 'all');
    readFilter('department', setSelectedDepartment, 'all');
    readFilter('priority', setSelectedPriority, '');
    readFilter('sortBy', setSortBy, 'completed');
    readFilter('sortOrder', (v) => setSortOrder(v as 'asc' | 'desc'), 'desc');
  }, [searchParams]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDirectorate, setSelectedDirectorate] = useState<string>('all');
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('completed');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Data
  const [records, setRecords] = useState<Correspondence[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    byDirectorate: 0,
    byDivision: 0,
    byDepartment: 0,
    thisYear: 0,
    completed: 0,
    archived: 0,
    byPriority: {} as Record<string, number>,
    byDirection: {} as Record<string, number>,
  });
  const [count, setCount] = useState(0);
  
  // Use pagination hook
  const pagination = usePagination({
    initialPage: 1,
    totalCount: count,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Determine user's organizational scope
  const userScope = useMemo<UserScope>(() => {
    if (!currentUser) {
      return { level: 'office', directorateIds: [], divisionIds: [], departmentIds: [], officeIds: [] };
    }

    const gradeCode = (currentUser.gradeLevel ?? '').toUpperCase();
    const userOfficeIds = officeMemberships
      .filter((m) => m.userId === currentUser.id && m.isActive)
      .map((m) => m.officeId);

    // Check if user is at directorate level (ED, MD)
    if (DIRECTORATE_GRADES.has(gradeCode) || currentUser.isSuperuser) {
      // Get directorates user is associated with
      const userDirectorateIds = currentUser.directorate ? [currentUser.directorate] : [];
      // Superuser sees all
      const dirIds = currentUser.isSuperuser ? directorates.map((d) => d.id) : userDirectorateIds;
      const divIds = divisions.filter((d) => dirIds.includes(d.directorateId ?? '')).map((d) => d.id);
      const deptIds = departments.filter((d) => divIds.includes(d.divisionId ?? '')).map((d) => d.id);
      
      return {
        level: 'directorate',
        directorateIds: dirIds,
        divisionIds: divIds,
        departmentIds: deptIds,
        officeIds: userOfficeIds,
      };
    }

    // Check if user is at division level (GM)
    if (DIVISION_GRADES.has(gradeCode)) {
      const userDivisionIds = currentUser.division ? [currentUser.division] : [];
      const deptIds = departments.filter((d) => userDivisionIds.includes(d.divisionId ?? '')).map((d) => d.id);
      const dirIds = divisions
        .filter((d) => userDivisionIds.includes(d.id))
        .map((d) => d.directorateId)
        .filter((id): id is string => Boolean(id));
      
      return {
        level: 'division',
        directorateIds: dirIds,
        divisionIds: userDivisionIds,
        departmentIds: deptIds,
        officeIds: userOfficeIds,
      };
    }

    // Check if user is at department level (AGM)
    if (DEPARTMENT_GRADES.has(gradeCode)) {
      const userDepartmentIds = currentUser.department ? [currentUser.department] : [];
      const divIds = departments
        .filter((d) => userDepartmentIds.includes(d.id))
        .map((d) => d.divisionId)
        .filter((id): id is string => Boolean(id));
      const dirIds = divisions
        .filter((d) => divIds.includes(d.id))
        .map((d) => d.directorateId)
        .filter((id): id is string => Boolean(id));
      
      return {
        level: 'department',
        directorateIds: dirIds,
        divisionIds: divIds,
        departmentIds: userDepartmentIds,
        officeIds: userOfficeIds,
      };
    }

    // Default: office-level access
    const userDeptId = currentUser.department;
    const userDivId = currentUser.division;
    const userDirId = currentUser.directorate;
    
    return {
      level: 'office',
      directorateIds: userDirId ? [userDirId] : [],
      divisionIds: userDivId ? [userDivId] : [],
      departmentIds: userDeptId ? [userDeptId] : [],
      officeIds: userOfficeIds,
    };
  }, [currentUser, directorates, divisions, departments, officeMemberships]);

  // Filtered directorates user can see
  const visibleDirectorates = useMemo(() => {
    if (userScope.level === 'directorate' && currentUser?.isSuperuser) {
      return directorates;
    }
    return directorates.filter((d) => userScope.directorateIds.includes(d.id));
  }, [directorates, userScope, currentUser?.isSuperuser]);

  // Filtered divisions based on selected directorate
  const visibleDivisions = useMemo(() => {
    let filtered = divisions.filter((d) => userScope.divisionIds.includes(d.id));
    if (selectedDirectorate !== 'all') {
      filtered = filtered.filter((d) => d.directorateId === selectedDirectorate);
    }
    return filtered;
  }, [divisions, userScope.divisionIds, selectedDirectorate]);

  // Filtered departments based on selected division
  const visibleDepartments = useMemo(() => {
    let filtered = departments.filter((d) => userScope.departmentIds.includes(d.id));
    if (selectedDivision !== 'all') {
      filtered = filtered.filter((d) => d.divisionId === selectedDivision);
    }
    return filtered;
  }, [departments, userScope.departmentIds, selectedDivision]);

  // Reset cascading filters when parent changes
  useEffect(() => {
    setSelectedDivision('all');
    setSelectedDepartment('all');
  }, [selectedDirectorate]);

  useEffect(() => {
    setSelectedDepartment('all');
  }, [selectedDivision]);

  // Count active filters
  const hasActiveFilters = useMemo(() => {
    return !!(searchQuery || selectedDirectorate !== 'all' || selectedDivision !== 'all' || selectedDepartment !== 'all' || selectedPriority || dateFrom || dateTo);
  }, [searchQuery, selectedDirectorate, selectedDivision, selectedDepartment, selectedPriority, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDirectorate('all');
    setSelectedDivision('all');
    setSelectedDepartment('all');
    setSelectedPriority('');
    setDateFrom('');
    setDateTo('');
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      const keys = ['search', 'directorate', 'division', 'department', 'priority'];
      keys.forEach(key => localStorage.removeItem(`records_filter_${key}`));
    }
  };

  // Persist filters to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('records_filter_search', JSON.stringify(searchQuery));
    localStorage.setItem('records_filter_directorate', JSON.stringify(selectedDirectorate));
    localStorage.setItem('records_filter_division', JSON.stringify(selectedDivision));
    localStorage.setItem('records_filter_department', JSON.stringify(selectedDepartment));
    localStorage.setItem('records_filter_priority', JSON.stringify(selectedPriority));
    localStorage.setItem('records_filter_sortBy', JSON.stringify(sortBy));
    localStorage.setItem('records_filter_sortOrder', JSON.stringify(sortOrder));
  }, [searchQuery, selectedDirectorate, selectedDivision, selectedDepartment, selectedPriority, sortBy, sortOrder]);

  // Sync filters with URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedDirectorate !== 'all') params.set('directorate', selectedDirectorate);
    if (selectedDivision !== 'all') params.set('division', selectedDivision);
    if (selectedDepartment !== 'all') params.set('department', selectedDepartment);
    if (selectedPriority) params.set('priority', selectedPriority);
    if (sortBy !== 'completed') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
    if (pagination.page > 1) params.set('page', String(pagination.page));
    if (pagination.pageSize !== DEFAULT_LIST_PAGE_SIZE) params.set('pageSize', String(pagination.pageSize));

    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [searchQuery, selectedDirectorate, selectedDivision, selectedDepartment, selectedPriority, sortBy, sortOrder, pagination.page, pagination.pageSize]);

  // Debounced search
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    pagination.setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedDirectorate, selectedDivision, selectedDepartment, selectedPriority, dateFrom, dateTo, sortBy, sortOrder]);
  
  // Sync pagination with URL
  useEffect(() => {
    const urlPage = searchParams.get('page');
    if (urlPage) {
      const pageNum = parseInt(urlPage, 10);
      if (pageNum >= 1 && pageNum !== pagination.page) {
        pagination.setPage(pageNum);
      }
    } else if (pagination.page !== 1) {
      pagination.setPage(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- pagination.setPage is stable, only react to URL changes
  }, [searchParams]);

  // Fetch records — org filters must be sent to list (M3), not just export.
  const getFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.append('search', debouncedSearch);
    if (selectedPriority) params.append('priority', selectedPriority);
    if (dateFrom) params.append('from_date', dateFrom);
    if (dateTo) params.append('to_date', dateTo);
    if (selectedDirectorate !== 'all') params.append('directorate', selectedDirectorate);
    if (selectedDivision !== 'all') params.append('division', selectedDivision);
    if (selectedDepartment !== 'all') params.append('department', selectedDepartment);
    params.append('status', 'completed');
    params.append('status', 'archived');
    return params;
  }, [debouncedSearch, selectedPriority, dateFrom, dateTo, selectedDirectorate, selectedDivision, selectedDepartment]);

  const fetchRecords = useCallback(async () => {
    if (!currentUser?.id) return;

    const signal = getSignal();

    setLoading(true);
    setError(null);
    try {
      const params = getFilterParams();
      params.append('page', String(pagination.page));
      params.append('page_size', String(pagination.pageSize));
      params.append('sort_by', sortBy);
      params.append('sort_order', sortOrder);

      const response = await apiFetch<Record<string, unknown>>(`/correspondence/items/records-archive/?${params.toString()}`, {
        signal,
      });
      
      if (signal.aborted) {
        return;
      }
      
      const results = Array.isArray(response.results) ? response.results : [];
      setRecords(results.map(mapApiCorrespondence));
      const responseObj = response as Record<string, unknown>;
      setCount((responseObj && typeof responseObj.count === 'number') ? responseObj.count : results.length);
      const summaryObj = responseObj.summary as Record<string, unknown> | undefined;
      setSummary({
        total: (summaryObj && typeof summaryObj.total === 'number') ? summaryObj.total : ((responseObj && typeof responseObj.count === 'number') ? responseObj.count : results.length),
        byDirectorate: (summaryObj && typeof summaryObj.by_directorate === 'number') ? summaryObj.by_directorate : 0,
        byDivision: (summaryObj && typeof summaryObj.by_division === 'number') ? summaryObj.by_division : 0,
        byDepartment: (summaryObj && typeof summaryObj.by_department === 'number') ? summaryObj.by_department : 0,
        thisYear: (summaryObj && typeof summaryObj.this_year === 'number') ? summaryObj.this_year : 0,
        completed: (summaryObj && typeof summaryObj.completed === 'number') ? summaryObj.completed : 0,
        archived: (summaryObj && typeof summaryObj.archived === 'number') ? summaryObj.archived : 0,
        byPriority: (summaryObj && typeof summaryObj.by_priority === 'object' && summaryObj.by_priority !== null) ? summaryObj.by_priority as Record<string, number> : {},
        byDirection: (summaryObj && typeof summaryObj.by_direction === 'object' && summaryObj.by_direction !== null) ? summaryObj.by_direction as Record<string, number> : {},
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
        return;
      }
      const errorMessage =
        err instanceof Error && err.message
          ? err.message
          : 'Unable to load records. Please try again.';
      setError(errorMessage);
      setRecords([]);
      setCount(0);
      logError('Failed to fetch records:', err);
    } finally {
      if (!signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [currentUser?.id, getFilterParams, pagination.page, pagination.pageSize, sortBy, sortOrder]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRecords();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch all records for export (without pagination)
      const params = getFilterParams();
      if (selectedDirectorate !== 'all') {
        params.append('directorate', selectedDirectorate);
      }
      if (selectedDivision !== 'all') {
        params.append('division', selectedDivision);
      }
      if (selectedDepartment !== 'all') {
        params.append('department', selectedDepartment);
      }
      const allRecords = await fetchAllPaginatedResults<Record<string, unknown>>(
        async (page, pageSize) => {
          params.set('page', String(page));
          params.set('page_size', String(pageSize));
          const response = await apiFetch<Record<string, unknown>>(
            `/correspondence/items/records-archive/?${params.toString()}`,
          );
          const results = Array.isArray(response.results) ? response.results : [];
          return {
            results,
            count: typeof response.count === 'number' ? response.count : results.length,
            next: typeof response.next === 'string' ? response.next : null,
          };
        },
      );
      
      const exportData = allRecords.map((corr: Record<string, unknown>) => {
        const mapped = mapApiCorrespondence(corr);
        return {
          'Reference Number': mapped.referenceNumber || 'N/A',
          'Subject': mapped.subject || '',
          'Status': mapped.status || '',
          'Priority': mapped.priority || '',
          'Direction': mapped.direction || '',
          'Archive Level': mapped.archiveLevel || '',
          'Sender Name': mapped.senderName || '',
          'Sender Organization': mapped.senderOrganization || '',
          'Received Date': mapped.receivedDate ? formatDateShort(mapped.receivedDate) : '',
          'Completed Date': mapped.completedAt ? formatDateShort(mapped.completedAt) : '',
          'Created Date': mapped.createdAt ? formatDateShort(mapped.createdAt) : '',
        };
      });

      exportToCSV(exportData, [
        { key: 'Reference Number', label: 'Reference Number' },
        { key: 'Subject', label: 'Subject' },
        { key: 'Status', label: 'Status' },
        { key: 'Priority', label: 'Priority' },
        { key: 'Direction', label: 'Direction' },
        { key: 'Archive Level', label: 'Archive Level' },
        { key: 'Sender Name', label: 'Sender Name' },
        { key: 'Sender Organization', label: 'Sender Organization' },
        { key: 'Received Date', label: 'Received Date' },
        { key: 'Completed Date', label: 'Completed Date' },
        { key: 'Created Date', label: 'Created Date' },
      ], {
        filename: `records-export-${new Date().toISOString().split('T')[0]}.csv`,
      });

      toast.success(`Exported ${exportData.length} records successfully`);
    } catch (err: unknown) {
      toast.error('Failed to export records. Please try again.');
      logError('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const getScopeLabel = () => {
    switch (userScope.level) {
      case 'directorate': return currentUser?.isSuperuser ? 'Organization-wide' : 'Directorate';
      case 'division': return 'Division';
      case 'department': return 'Department';
      default: return 'Your Offices';
    }
  };

  return (
    <ErrorBoundary>
      <>
        {!currentUser ? null : (
          <QueuePageShell
            title="Archives"
            subtitle={`Review completed and archived correspondence in your ${getScopeLabel().toLowerCase()} scope.`}
            actions={(
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="compact">
                    <MoreVertical className="h-4 w-4" />
                    More
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleRefresh} disabled={loading || refreshing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExport} disabled={exporting || loading || records.length === 0}>
                    <Download className={`h-4 w-4 mr-2 ${exporting ? 'animate-spin' : ''}`} />
                    {exporting ? 'Exporting...' : 'Export'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            stats={(
              <StatStrip
                items={[
                  { key: 'total', label: 'Total records', value: summary.total },
                  { key: 'thisYear', label: 'This year', value: summary.thisYear },
                  { key: 'completed', label: 'Completed', value: summary.completed },
                  { key: 'archived', label: 'Archived', value: summary.archived },
                ]}
              />
            )}
          >
        {/* Inline filter bar */}
        <div className="rounded-xl bg-muted/30 p-2">
            <div className="md:hidden mb-2">
              <Button variant="outline" size="sm" onClick={() => setFiltersOpen(!filtersOpen)} className="h-8 w-full justify-between text-xs">
                <span className="flex items-center"><Search className="h-3.5 w-3.5 mr-2" /> Filters</span>
                {hasActiveFilters && <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">1</span>}
              </Button>
            </div>
            <div className={`flex-wrap items-center gap-2${filtersOpen ? ' flex' : ' hidden'} md:flex`}>
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
                aria-label="Search correspondence"
              />
            </div>

            {userScope.level === 'directorate' && visibleDirectorates.length > 1 && (
              <Select value={selectedDirectorate} onValueChange={(v) => { setSelectedDirectorate(v); pagination.goToFirstPage(); }}>
                <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Filter by directorate"><SelectValue placeholder="Directorate" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Directorates</SelectItem>
                  {visibleDirectorates.map((dir) => (
                    <SelectItem key={dir.id} value={dir.id}>{dir.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {(userScope.level === 'directorate' || userScope.level === 'division') && visibleDivisions.length > 0 && (
              <Select value={selectedDivision} onValueChange={(v) => { setSelectedDivision(v); pagination.goToFirstPage(); }}>
                <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Filter by division"><SelectValue placeholder="Division" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {visibleDivisions.map((div) => (
                    <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {userScope.level !== 'office' && visibleDepartments.length > 0 && (
              <Select value={selectedDepartment} onValueChange={(v) => { setSelectedDepartment(v); pagination.goToFirstPage(); }}>
                <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Filter by department"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {visibleDepartments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

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

            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => { const [by, order] = value.split('-'); setSortBy(by); setSortOrder(order as 'asc' | 'desc'); }}>
              <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Sort by"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="completed-desc">Completed (Newest)</SelectItem>
                <SelectItem value="completed-asc">Completed (Oldest)</SelectItem>
                <SelectItem value="received-desc">Received (Newest)</SelectItem>
                <SelectItem value="received-asc">Received (Oldest)</SelectItem>
                <SelectItem value="priority-desc">Priority (Urgent First)</SelectItem>
                <SelectItem value="subject-asc">Subject (A-Z)</SelectItem>
                <SelectItem value="subject-desc">Subject (Z-A)</SelectItem>
                <SelectItem value="reference-asc">Reference (A-Z)</SelectItem>
                <SelectItem value="reference-desc">Reference (Z-A)</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">Clear</Button>}
            </div>
        </div>

        <div aria-live="polite">
        {loading && !refreshing ? (
          <LoadingState message="Loading records…" />
        ) : error ? (
          <ErrorState
            title="Error loading records"
            message={error}
            onRetry={handleRefresh}
            retryLabel="Retry"
            variant="inline"
          />
        ) : records.length === 0 ? (
          <EmptyState
            icon={<Archive className={registryQueueEmptyIconClass} />}
            title={hasActiveFilters ? 'No records match your filters' : 'No records in your scope'}
            message={
              hasActiveFilters
                ? 'Try adjusting your search or filters.'
                : 'Completed and archived correspondence in your access scope will appear here.'
            }
            actionLabel={hasActiveFilters ? 'Clear Filters' : undefined}
            onAction={hasActiveFilters ? clearFilters : undefined}
          />
        ) : (
          <div className={correspondenceQueueListStackClass} role="list">
            {records.map((corr) => (
              <div key={corr.id} role="listitem">
                <RecordCard corr={corr} />
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
    </ErrorBoundary>
  );
};

const RecordsArchivePage = () => (
  <Suspense fallback={<PageSuspenseFallback message="Loading..." />}>
    <CorrespondenceProvider>
      <RecordsArchiveForm />
    </CorrespondenceProvider>
  </Suspense>
);

export default RecordsArchivePage;

