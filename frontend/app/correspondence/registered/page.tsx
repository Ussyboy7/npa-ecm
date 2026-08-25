"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, User as UserIcon, Building2, Plus, Mail, Send } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useRouter } from "next/navigation";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { mapApiCorrespondence } from "@/lib/api/correspondence-mappers";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOrgUsers } from "@/hooks/use-org-users";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { apiFetch } from "@/lib/api-client";
import { canDispatchCorrespondence, formatDateShort } from "@/lib/correspondence-helpers";
import { PRIORITY_VALUES } from "@/lib/constants";
import type { Correspondence } from "@/lib/npa-structure";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { QueuePageShell } from "@/components/shared/QueuePageShell";
import { RegistryTabList } from "@/components/registry/RegistryTabList";
import { StatStrip } from "@/components/shared/StatStrip";
import { ListRowCard } from "@/components/shared/ListRowCard";
import { getCorrespondenceStatusBadge, getPriorityBadgeVariant } from "@/lib/status-badge";
import { cn } from "@/lib/utils";
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
} from "@/components/shared/registry-queue-styles";

const statusFilters = ["all", "pending", "in-progress", "completed", "archived"] as const;
const priorityFilters = ["all", ...PRIORITY_VALUES] as const;

type StatusFilter = (typeof statusFilters)[number];
type PriorityFilter = (typeof priorityFilters)[number];

const RegisteredCorrespondencePage = () => {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const permissions = useUserPermissions(currentUser ?? undefined);
  const { divisions } = useOrganization();
  const { users } = useOrgUsers();
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

  const pagination = usePagination({
    initialPage: 1,
    totalCount: count,
  });

  const hasActiveFilters = useMemo(
    () => Boolean(dateFrom || dateTo || statusFilter !== "all" || priorityFilter !== "all" || searchQuery.trim()),
    [dateFrom, dateTo, statusFilter, priorityFilter, searchQuery],
  );

  const clearFilters = useCallback(() => {
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setSearchQuery("");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sortPrefix = sortOrder === "desc" ? "-" : "";
      const params = new URLSearchParams({
        page: String(pagination.page),
        page_size: String(pagination.pageSize),
        ordering: `${sortPrefix}${sortBy}`,
      });

      if (debouncedSearch) params.append("search", debouncedSearch);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (priorityFilter !== "all") params.append("priority", priorityFilter);
      if (dateFrom) params.append("received_date_from", dateFrom);
      if (dateTo) params.append("received_date_to", dateTo);

      const response = await apiFetch<Record<string, unknown>>(
        `/correspondence/items/?${params.toString()}`,
      );
      const results = Array.isArray(response.results) ? response.results : [];
      setItems(results.map(mapApiCorrespondence));
      setCount(typeof response.count === "number" ? response.count : results.length);
    } catch {
      setError("Failed to load registered correspondence. Please try again.");
      setItems([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.pageSize,
    debouncedSearch,
    statusFilter,
    priorityFilter,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const handleDispatch = useCallback(async (id: string) => {
    try {
      await apiFetch(`/correspondence/items/${id}/dispatch/`, { method: 'POST', body: JSON.stringify({}) });
      toast.success('Dispatched');
      void loadItems();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Dispatch failed');
    }
  }, [loadItems]);

  useEffect(() => {
    pagination.goToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, priorityFilter, dateFrom, dateTo, sortBy, sortOrder]);

  const canViewRegistry = permissions.canViewCorrespondenceRegistry;
  const canRegister = Boolean(permissions.canRegisterCorrespondence);

  if (!currentUser) return null;

  if (!canViewRegistry) {
    return (
      <QueuePageShell
        title="Registered"
        subtitle="Executive registry of inbound correspondence"
        tabs={<RegistryTabList />}
      >
        <EmptyState
          icon={<Mail className={registryQueueEmptyIconClass} />}
          title="Registry access required"
          message="You do not have permission to view the correspondence registry. Executive access is available from Assistant General Manager grade and above."
        />
      </QueuePageShell>
    );
  }

  return (
    <QueuePageShell
      title="Registered"
      subtitle="Executive registry of inbound correspondence across directorates"
      tabs={<RegistryTabList />}
      actions={
        canRegister ? (
          <Button size="compact" onClick={() => router.push("/correspondence/register")}>
            <Plus className="h-4 w-4" />
            Register New
          </Button>
        ) : null
      }
      stats={
        <StatStrip
          items={[{ key: "total", label: "Registered", value: count }]}
        />
      }
    >
      <div className="rounded-xl bg-muted/30 p-2">
        <div className="md:hidden mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="h-8 w-full justify-between text-xs"
          >
            <span className="flex items-center">
              <Search className="h-3.5 w-3.5 mr-2" /> Filters
            </span>
            {hasActiveFilters ? (
              <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">1</span>
            ) : null}
          </Button>
        </div>
        <div className={`flex-wrap items-center gap-2${filtersOpen ? " flex" : " hidden"} md:flex`}>
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by subject, reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
              aria-label="Search correspondence"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as StatusFilter);
              pagination.goToFirstPage();
            }}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusFilters.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === "all"
                    ? "All statuses"
                    : status.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={priorityFilter}
            onValueChange={(value) => {
              setPriorityFilter(value as PriorityFilter);
              pagination.goToFirstPage();
            }}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Filter by priority">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {priorityFilters.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {priority === "all" ? "All priorities" : priority.charAt(0).toUpperCase() + priority.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <Select
            value={`${sortBy}-${sortOrder}`}
            onValueChange={(value) => {
              const [by, order] = value.split("-");
              setSortBy(by);
              setSortOrder(order as "asc" | "desc");
            }}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="received_date-desc">Newest First</SelectItem>
              <SelectItem value="received_date-asc">Oldest First</SelectItem>
              <SelectItem value="updated_at-desc">Last Updated</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      <div aria-live="polite">
        {error ? <ErrorState message={error} variant="inline" /> : null}
        {loading ? (
          <LoadingState message="Loading registered correspondence…" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Mail className={registryQueueEmptyIconClass} />}
            title={hasActiveFilters ? "No items match your filters" : "No registered correspondence"}
            message={
              hasActiveFilters
                ? "Try adjusting your search or filters"
                : "Registered inbound correspondence will appear here."
            }
            actionLabel={hasActiveFilters ? "Clear Filters" : undefined}
            onAction={hasActiveFilters ? clearFilters : undefined}
          />
        ) : (
          <div className={correspondenceQueueListStackClass} role="list">
            {items.map((item) => {
              const division = item.divisionId
                ? divisions.find((d) => d.id === item.divisionId)
                : undefined;
              const registeredBy = item.createdById
                ? users.find((user) => user.id === item.createdById)
                : undefined;
              const registeredByName = registeredBy?.name ?? item.createdByName ?? "—";
              const statusBadge = getCorrespondenceStatusBadge(item.status);

              return (
                <div key={item.id} role="listitem">
                  <ListRowCard
                    density="compact"
                    href={`/correspondence/${item.id}`}
                    leading={
                      <div
                        className={cn(
                          correspondenceQueueLeadingBoxClass,
                          item.priority === "urgent"
                            ? "bg-destructive/10"
                            : item.priority === "high"
                              ? "bg-warning/10"
                              : "bg-primary/10",
                        )}
                      >
                        <Mail
                          className={cn(
                            correspondenceQueueLeadingIconClass,
                            item.priority === "urgent"
                              ? "text-destructive"
                              : item.priority === "high"
                                ? "text-warning"
                                : "text-primary",
                          )}
                        />
                      </div>
                    }
                  >
                    <h4 className={correspondenceQueueSubjectClass}>{item.subject}</h4>
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                        <Badge variant={getPriorityBadgeVariant(item.priority)} className={correspondenceQueueBadgeClass}>
                          {item.priority.toUpperCase()}
                        </Badge>
                        <Badge
                          variant={statusBadge.variant}
                          className={cn(correspondenceQueueBadgeClass, statusBadge.className)}
                        >
                          {statusBadge.label}
                        </Badge>
                        {item.hasPhysicalCopy ? (
                          <Badge variant="outline" className={cn(correspondenceQueueBadgeClass, "gap-0.5")}>
                            <FileText className="h-2.5 w-2.5" />
                            Physical
                          </Badge>
                        ) : null}
                      </div>
                      <span className={correspondenceQueueDateClass}>{formatDateShort(item.receivedDate)}</span>
                    </div>
                    <div className={cn(correspondenceQueueMetaRowClass, "mt-1")}>
                      <span className={correspondenceQueueMetaItemClass}>
                        <Mail className={correspondenceQueueMetaIconClass} />
                        <span className="truncate">Ref: {item.referenceNumber}</span>
                      </span>
                      <span className={correspondenceQueueMetaItemClass}>
                        <UserIcon className={correspondenceQueueMetaIconClass} />
                        <span className="truncate">By: {registeredByName}</span>
                      </span>
                      {division ? (
                        <span className={correspondenceQueueMetaItemClass}>
                          <Building2 className={correspondenceQueueMetaIconClass} />
                          <span className="truncate">{division.name}</span>
                        </span>
                      ) : null}
                    </div>
                    {canDispatchCorrespondence(item as unknown as Parameters<typeof canDispatchCorrespondence>[0]) && (
                      <div className="mt-2 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleDispatch(item.id);
                          }}
                          className="h-7 text-xs"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Dispatch
                        </Button>
                      </div>
                    )}
                  </ListRowCard>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {count > 0 ? (
        <PaginationControls
          pagination={pagination}
          showPageSizeSelector
          showGoToPage
          className="border-t border-border/60 pt-4"
        />
      ) : null}
    </QueuePageShell>
  );
};

export default RegisteredCorrespondencePage;
