"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import {
  Mail,
  Search,
  Building2,
  Layers,
  Filter,
  Loader2,
  ArrowDown,
  ArrowUp,
  Archive,
  FileText,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';
import type { Correspondence } from '@/lib/npa-structure';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 25;
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/v1\/?$/, '');
const buildDownloadUrl = (path?: string | null) => {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
};

const DepartmentFilesPage = () => {
  const { currentUser } = useCurrentUser();
  const { officeMemberships, offices } = useOrganization();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [records, setRecords] = useState<Correspondence[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    completed: 0,
    archived: 0,
    officeOwned: 0,
  });
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userOfficeMemberships = useMemo(() => {
    if (!currentUser) return [];
    return officeMemberships.filter(
      (membership) => membership.userId === currentUser.id && membership.isActive,
    );
  }, [currentUser, officeMemberships]);

  const userOfficeIds = useMemo(
    () => userOfficeMemberships.map((membership) => membership.officeId),
    [userOfficeMemberships],
  );

  const selectableOffices = useMemo(() => {
    if (!userOfficeIds.length) return [];
    const idSet = new Set(userOfficeIds);
    return offices.filter((office) => idSet.has(office.id));
  }, [offices, userOfficeIds]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, selectedOfficeId, statusFilter, directionFilter, yearFilter]);

  useEffect(() => {
    let ignore = false;
    const fetchRecords = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(PAGE_SIZE),
        });
        if (debouncedQuery) params.append('search', debouncedQuery);
        if (selectedOfficeId !== 'all') params.append('office', selectedOfficeId);
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (directionFilter !== 'all') params.append('direction', directionFilter);
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
    return () => {
      ignore = true;
    };
  }, [page, debouncedQuery, selectedOfficeId, statusFilter, directionFilter, yearFilter]);

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const renderRecords = () => {
    if (loading) {
      return (
        <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading records…
        </div>
      );
    }

    if (error) {
      return <div className="py-4 text-sm text-destructive">{error}</div>;
    }

    if (records.length === 0) {
      return <div className="text-center py-12 text-muted-foreground text-sm">No departmental records match your filters.</div>;
    }

    return records.map((item) => {
      const owningOffice = item.owningOfficeId
        ? offices.find((office) => office.id === item.owningOfficeId)
        : undefined;
      const completionPackageUrl = buildDownloadUrl(item.completionPackage?.fileUrl ?? null);

      return (
        <Link
          key={item.id}
          href={`/correspondence/${item.id}`}
          className="block border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-foreground truncate">{item.subject}</h3>
            <Badge variant={item.status === 'archived' ? 'secondary' : 'outline'}>{item.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Ref: {item.referenceNumber || '—'} • Completed:{' '}
            {item.completedAt ? formatDateShort(item.completedAt) : '—'}
          </p>
          <p className="text-xs text-muted-foreground">
            Received: {item.receivedDate ? formatDateShort(item.receivedDate) : '—'}
          </p>
          {item.completionPackage && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Completion package</Badge>
              <span>
                Generated{' '}
                {item.completionPackage.generatedAt
                  ? formatDateShort(item.completionPackage.generatedAt)
                  : 'recently'}
              </span>
              {completionPackageUrl && (
                <Button
                  variant="secondary"
                  size="sm"
                  asChild
                  className="text-xs h-7 px-3"
                  onClick={(event) => event.stopPropagation()}
                >
                  <a
                    href={completionPackageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Download PDF
                  </a>
                </Button>
              )}
            </div>
          )}
          {owningOffice && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Building2 className="h-3.5 w-3.5" />
              {owningOffice.name}
            </p>
          )}
        </Link>
      );
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Layers className="h-7 w-7 text-primary" />
            Department Files & Records
          </h1>
          <p className="text-muted-foreground">
            Finalized correspondence for your department, division, or offices.
          </p>
        </div>

        <HelpGuideCard
          title="Department Records"
          description="Respond to audits, compile reports, and reuse templates by searching your completed/archived correspondence."
          links={[
            { label: 'Correspondence Archive', href: '/correspondence/archived' },
            { label: 'Help & Guides', href: '/help' },
          ]}
        />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="relative max-w-xl w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search records by subject, reference, or participant..."
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            {selectableOffices.length > 0 && (
              <Select value={selectedOfficeId} onValueChange={setSelectedOfficeId}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Office" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All offices</SelectItem>
                  {selectableOffices.map((office) => (
                    <SelectItem key={office.id} value={office.id}>
                      {office.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All directions</SelectItem>
                <SelectItem value="downward">Downward</SelectItem>
                <SelectItem value="upward">Upward</SelectItem>
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[120px]">
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
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total records</p>
                  <p className="text-2xl font-bold">{summary.total}</p>
                </div>
                <Layers className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{summary.completed}</p>
                </div>
                <Mail className="h-8 w-8 text-success opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Archived</p>
                  <p className="text-2xl font-bold">{summary.archived}</p>
                </div>
                <Archive className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Owned by your offices</p>
                  <p className="text-2xl font-bold">{summary.officeOwned}</p>
                </div>
                <Building2 className="h-8 w-8 text-info opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Mail className="h-5 w-5 text-primary" />
              {records.length} result{records.length === 1 ? '' : 's'} on this page
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">{renderRecords()}</CardContent>
        </Card>

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

export default DepartmentFilesPage;


