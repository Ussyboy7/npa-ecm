"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { usePagination } from '@/hooks/use-pagination';
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
  Send,
  Building2,
  Loader2,
  AlertCircle,
  Download,
  Clock,
  Pencil,
  Undo2,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { formatDateShort } from '@/lib/correspondence-helpers';
import type { Correspondence } from '@/lib/npa-structure';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { exportToCSV } from '@/lib/admin-export';
import { toast } from 'sonner';
import { logError } from '@/lib/client-logger';
import { cn } from '@/lib/utils';
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
import { FlowTypeBadge } from '@/components/correspondence/FlowTypeBadge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const calculateDaysPending = (item: Correspondence): number => {
  if (!item.receivedDate) return 0;
  const received = new Date(item.receivedDate).getTime();
  return Math.floor((Date.now() - received) / (1000 * 60 * 60 * 24));
};

// Status badge variant helper (consistent with My Outbox)
const getStatusBadgeVariant = (status: string): 'destructive' | 'secondary' | 'default' | 'outline' => {
  if (status === 'pending') return 'destructive';
  if (status === 'in-progress') return 'secondary';
  if (status === 'completed') return 'default';
  return 'outline';
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

const OfficeOutboxPage = () => {
  const router = useRouter();
  const {currentUser, hydrated: _hydrated } = useCurrentUser();
  const systemRole = typeof currentUser?.systemRole === 'string' ? currentUser.systemRole.toLowerCase() : '';
  const isAdmin = currentUser?.isSuperuser === true || systemRole === 'admin' || systemRole === 'super admin';
  const { officeMemberships, offices, divisions, users: organizationUsers } = useOrganization();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [outboxItems, setOutboxItems] = useState<Correspondence[]>([]);
  const [summary, setSummary] = useState({ total: 0, urgent: 0, pending: 0, inProgress: 0 });
  const [count, setCount] = useState(0);
  const pagination = usePagination({
    initialPage: 1,
    initialPageSize: 25,
    totalCount: count,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Correspondence | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isSuperAdmin = currentUser?.isSuperuser === true || systemRole === 'super admin' || systemRole === 'admin';

  const userOfficeIds = useMemo(() => {
    if (!currentUser) return [];
    return officeMemberships
      .filter((membership) => membership.userId === currentUser.id && membership.isActive)
      .map((membership) => membership.officeId);
  }, [currentUser, officeMemberships]);

  const hasOfficeAccess = isSuperAdmin || userOfficeIds.length > 0;

  const selectableOffices = useMemo(() => {
    if (isSuperAdmin) return offices;
    if (!userOfficeIds.length) return [];
    const idSet = new Set(userOfficeIds);
    return offices.filter((office) => idSet.has(office.id));
  }, [offices, userOfficeIds, isSuperAdmin]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedOfficeId !== 'all') count++;
    if (selectedStatus) count++;
    if (selectedPriority) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [selectedOfficeId, selectedStatus, selectedPriority, dateFrom, dateTo]);

  const hasActiveFilters = activeFilterCount > 0 || !!query;

  const clearFilters = () => {
    setSelectedOfficeId('all');
    setSelectedStatus('');
    setSelectedPriority('');
    setDateFrom('');
    setDateTo('');
    setQuery('');
  };

  const getFilterParams = useCallback((): URLSearchParams => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.append('search', debouncedQuery);
    if (selectedOfficeId !== 'all') {
      params.append('office', selectedOfficeId);
    } else if (userOfficeIds.length > 0) {
      userOfficeIds.forEach((officeId) => {
        params.append('office', officeId);
      });
    }
    if (selectedStatus) {
      params.append('status', selectedStatus);
    }
    if (selectedPriority) {
      params.append('priority', selectedPriority);
    }
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    return params;
  }, [debouncedQuery, selectedOfficeId, userOfficeIds, selectedStatus, selectedPriority, dateFrom, dateTo]);

  const handleExport = async () => {
    if (outboxItems.length === 0) {
      toast.error('No items to export');
      return;
    }

    setExporting(true);
    try {
      // Fetch all items matching current filters
      const params = getFilterParams();
      params.append('page_size', '1000'); // Reasonable limit for export

      const response = await apiFetch<Record<string, unknown>>(`/correspondence/items/outbox/?${params.toString()}`);
      const allItems = Array.isArray(response.results) ? response.results.map(mapApiCorrespondence) : [];

      const exportData = allItems.map((item: Correspondence) => ({
        'Reference Number': item.referenceNumber || '',
        'Subject': item.subject || '',
        'Priority': item.priority || '',
        'Status': item.status as string || '',
        'Dispatch Date': item.dispatchDate ? formatDateShort(item.dispatchDate) : '',
        'Office': offices.find(o => o.id === item.owningOfficeId)?.name || '',
      }));

      exportToCSV(exportData, [
        { key: 'Reference Number', label: 'Reference Number' },
        { key: 'Subject', label: 'Subject' },
        { key: 'Priority', label: 'Priority' },
        { key: 'Status', label: 'Status' },
        { key: 'Dispatch Date', label: 'Dispatch Date' },
        { key: 'Office', label: 'Office' },
      ], {
        filename: `office-outbox-export-${new Date().toISOString().split('T')[0]}.csv`,
      });

      toast.success(`Exported ${exportData.length} items successfully`);
    } catch (err: unknown) {
      toast.error('Failed to export items. Please try again.');
      logError('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    pagination.goToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, selectedOfficeId, selectedStatus, selectedPriority, sortBy, sortOrder, dateFrom, dateTo]);

  useEffect(() => {
    // Fetch data immediately if user has offices or is super admin (don't wait for currentUser hydration)
    if (!hasOfficeAccess) {
      setLoading(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchOfficeOutbox = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = getFilterParams();
        params.append('sort_by', sortBy);
        params.append('sort_order', sortOrder);
        params.append('page', String(pagination.page));
        params.append('page_size', String(pagination.pageSize));

        const response = await apiFetch<Record<string, unknown>>(
          `/correspondence/items/outbox/?${params.toString()}`,
          { signal: controller.signal }
        );
        const results = Array.isArray(response.results) ? response.results : [];
        setOutboxItems(results.map(mapApiCorrespondence));
        const responseObj = response as Record<string, unknown>;
        const summaryObj = responseObj.summary as Record<string, unknown> | undefined;
        setSummary({
          total: (summaryObj && typeof summaryObj.total === 'number') ? summaryObj.total : ((responseObj && typeof responseObj.count === 'number') ? responseObj.count : results.length),
          urgent: (summaryObj && typeof summaryObj.urgent === 'number') ? summaryObj.urgent : 0,
          pending: (summaryObj && typeof summaryObj.pending === 'number') ? summaryObj.pending : 0,
          inProgress: (summaryObj && typeof summaryObj.in_progress === 'number') ? summaryObj.in_progress : 0,
        });
        setCount((responseObj && typeof responseObj.count === 'number') ? responseObj.count : results.length);
      } catch (err: unknown) {
        // Ignore abort errors
        if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
          return;
        }
        setError('Failed to load office outbox items. Please try again.');
        setOutboxItems([]);
        setSummary({ total: 0, urgent: 0, pending: 0, inProgress: 0 });
        setCount(0);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchOfficeOutbox();

    // Cleanup: abort request on unmount or dependency change
    return () => {
      controller.abort();
    };
  }, [hasOfficeAccess, userOfficeIds, pagination.page, pagination.pageSize, debouncedQuery, selectedOfficeId, selectedStatus, selectedPriority, dateFrom, dateTo, sortBy, sortOrder, getFilterParams]);

  const handleWithdrawClick = (item: Correspondence) => {
    if (item.status as string !== 'pending' && item.status as string !== 'in-progress') {
      toast.error('Only pending or in-progress correspondence can be withdrawn');
      return;
    }
    setSelectedItem(item);
    setWithdrawDialogOpen(true);
  };

  const confirmWithdraw = async () => {
    if (!selectedItem || !withdrawReason.trim()) {
      toast.error('Please provide a reason for withdrawal');
      return;
    }

    setIsProcessing(true);
    try {
      // Use withdraw endpoint (similar to recall in minutes)
      await apiFetch(`/correspondence/items/${selectedItem.id}/withdraw/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: withdrawReason.trim() }),
      });
      
      toast.success('Correspondence withdrawn successfully. You can edit and resend it later.');
      setWithdrawDialogOpen(false);
      setWithdrawReason('');
      setSelectedItem(null);
      
      // Refresh the list
      pagination.goToFirstPage();
    } catch (err: unknown) {
      let errorMessage = 'Failed to withdraw correspondence';
      if (err && typeof err === 'object') {
        const errorObj = err as Record<string, unknown>;
        if (errorObj.response && typeof errorObj.response === 'object') {
          const response = errorObj.response as Record<string, unknown>;
          if (response.data && typeof response.data === 'object') {
            const data = response.data as Record<string, unknown>;
            errorMessage = (data.detail as string) || errorMessage;
          }
        }
        if (errorMessage === 'Failed to withdraw correspondence') {
          errorMessage = (errorObj.message as string) || errorMessage;
        }
      }
      toast.error(`Failed to withdraw: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteClick = (item: Correspondence) => {
    if (item.status as string !== 'pending') {
      toast.error('Only pending correspondence can be deleted');
      return;
    }
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;

    setIsProcessing(true);
    try {
      await apiFetch(`/correspondence/items/${selectedItem.id}/`, {
        method: 'DELETE',
      });
      
      toast.success('Correspondence deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedItem(null);
      
      // Refresh the list
      pagination.goToFirstPage();
    } catch (err: unknown) {
      let errorMessage = 'Failed to delete correspondence';
      if (err && typeof err === 'object') {
        const errorObj = err as Record<string, unknown>;
        if (errorObj.response && typeof errorObj.response === 'object') {
          const response = errorObj.response as Record<string, unknown>;
          if (response.data && typeof response.data === 'object') {
            const data = response.data as Record<string, unknown>;
            errorMessage = (data.detail as string) || errorMessage;
          }
        }
        if (errorMessage === 'Failed to delete correspondence') {
          errorMessage = (errorObj.message as string) || errorMessage;
        }
      }
      toast.error(`Failed to delete: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      {!currentUser ? (
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        </div>
      ) : !hasOfficeAccess ? (
        <div className="container mx-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Office Outbox</h1>
            <p className="text-muted-foreground mt-1">
              Correspondence sent from your office(s)
            </p>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                You are not a member of any office. Office outbox is only available to office members.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <ErrorBoundary>
          <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Office Outbox</h1>
            <p className="text-muted-foreground mt-1">
              Correspondence sent from your office(s)
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExport}
              disabled={exporting || outboxItems.length === 0 || loading}
              aria-label="Export to CSV"
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
            <ContextualHelp
              title="How to use Office Outbox"
              description="Review correspondence your office has sent or is preparing to dispatch. Withdraw or edit drafts while they are still pending."
              steps={[
                'Filter by office, status, or priority to find items.',
                'Open a record to view routing details or continue processing.',
                'Use Withdraw on pending or in-progress items if you need to recall and fix them.',
              ]}
            />
          </div>
        </div>


        <HelpGuideCard
          title="Office Outbox"
          description="View all correspondence sent from offices you are a member of. This is different from your personal outbox which shows items you sent individually."
          links={[
            { label: 'My Outbox', href: '/correspondence/outbox' },
            { label: 'Office Inbox', href: '/correspondence/inbox' },
            { label: 'Help & Guides', href: '/help' },
          ]}
        />

        {/* Inline Filter Bar */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-2">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by subject, reference..." value={query} onChange={(e) => setQuery(e.target.value)} className="h-8 pl-8 text-xs" />
            </div>
            {/* Office select */}
            <Select value={selectedOfficeId} onValueChange={(v) => { setSelectedOfficeId(v); pagination.goToFirstPage(); }}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="All Offices" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Offices</SelectItem>
                {selectableOffices.map((office) => (
                  <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Status select */}
            <Select value={selectedStatus || 'all'} onValueChange={(v) => { setSelectedStatus(v === 'all' ? '' : v); pagination.goToFirstPage(); }}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            {/* Priority select */}
            <Select value={selectedPriority || 'all'} onValueChange={(v) => { setSelectedPriority(v === 'all' ? '' : v); pagination.goToFirstPage(); }}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="All Priorities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
            {/* Sort select */}
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => { const [by, order] = value.split('-'); setSortBy(by); setSortOrder(order as 'asc' | 'desc'); }}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="updated-desc">Last Updated</SelectItem>
                <SelectItem value="created-desc">Newest First</SelectItem>
                <SelectItem value="created-asc">Oldest First</SelectItem>
                <SelectItem value="priority-desc">Priority (High-Low)</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">Clear</Button>}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total in Queue', value: summary.total, icon: Send, bgClass: 'bg-primary/10', iconClass: 'text-primary' },
            { label: 'Urgent', value: summary.urgent, icon: AlertCircle, bgClass: 'bg-destructive/10', iconClass: 'text-destructive' },
            { label: 'Pending', value: summary.pending, icon: Clock, bgClass: 'bg-warning/10', iconClass: 'text-warning' },
            { label: 'In Progress', value: summary.inProgress, icon: Mail, bgClass: 'bg-info/10', iconClass: 'text-info' },
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

        {loading ? (
          <LoadingState message="Loading office outbox…" />
        ) : error ? (
          <ErrorState message={error} variant="inline" />
        ) : outboxItems.length === 0 ? (
          <EmptyState
            icon={<Send className={registryQueueEmptyIconClass} />}
            title={
              debouncedQuery || activeFilterCount > 0
                ? 'No items match your filters'
                : 'No correspondence in your office outbox yet'
            }
            message={
              debouncedQuery || activeFilterCount > 0
                ? 'Try adjusting your search or filters.'
                : 'When your office sends or drafts outgoing correspondence, it will appear here.'
            }
            actionLabel={debouncedQuery || activeFilterCount > 0 ? 'Clear Filters' : undefined}
            onAction={debouncedQuery || activeFilterCount > 0 ? clearFilters : undefined}
          />
        ) : (
          <div className={correspondenceQueueListStackClass}>
            {outboxItems.map((item) => {
              const owningOffice = item.owningOfficeId
                ? offices.find((office) => office.id === item.owningOfficeId)
                : undefined;
              const division = item.divisionId ? divisions.find((div) => div.id === item.divisionId) : undefined;
              const currentApprover = item.currentApproverId ? organizationUsers.find((user) => user.id === item.currentApproverId) : undefined;
              const daysPending = calculateDaysPending(item);

              return (
                <ListRowCard
                  key={item.id as string}
                  density="compact"
                  href={`/correspondence/${item.id as string}`}
                  leading={(
                    <div
                      className={cn(
                        correspondenceQueueLeadingBoxClass,
                        item.priority === 'urgent'
                          ? 'bg-destructive/10'
                          : item.priority === 'high'
                            ? 'bg-warning/10'
                            : 'bg-primary/10',
                      )}
                    >
                      <Mail
                        className={cn(
                          correspondenceQueueLeadingIconClass,
                          item.priority === 'urgent'
                            ? 'text-destructive'
                            : item.priority === 'high'
                              ? 'text-warning'
                              : 'text-primary',
                        )}
                      />
                    </div>
                  )}
                  actions={(
                    <>
                      {item.status as string === 'pending' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              aria-label="Edit draft"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                router.push(`/correspondence/register?edit=${item.id as string}`);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">Edit draft</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              aria-label="Withdraw correspondence"
                              disabled={item.status as string !== 'pending' || isProcessing}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleWithdrawClick(item);
                              }}
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          {item.status as string === 'pending'
                            ? 'Withdraw correspondence'
                            : 'Only pending items can be withdrawn'}
                        </TooltipContent>
                      </Tooltip>
                      {item.status as string === 'pending' && isAdmin && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              aria-label="Delete draft"
                              disabled={isProcessing}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteClick(item);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">Delete draft</TooltipContent>
                        </Tooltip>
                      )}
                    </>
                  )}
                >
                  <h4 className={correspondenceQueueSubjectClass}>{item.subject}</h4>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                      <Badge variant={getPriorityColor(item.priority)} className={correspondenceQueueBadgeClass}>
                        {item.priority.toUpperCase()}
                      </Badge>
                      <FlowTypeBadge
                        flowType={item.flowType}
                        isInward={item.isInward}
                        isOutward={item.isOutward}
                        isInternal={item.isInternal}
                        isExternal={item.isExternal}
                        compact
                        className={correspondenceQueueBadgeClass}
                      />
                      <Badge
                        variant={getStatusBadgeVariant(item.status as string)}
                        className={correspondenceQueueBadgeClass}
                      >
                        {(item.status as string).replace('-', ' ')}
                      </Badge>
                      {daysPending > 0 && (
                        <Badge variant="outline" className={cn(correspondenceQueueBadgeClass, 'gap-0.5')}>
                          <Clock className="h-2.5 w-2.5" />
                          {daysPending} day{daysPending === 1 ? '' : 's'} pending
                        </Badge>
                      )}
                    </div>
                    <span className={correspondenceQueueDateClass}>
                      {item.updatedAt ? formatDateShort(item.updatedAt) : '—'}
                    </span>
                  </div>
                  <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
                    <span className={correspondenceQueueMetaItemClass}>
                      <Mail className={correspondenceQueueMetaIconClass} />
                      <span className="truncate">Ref: {item.referenceNumber}</span>
                    </span>
                    {item.senderName && (
                      <span className={correspondenceQueueMetaItemClass}>
                        <UserIcon className={correspondenceQueueMetaIconClass} />
                        <span className="truncate">From: {item.senderName}</span>
                      </span>
                    )}
                    {owningOffice && (
                      <span className={correspondenceQueueMetaItemClass}>
                        <Building2 className={correspondenceQueueMetaIconClass} />
                        <span className="truncate">Office: {owningOffice.name}</span>
                      </span>
                    )}
                    {division && (
                      <span className={correspondenceQueueMetaItemClass}>
                        <Building2 className={correspondenceQueueMetaIconClass} />
                        <span className="truncate">Division: {division.name}</span>
                      </span>
                    )}
                    {currentApprover && (
                      <span className={correspondenceQueueMetaItemClass}>
                        <Clock className={correspondenceQueueMetaIconClass} />
                        <span className="truncate">Current: {currentApprover.name}</span>
                      </span>
                    )}
                  </div>
                </ListRowCard>
              );
            })}
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

        {/* Withdraw Confirmation Dialog */}
        <AlertDialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Withdraw Correspondence</AlertDialogTitle>
              <AlertDialogDescription>
                Withdrawing this correspondence will cancel it and allow you to edit and resend it later (similar to recalling a minute). The correspondence will be marked as withdrawn but can be restored.
                <br /><br />
                <strong>Note:</strong> This is an <strong>outgoing</strong> correspondence sent from your office. Withdrawing allows you to fix mistakes and resend to the correct recipient.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label htmlFor="withdraw-reason" className="text-sm font-medium">
                  Reason for Withdrawal <span className="text-destructive">*</span>
                </label>
                <Input
                  id="withdraw-reason"
                  placeholder="Please provide a reason for withdrawing this correspondence..."
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  className="mt-2"
                  disabled={isProcessing}
                />
              </div>
              {selectedItem && (
                <div className="text-sm text-muted-foreground">
                  <p><strong>Subject:</strong> {selectedItem.subject}</p>
                  <p><strong>Reference:</strong> {selectedItem.referenceNumber || '—'}</p>
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel 
                onClick={() => {
                  setWithdrawReason('');
                  setSelectedItem(null);
                }}
                disabled={isProcessing}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmWithdraw}
                disabled={!withdrawReason.trim() || isProcessing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isProcessing ? 'Withdrawing...' : 'Confirm Withdrawal'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Correspondence</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>Admin Only:</strong> Are you sure you want to permanently delete this correspondence? This action will permanently remove it from the system and cannot be undone.
                <br /><br />
                <strong>Note:</strong> For regular users, use "Withdraw" instead to cancel and allow editing/resending. Delete is only available to administrators.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {selectedItem && (
              <div className="py-4 text-sm text-muted-foreground">
                <p><strong>Subject:</strong> {selectedItem.subject}</p>
                <p><strong>Reference:</strong> {selectedItem.referenceNumber || '—'}</p>
                <p><strong>Status:</strong> {selectedItem.status}</p>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel 
                onClick={() => setSelectedItem(null)}
                disabled={isProcessing}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={isProcessing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isProcessing ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
        </ErrorBoundary>
      )}
    </DashboardLayout>
  );
};

export default OfficeOutboxPage;

