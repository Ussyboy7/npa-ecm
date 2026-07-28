"use client";

import { useEffect, useMemo, useState } from "react";
import { useAbortController } from "@/hooks/use-abort-controller";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useOrganization } from "@/contexts/OrganizationContext";
import { getCases, type CaseQueryParams } from "@/lib/api/cases";
import { PRIORITY_OPTIONS } from "@/lib/constants";
import type { Case } from "@/lib/npa-structure";
import { formatDateShort } from "@/lib/correspondence-helpers";
import { toast } from "@/components/ui/sonner";
import { logError, logWarn } from "@/lib/client-logger";
import { exportToCSV } from "@/lib/admin-export";
import { apiFetch } from "@/lib/api-client";
import { Search, Plus, FileText, Loader2, Briefcase, Building2, Download, ChevronRight } from "lucide-react";
import { ContextualHelp } from "@/components/help/ContextualHelp";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { fetchAllPaginatedResults } from "@/lib/pagination-utils";
import { useScopeChecks } from "@/hooks/use-scope-checks";
import { useRoleChecks } from "@/hooks/use-role-checks";
import { ListRowCard } from "@/components/shared/ListRowCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { QueuePageShell } from "@/components/shared/QueuePageShell";
import { StatStrip } from "@/components/shared/StatStrip";
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

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
] as const;

const caseTypeOptions = [
  { value: "all", label: "All Types" },
  { value: "complaint", label: "Complaint" },
  { value: "request", label: "Request" },
  { value: "inquiry", label: "Inquiry" },
  { value: "project", label: "Project" },
  { value: "legal", label: "Legal" },
  { value: "audit", label: "Audit" },
  { value: "general", label: "General" },
] as const;

const priorityOptions = [
  { value: "all", label: "All Priorities" },
  ...PRIORITY_OPTIONS,
] as const;

const getPriorityBadgeVariant = (priority: Case["priority"]) => {
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

const getStatusBadgeClass = (status: Case["status"]) => {
  switch (status) {
    case "open":
      return "border-sky-700/40 bg-sky-50 text-sky-900 dark:border-sky-400/40 dark:bg-sky-950 dark:text-sky-100";
    case "in_progress":
      return "border-amber-700/40 bg-amber-50 text-amber-950 dark:border-amber-400/40 dark:bg-amber-950 dark:text-amber-100";
    case "resolved":
      return "border-emerald-700/40 bg-emerald-50 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-950 dark:text-emerald-100";
    case "closed":
      return "border-border bg-muted text-foreground";
    case "archived":
      return "border-violet-700/40 bg-violet-50 text-violet-900 dark:border-violet-400/40 dark:bg-violet-950 dark:text-violet-100";
    default:
      return "bg-muted text-foreground";
  }
};

const getCaseTypeLabel = (type: Case["caseType"]) => {
  return caseTypeOptions.find(opt => opt.value === type)?.label || type;
};

interface CasesListContentProps {
  scope: "my" | "office" | "all";
  title: string;
  description: string;
}

export function CasesListContent({ scope, title, description }: CasesListContentProps) {
  const router = useRouter();
  const {currentUser, hydrated: _hydrated } = useCurrentUser();
  const {divisions, departments: _departments, offices, officeMemberships } = useOrganization();
  const { getSignal, reset } = useAbortController();
  
  // Get user's office IDs for scope filtering
  const userOfficeIds = useMemo(() => {
    if (!currentUser) return [];
    return officeMemberships
      .filter(m => m.userId === currentUser.id && m.isActive)
      .map(m => m.officeId);
  }, [currentUser, officeMemberships]);

  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const scopeChecks = useScopeChecks();
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [executiveFilter, setExecutiveFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('opened_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [count, setCount] = useState(0);
  const [executives, setExecutives] = useState<Array<{id: string; name: string; email?: string}>>([]);
  const [exporting, setExporting] = useState(false);
  
  // Use role checks hook for type-safe role checking
  const { isSecretary, isSuperAdmin } = useRoleChecks();
  
  // Use pagination hook
  const pagination = usePagination({
    initialPage: 1,
    totalCount: count,
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch executives for secretaries and super admins
  useEffect(() => {
    // Only fetch if user is a secretary or super admin
    if (!currentUser?.id || (!isSecretary && !isSuperAdmin)) {
      setExecutives([]);
      return;
    }
    
    const abortController = new AbortController();
    
    const fetchExecutives = async () => {
      try {
        const response = await apiFetch<Array<{id: string; name: string; email?: string}>>('/correspondence/cases/secretary-executives/', {
          signal: abortController.signal,
        });
        setExecutives(response);
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') return;
        // Silently fail if user doesn't have permission (403) or endpoint not found (404)
        if (err && typeof err === 'object' && 'status' in err && (err.status === 403 || err.status === 404)) {
          logWarn("Executives endpoint not available for this user");
          setExecutives([]);
          return;
        }
        logError("Failed to load executives", err);
      }
    };
    
    void fetchExecutives();
    
    return () => {
      abortController.abort();
    };
  }, [currentUser?.id, isSecretary, isSuperAdmin]);

  // Reset page when filters change
  useEffect(() => {
    pagination.goToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, scope, selectedStatus, selectedType, selectedPriority, divisionFilter, executiveFilter, dateFrom, dateTo, sortBy, sortOrder, pagination.pageSize]);

  // Fetch cases with request cancellation
  useEffect(() => {
    if (!currentUser?.id) return;

    const signal = getSignal();

    const fetchCases = async () => {
      setLoading(true);
      setError(null);
      try {
        // Build params based on scope
        const params: CaseQueryParams = {
          page: pagination.page,
          pageSize: pagination.pageSize,
          search: debouncedSearch.trim() || undefined,
          status: selectedStatus || undefined,
          caseType: selectedType || undefined,
          priority: selectedPriority || undefined,
          division: divisionFilter !== "all" ? divisionFilter : undefined,
          executive: (isSecretary || isSuperAdmin) && executiveFilter !== "all" ? executiveFilter : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          ordering: sortOrder === 'desc' ? `-${sortBy}` : sortBy,
        };
        
        // Apply scope filtering based on scope prop
        if (scope === "my" && currentUser) {
          params.scope = "my";
          params.assignedTo = currentUser.id;
        } else if (scope === "office" && (userOfficeIds.length > 0 || isSuperAdmin)) {
          params.scope = "office";
        } else if (scope === "all") {
          // Use the scope from scopeChecks (department/division/directorate/organization)
          params.scope = scopeChecks.caseScope === "personal" ? "my" : scopeChecks.caseScope;
        }

        const response = await getCases({ ...params, signal });
        
        if (signal.aborted) return;
        
        setCases(response.results);
        setCount(response.count as number);
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') return;
        logError("Failed to load cases", err);
        setError("Failed to load cases. Please try again.");
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchCases();
    
  }, [
    currentUser,
    pagination.page,
    pagination.pageSize,
    debouncedSearch,
    selectedStatus,
    selectedType,
    selectedPriority,
    divisionFilter,
    executiveFilter,
    isSecretary,
    isSuperAdmin,
    scope,
    scopeChecks.caseScope,
    userOfficeIds.length,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
  ]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStatus) count++;
    if (selectedType) count++;
    if (selectedPriority) count++;
    if (divisionFilter !== "all") count++;
    if (executiveFilter !== "all") count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [selectedStatus, selectedType, selectedPriority, divisionFilter, executiveFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setSelectedStatus("");
    setSelectedType("");
    setSelectedPriority("");
    setDivisionFilter("all");
    setExecutiveFilter("all");
    setDateFrom('');
    setDateTo('');
    setSearchQuery("");
  };

  const handleExport = async () => {
    if (cases.length === 0 && count === 0) {
      toast.error('No cases to export');
      return;
    }
    setExporting(true);
    try {
      const baseParams: CaseQueryParams = {
        search: debouncedSearch.trim() || undefined,
        status: selectedStatus || undefined,
        caseType: selectedType || undefined,
        priority: selectedPriority || undefined,
        division: divisionFilter !== "all" ? divisionFilter : undefined,
        executive: (isSecretary || isSuperAdmin) && executiveFilter !== "all" ? executiveFilter : undefined,
        ordering: sortOrder === 'desc' ? `-${sortBy}` : sortBy,
      };
      if (scope === "my" && currentUser) {
        baseParams.scope = "my";
        baseParams.assignedTo = currentUser.id;
      } else if (scope === "office" && (userOfficeIds.length > 0 || isSuperAdmin)) {
        baseParams.scope = "office";
      } else if (scope === "all") {
        baseParams.scope = scopeChecks.caseScope === "personal" ? "my" : scopeChecks.caseScope;
      }

      const allCases = await fetchAllPaginatedResults((page, pageSize) =>
        getCases({ ...baseParams, page, pageSize }),
      );

      const exportData = allCases.map((c) => ({
        'Case Number': c.caseNumber,
        'Title': c.title,
        'Status': c.status.replace('_', ' '),
        'Priority': c.priority,
        'Type': c.caseType,
        'Opened': formatDateShort(c.openedAt),
        'Office': c.owningOfficeId ? offices.find((o) => o.id === c.owningOfficeId)?.name || '' : '',
      }));
      exportToCSV(exportData, [
        { key: 'Case Number', label: 'Case Number' },
        { key: 'Title', label: 'Title' },
        { key: 'Status', label: 'Status' },
        { key: 'Priority', label: 'Priority' },
        { key: 'Type', label: 'Type' },
        { key: 'Opened', label: 'Opened' },
        { key: 'Office', label: 'Office' },
      ], {
        filename: `cases-export-${new Date().toISOString().split('T')[0]}.csv`,
      });
      toast.success(`Exported ${exportData.length} cases successfully`);
    } catch (err: unknown) {
      logError('Failed to export cases', err);
      toast.error('Failed to export cases');
    } finally {
      setExporting(false);
    }
  };

  if (!currentUser?.id) {
    return (
      <QueuePageShell title={title} subtitle={description}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </QueuePageShell>
    );
  }

  return (
    <QueuePageShell
      title={title}
      subtitle={description}
      actions={(
        <>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport}
            disabled={exporting || cases.length === 0}
            aria-label="Export to CSV"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" /> Export
              </>
            )}
          </Button>
          <Button 
            size="sm" 
            onClick={() => router.push("/cases/new")}
            aria-label="Create new case"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Case
          </Button>
          <ContextualHelp
            title="How to manage cases"
            description="Track cases from intake to closure."
            steps={['Filter by status, type, priority, or division.', 'Open a case to link correspondence, documents, and forms.', 'Create a case for new complaints, requests, inquiries, or projects.']}
          />
        </>
      )}
      stats={(
        <StatStrip
          items={[
            { key: 'total', label: 'Total cases', value: count },
            { key: 'open', label: 'Open', value: cases.filter((c) => c.status === "open").length },
            { key: 'inProgress', label: 'In progress', value: cases.filter((c) => c.status === "in_progress").length },
            { key: 'resolved', label: 'Resolved', value: cases.filter((c) => c.status === "resolved" || c.status === "closed").length },
          ]}
        />
      )}
    >
      {/* Inline Filter Bar */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-2">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search cases..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 pl-8 text-xs" />
          </div>
          <Select value={selectedStatus || 'all'} onValueChange={(v) => { setSelectedStatus(v === 'all' ? '' : v); pagination.goToFirstPage(); }}>
            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedType || 'all'} onValueChange={(v) => { setSelectedType(v === 'all' ? '' : v); pagination.goToFirstPage(); }}>
            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              {caseTypeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={divisionFilter} onValueChange={(v) => { setDivisionFilter(v); pagination.goToFirstPage(); }}>
            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="All Divisions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              {divisions.map((div) => (
                <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedPriority || 'all'} onValueChange={(v) => { setSelectedPriority(v === 'all' ? '' : v); pagination.goToFirstPage(); }}>
            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="All Priorities" /></SelectTrigger>
            <SelectContent>
              {priorityOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(isSecretary || isSuperAdmin) && executives.length > 0 && (
            <Select value={executiveFilter} onValueChange={(v) => { setExecutiveFilter(v); pagination.goToFirstPage(); }}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="All Executives" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Executives</SelectItem>
                {executives.map((exec) => (
                  <SelectItem key={exec.id} value={exec.id}>{exec.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
            const [by, order] = value.split('-');
            setSortBy(by);
            setSortOrder(order as 'asc' | 'desc');
          }}>
            <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="opened_at-desc">Opened Date (Newest)</SelectItem>
              <SelectItem value="opened_at-asc">Opened Date (Oldest)</SelectItem>
              <SelectItem value="updated_at-desc">Last Updated (Newest)</SelectItem>
              <SelectItem value="updated_at-asc">Last Updated (Oldest)</SelectItem>
              <SelectItem value="case_number-asc">Case Number (A-Z)</SelectItem>
              <SelectItem value="case_number-desc">Case Number (Z-A)</SelectItem>
              <SelectItem value="priority-desc">Priority (Urgent First)</SelectItem>
            </SelectContent>
          </Select>
          {activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">Clear</Button>}
        </CardContent>
      </Card>

      {loading ? (
        <LoadingState message="Loading cases…" />
      ) : error ? (
        <ErrorState message={error} variant="inline" />
      ) : cases.length === 0 ? (
        <EmptyState
          icon={<Briefcase className={registryQueueEmptyIconClass} />}
          title={
            debouncedSearch || activeFilterCount > 0
              ? "No cases match your filters"
              : scope === "my"
                ? "No cases assigned to you yet"
                : scope === "office"
                  ? "No cases for your office yet"
                  : "No cases in your scope"
          }
          message={
            debouncedSearch || activeFilterCount > 0
              ? "Try adjusting your search or filters."
              : "When cases are created in your scope, they will appear here."
          }
          actionLabel={debouncedSearch || activeFilterCount > 0 ? "Clear Filters" : undefined}
          onAction={debouncedSearch || activeFilterCount > 0 ? clearFilters : undefined}
        />
      ) : (
        <>
          <div className={correspondenceQueueListStackClass}>
              {cases.map((caseItem) => {
                const owningOffice = caseItem.owningOfficeId
                  ? offices.find((o) => o.id === caseItem.owningOfficeId)
                  : undefined;
                const showMeta =
                  Boolean(owningOffice) || caseItem.correspondenceCount !== undefined;

                return (
                <ListRowCard
                  key={caseItem.id}
                  density="compact"
                  href={`/cases/${caseItem.id}`}
                  actions={(
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          aria-label="View case"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/cases/${caseItem.id}`);
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">View case</TooltipContent>
                    </Tooltip>
                  )}
                  leading={(
                    <div
                      className={cn(
                        correspondenceQueueLeadingBoxClass,
                        caseItem.priority === "urgent"
                          ? "bg-destructive/10"
                          : caseItem.priority === "high"
                            ? "bg-warning/10"
                            : "bg-primary/10",
                      )}
                    >
                      <Briefcase
                        className={cn(
                          correspondenceQueueLeadingIconClass,
                          caseItem.priority === "urgent"
                            ? "text-destructive"
                            : caseItem.priority === "high"
                              ? "text-warning"
                              : "text-primary",
                        )}
                      />
                    </div>
                  )}
                >
                  <h4 className={correspondenceQueueSubjectClass}>{caseItem.title}</h4>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                      <Badge
                        variant="outline"
                        className={cn(correspondenceQueueBadgeClass, "font-mono")}
                      >
                        {caseItem.caseNumber}
                      </Badge>
                      <Badge
                        className={cn(
                          correspondenceQueueBadgeClass,
                          getStatusBadgeClass(caseItem.status),
                        )}
                      >
                        {caseItem.status.replace("_", " ").toUpperCase()}
                      </Badge>
                      <Badge
                        variant={getPriorityBadgeVariant(caseItem.priority)}
                        className={correspondenceQueueBadgeClass}
                      >
                        {caseItem.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className={correspondenceQueueBadgeClass}>
                        {getCaseTypeLabel(caseItem.caseType)}
                      </Badge>
                    </div>
                    <span className={correspondenceQueueDateClass}>
                      {formatDateShort(caseItem.openedAt)}
                    </span>
                  </div>
                  {caseItem.description && (
                    <p className="mt-1 line-clamp-1 text-[11px] leading-snug text-muted-foreground">
                      {caseItem.description}
                    </p>
                  )}
                  {showMeta && (
                    <div className={cn(correspondenceQueueMetaRowClass, "mt-1")}>
                      {owningOffice && (
                        <span className={correspondenceQueueMetaItemClass}>
                          <Building2 className={correspondenceQueueMetaIconClass} />
                          <span className="truncate">Office: {owningOffice.name}</span>
                        </span>
                      )}
                      {caseItem.correspondenceCount !== undefined && (
                        <span className={correspondenceQueueMetaItemClass}>
                          <FileText className={correspondenceQueueMetaIconClass} />
                          <span className="truncate">
                            {caseItem.correspondenceCount} linked correspondence
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                </ListRowCard>
                );
              })}
            </div>

            <PaginationControls
              pagination={pagination}
              showPageSizeSelector={true}
              showGoToPage={true}
              className="border-t border-border/60 pt-4"
            />
          </>
        )}
    </QueuePageShell>
  );
}

