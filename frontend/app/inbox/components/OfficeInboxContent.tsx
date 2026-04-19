"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logInfo } from '@/lib/client-logger';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mail,
  Search,
  User as UserIcon,
  ArrowDown,
  ArrowUp,
  Clock,
  AlertCircle,
  Building2,
  Inbox,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Copy,
} from 'lucide-react';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Correspondence } from '@/lib/npa-structure';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { fetchSLATargets, type SLATargets } from '@/lib/sla-client';
import { exportToCSV } from '@/lib/admin-export';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { FlowTypeBadge } from '@/components/correspondence/FlowTypeBadge';
import { logError } from '@/lib/client-logger';

const STORAGE_KEY = 'office-inbox-selection';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

// Default SLA thresholds in hours (fallback if API fails)
const DEFAULT_SLA_THRESHOLDS: Record<string, number> = {
  urgent: 48,   // 2 days = 48 hours
  high: 72,      // 3 days = 72 hours
  medium: 120,   // 5 days = 120 hours
  low: 168,      // 7 days = 168 hours
  default: 120,
};

const isOverdue = (item: Correspondence, slaTargets: SLATargets | null): boolean => {
  if (!item.receivedDate) return false;
  const priority = item.priority ?? 'medium';
  const thresholdHours = slaTargets?.[priority as keyof SLATargets] ?? DEFAULT_SLA_THRESHOLDS[priority] ?? DEFAULT_SLA_THRESHOLDS.default;
  const received = new Date(item.receivedDate).getTime();
  const hoursOpen = (Date.now() - received) / (1000 * 60 * 60); // Hours since received
  return hoursOpen > thresholdHours && item.status as string !== 'completed';
};

const calculateDaysPending = (item: Correspondence): number => {
  if (!item.receivedDate) return 0;
  const received = new Date(item.receivedDate).getTime();
  return Math.floor((Date.now() - received) / (1000 * 60 * 60 * 24));
};

type InboxSummary = {
  total: number;
  urgent: number;
  overdue: number;
  assigned_to_user: number;
};

const DEFAULT_SUMMARY: InboxSummary = {
  total: 0,
  urgent: 0,
  overdue: 0,
  assigned_to_user: 0,
};

const CorrespondenceInbox = () => {
  const router = useRouter();
  const { currentUser, hydrated } = useCurrentUser();
  const { divisions, users: organizationUsers, offices, officeMemberships } = useOrganization();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('all');
  
  // Use pagination hook
  const [count, setCount] = useState(0);
  const pagination = usePagination({
    initialPage: 1,
    initialPageSize: 25,
    totalCount: count,
  });
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['pending', 'in-progress']);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<string>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const [inboxItems, setInboxItems] = useState<Correspondence[]>([]);
  const [summary, setSummary] = useState<InboxSummary>(DEFAULT_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slaTargets, setSlaTargets] = useState<SLATargets | null>(null);
  const [exporting, setExporting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchInProgressRef = useRef<boolean>(false);
  const lastFetchParamsRef = useRef<string>('');
  const requestIdRef = useRef<number>(0);

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

  const isSuperuser = Boolean(currentUser?.isSuperuser);
  const hasCorrespondenceAccess = userOfficeIds.length > 0 || isSuperuser;

  const selectableOffices = useMemo(() => {
    if (isSuperuser) return offices;
    const membershipOfficeIds = new Set(userOfficeIds);
    return offices.filter((office) => membershipOfficeIds.has(office.id));
  }, [isSuperuser, offices, userOfficeIds]);

  // Get user's organizational unit IDs for CC/distribution matching
  const userOrgIds = useMemo(() => {
    const officeIds = new Set<string>();
    const divisionIds = new Set<string>();
    const departmentIds = new Set<string>();
    const directorateIds = new Set<string>();

    // Get from user's offices
    userOfficeMemberships.forEach((membership) => {
      const office = offices.find((o) => o.id === membership.officeId);
      if (office) {
        officeIds.add(office.id);
        if (office.divisionId) divisionIds.add(office.divisionId);
        if (office.departmentId) departmentIds.add(office.departmentId);
        if (office.directorateId) directorateIds.add(office.directorateId);
      }
    });

    // Note: User type has division/department/directorate as names, not IDs
    // The office memberships above already capture the user's organizational units

    return { officeIds, divisionIds, departmentIds, directorateIds };
  }, [userOfficeMemberships, offices, currentUser]);

  // Helper to check if user is a CC recipient and get the purpose
  const getCCInfo = (corr: Correspondence): { isCC: boolean; purpose?: string } => {
    if (!corr.distribution || corr.distribution.length === 0) {
      return { isCC: false };
    }

    for (const recipient of corr.distribution) {
      // Check if user's org matches this distribution entry
      if (recipient.type === 'office' && recipient.officeId && userOrgIds.officeIds.has(recipient.officeId)) {
        return { isCC: true, purpose: recipient.purpose };
      }
      if (recipient.type === 'division' && recipient.divisionId && userOrgIds.divisionIds.has(recipient.divisionId)) {
        return { isCC: true, purpose: recipient.purpose };
      }
      if (recipient.type === 'department' && recipient.departmentId && userOrgIds.departmentIds.has(recipient.departmentId)) {
        return { isCC: true, purpose: recipient.purpose };
      }
      if (recipient.type === 'directorate' && recipient.directorateId && userOrgIds.directorateIds.has(recipient.directorateId)) {
        return { isCC: true, purpose: recipient.purpose };
      }
    }

    return { isCC: false };
  };

  // Count active filters for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStatuses.length > 0 && !(selectedStatuses.length === 2 && selectedStatuses.includes('pending') && selectedStatuses.includes('in-progress'))) count++;
    if (selectedPriorities.length > 0) count++;
    if (assignedOnly) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (selectedOfficeId !== 'all') count++;
    return count;
  }, [selectedStatuses, selectedPriorities, assignedOnly, dateFrom, dateTo, selectedOfficeId]);

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const togglePriority = (priority: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]
    );
  };

  const clearAllFilters = () => {
    setSelectedStatuses(['pending', 'in-progress']);
    setSelectedPriorities([]);
    setAssignedOnly(false);
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
    setSelectedOfficeId('all');
  };

  useEffect(() => {
    if (!hasCorrespondenceAccess) return;
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'all' || userOfficeIds.includes(saved) || (isSuperuser && selectableOffices.some((office) => office.id === saved)))) {
        setSelectedOfficeId(saved);
        return;
      }
    }
    if (userOfficeIds.length > 0) {
      setSelectedOfficeId(userOfficeIds[0]);
    } else if (isSuperuser) {
      setSelectedOfficeId('all');
    }
  }, [hasCorrespondenceAccess, userOfficeIds, isSuperuser, selectableOffices]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, selectedOfficeId);
    }
  }, [selectedOfficeId]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    pagination.goToFirstPage();
  }, [selectedOfficeId, debouncedSearch, selectedStatuses, selectedPriorities, assignedOnly, sortBy, sortOrder, dateFrom, dateTo]);

  // Load SLA targets on mount
  useEffect(() => {
    const loadSLATargets = async () => {
      try {
        const targets = await fetchSLATargets();
        setSlaTargets(targets);
      } catch (err) {
        logError('Failed to load SLA targets:', err);
        // Use defaults if API fails
        setSlaTargets({ urgent: 2, high: 5, medium: 10, low: 14 });
      }
    };
    void loadSLATargets();
  }, []);

  useEffect(() => {
    if (currentUser?.id && !hasCorrespondenceAccess) {
      router.replace('/inbox');
    }
  }, [currentUser?.id, hasCorrespondenceAccess, router]);

  // Memoize fetch function to prevent unnecessary recreations
  const fetchInbox = useCallback(async () => {
    if (!currentUser?.id || !hasCorrespondenceAccess) {
      return;
    }

    // Build params string for deduplication
    const params = new URLSearchParams();
    let appendedOffice = false;
    if (selectedOfficeId && selectedOfficeId !== 'all') {
      params.append('office', selectedOfficeId);
      appendedOffice = true;
    } else if (userOfficeIds.length > 0) {
      userOfficeIds.forEach((officeId) => params.append('office', officeId));
      appendedOffice = true;
    }

    if (!appendedOffice && isSuperuser) {
      params.append('include_all_offices', 'true');
    }
    if (debouncedSearch) params.append('search', debouncedSearch);
    if (selectedStatuses.length > 0) {
      selectedStatuses.forEach((status) => params.append('status', status));
    }
    if (selectedPriorities.length > 0) {
      selectedPriorities.forEach((priority) => params.append('priority', priority));
    }
    if (assignedOnly) params.append('assigned_only', 'true');
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    params.append('sort_by', sortBy);
    params.append('sort_order', sortOrder);
    params.append('page', String(pagination.page));
    params.append('page_size', String(pagination.pageSize));

    const paramsString = params.toString();
    
    // Deduplication: Skip if same params and fetch in progress
    if (fetchInProgressRef.current && lastFetchParamsRef.current === paramsString) {
      logInfo('[OfficeInboxContent] Skipping duplicate fetch with same params');
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    // Track this request
    const currentRequestId = ++requestIdRef.current;
    fetchInProgressRef.current = true;
    lastFetchParamsRef.current = paramsString;

    setLoading(true);
    setError(null);
    
    try {
      const response = await apiFetch<Record<string, unknown>>(
        `/correspondence/items/office-inbox/?${paramsString}`,
        { signal: controller.signal }
      );
      
      // Ignore stale responses (if a new request was made)
      if (currentRequestId !== requestIdRef.current) {
        logInfo('[OfficeInboxContent] Ignoring stale response');
        return;
      }
      
      // Handle both paginated and non-paginated responses
      const results = Array.isArray(response.results) 
        ? response.results 
        : (Array.isArray(response) ? response : []);
      
      setInboxItems(results.map(mapApiCorrespondence));
      const summary = response.summary as Record<string, unknown> as Record<string, unknown> | undefined;
      setSummary({
        total: (summary && typeof summary.total === 'number') ? summary.total : (response.count as number as number ?? results.length),
        urgent: (summary && typeof summary.urgent === 'number') ? summary.urgent : 0,
        overdue: (summary && typeof summary.overdue === 'number') ? summary.overdue : 0,
        assigned_to_user: (summary && typeof summary.assigned_to_user === 'number') ? summary.assigned_to_user : 0,
      });
      setCount((response.count as number as number) ?? results.length);
    } catch (err: unknown) {
      // Ignore abort errors and stale requests
      if ((err instanceof Error && err.name === 'AbortError') || currentRequestId !== requestIdRef.current) {
        return;
      }
      logError('Failed to load office inbox', err);

      // Extract user-friendly error message
      let errorMessage = 'Please try again.';
      if (err instanceof Error && err.message) {
        // For authentication errors, show a more helpful message
        if (err.message.includes('Authentication') || err.message.includes('401')) {
          errorMessage = 'Authentication required. Please refresh the page.';
        } else if (err.message.includes('403') || err.message.includes('permission')) {
          errorMessage = 'You do not have permission to access this inbox.';
        } else if (err.message.includes('404')) {
          errorMessage = 'Office inbox endpoint not found.';
        } else if (err.message.includes('500') || err.message.includes('server')) {
          errorMessage = 'Server error. Please try again later.';
        } else if (err.message.includes('Network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          // For other errors, show a sanitized version
          const msg = err.message.length > 100 ? err.message.substring(0, 100) + '...' : err.message;
          errorMessage = msg;
        }
      }
      
      // Log the full error for debugging
      logError('[OfficeInboxContent] Full error:', {
        error: err,
        message: (err instanceof Error ? err.message : 'Unknown error'),
        status: (err instanceof Error && 'status' in err ? (err as any).status : undefined),
        response: (err instanceof Error && 'response' in err ? (err as any).response : undefined),
      });
      
      setError(`Failed to load office inbox. ${errorMessage}`);
      setInboxItems([]);
      setSummary(DEFAULT_SUMMARY);
      setCount(0);
    } finally {
      // Only update loading state if this is still the current request
      if (currentRequestId === requestIdRef.current && !controller.signal.aborted) {
        setLoading(false);
        fetchInProgressRef.current = false;
      }
    }
  }, [
    currentUser,
    hasCorrespondenceAccess,
    selectedOfficeId,
    debouncedSearch,
    pagination.page,
    pagination.pageSize,
    userOfficeIds,
    isSuperuser,
    selectedStatuses,
    selectedPriorities,
    assignedOnly,
    sortBy,
    sortOrder,
    dateFrom,
    dateTo,
  ]);

  // Main effect to trigger fetch
  useEffect(() => {
    if (!currentUser?.id || !hasCorrespondenceAccess) {
      return;
    }

    void fetchInbox();

    // Cleanup: abort request on unmount or dependency change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchInbox, currentUser?.id, hasCorrespondenceAccess]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-warning bg-warning/10';
      case 'in-progress': return 'text-info bg-info/10';
      case 'completed': return 'text-success bg-success/10';
      case 'archived': return 'text-muted-foreground bg-muted';
      default: return 'text-foreground bg-muted';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const handleExport = async () => {
    if (inboxItems.length === 0) {
      toast.error('No items to export');
      return;
    }

    setExporting(true);
    try {
      // Fetch all items matching current filters (not just current page)
      const params = new URLSearchParams();
      let appendedOffice = false;
      if (selectedOfficeId && selectedOfficeId !== 'all') {
        params.append('office', selectedOfficeId);
        appendedOffice = true;
      } else if (userOfficeIds.length > 0) {
        userOfficeIds.forEach((officeId) => params.append('office', officeId));
        appendedOffice = true;
      }

      if (!appendedOffice && isSuperuser) {
        params.append('include_all_offices', 'true');
      }
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (selectedStatuses.length > 0) {
        selectedStatuses.forEach((status) => params.append('status', status));
      }
      if (selectedPriorities.length > 0) {
        selectedPriorities.forEach((priority) => params.append('priority', priority));
      }
      if (assignedOnly) params.append('assigned_only', 'true');
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      params.append('sort_by', sortBy);
      params.append('sort_order', sortOrder);
      params.append('page_size', '1000'); // Reasonable limit for export

      const response = await apiFetch<Record<string, unknown>>(`/correspondence/items/office-inbox/?${params.toString()}`);
      const allItems = Array.isArray(response.results) ? response.results.map(mapApiCorrespondence) : [];

      const exportData = allItems.map((item: Correspondence) => ({
        'Reference Number': item.referenceNumber || '',
        'Subject': item.subject || '',
        'Sender': item.senderName || '',
        'Priority': item.priority || '',
        'Status': item.status as string || '',
        'Direction': item.direction || '',
        'Received Date': item.receivedDate ? formatDateShort(item.receivedDate) : '',
        'Days Pending': calculateDaysPending(item),
        'Current Office': item.currentOfficeName || '',
        'Current Approver': organizationUsers.find(u => u.id === item.currentApproverId)?.name || '',
        'Division': divisions.find(d => d.id === item.divisionId)?.name || '',
      }));

      exportToCSV(exportData, [
        { key: 'Reference Number', label: 'Reference Number' },
        { key: 'Subject', label: 'Subject' },
        { key: 'Sender', label: 'Sender' },
        { key: 'Priority', label: 'Priority' },
        { key: 'Status', label: 'Status' },
        { key: 'Direction', label: 'Direction' },
        { key: 'Received Date', label: 'Received Date' },
        { key: 'Days Pending', label: 'Days Pending' },
        { key: 'Current Office', label: 'Current Office' },
        { key: 'Current Approver', label: 'Current Approver' },
        { key: 'Division', label: 'Division' },
      ], {
        filename: `office-inbox-export-${new Date().toISOString().split('T')[0]}.csv`,
      });

      toast.success(`Exported ${exportData.length} items successfully`);
    } catch (err: unknown) {
      toast.error('Failed to export items. Please try again.');
      logError('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const CorrespondenceCard = ({ corr }: { corr: Correspondence }) => {
    const division = corr.divisionId ? divisions.find((div) => div.id === corr.divisionId) : undefined;
    const currentApprover = corr.currentApproverId ? organizationUsers.find((user) => user.id === corr.currentApproverId) : undefined;
    const overdue = isOverdue(corr, slaTargets);
    const daysPending = calculateDaysPending(corr);
    const daysPendingColor = daysPending > 5 ? 'destructive' : daysPending > 2 ? 'default' : 'secondary';
    const ccInfo = getCCInfo(corr);

    const getPurposeLabel = (purpose?: string) => {
      switch (purpose) {
        case 'action': return 'For Action';
        case 'information': return 'For Info';
        case 'comment': return 'For Comment';
        default: return 'CC';
      }
    };

    const getPurposeColor = (purpose?: string) => {
      switch (purpose) {
        case 'action': return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
        case 'information': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
        case 'comment': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
        default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
      }
    };

    return (
      <Link 
        href={`/correspondence/${corr.id}`} 
        className="p-4 border border-border rounded-lg hover:bg-muted/50 hover:shadow-soft transition-all cursor-pointer block"
        aria-label={`View correspondence: ${corr.subject}`}
      >
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg relative ${corr.priority === 'urgent' ? 'bg-destructive/10' : corr.priority === 'high' ? 'bg-warning/10' : 'bg-primary/10'}`}>
            <Mail className={`h-5 w-5 ${corr.priority === 'urgent' ? 'text-destructive' : corr.priority === 'high' ? 'text-warning' : 'text-primary'}`} />
            {ccInfo.isCC && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <Copy className="h-2.5 w-2.5 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground truncate mb-1">{corr.subject}</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {ccInfo.isCC && (
                    <Badge variant="outline" className={`gap-1 ${getPurposeColor(ccInfo.purpose)}`}>
                      <Copy className="h-3 w-3" />
                      {getPurposeLabel(ccInfo.purpose)}
                  </Badge>
                  )}
                  <Badge variant={getPriorityColor(corr.priority)}>{corr.priority.toUpperCase()}</Badge>
                  <FlowTypeBadge
                    flowType={corr.flowType}
                    isInward={corr.isInward}
                    isOutward={corr.isOutward}
                    isInternal={corr.isInternal}
                    isExternal={corr.isExternal}
                  />
                  <Badge variant="secondary" className={getStatusColor(corr.status)}>{corr.status.replace('-', ' ')}</Badge>
                  {overdue && <Badge variant="destructive">SLA Breach</Badge>}
                  {daysPending > 0 && (
                    <Badge variant={daysPendingColor} className="gap-1">
                      <Clock className="h-3 w-3" />{daysPending} day{daysPending !== 1 ? 's' : ''} pending
                    </Badge>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateShort(corr.receivedDate)}</span>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><UserIcon className="h-3.5 w-3.5" /><span>From: {corr.senderName}</span></div>
              <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /><span>Ref: {corr.referenceNumber}</span></div>
              {division && <div className="flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5" /><span>Division: {division.name}</span></div>}
              {currentApprover && <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /><span>Current: {currentApprover.name}</span></div>}
              {corr.currentOfficeName && <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /><span>Office: {corr.currentOfficeName}</span></div>}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  if (!currentUser?.id) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading office inbox…</CardContent></Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!hasCorrespondenceAccess) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <Card><CardContent className="py-12 text-center"><p className="text-lg font-semibold">No office inbox available</p><p className="text-sm text-muted-foreground mt-2">This persona does not have registry or routing permissions. Redirecting you to your personal inbox…</p></CardContent></Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ErrorBoundary>
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Office Inbox</h1>
            <p className="text-muted-foreground mt-1">Monitor work queued in your offices and prioritize urgent escalations</p>
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
              disabled={exporting || inboxItems.length === 0}
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
              onClick={() => router.push('/correspondence/register')}
              aria-label="Register new correspondence"
            >
              <Mail className="h-4 w-4 mr-2" /> Register New
            </Button>
            <ContextualHelp
              title="How to triage correspondence"
              description="Pick one of your offices, tackle urgent/SLA breaches first, and then work through the remaining approvals."
              steps={['Select the office you are acting for.', 'Use search to find specific references or senders.', 'Open a record to minute, approve, delegate, or archive.']}
            />
          </div>
        </div>

        <HelpGuideCard
          title="Office Queue Basics"
          description="Department files, archives, and outgoing dispatch now live in their dedicated sections. This view is focused solely on items currently sitting with your office."
          links={[{ label: 'Department Files', href: '/correspondence/department-files' }, { label: 'Outbox', href: '/correspondence/outbox' }]}
        />

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Inbox Filters</CardTitle>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>Clear All</Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Office</Label>
                  <Select value={selectedOfficeId} onValueChange={setSelectedOfficeId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isSuperuser ? 'All Offices' : 'All My Offices'}</SelectItem>
                      {selectableOffices.map((office) => (
                        <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Status</Label>
                  <div className="flex flex-wrap gap-1">
                    {['pending', 'in-progress', 'completed', 'archived'].map((status) => (
                      <Badge
                        key={status}
                        variant={selectedStatuses.includes(status) ? 'default' : 'outline'}
                        className="cursor-pointer capitalize text-xs"
                        onClick={() => toggleStatus(status)}
                      >
                        {status.replace('-', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Priority</Label>
                  <div className="flex flex-wrap gap-1">
                    {['urgent', 'high', 'medium', 'low'].map((priority) => (
                      <Badge
                        key={priority}
                        variant={selectedPriorities.includes(priority) ? 'default' : 'outline'}
                        className="cursor-pointer capitalize text-xs"
                        onClick={() => togglePriority(priority)}
                        style={selectedPriorities.includes(priority) ? { backgroundColor: PRIORITY_COLORS[priority] } : {}}
                      >
                        {priority}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Assignment</Label>
                  <Badge
                    variant={assignedOnly ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setAssignedOnly(!assignedOnly)}
                  >
                    <UserIcon className="h-3 w-3 mr-1" /> Assigned to me
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Date From</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Date To</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Sort By</Label>
                    <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => { const [by, order] = value.split('-'); setSortBy(by); setSortOrder(order as 'asc' | 'desc'); }}>
                      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="priority-desc">Priority (Urgent First)</SelectItem>
                        <SelectItem value="days_pending-desc">Days Pending (Oldest)</SelectItem>
                        <SelectItem value="updated-desc">Last Updated (Newest)</SelectItem>
                        <SelectItem value="updated-asc">Last Updated (Oldest)</SelectItem>
                        <SelectItem value="reference-asc">Reference (A-Z)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input 
            placeholder="Search by subject, reference, sender, office, division..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-10"
            aria-label="Search correspondence"
            type="search"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total in Queue', value: summary.total, icon: Inbox, bgClass: 'bg-primary/10', iconClass: 'text-primary' },
            { label: 'Urgent Items', value: summary.urgent, icon: AlertCircle, bgClass: 'bg-destructive/10', iconClass: 'text-destructive' },
            { label: 'SLA Breaches', value: summary.overdue, icon: Clock, bgClass: 'bg-warning/10', iconClass: 'text-warning' },
            { label: 'Assigned to You', value: summary.assigned_to_user, icon: UserIcon, bgClass: 'bg-info/10', iconClass: 'text-info' },
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

        {error && <Card><CardContent className="py-4 text-sm text-destructive" role="alert">{error}</CardContent></Card>}

        {loading ? (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading office queue…</CardContent></Card>
        ) : inboxItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Inbox className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground mb-2">{debouncedSearch || activeFilterCount > 0 ? 'No items match your filters' : 'No correspondence routed to your office yet.'}</p>
              {(debouncedSearch || activeFilterCount > 0) && <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4">Clear Filters</Button>}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">{inboxItems.map((corr) => <CorrespondenceCard key={corr.id} corr={corr} />)}</div>
        )}

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
      </DashboardLayout>
    </ErrorBoundary>
  );
};

export default CorrespondenceInbox;
