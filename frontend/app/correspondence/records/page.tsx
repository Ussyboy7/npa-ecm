"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Filter,
  Loader2,
  Building2,
  Layers,
  FolderTree,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Correspondence } from '@/lib/npa-structure';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { useCurrentUser } from '@/hooks/use-current-user';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';

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
  const { currentUser, hydrated } = useCurrentUser();
  const { directorates, divisions, departments, offices, officeMemberships } = useOrganization();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDirectorate, setSelectedDirectorate] = useState<string>('all');
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedDirections, setSelectedDirections] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('completed');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Data
  const [records, setRecords] = useState<Correspondence[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    byDirectorate: 0,
    byDivision: 0,
    byDepartment: 0,
    thisYear: 0,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [goToPageInput, setGoToPageInput] = useState('');
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (yearFilter !== 'all') count++;
    if (selectedPriorities.length > 0) count++;
    if (selectedDirections.length > 0) count++;
    return count;
  }, [selectedDirectorate, selectedDivision, selectedDepartment, yearFilter, selectedPriorities, selectedDirections]);

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
    setSelectedPriorities([]);
    setSelectedDirections([]);
  };

  // Debounced search
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedDirectorate, selectedDivision, selectedDepartment, yearFilter, selectedPriorities, selectedDirections, sortBy, sortOrder, pageSize]);

  // Fetch records
  useEffect(() => {
    if (!hydrated || !currentUser) return;

    let ignore = false;
    const fetchRecords = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
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
        if (selectedPriorities.length > 0) {
          selectedPriorities.forEach((p) => params.append('priority', p));
        }
        if (selectedDirections.length > 0) {
          selectedDirections.forEach((d) => params.append('direction', d));
        }
        params.append('sort_by', sortBy);
        params.append('sort_order', sortOrder);
        params.append('status', 'completed');
        params.append('status', 'archived');

        const response = await apiFetch<any>(`/correspondence/items/records-archive/?${params.toString()}`);
        if (ignore) return;

        const results = Array.isArray(response.results) ? response.results : [];
        setRecords(results.map(mapApiCorrespondence));
        setCount(response.count ?? results.length);
        setSummary({
          total: response.summary?.total ?? response.count ?? results.length,
          byDirectorate: response.summary?.by_directorate ?? 0,
          byDivision: response.summary?.by_division ?? 0,
          byDepartment: response.summary?.by_department ?? 0,
          thisYear: response.summary?.this_year ?? 0,
        });
        setAvailableYears(response.summary?.available_years ?? []);
      } catch (err) {
        if (!ignore) {
          setError('Unable to load records. Please try again.');
          setRecords([]);
          setCount(0);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchRecords();
    return () => { ignore = true; };
  }, [hydrated, currentUser, page, pageSize, debouncedSearch, selectedDirectorate, selectedDivision, selectedDepartment, yearFilter, selectedPriorities, selectedDirections, sortBy, sortOrder, userScope]);

  const pageCount = Math.max(1, Math.ceil(count / pageSize));

  const handleGoToPage = () => {
    const pageNum = parseInt(goToPageInput, 10);
    if (pageNum >= 1 && pageNum <= pageCount) {
      setPage(pageNum);
      setGoToPageInput('');
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

  if (!hydrated || !currentUser) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading records…</CardContent></Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
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
            <Badge variant="secondary" className="text-lg px-4 py-2">{summary.total} records</Badge>
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
          {userScope.level === 'directorate' && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-info/10"><FolderTree className="h-6 w-6 text-info" /></div>
                  <div><p className="text-sm text-muted-foreground">Directorates</p><p className="text-2xl font-semibold">{visibleDirectorates.length}</p></div>
                </div>
              </CardContent>
            </Card>
          )}
          {(userScope.level === 'directorate' || userScope.level === 'division') && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-success/10"><Layers className="h-6 w-6 text-success" /></div>
                  <div><p className="text-sm text-muted-foreground">Divisions</p><p className="text-2xl font-semibold">{visibleDivisions.length}</p></div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-warning/10"><Building2 className="h-6 w-6 text-warning" /></div>
                <div><p className="text-sm text-muted-foreground">Departments</p><p className="text-2xl font-semibold">{visibleDepartments.length}</p></div>
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
        </div>

        {/* Error */}
        {error && <Card><CardContent className="py-4 text-sm text-destructive">{error}</CardContent></Card>}

        {/* Loading */}
        {loading ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading records...</CardContent></Card>
        ) : records.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Archive className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-2">{debouncedSearch || activeFilterCount > 0 ? 'No records match your filters' : 'No records found in your scope'}</p>
              {(debouncedSearch || activeFilterCount > 0) && <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4">Clear Filters</Button>}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {records.map((corr) => {
              const division = corr.divisionId ? divisions.find((item) => item.id === corr.divisionId) : null;
              const department = corr.departmentId ? departments.find((item) => item.id === corr.departmentId) : null;
              const directorate = corr.directorateId ? directorates.find((item) => item.id === corr.directorateId) : null;
              const archiveLevel = corr.archiveLevel || 'department';
              const levelLabel = archiveLevel === 'directorate' ? 'Directorate' : archiveLevel === 'division' ? 'Division' : 'Department';

              return (
                <Link
                  key={corr.id}
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
                            <Badge variant="outline">{levelLabel} Record</Badge>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateShort(corr.completedAt || corr.receivedDate)}</span>
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
              );
            })}
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {count === 0 ? 0 : `${(page - 1) * pageSize + 1}-${Math.min(count, (page - 1) * pageSize + records.length)}`} of {count} records
            </p>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Per page:</label>
              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1 || loading}>
              <ChevronLeft className="h-4 w-4" />Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                let pageNum: number;
                if (pageCount <= 5) pageNum = i + 1;
                else if (page <= 3) pageNum = i + 1;
                else if (page >= pageCount - 2) pageNum = pageCount - 4 + i;
                else pageNum = page - 2 + i;
                if (pageNum > pageCount) return null;
                return (
                  <Button key={pageNum} variant={page === pageNum ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setPage(pageNum)} disabled={loading}>
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            {pageCount > 5 && (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={pageCount}
                  value={goToPageInput}
                  onChange={(e) => setGoToPageInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleGoToPage(); }}
                  placeholder="Page"
                  className="w-16 h-8 text-xs"
                />
                <Button variant="outline" size="sm" className="h-8" onClick={handleGoToPage} disabled={loading}>Go</Button>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))} disabled={page >= pageCount || loading}>
              Next<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RecordsArchivePage;

