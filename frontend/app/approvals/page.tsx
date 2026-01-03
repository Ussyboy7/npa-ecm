"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { Shield, Search, FileText, QrCode, Filter, ExternalLink, CheckCircle2, XCircle, TrendingUp, RefreshCw, Download, Loader2, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch, getBaseUrl } from "@/lib/api-client";
import { logError } from "@/lib/client-logger";
import { formatDateShort, formatDateTime } from "@/lib/correspondence-helpers";
import { exportToCSV } from "@/lib/admin-export";
import { toast } from "sonner";
import { SealBadge } from "@/components/seals/SealBadge";
import { DigitalSealPreview } from "@/components/seals/DigitalSealPreview";
import { EmptyState } from "@/components/shared/EmptyState";

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
  };
}

export default function ApprovalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize filters from URL params or localStorage
  const getInitialFilter = (key: string, defaultValue: string): string => {
    if (typeof window === 'undefined') return defaultValue;
    const urlParam = searchParams.get(key);
    if (urlParam) return urlParam;
    const saved = localStorage.getItem(`approvals_filter_${key}`);
    return saved ? JSON.parse(saved) : defaultValue;
  };

  const [approvals, setApprovals] = useState<ExecutiveApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(() => getInitialFilter('search', ''));
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>(() => getInitialFilter('role', 'all'));
  const [filterStatus, setFilterStatus] = useState<string>(() => getInitialFilter('status', 'all'));
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'last30' | 'last90' | 'thisYear' | 'custom'>(() => getInitialFilter('dateRange', 'all') as 'all' | 'last30' | 'last90' | 'thisYear' | 'custom');
  const [customDateFrom, setCustomDateFrom] = useState<string>('');
  const [customDateTo, setCustomDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>(() => getInitialFilter('sortBy', 'sealedAt'));
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => (getInitialFilter('sortOrder', 'desc') as 'asc' | 'desc'));
  const [showFilters, setShowFilters] = useState(false);
  const [count, setCount] = useState(0);
  const fetchApprovalsRef = useRef<(() => Promise<void>) | null>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Persist filters to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('approvals_filter_search', JSON.stringify(searchTerm));
    localStorage.setItem('approvals_filter_role', JSON.stringify(filterRole));
    localStorage.setItem('approvals_filter_status', JSON.stringify(filterStatus));
    localStorage.setItem('approvals_filter_dateRange', JSON.stringify(dateRangeFilter));
    localStorage.setItem('approvals_filter_sortBy', JSON.stringify(sortBy));
    localStorage.setItem('approvals_filter_sortOrder', JSON.stringify(sortOrder));
  }, [searchTerm, filterRole, filterStatus, dateRangeFilter, sortBy, sortOrder]);

  // Sync filters with URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (filterRole !== 'all') params.set('role', filterRole);
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (dateRangeFilter !== 'all') params.set('dateRange', dateRangeFilter);
    if (sortBy !== 'sealedAt') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
    // Note: pagination.page and pagination.pageSize will be added after pagination hook is defined

    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [searchTerm, filterRole, filterStatus, dateRangeFilter, sortBy, sortOrder]);

  // Reset page when filters change - will be added after pagination is defined

  const loadApprovals = useCallback(async (page: number = 1, pageSize: number = 25) => {
    try {
      setLoading(true);
      setError(null);
      // Use backend filtering for executive approvals with seals
      const params = new URLSearchParams({
        action_type: 'approve',
        has_seal: 'true', // Backend filter for minutes with valid seals
        page: String(page),
        page_size: String(pageSize),
        ordering: '-timestamp', // Most recent first
      });
      
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
          } : undefined,
          };
        });
      
      setApprovals(executiveApprovals);
      // Use backend count for accurate pagination
      const count = (response && typeof response === 'object' && 'count' in response && typeof response.count === 'number') 
        ? response.count 
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
      toast.error(errorMessage);
      setApprovals([]);
      setCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Store loadApprovals ref
  useEffect(() => {
    fetchApprovalsRef.current = loadApprovals;
  }, [loadApprovals]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadApprovals(pagination.page, pagination.pageSize);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch all approvals for export using backend filter
      const params = new URLSearchParams({
        action_type: 'approve',
        has_seal: 'true', // Use backend filter
        page_size: '1000', // Reasonable limit for export
        ordering: '-timestamp',
      });
      
      const response = await apiFetch<Record<string, unknown> | Record<string, unknown>[] | { results: Record<string, unknown>[] }>(`/correspondence/minutes/?${params.toString()}`);
      const minutes: Record<string, unknown>[] = Array.isArray(response) ? response : (response && typeof response === 'object' && 'results' in response && Array.isArray(response.results)) ? response.results : [];
      
      const allExecutiveApprovals = minutes
        .map((m: Record<string, unknown>) => {
          const correspondenceDetails = (m.correspondence_details as Record<string, unknown>) || {};
          const user = (m.user as Record<string, unknown>) || {};
          const sealData = (m.seal_data as Record<string, unknown>) || {};
          return {
            id: m.id,
            correspondenceId: m.correspondence,
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
            sealData: sealData,
          };
        })
        .filter((m: Record<string, unknown>) => {
          const sealData = (m.sealData as Record<string, unknown>) || {};
          return sealData && (sealData.is_valid as boolean) !== false;
        })
        .map((m: Record<string, unknown>) => {
          const correspondenceDetails = (m.correspondence_details as Record<string, unknown>) || {};
          const user = (m.user as Record<string, unknown>) || {};
          const sealData = (m.sealData as Record<string, unknown>) || {};
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
            sealedAt: (sealData.sealed_at as string) || (m.timestamp as string) || "",
            serialNumber: (sealData.serial_number as string) || "N/A",
            verificationUrl: (sealData.verification_url as string) || "",
            isValid: (sealData.is_valid as boolean) ?? true,
          };
        });

      // Apply filters to export data
      const filtered = allExecutiveApprovals.filter((approval) => {
        const matchesSearch = 
          approval.correspondenceSubject.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          approval.correspondenceReference.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          approval.sealedBy.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          approval.serialNumber.toLowerCase().includes(debouncedSearch.toLowerCase());
        
        const matchesRole = filterRole === "all" || 
          approval.sealedByRole.toLowerCase().includes(filterRole.toLowerCase());
        
        const matchesStatus = filterStatus === "all" || 
          (filterStatus === "valid" && approval.isValid) ||
          (filterStatus === "invalid" && !approval.isValid);
        
        // Date range filtering
        let matchesDate = true;
        if (dateRangeFilter === 'last30') {
          const date = new Date(approval.sealedAt);
          const fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - 30);
          matchesDate = date >= fromDate;
        } else if (dateRangeFilter === 'last90') {
          const date = new Date(approval.sealedAt);
          const fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - 90);
          matchesDate = date >= fromDate;
        } else if (dateRangeFilter === 'thisYear') {
          const date = new Date(approval.sealedAt);
          const now = new Date();
          matchesDate = date.getFullYear() === now.getFullYear();
        } else if (dateRangeFilter === 'custom') {
          const date = new Date(approval.sealedAt);
          if (customDateFrom) {
            const from = new Date(customDateFrom);
            matchesDate = date >= from;
          }
          if (customDateTo) {
            const to = new Date(customDateTo);
            to.setHours(23, 59, 59, 999);
            matchesDate = matchesDate && date <= to;
          }
        }
        
        return matchesSearch && matchesRole && matchesStatus && matchesDate;
      });

      const exportData = filtered.map((a) => ({
        'Reference Number': a.correspondenceReference,
        'Subject': a.correspondenceSubject,
        'Executive': a.sealedBy,
        'Role': a.sealedByRole,
        'Office': a.officeName,
        'Office Title': a.officeTitle,
        'Serial Number': a.serialNumber,
        'Sealed At': formatDateTime(a.sealedAt),
        'Status': a.isValid ? 'Valid' : 'Invalid',
        'Verification URL': a.verificationUrl,
      }));

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

  const filteredApprovals = useMemo(() => {
    let filtered = approvals.filter((approval) => {
      const matchesSearch = 
        approval.correspondenceSubject.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        approval.correspondenceReference.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        approval.sealedBy.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        approval.serialNumber.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      const matchesRole = filterRole === "all" || 
        approval.sealedByRole.toLowerCase().includes(filterRole.toLowerCase());
      
      const matchesStatus = filterStatus === "all" || 
        (filterStatus === "valid" && approval.isValid) ||
        (filterStatus === "invalid" && !approval.isValid);
      
      // Date range filtering
      let matchesDate = true;
      if (dateRangeFilter === 'last30') {
        const date = new Date(approval.sealedAt);
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 30);
        matchesDate = date >= fromDate;
      } else if (dateRangeFilter === 'last90') {
        const date = new Date(approval.sealedAt);
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 90);
        matchesDate = date >= fromDate;
      } else if (dateRangeFilter === 'thisYear') {
        const date = new Date(approval.sealedAt);
        const now = new Date();
        matchesDate = date.getFullYear() === now.getFullYear();
      } else if (dateRangeFilter === 'custom') {
        const date = new Date(approval.sealedAt);
        if (customDateFrom) {
          const from = new Date(customDateFrom);
          matchesDate = date >= from;
        }
        if (customDateTo) {
          const to = new Date(customDateTo);
          to.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && date <= to;
        }
      }
      
      return matchesSearch && matchesRole && matchesStatus && matchesDate;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'sealedAt') {
        comparison = new Date(a.sealedAt).getTime() - new Date(b.sealedAt).getTime();
      } else if (sortBy === 'executive') {
        comparison = a.sealedBy.localeCompare(b.sealedBy);
      } else if (sortBy === 'reference') {
        comparison = (a.correspondenceReference || '').localeCompare(b.correspondenceReference || '');
      } else if (sortBy === 'status') {
        comparison = (a.isValid ? 1 : 0) - (b.isValid ? 1 : 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [approvals, debouncedSearch, filterRole, filterStatus, dateRangeFilter, customDateFrom, customDateTo, sortBy, sortOrder]);

  // Use pagination hook with backend count
  const pagination = usePagination({
    initialPage: 1,
    initialPageSize: 25,
    totalCount: count, // Use backend count for accurate pagination
  });

  // Load data when pagination changes
  useEffect(() => {
    loadApprovals(pagination.page, pagination.pageSize);
  }, [pagination.page, pagination.pageSize]);

  // Reset page when filters change
  useEffect(() => {
    pagination.goToFirstPage();
  }, [debouncedSearch, filterRole, filterStatus, dateRangeFilter, sortBy, sortOrder]);

  // Sync pagination with URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (filterRole !== 'all') params.set('role', filterRole);
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (dateRangeFilter !== 'all') params.set('dateRange', dateRangeFilter);
    if (sortBy !== 'sealedAt') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
    if (pagination.page > 1) params.set('page', String(pagination.page));
    if (pagination.pageSize !== 25) params.set('pageSize', String(pagination.pageSize));

    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [searchTerm, filterRole, filterStatus, dateRangeFilter, sortBy, sortOrder, pagination.page, pagination.pageSize]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (debouncedSearch) count++;
    if (filterRole !== "all") count++;
    if (filterStatus !== "all") count++;
    if (dateRangeFilter !== "all") count++;
    return count;
  }, [debouncedSearch, filterRole, filterStatus, dateRangeFilter]);

  const clearAllFilters = () => {
    setSearchTerm("");
    setFilterRole("all");
    setFilterStatus("all");
    setDateRangeFilter("all");
    setCustomDateFrom("");
    setCustomDateTo("");
  };


  // With server-side pagination, filteredApprovals already contains the current page
  // Client-side filtering is applied to the current page's data only
  const paginatedApprovals = useMemo(() => {
    return filteredApprovals;
  }, [filteredApprovals]);


  // Statistics from filtered approvals
  const statistics = useMemo(() => {
    const filtered = filteredApprovals;
    return {
      total: filtered.length,
      valid: filtered.filter(a => a.isValid).length,
      invalid: filtered.filter(a => !a.isValid).length,
      thisMonth: filtered.filter(a => {
        const date = new Date(a.sealedAt);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }).length,
    };
  }, [filteredApprovals]);

  const toggleRole = (role: string) => {
    setFilterRole(role === filterRole ? "all" : role);
  };

  const toggleStatus = (status: string) => {
    setFilterStatus(status === filterStatus ? "all" : status);
  };

  // Approval Card Component (similar to CorrespondenceCard in Office Inbox)
  const ApprovalCard = ({ approval }: { approval: ExecutiveApproval }) => {
    // Combine office name and title intelligently
    const officeDisplay = approval.officeTitle && approval.officeTitle !== approval.officeName
      ? `${approval.officeName} - ${approval.officeTitle}`
      : approval.officeName || approval.officeTitle;

    const handleCardClick = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        // Open approval PDF when card is clicked
        const pdfBlob = await apiFetch<Blob>(`/correspondence/minutes/${approval.id}/approval-pdf/`, { responseType: 'blob' });
        const blobUrl = URL.createObjectURL(pdfBlob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } catch (error) {
        logError("Failed to load PDF:", error);
        toast.error(`Failed to load PDF: ${error instanceof Error ? error.message : String(error)}`);
        // Fallback to correspondence if PDF fails
        router.push(`/correspondence/${approval.correspondenceId}`);
      }
    };

    return (
      <div 
        onClick={handleCardClick}
        className="p-4 border border-border rounded-lg hover:bg-muted/50 hover:shadow-soft transition-all cursor-pointer"
      >
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg flex-shrink-0 ${approval.isValid ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
            <Shield className={`h-5 w-5 ${approval.isValid ? 'text-emerald-600' : 'text-destructive'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground truncate mb-1">{approval.correspondenceSubject}</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={approval.isValid ? 'default' : 'destructive'}>
                    {approval.isValid ? 'Valid' : 'Invalid'}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Shield className="h-3 w-3" />
                    {approval.sealedByRole}
                  </Badge>
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDateShort(approval.sealedAt)}
              </span>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                <span>Ref: {approval.correspondenceReference}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" />
                <span>Executive: {approval.sealedBy}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="truncate">Office: {officeDisplay}</span>
              </div>
              <div className="flex items-center gap-2">
                <QrCode className="h-3.5 w-3.5" />
                <code className="text-xs font-mono">Serial: {approval.serialNumber}</code>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    const pdfBlob = await apiFetch<Blob>(`/correspondence/minutes/${approval.id}/approval-pdf/`, { responseType: 'blob' });
                    const blobUrl = URL.createObjectURL(pdfBlob);
                    window.open(blobUrl, '_blank');
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                  } catch (error) {
                    logError("Failed to load PDF:", error);
                    toast.error(`Failed to load PDF: ${error instanceof Error ? error.message : String(error)}`);
                  }
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                View PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/correspondence/${approval.correspondenceId}`);
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Correspondence
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const verifyUrl = typeof window !== 'undefined' 
                    ? `${window.location.origin}/verify/${approval.serialNumber}`
                    : approval.verificationUrl;
                  window.open(verifyUrl, '_blank');
                }}
              >
                <QrCode className="h-4 w-4 mr-2" />
                Verify Seal
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header - Simple like Office Inbox */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Executive Approvals</h1>
            <p className="text-muted-foreground mt-1">Track and verify all executive approvals with digital seals</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" /> Filters
              {activeFilterCount > 0 && <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading || refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || loading || filteredApprovals.length === 0}>
              <Download className={`h-4 w-4 mr-2 ${exporting ? 'animate-spin' : ''}`} />
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>

        <HelpGuideCard
          title="Executive Approvals"
          description="View all correspondence approvals that have been sealed with digital executive seals. Use filters to find specific approvals, verify seals, and export data for reporting."
          links={[{ label: 'Verify Seal', href: '/verify' }, { label: 'Help & Guides', href: '/help' }]}
        />

        {/* Summary Stats - Using filtered statistics */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Total Approvals',
              value: statistics.total,
              icon: Shield,
              bgClass: 'bg-primary/10',
              iconClass: 'text-primary',
            },
            {
              label: 'Valid Seals',
              value: statistics.valid,
              icon: CheckCircle2,
              bgClass: 'bg-emerald-500/10',
              iconClass: 'text-emerald-600 dark:text-emerald-500',
            },
            {
              label: 'Invalid Seals',
              value: statistics.invalid,
              icon: XCircle,
              bgClass: 'bg-destructive/10',
              iconClass: 'text-destructive',
            },
            {
              label: 'This Month',
              value: statistics.thisMonth,
              icon: TrendingUp,
              bgClass: 'bg-blue-500/10',
              iconClass: 'text-blue-600 dark:text-blue-500',
            },
          ].map(({ label, value, icon: Icon, bgClass, iconClass }) => (
            <Card key={label} className="shadow-soft hover:shadow-medium transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${bgClass}`}>
                    <Icon className={`h-6 w-6 ${iconClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters Panel - Enhanced */}
        {showFilters && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Approval Filters</CardTitle>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>Clear All</Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Role</Label>
                  <div className="flex flex-wrap gap-1">
                    <Badge
                      variant={filterRole === 'all' ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => setFilterRole('all')}
                    >
                      All Roles
                    </Badge>
                    {['managing director', 'executive director'].map((role) => (
                      <Badge
                        key={role}
                        variant={filterRole === role ? 'default' : 'outline'}
                        className="cursor-pointer capitalize text-xs"
                        onClick={() => toggleRole(role)}
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Status</Label>
                  <div className="flex flex-wrap gap-1">
                    <Badge
                      variant={filterStatus === 'all' ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => setFilterStatus('all')}
                    >
                      All Status
                    </Badge>
                    {['valid', 'invalid'].map((status) => (
                      <Badge
                        key={status}
                        variant={filterStatus === status ? 'default' : 'outline'}
                        className="cursor-pointer capitalize text-xs"
                        onClick={() => toggleStatus(status)}
                      >
                        {status}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Date Range</Label>
                  <Select value={dateRangeFilter} onValueChange={(value) => setDateRangeFilter(value as typeof dateRangeFilter)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="last30">Last 30 Days</SelectItem>
                      <SelectItem value="last90">Last 90 Days</SelectItem>
                      <SelectItem value="thisYear">This Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                  {dateRangeFilter === 'custom' && (
                    <div className="mt-2 space-y-2">
                      <Input
                        type="date"
                        placeholder="From"
                        value={customDateFrom}
                        onChange={(e) => setCustomDateFrom(e.target.value)}
                        className="w-full"
                      />
                      <Input
                        type="date"
                        placeholder="To"
                        value={customDateTo}
                        onChange={(e) => setCustomDateTo(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Sort By</Label>
                  <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => { const [by, order] = value.split('-'); setSortBy(by); setSortOrder(order as 'asc' | 'desc'); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sealedAt-desc">Sealed At (Newest)</SelectItem>
                      <SelectItem value="sealedAt-asc">Sealed At (Oldest)</SelectItem>
                      <SelectItem value="executive-asc">Executive (A-Z)</SelectItem>
                      <SelectItem value="executive-desc">Executive (Z-A)</SelectItem>
                      <SelectItem value="reference-asc">Reference (A-Z)</SelectItem>
                      <SelectItem value="reference-desc">Reference (Z-A)</SelectItem>
                      <SelectItem value="status-desc">Status (Valid First)</SelectItem>
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
            placeholder="Search by subject, reference, executive, or serial number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Approvals Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Approvals ({filteredApprovals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredApprovals.length === 0 ? (
              <EmptyState
                icon={<Shield className="h-12 w-12" />}
                title="No executive approvals found"
                description={
                  activeFilterCount > 0 
                    ? "Try adjusting your filters to see more results."
                    : "Executive approvals will appear here once they are created."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Correspondence</TableHead>
                      <TableHead className="w-[180px]">Executive</TableHead>
                      <TableHead className="w-[120px]">Serial Number</TableHead>
                      <TableHead className="w-[150px]">Sealed At</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApprovals.map((approval) => (
                      <TableRow key={approval.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{approval.correspondenceReference}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {approval.correspondenceSubject}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{approval.sealedBy}</div>
                            <div className="text-xs text-muted-foreground truncate">{approval.sealedByRole}</div>
                            <div className="text-xs text-muted-foreground truncate">{approval.officeTitle}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs font-mono bg-muted px-2 py-1 rounded block truncate max-w-full">
                            {approval.serialNumber}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {formatDateShort(approval.sealedAt)}
                            <div className="text-muted-foreground mt-0.5">
                              {new Date(approval.sealedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {approval.sealData && approval.isValid ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-shrink-0">
                                <DigitalSealPreview
                                  officeName={approval.sealData.officeName}
                                  officeTitle={approval.sealData.officeTitle}
                                  serialNumber={approval.sealData.serialNumber}
                                  signatureImage={approval.sealData.sealImageUrl}
                                  timestamp={approval.sealData.sealedAt}
                                  size={60}
                                  showQR={false}
                                  verificationBaseUrl={typeof window !== 'undefined' ? window.location.origin : undefined}
                                />
                              </div>
                              <SealBadge sealData={approval.sealData} size="sm" />
                            </div>
                          ) : approval.sealData ? (
                            <SealBadge sealData={approval.sealData} size="sm" />
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={async () => {
                                try {
                                  const pdfUrl = `${getBaseUrl()}/correspondence/minutes/${approval.id}/approval-pdf/`;
                                  const pdfBlob = await apiFetch<Blob>(pdfUrl, { responseType: 'blob' });
                                  const blobUrl = URL.createObjectURL(pdfBlob);
                                  window.open(blobUrl, '_blank');
                                  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                                } catch (error) {
                                  console.error("Failed to load PDF:", error);
                                  toast.error(`Failed to load PDF: ${error instanceof Error ? error.message : String(error)}`);
                                }
                              }}
                              title="View Approval PDF"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => router.push(`/correspondence/${approval.correspondenceId}`)}
                              title="View Correspondence Details"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                // Build verification URL dynamically based on current environment
                                const verifyUrl = typeof window !== 'undefined' 
                                  ? `${window.location.origin}/verify/${approval.serialNumber}`
                                  : approval.verificationUrl;
                                window.open(verifyUrl, '_blank');
                              }}
                              title="Verify Seal with QR Code"
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

