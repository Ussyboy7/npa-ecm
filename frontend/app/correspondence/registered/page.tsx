"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, Clock, CheckCircle2 } from "lucide-react";
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mapApiCorrespondence } from '@/lib/api/correspondence-mappers';
import { useOrganization } from "@/contexts/OrganizationContext";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { apiFetch } from "@/lib/api-client";
import { formatDateShort } from "@/lib/correspondence-helpers";
import { PRIORITY_VALUES } from "@/lib/constants";
import type { Correspondence } from "@/lib/npa-structure";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { ErrorState } from "@/components/shared/ErrorState";
import { cn } from "@/lib/utils";
import {
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from "@/components/shared/registry-queue-styles";

const statusFilters = ["all", "pending", "in-progress", "completed", "archived"] as const;
const priorityFilters = ["all", ...PRIORITY_VALUES] as const;

type StatusFilter = (typeof statusFilters)[number];
type PriorityFilter = (typeof priorityFilters)[number];

const getStatusBadgeClass = (status: Correspondence["status"]) => {
  switch (status) {
    case "pending":
      return "bg-warning/10 text-warning";
    case "in-progress":
      return "bg-info/10 text-info";
    case "completed":
      return "bg-success/10 text-success";
    case "archived":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-foreground";
  }
};

const RegisteredCorrespondencePage = () => {
  const {currentUser, hydrated: _hydrated } = useCurrentUser();
  const permissions = useUserPermissions(currentUser ?? undefined);
  const { users, divisions } = useOrganization();
  const [items, setItems] = useState<Correspondence[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("received_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Use pagination hook
  const pagination = usePagination({
    initialPage: 1,
    totalCount: count,
  });

  const hasActiveFilters = useMemo(
    () => dateFrom || dateTo || statusFilter !== 'all' || priorityFilter !== 'all',
    [dateFrom, dateTo, statusFilter, priorityFilter]
  );

  const clearFilters = useCallback(() => {
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setSearchQuery("");
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Server-side data loading
  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sortPrefix = sortOrder === 'desc' ? '-' : '';
      const params = new URLSearchParams({
        page: String(pagination.page),
        page_size: String(pagination.pageSize),
        ordering: `${sortPrefix}${sortBy}`,
      });
      
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (priorityFilter !== 'all') {
        params.append('priority', priorityFilter);
      }
      if (dateFrom) {
        params.append('received_date_from', dateFrom);
      }
      if (dateTo) {
        params.append('received_date_to', dateTo);
      }
      
      const response = await apiFetch<Record<string, unknown>>(
        `/correspondence/items/?${params.toString()}`
      );
      const results = Array.isArray(response.results) ? response.results : [];
      setItems(results.map(mapApiCorrespondence));
      setCount(typeof response.count === 'number' ? response.count : results.length);
    } catch (_error) {
      setError("Failed to load registered correspondence. Please try again.");
      setItems([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, debouncedSearch, statusFilter, priorityFilter, dateFrom, dateTo, sortBy, sortOrder]);

  // Load data when filters or pagination change
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Reset page when filters change
  useEffect(() => {
    pagination.goToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, priorityFilter, dateFrom, dateTo, sortBy, sortOrder]);

  const canViewRegistry = permissions.canViewCorrespondenceRegistry;

  // Server-side: use items directly from API
  const paginatedCorrespondence = items;

  if (!currentUser) {
    return null;
  }

  return (
    <>
      {!canViewRegistry ? (
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Registered Correspondence</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                You do not have permission to view the correspondence registry. Executive access is
                available from Assistant General Manager grade and above. If you believe this is an
                error, please contact the ECM administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="p-6 space-y-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Registered Correspondence</h1>
              <p className="text-muted-foreground max-w-2xl">
                Executive registry of all inbound correspondence captured by the ECM. Use search and
                filters to audit registrations across directorates and support handovers when an
                office changes leadership.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards — global total only; per-status breakdown would need global counts, not page slice */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Registered", value: count, icon: FileText, bgClass: "bg-primary/10", iconClass: "text-primary" },
            ].map(({ label, value, icon: Icon, bgClass, iconClass }) => (
            <Card key={label} aria-label={label}>
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

        {/* Filter bar */}
        <Card>
          <CardContent className="p-2">
            <div className="md:hidden mb-2">
              <Button variant="outline" size="sm" onClick={() => setFiltersOpen(!filtersOpen)} className="w-full justify-between">
                <span className="flex items-center"><Search className="h-3.5 w-3.5 mr-2" /> Filters</span>
                {hasActiveFilters && <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">{hasActiveFilters ? 1 : 0}</span>}
              </Button>
            </div>
            <div className={`flex-wrap items-center gap-2${filtersOpen ? ' flex' : ' hidden'} md:flex`}>
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by subject, reference..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 pl-8 text-xs" aria-label="Search correspondence" />
            </div>
            <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value as StatusFilter); pagination.goToFirstPage(); }}>
              <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Filter by status"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {statusFilters.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "all" ? "All statuses" : status.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(value) => { setPriorityFilter(value as PriorityFilter); pagination.goToFirstPage(); }}>
              <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Filter by priority"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                {priorityFilters.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority === "all" ? "All priorities" : priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => { const [by, order] = value.split('-'); setSortBy(by); setSortOrder(order as 'asc' | 'desc'); }}>
              <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Sort by"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="received_date-desc">Newest First</SelectItem>
                <SelectItem value="received_date-asc">Oldest First</SelectItem>
                <SelectItem value="updated_at-desc">Last Updated</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">Clear</Button>}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <div aria-live="polite">
          {error ? (
            <ErrorState message={error} variant="inline" />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="hidden md:block overflow-x-auto">
                  <Table className="table-fixed" role="table" aria-label="Registered correspondence">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[16%]">Reference</TableHead>
                        <TableHead className="w-[30%]">Subject</TableHead>
                        <TableHead className="w-[17%] hidden lg:table-cell">Division</TableHead>
                        <TableHead className="w-[15%] hidden lg:table-cell">Registered By</TableHead>
                        <TableHead className="w-[12%]">Status</TableHead>
                        <TableHead className="w-[10%]">Received</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Loading registered correspondence...
                        </TableCell>
                      </TableRow>
                    ) : paginatedCorrespondence.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No correspondence matches the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedCorrespondence.map((item) => {
                        const division = item.divisionId
                          ? divisions.find((d) => d.id === item.divisionId)
                          : undefined;
                        const registeredBy = item.createdById
                          ? users.find((user) => user.id === item.createdById)
                          : undefined;
                        const registeredByName = registeredBy?.name ?? item.createdByName ?? '—';

                        const urgency = item.priority === 'urgent' || item.priority === 'high';

                        return (
                          <TableRow key={item.id as string} className="hover:bg-muted/50">
                            <TableCell className="truncate">
                              <div className="flex items-center gap-1.5">
                                <Link
                                  href={`/correspondence/${item.id as string}`}
                                  className="text-primary hover:underline font-medium text-sm truncate"
                                >
                                  {item.referenceNumber}
                                </Link>
                                {urgency && (
                                  <span className="h-2 w-2 rounded-full bg-destructive shrink-0" title={`${item.priority} priority`} />
                                )}
                                {item.hasPhysicalCopy && (
                                  <FileText className="h-3 w-3 text-muted-foreground shrink-0" aria-label="Physical copy exists" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="truncate text-sm" title={item.subject}>
                                {item.subject}
                              </p>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                              <span className="truncate block" title={division?.name}>{division?.name ?? "—"}</span>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground truncate">
                              {registeredByName}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("font-normal", getStatusBadgeClass(item.status as 'pending' | 'in-progress' | 'completed' | 'archived'))}>
                                {(item.status as string).replace("-", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDateShort(item.receivedDate)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                </div>

                {/* Mobile cards */}
                {!loading && paginatedCorrespondence.length > 0 && (
                  <div className="md:hidden divide-y divide-border">
                    {paginatedCorrespondence.map((item) => {
                      const division = item.divisionId
                        ? divisions.find((d) => d.id === item.divisionId)
                        : undefined;
                      const registeredBy = item.createdById
                        ? users.find((user) => user.id === item.createdById)
                        : undefined;
                      const registeredByName = registeredBy?.name ?? item.createdByName ?? '—';
                      const urgency = item.priority === 'urgent' || item.priority === 'high';

                      return (
                        <Link
                          key={item.id as string}
                          href={`/correspondence/${item.id as string}`}
                          className="block p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-primary font-medium text-sm truncate">
                                {item.referenceNumber}
                              </span>
                              {urgency && (
                                <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                              )}
                              {item.hasPhysicalCopy && (
                                <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                              )}
                            </div>
                            <Badge variant="outline" className={cn("font-normal shrink-0", getStatusBadgeClass(item.status as 'pending' | 'in-progress' | 'completed' | 'archived'))}>
                              {(item.status as string).replace("-", " ")}
                            </Badge>
                          </div>
                          <p className="text-sm mt-1 line-clamp-2">{item.subject}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
                            {division?.name && <span>{division.name}</span>}
                            <span>By: {registeredByName}</span>
                            <span>{formatDateShort(item.receivedDate)}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
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
      </div>
      )}
    </>
  );
};

export default RegisteredCorrespondencePage;
