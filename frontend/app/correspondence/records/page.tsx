"use client";

import { useEffect, useMemo, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Archive,
  Search,
  Calendar,
  User as UserIcon,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  FileArchive,
  Filter,
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
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { useCurrentUser } from '@/hooks/use-current-user';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';
import { exportToCSV } from '@/lib/admin-export';
import { toast } from 'sonner';
import { logError } from '@/lib/client-logger';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
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
  registryQueueSearchInputWrapClass,
} from '@/components/shared/registry-queue-styles';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

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
  const { currentUser, hydrated } = useCurrentUser();
  const { directorates, divisions, departments, offices, officeMemberships } = useOrganization();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize filters from URL params or localStorage
  // Clear any invalid stored filters (empty strings or invalid UUIDs)
  if (typeof window !== 'undefined') {
    const invalidKeys = ['division', 'department', 'directorate'];
    invalidKeys.forEach(key => {
      const stored = localStorage.getItem(`records_filter_${key}`);
      if (stored && (stored === '""' || stored === '"' || stored === '' || !stored.match(/^[a-f0-9-]+$/i))) {
        localStorage.removeItem(`records_filter_${key}`);
      }
    });
  }
  
  const getInitialFilter = (key: string, defaultValue: string | string[]): string | string[] => {
    if (typeof window === 'undefined') return defaultValue;
    const urlParam = searchParams.get(key);
    if (urlParam) {
      if (Array.isArray(defaultValue)) {
        return urlParam.split(',').filter(Boolean);
      }
      return urlParam;
    }
    const saved = localStorage.getItem(`records_filter_${key}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed;
      } catch {
        return saved;
      }
    }
    return defaultValue;
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState(() => getInitialFilter('search', '') as string);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDirectorate, setSelectedDirectorate] = useState<string>(() => getInitialFilter('directorate', 'all') as string);
  const [selectedDivision, setSelectedDivision] = useState<string>(() => getInitialFilter('division', 'all') as string);
  const [selectedDepartment, setSelectedDepartment] = useState<string>(() => getInitialFilter('department', 'all') as string);
  const [yearFilter, setYearFilter] = useState<string>(() => getInitialFilter('year', 'all') as string);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>(() => getInitialFilter('priorities', []) as string[]);
  const [selectedDirections, setSelectedDirections] = useState<string[]>(() => getInitialFilter('directions', []) as string[]);
  const [selectedArchiveLevel, setSelectedArchiveLevel] = useState<string>(() => getInitialFilter('archiveLevel', 'all') as string);
  const [hasCompletionPackage, setHasCompletionPackage] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('records_filter_hasCompletionPackage');
    return saved === 'true';
  });
  const [sortBy, setSortBy] = useState<string>(() => getInitialFilter('sortBy', 'completed') as string);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => (getInitialFilter('sortOrder', 'desc') as 'asc' | 'desc'));
  const [showFilters, setShowFilters] = useState(false);
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'last30' | 'last90' | 'thisYear' | 'custom'>(() => getInitialFilter('dateRange', 'all') as 'all' | 'last30' | 'last90' | 'thisYear' | 'custom');
  const [customDateFrom, setCustomDateFrom] = useState<string>('');
  const [customDateTo, setCustomDateTo] = useState<string>('');

  // Data
  const [records, setRecords] = useState<Correspondence[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
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
    initialPageSize: 25,
    totalCount: count,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const fetchRecordsRef = useRef<(() => Promise<void>) | null>(null);

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
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedDirectorate !== 'all') count++;
    if (selectedDivision !== 'all') count++;
    if (selectedDepartment !== 'all') count++;
    if (yearFilter !== 'all' || dateRangeFilter !== 'all') count++;
    if (selectedPriorities.length > 0) count++;
    if (selectedDirections.length > 0) count++;
    if (selectedArchiveLevel !== 'all') count++;
    if (hasCompletionPackage) count++;
    return count;
  }, [selectedDirectorate, selectedDivision, selectedDepartment, yearFilter, dateRangeFilter, selectedPriorities, selectedDirections, selectedArchiveLevel, hasCompletionPackage]);

  const togglePriority = (priority: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]
    );
  };

  const toggleDirection = (direction: string) => {
    setSelectedDirections((prev) =>
      prev.includes(direction) ? prev.filter((d) => d !== direction) : [...prev, direction]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedDirectorate('all');
    setSelectedDivision('all');
    setSelectedDepartment('all');
    setYearFilter('all');
    setDateRangeFilter('all');
    setCustomDateFrom('');
    setCustomDateTo('');
    setSelectedPriorities([]);
    setSelectedDirections([]);
    setSelectedArchiveLevel('all');
    setHasCompletionPackage(false);
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      const keys = ['search', 'directorate', 'division', 'department', 'year', 'dateRange', 'priorities', 'directions', 'archiveLevel', 'hasCompletionPackage'];
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
    localStorage.setItem('records_filter_year', JSON.stringify(yearFilter));
    localStorage.setItem('records_filter_dateRange', JSON.stringify(dateRangeFilter));
    localStorage.setItem('records_filter_priorities', JSON.stringify(selectedPriorities));
    localStorage.setItem('records_filter_directions', JSON.stringify(selectedDirections));
    localStorage.setItem('records_filter_archiveLevel', JSON.stringify(selectedArchiveLevel));
    localStorage.setItem('records_filter_hasCompletionPackage', JSON.stringify(hasCompletionPackage));
    localStorage.setItem('records_filter_sortBy', JSON.stringify(sortBy));
    localStorage.setItem('records_filter_sortOrder', JSON.stringify(sortOrder));
  }, [searchQuery, selectedDirectorate, selectedDivision, selectedDepartment, yearFilter, dateRangeFilter, selectedPriorities, selectedDirections, selectedArchiveLevel, hasCompletionPackage, sortBy, sortOrder]);

  // Sync filters with URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedDirectorate !== 'all') params.set('directorate', selectedDirectorate);
    if (selectedDivision !== 'all') params.set('division', selectedDivision);
    if (selectedDepartment !== 'all') params.set('department', selectedDepartment);
    if (yearFilter !== 'all') params.set('year', yearFilter);
    if (dateRangeFilter !== 'all') params.set('dateRange', dateRangeFilter);
    if (selectedPriorities.length > 0) params.set('priorities', selectedPriorities.join(','));
    if (selectedDirections.length > 0) params.set('directions', selectedDirections.join(','));
    if (selectedArchiveLevel !== 'all') params.set('archiveLevel', selectedArchiveLevel);
    if (hasCompletionPackage) params.set('hasCompletionPackage', 'true');
    if (sortBy !== 'completed') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
    if (pagination.page > 1) params.set('page', String(pagination.page));
    if (pagination.pageSize !== 25) params.set('pageSize', String(pagination.pageSize));

    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [searchQuery, selectedDirectorate, selectedDivision, selectedDepartment, yearFilter, dateRangeFilter, selectedPriorities, selectedDirections, selectedArchiveLevel, hasCompletionPackage, sortBy, sortOrder, pagination.page, pagination.pageSize]);

  // Debounced search
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    pagination.setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedDirectorate, selectedDivision, selectedDepartment, yearFilter, dateRangeFilter, selectedPriorities, selectedDirections, selectedArchiveLevel, hasCompletionPackage, sortBy, sortOrder]);
  
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
      const params = new URLSearchParams({
        page: String(pagination.page),
        page_size: String(pagination.pageSize),
      });

      // Note: Don't send division/department params - backend handles scoping automatically
      // This avoids UUID validation errors with large number of IDs

      // Add other filters
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (yearFilter !== 'all') params.append('year', yearFilter);
      
      // Date range filtering
      if (dateRangeFilter === 'last30') {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 30);
        params.append('from_date', fromDate.toISOString().split('T')[0]);
      } else if (dateRangeFilter === 'last90') {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 90);
        params.append('from_date', fromDate.toISOString().split('T')[0]);
      } else if (dateRangeFilter === 'thisYear') {
        const fromDate = new Date();
        fromDate.setMonth(0, 1);
        params.append('from_date', fromDate.toISOString().split('T')[0]);
      } else if (dateRangeFilter === 'custom') {
        if (customDateFrom) params.append('from_date', customDateFrom);
        if (customDateTo) params.append('to_date', customDateTo);
      }
      
      if (selectedPriorities.length > 0) {
        selectedPriorities.forEach((p) => params.append('priority', p));
      }
      if (selectedDirections.length > 0) {
        selectedDirections.forEach((d) => params.append('direction', d));
      }
      if (selectedArchiveLevel !== 'all') {
        params.append('archive_level', selectedArchiveLevel);
      }
      if (hasCompletionPackage) {
        params.append('has_completion_package', 'true');
      }
      params.append('sort_by', sortBy);
      params.append('sort_order', sortOrder);
      params.append('status', 'completed');
      params.append('status', 'archived');

      // FIX: Correct endpoint name
      const response = await apiFetch<Record<string, unknown>>(`/correspondence/items/archive-records/?${params.toString()}`, {
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
      const availableYearsArray = (summaryObj && Array.isArray(summaryObj.available_years)) ? summaryObj.available_years : [];
      setAvailableYears(availableYearsArray.map(y => typeof y === 'number' ? y : parseInt(String(y), 10)).filter(y => !isNaN(y)));
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
        return;
      }
      let errorMessage = 'Unable to load records. Please try again.';
      if (err && typeof err === 'object') {
        const errorObj = err as Record<string, unknown>;
        if (errorObj.response && typeof errorObj.response === 'object') {
          const response = errorObj.response as Record<string, unknown>;
          if (response.data && typeof response.data === 'object') {
            const data = response.data as Record<string, unknown>;
            errorMessage = (data.detail as string) || errorMessage;
          }
        }
        if (errorMessage === 'Unable to load records. Please try again.') {
          errorMessage = (errorObj.message as string) || errorMessage;
        }
      }
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
  }, [currentUser, pagination.page, pagination.pageSize, debouncedSearch, yearFilter, dateRangeFilter, customDateFrom, customDateTo, selectedPriorities, selectedDirections, selectedArchiveLevel, hasCompletionPackage, sortBy, sortOrder]);

  // Store fetchRecords ref
  useEffect(() => {
    fetchRecordsRef.current = fetchRecords;
  }, [fetchRecords]);

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
      const params = new URLSearchParams();
      
      if (selectedDirectorate !== 'all') {
        params.append('directorate', selectedDirectorate);
      }
      if (selectedDivision !== 'all') {
        params.append('division', selectedDivision);
      }
      if (selectedDepartment !== 'all') {
        params.append('department', selectedDepartment);
      }
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (yearFilter !== 'all') params.append('year', yearFilter);
      if (dateRangeFilter === 'last30') {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 30);
        params.append('from_date', fromDate.toISOString().split('T')[0]);
      } else if (dateRangeFilter === 'last90') {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 90);
        params.append('from_date', fromDate.toISOString().split('T')[0]);
      } else if (dateRangeFilter === 'thisYear') {
        const fromDate = new Date();
        fromDate.setMonth(0, 1);
        params.append('from_date', fromDate.toISOString().split('T')[0]);
      } else if (dateRangeFilter === 'custom') {
        if (customDateFrom) params.append('from_date', customDateFrom);
        if (customDateTo) params.append('to_date', customDateTo);
      }
      if (selectedPriorities.length > 0) {
        selectedPriorities.forEach((p) => params.append('priority', p));
      }
      if (selectedDirections.length > 0) {
        selectedDirections.forEach((d) => params.append('direction', d));
      }
      if (selectedArchiveLevel !== 'all') {
        params.append('archive_level', selectedArchiveLevel);
      }
      if (hasCompletionPackage) {
        params.append('has_completion_package', 'true');
      }
      params.append('status', 'completed');
      params.append('status', 'archived');
      params.append('page_size', '1000'); // Reasonable limit for export

      const response = await apiFetch<Record<string, unknown>>(`/correspondence/items/archive-records/?${params.toString()}`);
      const allRecords = Array.isArray(response.results) ? response.results : [];
      
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

  if (!currentUser) {
    return (
      <ErrorBoundary>
        <DashboardLayout>
          <div className="container mx-auto p-6 space-y-6">
            <LoadingState message="Loading records…" />
          </div>
        </DashboardLayout>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">Records & Archives</h1>
              <p className="text-muted-foreground mt-1">
                Completed correspondence within your {getScopeLabel().toLowerCase()} scope
              </p>
            </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" /> Filters
              {activeFilterCount > 0 && <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>}
            </Button>
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

        <HelpGuideCard
          title={`${getScopeLabel()} Records`}
          description={`Browse completed and archived correspondence. ${
            userScope.level === 'directorate' ? 'As an executive, you can see all records across your directorate and filter by division or department.' :
            userScope.level === 'division' ? 'As a GM, you can see all records across your division and filter by department.' :
            userScope.level === 'department' ? 'As an AGM, you can see all records within your department.' :
            'You can see records from your assigned offices.'
          }`}
          links={[{ label: 'Help & Guides', href: '/help' }]}
        />

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Records & Archives Filters</CardTitle>
                {activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={clearAllFilters}>Clear All</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                {/* Directorate Filter - Only show for directorate-level users */}
                {userScope.level === 'directorate' && visibleDirectorates.length > 1 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Directorate</Label>
                    <Select value={selectedDirectorate} onValueChange={setSelectedDirectorate}>
                      <SelectTrigger><SelectValue placeholder="All Directorates" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Directorates</SelectItem>
                        {visibleDirectorates.map((dir) => (
                          <SelectItem key={dir.id} value={dir.id}>{dir.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Division Filter - Show for directorate and division-level users */}
                {(userScope.level === 'directorate' || userScope.level === 'division') && visibleDivisions.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Division</Label>
                    <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                      <SelectTrigger><SelectValue placeholder="All Divisions" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Divisions</SelectItem>
                        {visibleDivisions.map((div) => (
                          <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Department Filter - Show for all except office-level */}
                {userScope.level !== 'office' && visibleDepartments.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Department</Label>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {visibleDepartments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium mb-2 block">Date Range</Label>
                  <Select value={dateRangeFilter} onValueChange={(value) => setDateRangeFilter(value as typeof dateRangeFilter)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="last30">Last 30 Days</SelectItem>
                      <SelectItem value="last90">Last 90 Days</SelectItem>
                      <SelectItem value="thisYear">This Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                  {dateRangeFilter === 'custom' && (
                    <div className="mt-2 space-y-2">
                      <Input
                        type="date"
                        placeholder="From"
                        value={customDateFrom}
                        onChange={(e) => setCustomDateFrom(e.target.value)}
                        className="w-full"
                      />
                      <Input
                        type="date"
                        placeholder="To"
                        value={customDateTo}
                        onChange={(e) => setCustomDateTo(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Year</Label>
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {Array.from(new Set(availableYears)).sort((a, b) => b - a).map((year) => (
                        <SelectItem key={`year-${year}`} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Archive Level</Label>
                  <Select value={selectedArchiveLevel} onValueChange={setSelectedArchiveLevel}>
                    <SelectTrigger><SelectValue placeholder="All Levels" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="department">Department</SelectItem>
                      <SelectItem value="division">Division</SelectItem>
                      <SelectItem value="directorate">Directorate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Completion Package</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasCompletionPackage"
                      checked={hasCompletionPackage}
                      onCheckedChange={(checked) => setHasCompletionPackage(checked === true)}
                    />
                    <label
                      htmlFor="hasCompletionPackage"
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      Has Completion Package
                    </label>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Priority</Label>
                  <div className="flex flex-wrap gap-1">
                    {['urgent', 'high', 'medium', 'low'].map((priority) => (
                      <Badge
                        key={priority}
                        variant={selectedPriorities.includes(priority) ? 'default' : 'outline'}
                        className="cursor-pointer capitalize text-xs"
                        onClick={() => togglePriority(priority)}
                        style={selectedPriorities.includes(priority) ? { backgroundColor: PRIORITY_COLORS[priority] } : {}}
                      >
                        {priority}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Direction</Label>
                  <div className="flex flex-wrap gap-1">
                    {['downward', 'upward'].map((direction) => (
                      <Badge
                        key={direction}
                        variant={selectedDirections.includes(direction) ? 'default' : 'outline'}
                        className="cursor-pointer capitalize text-xs"
                        onClick={() => toggleDirection(direction)}
                      >
                        {direction === 'downward' ? '↓' : '↑'} {direction}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Sort By</Label>
                    <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => { const [by, order] = value.split('-'); setSortBy(by); setSortOrder(order as 'asc' | 'desc'); }}>
                      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
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
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search + summary stats (shared shell) */}
        <Card>
          <CardContent className={registryQueueSearchStatsShellContentClass}>
            <div className={registryQueueSearchInputWrapClass}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by subject, reference, sender..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
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
            title={debouncedSearch || activeFilterCount > 0 ? 'No records match your filters' : 'No records in your scope'}
            message={
              debouncedSearch || activeFilterCount > 0
                ? 'Try adjusting your search or filters.'
                : 'Completed and archived correspondence in your access scope will appear here.'
            }
            actionLabel={debouncedSearch || activeFilterCount > 0 ? 'Clear Filters' : undefined}
            onAction={debouncedSearch || activeFilterCount > 0 ? clearAllFilters : undefined}
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
      </div>
    </DashboardLayout>
    </ErrorBoundary>
  );
};

const RecordsArchivePage = () => (
  <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
    <RecordsArchiveForm />
  </Suspense>
);

export default RecordsArchivePage;

