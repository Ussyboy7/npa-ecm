"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  Loader2,
  Building2,
  Layers,
  FolderTree,
  FileText,
  RefreshCw,
  Download,
  MoreVertical,
  Eye,
  ExternalLink,
  Copy,
  AlertCircle,
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
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

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

const RecordsArchivePage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, hydrated } = useCurrentUser();
  const { directorates, divisions, departments, offices, officeMemberships } = useOrganization();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize filters from URL params or localStorage
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
    return count;
  }, [selectedDirectorate, selectedDivision, selectedDepartment, yearFilter, dateRangeFilter, selectedPriorities, selectedDirections, selectedArchiveLevel]);

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
    localStorage.setItem('records_filter_sortBy', JSON.stringify(sortBy));
    localStorage.setItem('records_filter_sortOrder', JSON.stringify(sortOrder));
  }, [searchQuery, selectedDirectorate, selectedDivision, selectedDepartment, yearFilter, dateRangeFilter, selectedPriorities, selectedDirections, selectedArchiveLevel, sortBy, sortOrder]);

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
    if (sortBy !== 'completed') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
    if (pagination.page > 1) params.set('page', String(pagination.page));
    if (pagination.pageSize !== 25) params.set('pageSize', String(pagination.pageSize));

    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [searchQuery, selectedDirectorate, selectedDivision, selectedDepartment, yearFilter, dateRangeFilter, selectedPriorities, selectedDirections, selectedArchiveLevel, sortBy, sortOrder, pagination.page, pagination.pageSize]);

  // Debounced search
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    pagination.setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedDirectorate, selectedDivision, selectedDepartment, yearFilter, dateRangeFilter, selectedPriorities, selectedDirections, selectedArchiveLevel, sortBy, sortOrder]);
  
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!hydrated || !currentUser) return;


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

      // Add scope parameters
      if (selectedDirectorate !== 'all') {
        params.append('directorate', selectedDirectorate);
      } else if (userScope.directorateIds.length > 0 && userScope.level !== 'directorate') {
        userScope.directorateIds.forEach((id) => params.append('directorate', id));
      }

      if (selectedDivision !== 'all') {
        params.append('division', selectedDivision);
      } else if (selectedDirectorate === 'all' && userScope.divisionIds.length > 0) {
        userScope.divisionIds.forEach((id) => params.append('division', id));
      }

      if (selectedDepartment !== 'all') {
        params.append('department', selectedDepartment);
      } else if (selectedDivision === 'all' && selectedDirectorate === 'all' && userScope.departmentIds.length > 0) {
        userScope.departmentIds.forEach((id) => params.append('department', id));
      }

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
      setCount(response.count ?? results.length);
      setSummary({
        total: response.summary?.total ?? response.count ?? results.length,
        byDirectorate: response.summary?.by_directorate ?? 0,
        byDivision: response.summary?.by_division ?? 0,
        byDepartment: response.summary?.by_department ?? 0,
        thisYear: response.summary?.this_year ?? 0,
        completed: response.summary?.completed ?? 0,
        archived: response.summary?.archived ?? 0,
        byPriority: response.summary?.by_priority ?? {},
        byDirection: response.summary?.by_direction ?? {},
      });
      setAvailableYears(response.summary?.available_years ?? []);
    } catch (err: Record<string, unknown>) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const errorMessage = err?.response?.data?.detail || err?.message || 'Unable to load records. Please try again.';
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
  }, [hydrated, currentUser, pagination.page, pagination.pageSize, debouncedSearch, selectedDirectorate, selectedDivision, selectedDepartment, yearFilter, dateRangeFilter, customDateFrom, customDateTo, selectedPriorities, selectedDirections, selectedArchiveLevel, sortBy, sortOrder, userScope]);

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
      params.append('status', 'completed');
      params.append('status', 'archived');
      params.append('page_size', '10000'); // Large number to get all

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
    } catch (err: Record<string, unknown>) {
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
    const division = corr.divisionId ? divisions.find((item) => item.id === corr.divisionId) : null;
    const department = corr.departmentId ? departments.find((item) => item.id === corr.departmentId) : null;
    const directorate = corr.directorateId ? directorates.find((item) => item.id === corr.directorateId) : null;
    const archiveLevel = corr.archiveLevel || 'department';
    const levelLabel = archiveLevel === 'directorate' ? 'Directorate' : archiveLevel === 'division' ? 'Division' : 'Department';

    return (
      <div className="group relative">
        <Link
          href={`/correspondence/${corr.id}`}
          className="block p-4 border border-border rounded-lg hover:bg-muted/50 hover:shadow-soft transition-all"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-muted"><FileArchive className="h-5 w-5 text-muted-foreground" /></div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <h4 className="font-semibold text-foreground truncate">{corr.subject}</h4>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant={getPriorityBadgeVariant(corr.priority)}>{corr.priority.toUpperCase()}</Badge>
                    <Badge variant="outline" className="gap-1">
                      {corr.direction === 'downward' ? (<><ArrowDown className="h-3 w-3 text-info" />Downward</>) : (<><ArrowUp className="h-3 w-3 text-success" />Upward</>)}
                    </Badge>
                    <Badge variant="secondary" className="gap-1 text-success bg-success/10">
                      <CheckCircle2 className="h-3 w-3" />{corr.status === 'archived' ? 'Archived' : 'Completed'}
                    </Badge>
                    <Badge variant="outline" className={archiveLevel === 'directorate' ? 'bg-primary/10 text-primary' : archiveLevel === 'division' ? 'bg-info/10 text-info' : ''}>
                      {levelLabel} Record
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateShort(corr.completedAt || corr.receivedDate)}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/correspondence/${corr.id}`} className="flex items-center">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.preventDefault();
                        window.open(`/correspondence/${corr.id}`, '_blank');
                      }}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in New Tab
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.preventDefault();
                        navigator.clipboard.writeText(corr.referenceNumber || '');
                        toast.success('Reference number copied to clipboard');
                      }}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Reference
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={(e) => {
                        e.preventDefault();
                        navigator.clipboard.writeText(window.location.origin + `/correspondence/${corr.id}`);
                        toast.success('Link copied to clipboard');
                      }}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><UserIcon className="h-3.5 w-3.5" /><span>From: {corr.senderName || 'Unknown'}</span></div>
                <div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" /><span>Ref: {corr.referenceNumber || 'N/A'}</span></div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>
                    {directorate?.name && `${directorate.name} → `}
                    {division?.name && `${division.name}`}
                    {department?.name && ` → ${department.name}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    );
  };

  if (!hydrated || !currentUser) {
    return (
      <ErrorBoundary>
        <DashboardLayout>
          <div className="container mx-auto p-6 space-y-6">
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading records…</CardContent></Card>
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
              <h1 className="text-3xl font-bold">Records & Archive</h1>
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
                <CardTitle className="text-lg">Archive Filters</CardTitle>
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

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by subject, reference, sender..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10"><Archive className="h-6 w-6 text-primary" /></div>
                <div><p className="text-sm text-muted-foreground">Total Records</p><p className="text-2xl font-semibold">{summary.total}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-secondary/50"><Calendar className="h-6 w-6 text-muted-foreground" /></div>
                <div><p className="text-sm text-muted-foreground">This Year</p><p className="text-2xl font-semibold">{summary.thisYear}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-success/10"><CheckCircle2 className="h-6 w-6 text-success" /></div>
                <div><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-semibold">{summary.completed}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-muted"><Archive className="h-6 w-6 text-muted-foreground" /></div>
                <div><p className="text-sm text-muted-foreground">Archived</p><p className="text-2xl font-semibold">{summary.archived}</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Records</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="ml-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {loading && !refreshing ? (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading records…</CardContent></Card>
        ) : records.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Archive className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground mb-2">{debouncedSearch || activeFilterCount > 0 ? 'No records match your filters' : 'No records found in your scope'}</p>
              {(debouncedSearch || activeFilterCount > 0) && <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4">Clear Filters</Button>}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
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

export default RecordsArchivePage;

