"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Correspondence } from '@/lib/npa-structure';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';

type DirectionFilter = 'all' | 'downward' | 'upward';

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
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [archiveLevelFilter, setArchiveLevelFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    downward: 0,
    upward: 0,
    thisYear: 0,
  });
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const archiveLevelOptions = useMemo(() => {
    const allowedLevels = permissions.allowedArchiveLevels ?? [];
    const labels: Record<string, string> = {
      department: 'Department',
      division: 'Division',
      directorate: 'Directorate',
    };
    return [
      { value: 'all', label: 'All levels' },
      ...allowedLevels.map((level) => ({
        value: level,
        label: labels[level] ?? level,
      })),
    ];
  }, [permissions.allowedArchiveLevels]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, yearFilter, priorityFilter, archiveLevelFilter, directionFilter]);

  useEffect(() => {
    let ignore = false;
    const fetchArchive = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(PAGE_SIZE),
        });
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (yearFilter !== 'all') params.append('year', yearFilter);
        if (priorityFilter !== 'all') params.append('priority', priorityFilter);
        if (archiveLevelFilter !== 'all') params.append('archive_level', archiveLevelFilter);
        if (directionFilter !== 'all') params.append('direction', directionFilter);

        const response = await apiFetch<any>(`/correspondence/items/archive-records/?${params.toString()}`);
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
    return () => {
      ignore = true;
    };
  }, [page, debouncedSearch, yearFilter, priorityFilter, archiveLevelFilter, directionFilter]);

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const renderRecords = () => {
    if (loading) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading archived correspondence…
          </CardContent>
        </Card>
      );
    }

    if (error) {
      return (
        <Card>
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      );
    }

    if (records.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <Archive className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No archived correspondence found</p>
            <p className="text-sm text-muted-foreground mt-1">Adjust your filters to broaden the search.</p>
          </CardContent>
        </Card>
      );
    }

    return records.map((corr) => {
      const division = corr.divisionId ? divisions.find((item) => item.id === corr.divisionId) : null;
      const department = corr.departmentId ? departments.find((item) => item.id === corr.departmentId) : null;
      const archiveLevel = corr.archiveLevel || 'department';
      const levelLabel =
        archiveLevel === 'directorate'
          ? 'Directorate Archive'
          : archiveLevel === 'division'
            ? 'Division Archive'
            : 'Department Archive';

      return (
        <div
          key={corr.id}
          onClick={() => router.push(`/correspondence/${corr.id}`)}
          className="p-4 border border-border rounded-lg hover:bg-muted/50 hover:shadow-soft transition-all cursor-pointer"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <FileArchive className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <h4 className="font-semibold text-foreground truncate">{corr.subject}</h4>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant={getPriorityBadgeVariant(corr.priority)}>
                      {corr.priority.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      {corr.direction === 'downward' ? (
                        <>
                          <ArrowDown className="h-3 w-3 text-info" />
                          Downward
                        </>
                      ) : (
                        <>
                          <ArrowUp className="h-3 w-3 text-success" />
                          Upward
                        </>
                      )}
                    </Badge>
                    <Badge variant="secondary" className="gap-1 text-success bg-success/10">
                      <CheckCircle2 className="h-3 w-3" />
                      {corr.status === 'archived' ? 'Archived' : 'Completed'}
                    </Badge>
                    <Badge variant="outline">{levelLabel}</Badge>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDateShort(corr.receivedDate)}
                </span>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-3.5 w-3.5" />
                  <span>From: {corr.senderName || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileArchive className="h-3.5 w-3.5" />
                  <span>Ref: {corr.referenceNumber || 'N/A'}</span>
                </div>
                {division && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {division.name}
                      {department && ` • ${department.name}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  if (!currentUser) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Archive className="h-8 w-8 text-muted-foreground" />
              Archived Correspondence
            </h1>
            <p className="text-muted-foreground mt-1">
              View completed/archived correspondence scoped to your archive access tier.
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {summary.total} records
          </Badge>
        </div>

        <HelpGuideCard
          title="Work with Archived Records"
          description="Use search, archive level, year, and direction filters to locate historical correspondence quickly."
          links={[
            { label: 'Archive Policy', href: '/help#archive-policy' },
            { label: 'Help & Guides', href: '/help' },
          ]}
        />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="relative max-w-xl w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by subject, reference number, or sender..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <Select value={archiveLevelFilter} onValueChange={setArchiveLevelFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Archive level" />
              </SelectTrigger>
              <SelectContent>
                {archiveLevelOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total archived</p>
                  <p className="text-2xl font-bold">{summary.total}</p>
                </div>
                <Archive className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Downward</p>
                  <p className="text-2xl font-bold">{summary.downward}</p>
                </div>
                <ArrowDown className="h-8 w-8 text-info opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Upward</p>
                  <p className="text-2xl font-bold">{summary.upward}</p>
                </div>
                <ArrowUp className="h-8 w-8 text-success opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">This year</p>
                  <p className="text-2xl font-bold">{summary.thisYear}</p>
                </div>
                <Calendar className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={directionFilter} onValueChange={(value) => setDirectionFilter(value as DirectionFilter)} className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="downward">Downward</TabsTrigger>
            <TabsTrigger value="upward">Upward</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="space-y-3">
            {renderRecords()}
          </TabsContent>
          <TabsContent value="downward" className="space-y-3">
            {renderRecords()}
          </TabsContent>
          <TabsContent value="upward" className="space-y-3">
            {renderRecords()}
          </TabsContent>
        </Tabs>

        {pageCount > 1 && !loading && !error && (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing page {page} of {pageCount} ({count} total)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
                Previous
              </Button>
              <Button variant="outline" onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))} disabled={page === pageCount}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ArchivedCorrespondence;

