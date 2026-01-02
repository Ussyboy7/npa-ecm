"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useOrganization } from "@/contexts/OrganizationContext";
import { getCases, type CaseQueryParams } from "@/lib/api/cases";
import type { Case } from "@/lib/npa-structure";
import { formatDateShort } from "@/lib/correspondence-helpers";
import { logError, logWarn } from "@/lib/client-logger";
import { apiFetch } from "@/lib/api-client";
import { Search, Filter, Plus, FileText, Loader2, AlertCircle, User, Briefcase, Clock, Building2, Inbox, Download } from "lucide-react";
import { HelpGuideCard } from "@/components/help/HelpGuideCard";
import { ContextualHelp } from "@/components/help/ContextualHelp";
import { Label } from "@/components/ui/label";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { useScopeChecks } from "@/hooks/use-scope-checks";
import { useRoleChecks } from "@/hooks/use-role-checks";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DEFAULT_PAGE_SIZE = 25;

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
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
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
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "in_progress":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "resolved":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "closed":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    case "archived":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
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
  const { currentUser, hydrated } = useCurrentUser();
  const { divisions, departments, offices, officeMemberships } = useOrganization();
  const abortControllerRef = useRef<AbortController | null>(null);
  
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
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [executiveFilter, setExecutiveFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('opened_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [count, setCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [executives, setExecutives] = useState<Array<{id: string; name: string; email?: string}>>([]);
  const [exporting, setExporting] = useState(false);
  
  // Use role checks hook for type-safe role checking
  const { isSecretary, isSuperAdmin } = useRoleChecks();
  
  // Use pagination hook
  const pagination = usePagination({
    initialPage: 1,
    initialPageSize: DEFAULT_PAGE_SIZE,
    totalCount: count,
  });
  
  // Calculate summary stats - fetch separately from API
  const [summary, setSummary] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    urgent: 0,
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
    if (!hydrated || !currentUser || (!isSecretary && !isSuperAdmin)) {
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
      } catch (err: Record<string, unknown>) {
        if (err.name === 'AbortError') return;
        // Silently fail if user doesn't have permission (403) or endpoint not found (404)
        if (err.status === 403 || err.status === 404) {
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
  }, [hydrated, currentUser, isSecretary, isSuperAdmin]);

  // Reset page when filters change
  useEffect(() => {
    pagination.goToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, scope, selectedStatuses, selectedTypes, selectedPriorities, divisionFilter, executiveFilter, dateFrom, dateTo, sortBy, sortOrder, pagination.pageSize]);

  // Fetch cases with request cancellation
  useEffect(() => {
    if (!hydrated || !currentUser) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const fetchCases = async () => {
      setLoading(true);
      setError(null);
      try {
        // Build params based on scope
        const params: CaseQueryParams = {
          page: pagination.page,
          pageSize: pagination.pageSize,
          search: debouncedSearch.trim() || undefined,
          status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
          caseType: selectedTypes.length > 0 ? selectedTypes : undefined,
          priority: selectedPriorities.length > 0 ? selectedPriorities : undefined,
          division: divisionFilter !== "all" ? divisionFilter : undefined,
          executive: (isSecretary || isSuperAdmin) && executiveFilter !== "all" ? executiveFilter : undefined,
          ordering: sortOrder === 'desc' ? `-${sortBy}` : sortBy,
        };
        
        // Apply scope filtering based on scope prop
        if (scope === "my" && currentUser) {
          params.scope = "my";
          params.assignedTo = currentUser.id;
        } else if (scope === "office" && userOfficeIds.length > 0) {
          params.scope = "office";
        } else if (scope === "all") {
          // Use the scope from scopeChecks (department/division/directorate/organization)
          params.scope = scopeChecks.caseScope === "personal" ? "all" : scopeChecks.caseScope;
        }

        const response = await getCases({ ...params, signal });
        
        if (signal.aborted) return;
        
        setCases(response.results);
        setCount(response.count);
        
        // Fetch summary stats separately from API
        try {
          const summaryParams: CaseQueryParams = {
            ...params,
            page: 1,
            pageSize: 1, // Just need count
          };
          const summaryResponse = await getCases(summaryParams);
          
          if (signal.aborted) return;
          
          // Fetch counts for each stat (4 metrics: Total, Open, In Progress, Urgent)
          const [openResponse, inProgressResponse, urgentResponse] = await Promise.all([
            getCases({ ...summaryParams, status: 'open', pageSize: 1, signal }),
            getCases({ ...summaryParams, status: 'in_progress', pageSize: 1, signal }),
            getCases({ ...summaryParams, priority: 'urgent', pageSize: 1, signal }),
          ]);
          
          if (signal.aborted) return;
          
          setSummary({
            total: summaryResponse.count,
            open: openResponse.count,
            inProgress: inProgressResponse.count,
            urgent: urgentResponse.count,
          });
        } catch (summaryErr: Record<string, unknown>) {
          if (summaryErr.name === 'AbortError') return;
          // Fallback to calculating from current page if summary fetch fails
          const allCases = response.results;
          setSummary({
            total: response.count,
            open: allCases.filter(c => c.status === 'open').length,
            inProgress: allCases.filter(c => c.status === 'in_progress').length,
            urgent: allCases.filter(c => c.priority === 'urgent').length,
          });
        }
      } catch (err: Record<string, unknown>) {
        if (err.name === 'AbortError') return;
        logError("Failed to load cases", err);
        setError("Failed to load cases. Please try again.");
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchCases();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [
    hydrated,
    currentUser,
    pagination.page,
    pagination.pageSize,
    debouncedSearch,
    selectedStatuses,
    selectedTypes,
    selectedPriorities,
    divisionFilter,
    executiveFilter,
    isSecretary,
    scope,
    scopeChecks.caseScope,
    userOfficeIds.length,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
  ]);

  const PRIORITY_COLORS: Record<string, string> = {
    urgent: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e',
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStatuses.length > 0) count++;
    if (selectedTypes.length > 0) count++;
    if (selectedPriorities.length > 0) count++;
    if (divisionFilter !== "all") count++;
    if (executiveFilter !== "all") count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [selectedStatuses, selectedTypes, selectedPriorities, divisionFilter, executiveFilter, dateFrom, dateTo]);

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const togglePriority = (priority: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]
    );
  };

  const clearAllFilters = () => {
    setSelectedStatuses([]);
    setSelectedTypes([]);
    setSelectedPriorities([]);
    setDivisionFilter("all");
    setExecutiveFilter("all");
    setDateFrom('');
    setDateTo('');
    setSearchQuery("");
  };

  const handleExport = async () => {
    // TODO: Implement export functionality
    setExporting(true);
    setTimeout(() => setExporting(false), 1000);
  };

  if (!hydrated || !currentUser) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
            aria-label={`${showFilters ? 'Hide' : 'Show'} filters`}
            aria-expanded={showFilters}
          >
            <Filter className="h-4 w-4 mr-2" /> Filters
            {activeFilterCount > 0 && <Badge variant="secondary" className="ml-2" aria-label={`${activeFilterCount} active filters`}>{activeFilterCount}</Badge>}
          </Button>
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
            description="Track and manage cases throughout their lifecycle. Use filters to find specific cases, link related items, and monitor progress."
            steps={['Use filters to find cases by status, type, priority, or division.', 'Click on a case to view details and link correspondence, documents, or forms.', 'Create new cases to track complaints, requests, inquiries, or projects.']}
          />
        </div>
      </div>

      <HelpGuideCard
        title="Case Management"
        description="Track and manage cases, complaints, requests, and inquiries throughout their lifecycle. Link related correspondence, documents, and forms to build a complete case file."
        links={[
          { label: 'Help & Guides', href: '/help' },
        ]}
      />

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Case Filters</CardTitle>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Status</Label>
                  <div className="flex flex-wrap gap-1">
                    {statusOptions.map((status) => (
                      <Badge
                        key={status.value}
                        variant={selectedStatuses.includes(status.value) ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleStatus(status.value)}
                      >
                        {status.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Case Type</Label>
                  <div className="flex flex-wrap gap-1">
                    {caseTypeOptions.map((type) => (
                      <Badge
                        key={type.value}
                        variant={selectedTypes.includes(type.value) ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleType(type.value)}
                      >
                        {type.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Priority</Label>
                  <div className="flex flex-wrap gap-1">
                    {priorityOptions.map((priority) => (
                      <Badge
                        key={priority.value}
                        variant={selectedPriorities.includes(priority.value) ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => togglePriority(priority.value)}
                        style={selectedPriorities.includes(priority.value) ? { backgroundColor: PRIORITY_COLORS[priority.value] } : {}}
                      >
                        {priority.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Division</Label>
                  <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Divisions</SelectItem>
                      {divisions.map((div) => (
                        <SelectItem key={div.id} value={div.id}>
                          {div.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(isSecretary || isSuperAdmin) && executives.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Executive</Label>
                    <Select value={executiveFilter} onValueChange={setExecutiveFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Executives</SelectItem>
                        {executives.map((exec) => (
                          <SelectItem key={exec.id} value={exec.id}>
                            {exec.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Date From</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Date To</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Sort By</Label>
                  <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                    const [by, order] = value.split('-');
                    setSortBy(by);
                    setSortOrder(order as 'asc' | 'desc');
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search cases by number, title, description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total Cases', value: summary.total, icon: Inbox, bgClass: 'bg-primary/10', iconClass: 'text-primary' },
            { label: 'Open Cases', value: summary.open, icon: FileText, bgClass: 'bg-blue-500/10', iconClass: 'text-blue-600 dark:text-blue-400' },
            { label: 'In Progress', value: summary.inProgress, icon: Clock, bgClass: 'bg-yellow-500/10', iconClass: 'text-yellow-600 dark:text-yellow-400' },
            { label: 'Urgent Items', value: summary.urgent, icon: AlertCircle, bgClass: 'bg-destructive/10', iconClass: 'text-destructive' },
          ].map(({ label, value, icon: Icon, bgClass, iconClass }) => (
            <Card key={label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${bgClass}`}><Icon className={`h-6 w-6 ${iconClass}`} /></div>
                  <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold">{value}</p></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

      {error && (
        <Card>
          <CardContent className="py-4 text-sm text-destructive" role="alert">
            {error}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading cases…
          </CardContent>
        </Card>
      ) : cases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground mb-2">
              {debouncedSearch || activeFilterCount > 0 
                ? 'No cases match your filters' 
                : scope === "my" 
                  ? "You don't have any cases assigned to you yet." 
                  : scope === "office" 
                    ? "Your office doesn't have any cases yet." 
                    : "No cases found in your scope."}
            </p>
            {(debouncedSearch || activeFilterCount > 0) && (
              <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4">
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
              {cases.map((caseItem) => (
                <Card key={caseItem.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Badge variant="outline" className="font-mono">
                            {caseItem.caseNumber}
                          </Badge>
                          <Badge className={getStatusBadgeClass(caseItem.status)}>
                            {caseItem.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <Badge variant={getPriorityBadgeVariant(caseItem.priority)}>
                            {caseItem.priority.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {getCaseTypeLabel(caseItem.caseType)}
                          </Badge>
                        </div>
                        <Link
                          href={`/cases/${caseItem.id}`}
                          className="text-lg font-semibold hover:text-primary transition-colors block mb-2"
                        >
                          {caseItem.title}
                        </Link>
                        {caseItem.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {caseItem.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {caseItem.owningOffice && (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              <span>{caseItem.owningOffice}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>Opened {formatDateShort(caseItem.openedAt)}</span>
                          </div>
                          {caseItem.correspondenceCount !== undefined && (
                            <div className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              <span>{caseItem.correspondenceCount} correspondence</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/cases/${caseItem.id}`)}
                      >
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <PaginationControls
              pagination={pagination}
              showPageSizeSelector={true}
              showGoToPage={true}
              className="border-t border-border/60 pt-4"
            />
          </>
        )}
      </div>
  );
}

