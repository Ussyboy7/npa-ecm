"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Correspondence } from '@/lib/npa-structure';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

const PAGE_SIZE = 25;

const ArchivedCorrespondence = () => {
  const router = useRouter();
  const { divisions, departments } = useOrganization();
  const { currentUser } = useCurrentUser();
  const permissions = useUserPermissions(currentUser ?? undefined);

  const [records, setRecords] = useState<Correspondence[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['completed', 'archived']);
  const [archiveLevelFilter, setArchiveLevelFilter] = useState<string>('all');
  const [selectedDirections, setSelectedDirections] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('received');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [receivedFrom, setReceivedFrom] = useState<string>('');
  const [receivedTo, setReceivedTo] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [summary, setSummary] = useState({ total: 0, downward: 0, upward: 0, thisYear: 0 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [goToPageInput, setGoToPageInput] = useState('');
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const archiveLevelOptions = useMemo(() => {
    const allowedLevels = permissions.allowedArchiveLevels ?? [];
    const labels: Record<string, string> = { department: 'Department', division: 'Division', directorate: 'Directorate' };
    return [{ value: 'all', label: 'All Levels' }, ...allowedLevels.map((level) => ({ value: level, label: labels[level] ?? level }))];
  }, [permissions.allowedArchiveLevels]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (yearFilter !== 'all') count++;
    if (selectedPriorities.length > 0) count++;
    if (selectedStatuses.length > 0 && !(selectedStatuses.length === 2 && selectedStatuses.includes('completed') && selectedStatuses.includes('archived'))) count++;
    if (archiveLevelFilter !== 'all') count++;
    if (selectedDirections.length > 0) count++;
    if (receivedFrom) count++;
    if (receivedTo) count++;
    return count;
  }, [yearFilter, selectedPriorities, selectedStatuses, archiveLevelFilter, selectedDirections, receivedFrom, receivedTo]);

  const togglePriority = (priority: string) => {
    setSelectedPriorities((prev) => prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]);
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) => prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]);
  };

  const toggleDirection = (direction: string) => {
    setSelectedDirections((prev) => prev.includes(direction) ? prev.filter((d) => d !== direction) : [...prev, direction]);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setYearFilter('all');
    setSelectedPriorities([]);
    setSelectedStatuses(['completed', 'archived']);
    setArchiveLevelFilter('all');
    setSelectedDirections([]);
    setReceivedFrom('');
    setReceivedTo('');
  };

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, yearFilter, selectedPriorities, selectedStatuses, archiveLevelFilter, selectedDirections, sortBy, sortOrder, receivedFrom, receivedTo, pageSize]);

  useEffect(() => {
    let ignore = false;
    const fetchArchive = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (yearFilter !== 'all') params.append('year', yearFilter);
        if (selectedPriorities.length > 0) selectedPriorities.forEach((p) => params.append('priority', p));
        if (selectedStatuses.length > 0) selectedStatuses.forEach((s) => params.append('status', s));
        if (archiveLevelFilter !== 'all') params.append('archive_level', archiveLevelFilter);
        if (selectedDirections.length > 0) selectedDirections.forEach((d) => params.append('direction', d));
        if (receivedFrom) params.append('from_date', receivedFrom);
        if (receivedTo) params.append('to_date', receivedTo);
        params.append('sort_by', sortBy);
        params.append('sort_order', sortOrder);

        const response = await apiFetch<Record<string, unknown>>(`/correspondence/items/archive-records/?${params.toString()}`);
        if (ignore) return;

        const results = Array.isArray(response.results) ? response.results : [];
        setRecords(results.map(mapApiCorrespondence));
        setCount(response.count ?? results.length);
        setSummary({
          total: response.summary?.total ?? response.count ?? results.length,
          downward: response.summary?.downward ?? 0,
          upward: response.summary?.upward ?? 0,
          thisYear: response.summary?.this_year ?? 0,
        });
        setAvailableYears(response.summary?.available_years ?? []);
      } catch {
        if (!ignore) {
          setError('Unable to load archived correspondence. Please try again.');
          setRecords([]);
          setCount(0);
          setSummary({ total: 0, downward: 0, upward: 0, thisYear: 0 });
          setAvailableYears([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchArchive();
    return () => { ignore = true; };
  }, [page, pageSize, debouncedSearch, yearFilter, selectedPriorities, selectedStatuses, archiveLevelFilter, selectedDirections, sortBy, sortOrder, receivedFrom, receivedTo]);

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

  if (!currentUser) return null;

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Archived Correspondence</h1>
            <p className="text-muted-foreground mt-1">View completed/archived correspondence scoped to your archive access tier</p>
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
          title="Work with Archived Records"
          description="Use search, archive level, year, and direction filters to locate historical correspondence quickly."
          links={[{ label: 'Archive Policy', href: '/help#archive-policy' }, { label: 'Help & Guides', href: '/help' }]}
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
                <div>
                  <Label className="text-sm font-medium mb-2 block">Archive Level</Label>
                  <Select value={archiveLevelFilter} onValueChange={setArchiveLevelFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {archiveLevelOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Year</Label>
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {Array.from(new Set(availableYears)).sort((a, b) => b - a).map((year) => <SelectItem key={`year-${year}`} value={year.toString()}>{year}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Status</Label>
                  <div className="flex flex-wrap gap-1">
                    {['completed', 'archived'].map((status) => (
                      <Badge key={status} variant={selectedStatuses.includes(status) ? 'default' : 'outline'} className="cursor-pointer capitalize text-xs" onClick={() => toggleStatus(status)}>
                        {status}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Priority</Label>
                  <div className="flex flex-wrap gap-1">
                    {['urgent', 'high', 'medium', 'low'].map((priority) => (
                      <Badge key={priority} variant={selectedPriorities.includes(priority) ? 'default' : 'outline'} className="cursor-pointer capitalize text-xs" onClick={() => togglePriority(priority)} style={selectedPriorities.includes(priority) ? { backgroundColor: PRIORITY_COLORS[priority] } : {}}>
                        {priority}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Direction</Label>
                  <div className="flex flex-wrap gap-1">
                    {['downward', 'upward'].map((direction) => (
                      <Badge key={direction} variant={selectedDirections.includes(direction) ? 'default' : 'outline'} className="cursor-pointer capitalize text-xs" onClick={() => toggleDirection(direction)}>
                        {direction === 'downward' ? '↓' : '↑'} {direction}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Sort By</Label>
                  <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => { const [by, order] = value.split('-'); setSortBy(by); setSortOrder(order as 'asc' | 'desc'); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="received-desc">Received (Newest)</SelectItem>
                      <SelectItem value="received-asc">Received (Oldest)</SelectItem>
                      <SelectItem value="completed-desc">Completed (Newest)</SelectItem>
                      <SelectItem value="priority-desc">Priority (Urgent First)</SelectItem>
                      <SelectItem value="subject-asc">Subject (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Received From</Label>
                  <Input type="date" value={receivedFrom} onChange={(e) => setReceivedFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Received To</Label>
                  <Input type="date" value={receivedTo} onChange={(e) => setReceivedTo(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by subject, reference, sender..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Total Archived', value: summary.total, icon: Archive, iconClass: 'text-muted-foreground' },
            { label: 'Downward', value: summary.downward, icon: ArrowDown, iconClass: 'text-info' },
            { label: 'Upward', value: summary.upward, icon: ArrowUp, iconClass: 'text-success' },
            { label: 'This Year', value: summary.thisYear, icon: Calendar, iconClass: 'text-primary' },
          ].map(({ label, value, icon: Icon, iconClass }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>
                  <Icon className={`h-8 w-8 opacity-50 ${iconClass}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {loading ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading archived records...</CardContent></Card>
        ) : error ? (
          <Card><CardContent className="py-4 text-sm text-destructive">{error}</CardContent></Card>
        ) : records.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Archive className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-2">{debouncedSearch || activeFilterCount > 0 ? 'No archived records match your filters' : 'No archived records found'}</p>
              {(debouncedSearch || activeFilterCount > 0) && <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4">Clear Filters</Button>}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {records.map((corr) => {
              const division = corr.divisionId ? divisions.find((item) => item.id === corr.divisionId) : null;
              const department = corr.departmentId ? departments.find((item) => item.id === corr.departmentId) : null;
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
        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">Showing {count === 0 ? 0 : `${(page - 1) * pageSize + 1}-${Math.min(count, (page - 1) * pageSize + records.length)}`} of {count} records</p>
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
            <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1 || loading}><ChevronLeft className="h-4 w-4" />Previous</Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                let pageNum: number;
                if (pageCount <= 5) pageNum = i + 1;
                else if (page <= 3) pageNum = i + 1;
                else if (page >= pageCount - 2) pageNum = pageCount - 4 + i;
                else pageNum = page - 2 + i;
                if (pageNum > pageCount) return null;
                return <Button key={pageNum} variant={page === pageNum ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setPage(pageNum)} disabled={loading}>{pageNum}</Button>;
              })}
            </div>
            {pageCount > 5 && (
              <div className="flex items-center gap-1">
                <Input type="number" min={1} max={pageCount} value={goToPageInput} onChange={(e) => setGoToPageInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleGoToPage(); }} placeholder="Page" className="w-16 h-8 text-xs" />
                <Button variant="outline" size="sm" className="h-8" onClick={handleGoToPage} disabled={loading}>Go</Button>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))} disabled={page >= pageCount || loading}>Next<ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ArchivedCorrespondence;
