"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HelpGuideCard } from "@/components/help/HelpGuideCard";
import { mapApiCorrespondence } from "@/contexts/CorrespondenceContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { apiFetch } from "@/lib/api-client";
import { formatDateShort } from "@/lib/correspondence-helpers";
import { PRIORITY_VALUES } from "@/lib/constants";
import type { Correspondence } from "@/lib/npa-structure";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "@/components/shared/PaginationControls";

const DEFAULT_PAGE_SIZE = 25;

const statusFilters = ["all", "pending", "in-progress", "completed", "archived"] as const;
const priorityFilters = ["all", ...PRIORITY_VALUES] as const;

type StatusFilter = (typeof statusFilters)[number];
type PriorityFilter = (typeof priorityFilters)[number];

const getPriorityBadgeVariant = (priority: Correspondence["priority"]) => {
  switch (priority) {
    case "urgent":
      return "destructive" as const;
    case "high":
      return "default" as const;
    case "medium":
      return "secondary" as const;
    case "low":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
};

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
  const {users, divisions, departments: _departments } = useOrganization();
  const [items, setItems] = useState<Correspondence[]>([]);
  const [_loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

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
    initialPageSize: DEFAULT_PAGE_SIZE,
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
        params.append('date_from', dateFrom);
      }
      if (dateTo) {
        params.append('date_to', dateTo);
      }
      
      const response = await apiFetch<Record<string, unknown>>(
        `/correspondence/items/?${params.toString()}`
      );
      const results = Array.isArray(response.results) ? response.results : [];
      setItems(results.map(mapApiCorrespondence));
      setCount(typeof response.count === 'number' ? response.count : results.length);
    } catch (_error) {
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
    <DashboardLayout>
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

          <HelpGuideCard
            title="Executive Correspondence Registry"
            description="Review every correspondence entry captured by registry officers. Track who registered it, the receiving division, and the current workflow owner."
            links={[
              { label: "Correspondence Inbox", href: "/correspondence/inbox" },
              { label: "Archived", href: "/correspondence/archived" },
            ]}
          />
        </div>

        {/* Filter bar */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-2">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by subject, reference..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 pl-8 text-xs" />
            </div>
            <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value as StatusFilter); pagination.goToFirstPage(); }}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {statusFilters.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "all" ? "All statuses" : status.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(value) => { setPriorityFilter(value as PriorityFilter); pagination.goToFirstPage(); }}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
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
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="received_date-desc">Newest First</SelectItem>
                <SelectItem value="received_date-asc">Oldest First</SelectItem>
                <SelectItem value="updated_at-desc">Last Updated</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">Clear</Button>}
          </CardContent>
        </Card>

        {/* Table card */}
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[70vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>Registered By</TableHead>
                    <TableHead>Current Owner</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCorrespondence.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                        No correspondence matches the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCorrespondence.map((item, index) => {
                      const division = item.divisionId
                        ? divisions.find((divisionItem) => divisionItem.id === item.divisionId)
                        : undefined;
                      const registeredBy = item.createdById
                        ? users.find((user) => user.id === item.createdById)
                        : undefined;
                      const currentOwner = item.currentApproverId
                        ? users.find((user) => user.id === item.currentApproverId)
                        : undefined;
                      const registeredByName = registeredBy?.name ?? item.createdByName ?? '—';
                      const currentOwnerName = currentOwner?.name ?? item.currentApproverName ?? '—';

                      return (
                        <TableRow key={item.id as string} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{(pagination.page - 1) * pagination.pageSize + index + 1}</TableCell>
                          <TableCell>
                            <Link
                              href={`/correspondence/${item.id as string}`}
                              className="text-primary hover:underline font-medium"
                            >
                              {item.referenceNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="truncate" title={item.subject}>
                              {item.subject}
                            </p>
                          </TableCell>
                          <TableCell>{division?.name ?? "—"}</TableCell>
                          <TableCell>{registeredByName}</TableCell>
                          <TableCell>{currentOwnerName}</TableCell>
                          <TableCell>{formatDateShort(item.receivedDate)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusBadgeClass(item.status as 'pending' | 'in-progress' | 'completed' | 'archived')}>
                              {(item.status as string).replace("-", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPriorityBadgeVariant(item.priority)}>
                              {item.priority.toUpperCase()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

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
    </DashboardLayout>
  );
};

export default RegisteredCorrespondencePage;
