"use client";

import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from '@/components/shared/ErrorState';
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
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,

} from '@/components/shared/registry-queue-styles';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Shield, Search, FileText, QrCode, ExternalLink, CheckCircle2, XCircle, TrendingUp, RefreshCw, Download, AlertCircle, MoreVertical } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { ensureSealImageCached } from "@/lib/seal-cache";
import { logError } from "@/lib/client-logger";
import { formatDateShort, formatDateTime } from "@/lib/correspondence-helpers";
import { exportToCSV } from "@/lib/admin-export";
import { toast } from "sonner";
import { HelpGuideCard } from "@/components/help/HelpGuideCard";
import { DateRangePicker } from '@/components/shared/DateRangePicker';

interface ExecutiveApproval {
  id: string;
  correspondenceId: string;
  correspondenceSubject: string;
  correspondenceReference: string;
  sealedBy: string;
  sealedByRole: string;
  officeName: string;
  officeTitle: string;
  sealedAt: string;
  serialNumber: string;
  verificationUrl: string;
  isValid: boolean;
  sealData?: {
    id: string;
    serialNumber: string;
    verificationUrl: string;
    sealedBy: string;
    officeName: string;
    officeTitle: string;
    sealedAt: string;
    isValid: boolean;
    sealImageUrl?: string;
    signatureImageUrl?: string;
  };
}

function ApprovalsForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [approvals, setApprovals] = useState<ExecutiveApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('sealedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Restore filters from localStorage after mount
  useEffect(() => {
    const restore = (key: string, setter: (v: string) => void, defaultValue: string) => {
      const urlParam = searchParams.get(key);
      if (urlParam) { setter(urlParam); return; }
      const saved = localStorage.getItem(`approvals_filter_${key}`);
      if (saved) { setter(JSON.parse(saved)); }
    };
    restore('search', setSearchQuery, '');
    restore('role', v => setFilterRole(v), 'all');
    restore('status', v => setFilterStatus(v), 'all');
    restore('dateFrom', v => setDateFrom(v), '');
    restore('dateTo', v => setDateTo(v), '');
    restore('sortBy', v => setSortBy(v), 'sealedAt');
    restore('sortOrder', v => setSortOrder(v as 'asc' | 'desc'), 'desc');
  }, [searchParams, setSearchQuery, setFilterRole, setFilterStatus, setDateFrom, setDateTo, setSortBy, setSortOrder]);
  const [count, setCount] = useState(0);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Persist filters to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('approvals_filter_search', JSON.stringify(searchQuery));
    localStorage.setItem('approvals_filter_role', JSON.stringify(filterRole));
    localStorage.setItem('approvals_filter_status', JSON.stringify(filterStatus));
    localStorage.setItem('approvals_filter_dateFrom', JSON.stringify(dateFrom));
    localStorage.setItem('approvals_filter_dateTo', JSON.stringify(dateTo));
    localStorage.setItem('approvals_filter_sortBy', JSON.stringify(sortBy));
    localStorage.setItem('approvals_filter_sortOrder', JSON.stringify(sortOrder));
  }, [searchQuery, filterRole, filterStatus, dateFrom, dateTo, sortBy, sortOrder]);

  // Sync filters with URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (filterRole !== 'all') params.set('role', filterRole);
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (sortBy !== 'sealedAt') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);

    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [searchQuery, filterRole, filterStatus, dateFrom, dateTo, sortBy, sortOrder]);

  // Reset page when filters change - will be added after pagination is defined

  const getFilterParams = useCallback(() => {
    const orderingMap: Record<string, string> = {
      'sealedAt-desc': '-sealed_at',
      'sealedAt-asc': 'sealed_at',
      'reference-asc': 'correspondence_details__reference_number',
      'reference-desc': '-correspondence_details__reference_number',
      'status-desc': '-seal_data__is_valid',
    };
    const orderingKey = `${sortBy}-${sortOrder}`;
    const ordering = orderingMap[orderingKey] || '-sealed_at';

    const params = new URLSearchParams({
      action_type: 'approve',
      has_seal: 'true',
      ordering,
    });
    if (debouncedSearch) {
      params.append('search', debouncedSearch);
    }
    if (filterStatus !== 'all') {
      const isValid = filterStatus === 'valid' ? 'true' : 'false';
      params.append('is_valid', isValid);
    }
    if (dateFrom) {
      params.append('date_from', dateFrom);
    }
    if (dateTo) {
      params.append('date_to', dateTo);
    }
    return params;
  }, [debouncedSearch, filterStatus, dateFrom, dateTo, sortBy, sortOrder]);

  const loadApprovals = useCallback(async (page: number = 1, pageSize: number = 25, soft = false) => {
    try {
      if (!soft) {
        setLoading(true);
      }
      setError(null);
      // Use backend filtering for executive approvals with seals
      const params = getFilterParams();
      params.append('page', String(page));
      params.append('page_size', String(pageSize));
      
      const response = await apiFetch<Record<string, unknown> | Record<string, unknown>[] | { results: Record<string, unknown>[] }>(`/correspondence/minutes/?${params.toString()}`);
      const minutes: Record<string, unknown>[] = Array.isArray(response) ? response : (response && typeof response === 'object' && 'results' in response && Array.isArray(response.results)) ? response.results : [];
      
      // Map minutes to executive approvals (all should have seal_data since we filtered)
      const executiveApprovals = minutes
        .map((m: Record<string, unknown>) => {
          const correspondenceDetails = (m.correspondence_details as Record<string, unknown>) || {};
          const user = (m.user as Record<string, unknown>) || {};
          const sealData = (m.seal_data as Record<string, unknown>) || {};
          return {
            id: String(m.id || ""),
            correspondenceId: String(m.correspondence || ""),
            correspondenceSubject: (correspondenceDetails.subject as string) || "N/A",
            correspondenceReference: (correspondenceDetails.reference_number as string) || "N/A",
            sealedBy: (user.first_name && user.last_name) 
              ? `${user.first_name as string} ${user.last_name as string}` 
              : (user.username as string) || "Unknown",
            sealedByRole: (user.system_role_name as string) || (m.grade_level as string) || "Executive",
            officeName: (sealData.office_name as string) || "N/A",
            officeTitle: (sealData.office_title as string) || "N/A",
            sealedAt: (sealData.sealed_at as string) || (m.timestamp as string),
            serialNumber: (sealData.serial_number as string) || "N/A",
            verificationUrl: (sealData.verification_url as string) || "",
            isValid: (sealData.is_valid as boolean) ?? true,
            sealData: sealData && Object.keys(sealData).length > 0 ? {
              id: String(sealData.id),
              serialNumber: (sealData.serial_number as string) ?? '',
              verificationUrl: (sealData.verification_url as string) ?? '',
              sealedBy: (sealData.sealed_by as string) ?? '',
              officeName: (sealData.office_name as string) ?? '',
            officeTitle: (sealData.office_title as string) ?? '',
            sealedAt: (sealData.sealed_at as string) ?? '',
            isValid: (sealData.is_valid as boolean) ?? true,
            sealImageUrl: (sealData.seal_image_url as string | undefined) ?? undefined,
            signatureImageUrl: (sealData.signature_image_url as string | undefined) ?? undefined,
          } : undefined,
          };
        });
      
      setApprovals(executiveApprovals);
      // Use backend count for accurate pagination
      const count = (response && typeof response === 'object' && 'count' in response && typeof response.count === 'number') 
        ? response.count as number 
        : executiveApprovals.length;
      setCount(count);
    } catch (err: unknown) {
      let errorMessage = 'Failed to load executive approvals';
      if (err && typeof err === 'object') {
        const errorObj = err as Record<string, unknown>;
        if (errorObj.response && typeof errorObj.response === 'object') {
          const response = errorObj.response as Record<string, unknown>;
          if (response.data && typeof response.data === 'object') {
            const data = response.data as Record<string, unknown>;
            errorMessage = (data.detail as string) || errorMessage;
          }
        }
        if (!errorMessage || errorMessage === 'Failed to load executive approvals') {
          errorMessage = (errorObj.message as string) || errorMessage;
        }
      }
      setError(errorMessage);
      logError("Failed to load approvals", err);
      setApprovals([]);
      setCount(0);
    } finally {
      if (!soft) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, [getFilterParams]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadApprovals(pagination.page, pagination.pageSize, true);
  };

  const handleRetry = () => {
    void loadApprovals(pagination.page, pagination.pageSize, false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch all approvals for export using backend filter with server-side filtering
      const params = getFilterParams();
      params.append('page_size', '1000'); // Reasonable limit for export
      
      const response = await apiFetch<Record<string, unknown> | Record<string, unknown>[] | { results: Record<string, unknown>[] }>(`/correspondence/minutes/?${params.toString()}`);
      const minutes: Record<string, unknown>[] = Array.isArray(response) ? response : (response && typeof response === 'object' && 'results' in response && Array.isArray(response.results)) ? response.results : [];
      
      const exportData = minutes
        .map((m: Record<string, unknown>) => {
          const correspondenceDetails = (m.correspondence_details as Record<string, unknown>) || {};
          const user = (m.user as Record<string, unknown>) || {};
          const sealData = (m.seal_data as Record<string, unknown>) || {};
          return {
            'Reference Number': (correspondenceDetails.reference_number as string) || 'N/A',
            'Subject': (correspondenceDetails.subject as string) || 'N/A',
            'Executive': (user.first_name && user.last_name) 
              ? `${user.first_name as string} ${user.last_name as string}` 
              : (user.username as string) || 'Unknown',
            'Role': (user.system_role_name as string) || (m.grade_level as string) || 'Executive',
            'Office': (sealData.office_name as string) || 'N/A',
            'Office Title': (sealData.office_title as string) || 'N/A',
            'Serial Number': (sealData.serial_number as string) || 'N/A',
            'Sealed At': formatDateTime((sealData.sealed_at as string) || (m.timestamp as string) || ''),
            'Status': (sealData.is_valid as boolean) ? 'Valid' : 'Invalid',
            'Verification URL': (sealData.verification_url as string) || '',
          };
        });

      exportToCSV(exportData, [
        { key: 'Reference Number', label: 'Reference Number' },
        { key: 'Subject', label: 'Subject' },
        { key: 'Executive', label: 'Executive' },
        { key: 'Role', label: 'Role' },
        { key: 'Office', label: 'Office' },
        { key: 'Office Title', label: 'Office Title' },
        { key: 'Serial Number', label: 'Serial Number' },
        { key: 'Sealed At', label: 'Sealed At' },
        { key: 'Status', label: 'Status' },
        { key: 'Verification URL', label: 'Verification URL' },
      ], {
        filename: `executive-approvals-${new Date().toISOString().split('T')[0]}.csv`,
      });

      toast.success(`Exported ${exportData.length} approvals successfully`);
    } catch (err: unknown) {
      toast.error('Failed to export approvals. Please try again.');
      logError('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  // Server-side filtering is now used, so we just use approvals directly
  // Sorting is handled by backend via the ordering parameter
  const filteredApprovals = approvals;

  // Use pagination hook with backend count
  const pagination = usePagination({
    initialPage: 1,
    initialPageSize: 25,
    totalCount: count, // Use backend count for accurate pagination
  });

  // Load data when pagination or filters change
  useEffect(() => {
    void loadApprovals(pagination.page, pagination.pageSize);
  }, [pagination.page, pagination.pageSize, debouncedSearch, filterRole, filterStatus, dateFrom, dateTo, sortBy, sortOrder, loadApprovals]);

  // Reset page when filters change
  useEffect(() => {
    pagination.goToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterRole, filterStatus, dateFrom, dateTo, sortBy, sortOrder]);

  // Sync pagination with URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (filterRole !== 'all') params.set('role', filterRole);
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (sortBy !== 'sealedAt') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
    if (pagination.page > 1) params.set('page', String(pagination.page));
    if (pagination.pageSize !== 25) params.set('pageSize', String(pagination.pageSize));

    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [searchQuery, filterRole, filterStatus, dateFrom, dateTo, sortBy, sortOrder, pagination.page, pagination.pageSize]);

  const hasActiveFilters = useMemo(() => {
    return !!(debouncedSearch || filterRole !== "all" || filterStatus !== "all" || dateFrom || dateTo);
  }, [debouncedSearch, filterRole, filterStatus, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearchQuery("");
    setFilterRole("all");
    setFilterStatus("all");
    setDateFrom("");
    setDateTo("");
  };


  // With server-side pagination, filteredApprovals already contains the current page
  // Client-side filtering is applied to the current page's data only
  // Summary: total from API count; other figures are for the current page only (quick scan).
  const statistics = useMemo(() => {
    const filtered = filteredApprovals;
    return {
      total: count,
      valid: filtered.filter((a) => a.isValid).length,
      invalid: filtered.filter((a) => !a.isValid).length,
      thisMonth: filtered.filter((a) => {
        const date = new Date(a.sealedAt);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }).length,
    };
  }, [filteredApprovals, count]);

  const ApprovalRow = ({ approval }: { approval: ExecutiveApproval }) => {
    const officeDisplay =
      approval.officeTitle && approval.officeTitle !== approval.officeName
        ? `${approval.officeName} - ${approval.officeTitle}`
        : approval.officeName || approval.officeTitle;

    const openApprovalPdf = async (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      try {
        if (approval.sealData) {
          await ensureSealImageCached({
            serialNumber: approval.sealData.serialNumber,
            officeName: approval.sealData.officeName,
            officeTitle: approval.sealData.officeTitle,
            sealedBy: approval.sealData.sealedBy,
            sealedAt: approval.sealData.sealedAt,
            signatureImageUrl: approval.sealData.signatureImageUrl,
            existingSealImageUrl: approval.sealData.sealImageUrl,
          });
        }
        const pdfBlob = await apiFetch<Blob>(`/correspondence/minutes/${approval.id}/approval-pdf/`, { responseType: 'blob' });
        const blobUrl = URL.createObjectURL(pdfBlob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } catch (error: unknown) {
        logError('Failed to load PDF:', error);
        toast.error(`Failed to load PDF: ${error instanceof Error ? error.message : String(error)}`);
        router.push(`/correspondence/${approval.correspondenceId}`);
      }
    };

    const verifyUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/verify/${approval.serialNumber}`
        : approval.verificationUrl;

    return (
      <div className="cursor-pointer" onClick={() => void openApprovalPdf()}>
        <ListRowCard
          density="compact"
          leading={(
            <div
              className={cn(
                correspondenceQueueLeadingBoxClass,
                approval.isValid ? 'bg-emerald-500/10' : 'bg-destructive/10',
              )}
            >
              <Shield
                className={cn(
                  correspondenceQueueLeadingIconClass,
                  approval.isValid ? 'text-emerald-600' : 'text-destructive',
                )}
              />
            </div>
          )}
          actions={(
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label="Open approval PDF"
                    onClick={(e) => void openApprovalPdf(e)}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Open approval PDF</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label="View correspondence"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/correspondence/${approval.correspondenceId}`);
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">View correspondence</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label="Verify seal"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(verifyUrl, '_blank');
                    }}
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Verify seal</TooltipContent>
              </Tooltip>
            </>
          )}
        >
          <h4 className={correspondenceQueueSubjectClass}>{approval.correspondenceSubject}</h4>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              <Badge variant={approval.isValid ? 'default' : 'destructive'} className={correspondenceQueueBadgeClass}>
                {approval.isValid ? 'Valid' : 'Invalid'}
              </Badge>
              <Badge variant="outline" className={cn(correspondenceQueueBadgeClass, 'gap-0.5')}>
                <Shield className="h-2.5 w-2.5" />
                {approval.sealedByRole}
              </Badge>
            </div>
            <span className={correspondenceQueueDateClass}>{formatDateShort(approval.sealedAt)}</span>
          </div>
          <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
            <span className={correspondenceQueueMetaItemClass}>
              <FileText className={correspondenceQueueMetaIconClass} />
              <span className="truncate">Ref: {approval.correspondenceReference}</span>
            </span>
            <span className={correspondenceQueueMetaItemClass}>
              <Shield className={correspondenceQueueMetaIconClass} />
              <span className="truncate">Executive: {approval.sealedBy}</span>
            </span>
            <span className={correspondenceQueueMetaItemClass}>
              <AlertCircle className={correspondenceQueueMetaIconClass} />
              <span className="truncate">Office: {officeDisplay}</span>
            </span>
            <span className={correspondenceQueueMetaItemClass}>
              <QrCode className={correspondenceQueueMetaIconClass} />
              <span className="truncate font-mono text-[10px]">Serial: {approval.serialNumber}</span>
            </span>
          </div>
        </ListRowCard>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header - Match My Inbox/Outbox style */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Executive Approvals</h1>
            <p className="text-muted-foreground mt-1">Track and verify approvals with digital executive seals</p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="h-4 w-4 mr-2" />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleRefresh} disabled={loading || refreshing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport} disabled={exporting || loading || count === 0}>
                  <Download className={`h-4 w-4 mr-2 ${exporting ? 'animate-spin' : ''}`} />
                  {exporting ? 'Exporting…' : 'Export CSV'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <HelpGuideCard
          title="Executive Approvals"
          description="Manage and verify executive approvals with digital seals"
          links={[{ label: 'Verify Seal', href: '/verify' }, { label: 'Help & Guides', href: '/help' }]}
        />

        {/* Inline filter bar */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-2">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search approvals..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 pl-8 text-xs" />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="managing director">MD</SelectItem>
                <SelectItem value="executive director">ED</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="invalid">Invalid</SelectItem>
              </SelectContent>
            </Select>
            <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => { const [by, order] = value.split('-'); setSortBy(by); setSortOrder(order as 'asc' | 'desc'); }}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sealedAt-desc">Newest first</SelectItem>
                <SelectItem value="sealedAt-asc">Oldest first</SelectItem>
                <SelectItem value="reference-asc">Reference A–Z</SelectItem>
                <SelectItem value="reference-desc">Reference Z–A</SelectItem>
                <SelectItem value="status-desc">Valid first</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">Clear</Button>}
          </CardContent>
        </Card>

        {/* Summary stats */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total Approvals', value: statistics.total, icon: Shield, bgClass: 'bg-primary/10', iconClass: 'text-primary' },
            { label: 'Valid (this page)', value: statistics.valid, icon: CheckCircle2, bgClass: 'bg-emerald-500/10', iconClass: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Invalid (this page)', value: statistics.invalid, icon: XCircle, bgClass: 'bg-destructive/10', iconClass: 'text-destructive' },
            { label: 'This month (this page)', value: statistics.thisMonth, icon: TrendingUp, bgClass: 'bg-blue-500/10', iconClass: 'text-blue-600 dark:text-blue-400' },
          ].map(({ label, value, icon: Icon, bgClass, iconClass }) => (
            <Card key={label}>
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

        {loading && !refreshing ? (
          <LoadingState message="Loading executive approvals…" />
        ) : error ? (
          <ErrorState
            title="Error loading executive approvals"
            message={error}
            onRetry={handleRetry}
            retryLabel="Retry"
            variant="inline"
          />
        ) : filteredApprovals.length === 0 ? (
          <EmptyState
            icon={<Shield className={registryQueueEmptyIconClass} />}
            title={hasActiveFilters ? 'No approvals match your filters' : 'No executive approvals found'}
            message={
              hasActiveFilters
                ? 'Try adjusting your search or filters to see more results.'
                : 'Executive approvals with digital seals will appear here once they are created.'
            }
            actionLabel={hasActiveFilters ? 'Clear Filters' : undefined}
            onAction={hasActiveFilters ? clearFilters : undefined}
          />
        ) : (
          <div className={correspondenceQueueListStackClass}>
            {filteredApprovals.map((approval) => (
              <ApprovalRow key={approval.id} approval={approval} />
            ))}
          </div>
        )}

        {count > 0 && (
          <PaginationControls
            pagination={pagination}
            showPageSizeSelector={true}
            showGoToPage={true}
            className="border-t border-border/60 pt-4"
          />
        )}
      </div>
    </DashboardLayout>
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <ApprovalsForm />
    </Suspense>
  );
}
