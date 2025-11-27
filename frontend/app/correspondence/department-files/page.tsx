"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import {
  Mail,
  Search,
  Building2,
  Layers,
  Filter,
  Loader2,
  Archive,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';
import type { Correspondence } from '@/lib/npa-structure';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const DEFAULT_PAGE_SIZE = 25;
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/v1\/?$/, '');

const buildDownloadUrl = (path?: string | null) => {
  if (!path) return undefined;
  if (path.startsWith('http')) {
    try {
      const url = new URL(path);
      if (url.pathname.startsWith('/api/media/')) {
        url.pathname = url.pathname.replace('/api/media/', '/media/');
        return url.toString();
      }
    } catch { }
    return path;
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const cleanedPath = normalized.replace(/^\/api\/media\//, '/media/');
  return `${API_BASE_URL}${cleanedPath}`;
};

const handleDownload = async (url: string, filename: string) => {
  try {
    const fixedUrl = url.replace(/\/api\/media\//, '/media/');
    const token = localStorage.getItem('npa_ecm_access_token');
    const response = await fetch(fixedUrl, {
      credentials: 'include',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Download error:', error);
    window.open(url.replace(/\/api\/media\//, '/media/'), '_blank');
  }
};

const DepartmentFilesPage = () => {
  const { currentUser } = useCurrentUser();
  const { officeMemberships, offices } = useOrganization();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [records, setRecords] = useState<Correspondence[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('all');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['completed', 'archived']);
  const [selectedDirections, setSelectedDirections] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [summary, setSummary] = useState({ total: 0, completed: 0, archived: 0, officeOwned: 0 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [goToPageInput, setGoToPageInput] = useState('');
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const userOfficeMemberships = useMemo(() => {
    if (!currentUser) return [];
    return officeMemberships.filter((membership) => membership.userId === currentUser.id && membership.isActive);
  }, [currentUser, officeMemberships]);

  const userOfficeIds = useMemo(() => userOfficeMemberships.map((membership) => membership.officeId), [userOfficeMemberships]);

  const selectableOffices = useMemo(() => {
    if (!userOfficeIds.length) return [];
    const idSet = new Set(userOfficeIds);
    return offices.filter((office) => idSet.has(office.id));
  }, [offices, userOfficeIds]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedOfficeId !== 'all') count++;
    if (selectedStatuses.length > 0 && !(selectedStatuses.length === 2 && selectedStatuses.includes('completed') && selectedStatuses.includes('archived'))) count++;
    if (selectedDirections.length > 0) count++;
    if (yearFilter !== 'all') count++;
    return count;
  }, [selectedOfficeId, selectedStatuses, selectedDirections, yearFilter]);

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) => prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]);
  };

  const toggleDirection = (direction: string) => {
    setSelectedDirections((prev) => prev.includes(direction) ? prev.filter((d) => d !== direction) : [...prev, direction]);
  };

  const clearAllFilters = () => {
    setSelectedOfficeId('all');
    setSelectedStatuses(['completed', 'archived']);
    setSelectedDirections([]);
    setYearFilter('all');
    setQuery('');
  };

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, selectedOfficeId, selectedStatuses, selectedDirections, yearFilter, pageSize]);

  useEffect(() => {
    let ignore = false;
    const fetchRecords = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
        if (debouncedQuery) params.append('search', debouncedQuery);
        if (selectedOfficeId !== 'all') params.append('office', selectedOfficeId);
        if (selectedStatuses.length > 0) selectedStatuses.forEach((s) => params.append('status', s));
        if (selectedDirections.length > 0) selectedDirections.forEach((d) => params.append('direction', d));
        if (yearFilter !== 'all') params.append('year', yearFilter);

        const response = await apiFetch<any>(`/correspondence/items/department-records/?${params.toString()}`);
        if (ignore) return;

        const results = Array.isArray(response.results) ? response.results : [];
        setRecords(results.map(mapApiCorrespondence));
        setCount(response.count ?? results.length);
        setSummary({
          total: response.summary?.total ?? response.count ?? results.length,
          completed: response.summary?.completed ?? 0,
          archived: response.summary?.archived ?? 0,
          officeOwned: response.summary?.office_owned ?? 0,
        });
        setAvailableYears(response.summary?.available_years ?? []);
      } catch (err) {
        if (!ignore) {
          setError('Unable to load department records. Please try again.');
          setRecords([]);
          setCount(0);
          setSummary({ total: 0, completed: 0, archived: 0, officeOwned: 0 });
          setAvailableYears([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchRecords();
    return () => { ignore = true; };
  }, [page, pageSize, debouncedQuery, selectedOfficeId, selectedStatuses, selectedDirections, yearFilter]);

  const pageCount = Math.max(1, Math.ceil(count / pageSize));

  const handleGoToPage = () => {
    const pageNum = parseInt(goToPageInput, 10);
    if (pageNum >= 1 && pageNum <= pageCount) {
      setPage(pageNum);
      setGoToPageInput('');
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Department Files & Records</h1>
            <p className="text-muted-foreground mt-1">Finalized correspondence for your department, division, or offices</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" /> Filters
              {activeFilterCount > 0 && <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>}
            </Button>
          </div>
        </div>

        <HelpGuideCard
          title="Department Records"
          description="Respond to audits, compile reports, and reuse templates by searching your completed/archived correspondence."
          links={[{ label: 'Correspondence Archive', href: '/correspondence/archived' }, { label: 'Help & Guides', href: '/help' }]}
        />

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Department Filters</CardTitle>
                {activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={clearAllFilters}>Clear All</Button>}
          </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {selectableOffices.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Office</Label>
              <Select value={selectedOfficeId} onValueChange={setSelectedOfficeId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                        <SelectItem value="all">All Offices</SelectItem>
                        {selectableOffices.map((office) => <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
                )}
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
                  <Label className="text-sm font-medium mb-2 block">Year</Label>
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {Array.from(new Set(availableYears)).sort((a, b) => b - a).map((year) => <SelectItem key={`year-${year}`} value={year.toString()}>{year}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search records by subject, reference, or participant..." className="pl-10" />
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Total Records', value: summary.total, icon: Layers, iconClass: 'text-primary' },
            { label: 'Completed', value: summary.completed, icon: Mail, iconClass: 'text-success' },
            { label: 'Archived', value: summary.archived, icon: Archive, iconClass: 'text-muted-foreground' },
            { label: 'Owned by Your Offices', value: summary.officeOwned, icon: Building2, iconClass: 'text-info' },
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
          <Card><CardContent className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading records…</CardContent></Card>
        ) : error ? (
          <Card><CardContent className="py-4 text-sm text-destructive">{error}</CardContent></Card>
        ) : records.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground text-sm">
              {debouncedQuery || activeFilterCount > 0 ? 'No departmental records match your filters.' : 'No departmental records found.'}
              {(debouncedQuery || activeFilterCount > 0) && <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4 block mx-auto">Clear Filters</Button>}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {records.map((item) => {
              const owningOffice = item.owningOfficeId ? offices.find((office) => office.id === item.owningOfficeId) : undefined;
              const completionPackageUrl = buildDownloadUrl(item.completionPackage?.fileUrl ?? null);

              return (
                <Link key={item.id} href={`/correspondence/${item.id}`} className="block border border-border rounded-lg p-4 hover:bg-muted/50 hover:shadow-soft transition-all">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground truncate">{item.subject}</h3>
                    <Badge variant={item.status === 'archived' ? 'secondary' : 'outline'}>{item.status}</Badge>
        </div>
                  <p className="text-xs text-muted-foreground mt-1">Ref: {item.referenceNumber || '—'} • Completed: {item.completedAt ? formatDateShort(item.completedAt) : '—'}</p>
                  <p className="text-xs text-muted-foreground">Received: {item.receivedDate ? formatDateShort(item.receivedDate) : '—'}</p>
                  {item.completionPackage && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">Completion package</Badge>
                      <span>Generated {item.completionPackage.generatedAt ? formatDateShort(item.completionPackage.generatedAt) : 'recently'}</span>
                      {completionPackageUrl && (
                        <Button variant="secondary" size="sm" className="text-xs h-7 px-3" onClick={(event) => { event.preventDefault(); event.stopPropagation(); const filename = `completion-package-${item.referenceNumber || item.id}.pdf`; handleDownload(completionPackageUrl, filename); }}>
                          <FileText className="h-3.5 w-3.5 mr-1" />Download PDF
              </Button>
                      )}
                    </div>
                  )}
                  {owningOffice && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Building2 className="h-3.5 w-3.5" />{owningOffice.name}</p>}
                </Link>
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

export default DepartmentFilesPage;
