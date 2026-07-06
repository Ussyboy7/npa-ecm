"use client";

import { useEffect, useMemo, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Archive,
  Search,
  Calendar,
  User as UserIcon,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  FileArchive,
  Building2,
  ChevronRight,
  FileText,
  RefreshCw,
  Download,
  MoreVertical,
  Eye,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Correspondence } from '@/lib/npa-structure';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { useCurrentUser } from '@/hooks/use-current-user';
import { apiFetch } from '@/lib/api-client';
import { CorrespondenceProvider, mapApiCorrespondence, useCorrespondence } from '@/contexts/CorrespondenceContext';
import { fetchAllPaginatedResults } from '@/lib/pagination-utils';
import { DEFAULT_LIST_PAGE_SIZE } from '@/lib/pagination-constants';
import { toast } from 'sonner';
import { logError } from '@/lib/client-logger';
import { exportToCSV } from '@/lib/admin-export';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import {
  correspondenceQueueBadgeClass,
  correspondenceQueueDateClass,
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueListStackClass,
  correspondenceQueueMetaIconClass,
  correspondenceQueueMetaItemClass,
  correspondenceQueueMetaRowClass,
  correspondenceQueueSubjectClass,
  registryQueueEmptyIconClass,
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
  registryQueueSearchStatsShellContentClass,
} from '@/components/shared/registry-queue-styles';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Fetch records
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const getFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.append('search', debouncedSearch);
    if (selectedPriority) params.append('priority', selectedPriority);
    if (dateFrom) params.append('from_date', dateFrom);
    if (dateTo) params.append('to_date', dateTo);
    params.append('status', 'completed');
    params.append('status', 'archived');
    return params;
  }, [debouncedSearch, selectedPriority, dateFrom, dateTo]);

  const fetchRecords = useCallback(async () => {
    if (!currentUser?.id) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const params = getFilterParams();
      params.append('page', String(pagination.page));
      params.append('page_size', String(pagination.pageSize));
      params.append('sort_by', sortBy);
      params.append('sort_order', sortOrder);

      const response = await apiFetch<Record<string, unknown>>(`/correspondence/items/records-archive/?${params.toString()}`, {
        signal: controller.signal,
      });
      
      if (controller.signal.aborted) {
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
      if (!controller.signal.aborted) {
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

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
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

  // RecordCard component
  const RecordCard = ({ corr }: { corr: Correspondence }) => {
    const division = corr.divisionId ? divisions.find((item) => item.id as string === corr.divisionId) : null;
    const department = corr.departmentId ? departments.find((item) => item.id as string === corr.departmentId) : null;
    const directorate = corr.directorateId ? directorates.find((item) => item.id as string === corr.directorateId) : null;
    const archiveLevel = corr.archiveLevel || 'department';
    const levelLabel = archiveLevel === 'directorate' ? 'Directorate' : archiveLevel === 'division' ? 'Division' : 'Department';
    const orgParts: string[] = [];
    if (directorate?.name) orgParts.push(directorate.name);
    if (division?.name) orgParts.push(division.name);
    if (department?.name) orgParts.push(department.name);
    const orgPath = orgParts.join(' → ');

    return (
      <ListRowCard
        density="compact"
        href={`/correspondence/${corr.id}`}
        leading={(
          <div className={cn(correspondenceQueueLeadingBoxClass, 'bg-muted')}>
            <FileArchive className={cn(correspondenceQueueLeadingIconClass, 'text-muted-foreground')} />
          </div>
        )}
        actions={(
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label="Open record"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/correspondence/${corr.id}`);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Open record</TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label="More actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/correspondence/${corr.id}`} className="flex items-center">
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(`/correspondence/${corr.id}`, '_blank');
                  }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in New Tab
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    void navigator.clipboard.writeText(corr.referenceNumber || '');
                    toast.success('Reference number copied to clipboard');
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Reference
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    void navigator.clipboard.writeText(`${window.location.origin}/correspondence/${corr.id}`);
                    toast.success('Link copied to clipboard');
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Link
                </DropdownMenuItem>
                {corr.completionPackage?.fileUrl ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(corr.completionPackage?.fileUrl, '_blank');
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Completion Package
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      >
        <h4 className={correspondenceQueueSubjectClass}>{corr.subject}</h4>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            <Badge variant={getPriorityBadgeVariant(corr.priority)} className={correspondenceQueueBadgeClass}>
              {corr.priority.toUpperCase()}
            </Badge>
            <Badge variant="outline" className={cn(correspondenceQueueBadgeClass, 'gap-0.5')}>
              {corr.direction === 'downward' ? (
                <><ArrowDown className="h-2.5 w-2.5 text-info" />Downward</>
              ) : (
                <><ArrowUp className="h-2.5 w-2.5 text-success" />Upward</>
              )}
            </Badge>
            <Badge variant="secondary" className={cn(correspondenceQueueBadgeClass, 'gap-0.5 text-success bg-success/10')}>
              <CheckCircle2 className="h-2.5 w-2.5" />
              {corr.status === 'archived' ? 'Archived' : 'Completed'}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                correspondenceQueueBadgeClass,
                archiveLevel === 'directorate'
                  ? 'bg-primary/10 text-primary'
                  : archiveLevel === 'division'
                    ? 'bg-info/10 text-info'
                    : '',
              )}
            >
              {levelLabel} Record
            </Badge>
          </div>
          <span className={correspondenceQueueDateClass}>
            {formatDateShort(corr.completedAt || corr.receivedDate)}
          </span>
        </div>
        <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
          <span className={correspondenceQueueMetaItemClass}>
            <UserIcon className={correspondenceQueueMetaIconClass} />
            <span className="truncate">From: {corr.senderName || 'Unknown'}</span>
          </span>
          <span className={correspondenceQueueMetaItemClass}>
            <FileText className={correspondenceQueueMetaIconClass} />
            <span className="truncate">Ref: {corr.referenceNumber || 'N/A'}</span>
          </span>
          {orgPath ? (
            <span className={correspondenceQueueMetaItemClass}>
              <Building2 className={correspondenceQueueMetaIconClass} />
              <span className="truncate">{orgPath}</span>
            </span>
          ) : null}
        </div>
      </ListRowCard>
    );
  };

  return (
    <ErrorBoundary>
      <>
        <div className="container mx-auto p-6 space-y-6">
          {!currentUser ? (
            <LoadingState message="Loading records…" />
          ) : (
            <>
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">Records & Archives</h1>
              <p className="text-muted-foreground mt-1">
                Review completed and archived correspondence in your {getScopeLabel().toLowerCase()} scope.
              </p>
            </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="h-4 w-4 mr-2" />
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
          </div>
        </div>

        {/* Inline filter bar */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-2">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            {userScope.level === 'directorate' && visibleDirectorates.length > 1 && (
              <Select value={selectedDirectorate} onValueChange={(v) => { setSelectedDirectorate(v); pagination.goToFirstPage(); }}>
                <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Directorate" /></SelectTrigger>
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
                <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Division" /></SelectTrigger>
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
                <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {visibleDepartments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

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
          </CardContent>
        </Card>

        {/* Summary stats */}
        <Card>
          <CardContent className={registryQueueSearchStatsShellContentClass}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Total Records', value: summary.total, icon: Archive, bgClass: 'bg-primary/10', iconClass: 'text-primary' },
                { label: 'This Year', value: summary.thisYear, icon: Calendar, bgClass: 'bg-secondary/50', iconClass: 'text-muted-foreground' },
                { label: 'Completed', value: summary.completed, icon: CheckCircle2, bgClass: 'bg-success/10', iconClass: 'text-success' },
                { label: 'Archived', value: summary.archived, icon: Archive, bgClass: 'bg-muted', iconClass: 'text-muted-foreground' },
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
          </CardContent>
        </Card>

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
          <div className={correspondenceQueueListStackClass}>
            {records.map((corr) => (
              <RecordCard key={corr.id} corr={corr} />
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
    </>
    </ErrorBoundary>
  );
};

const RecordsArchivePage = () => (
  <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
    <CorrespondenceProvider>
      <RecordsArchiveForm />
    </CorrespondenceProvider>
  </Suspense>
);

export default RecordsArchivePage;

