"use client";

import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Send,
  Building2,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Download,
  Clock,
  User as UserIcon,
  ArrowDown,
  ArrowUp,
  Calendar,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { formatDateShort, formatDateTime } from '@/lib/correspondence-helpers';
import type { Correspondence } from '@/lib/npa-structure';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { exportToCSV } from '@/lib/admin-export';
import { toast } from 'sonner';
import { logError } from '@/lib/client-logger';
import { FlowTypeBadge } from '@/components/correspondence/FlowTypeBadge';
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

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

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
  const { currentUser, hydrated } = useCurrentUser();
  const systemRoleObj = currentUser?.systemRole as Record<string, unknown> | undefined;
  const isAdmin = currentUser?.isSuperuser || (systemRoleObj && typeof systemRoleObj.name === 'string' && systemRoleObj.name.toLowerCase() === 'admin');
  const { officeMemberships, offices, divisions, users: organizationUsers } = useOrganization();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('all');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['pending', 'in-progress']);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [goToPageInput, setGoToPageInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [outboxItems, setOutboxItems] = useState<Correspondence[]>([]);
  const [summary, setSummary] = useState({ total: 0, urgent: 0, pending: 0, inProgress: 0 });
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Correspondence | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const userOfficeIds = useMemo(() => {
    if (!currentUser) return [];
    return officeMemberships
      .filter((membership) => membership.userId === currentUser.id && membership.isActive)
      .map((membership) => membership.officeId);
  }, [currentUser, officeMemberships]);

  const selectableOffices = useMemo(() => {
    if (!userOfficeIds.length) return [];
    const idSet = new Set(userOfficeIds);
    return offices.filter((office) => idSet.has(office.id));
  }, [offices, userOfficeIds]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedOfficeId !== 'all') count++;
    if (selectedStatuses.length > 0 && !(selectedStatuses.length === 2 && selectedStatuses.includes('pending') && selectedStatuses.includes('in-progress'))) count++;
    if (selectedPriorities.length > 0) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [selectedOfficeId, selectedStatuses, selectedPriorities, dateFrom, dateTo]);

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) => prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]);
  };

  const togglePriority = (priority: string) => {
    setSelectedPriorities((prev) => prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]);
  };

  const clearAllFilters = () => {
    setSelectedOfficeId('all');
    setSelectedStatuses(['pending', 'in-progress']);
    setSelectedPriorities([]);
    setDateFrom('');
    setDateTo('');
    setQuery('');
    setDateError(null);
  };

  // Validate date range
  const validateDateRange = (from: string, to: string) => {
    if (from && to && new Date(from) > new Date(to)) {
      setDateError('Date From must be before Date To');
      return false;
    }
    setDateError(null);
    return true;
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    if (value && dateTo) {
      validateDateRange(value, dateTo);
    }
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    if (dateFrom && value) {
      validateDateRange(dateFrom, value);
    }
  };

  const handleExport = async () => {
    if (outboxItems.length === 0) {
      toast.error('No items to export');
      return;
    }

    setExporting(true);
    try {
      // Fetch all items matching current filters
      const params = new URLSearchParams();
      if (debouncedQuery) params.append('search', debouncedQuery);
      
      if (selectedOfficeId !== 'all') {
        params.append('office', selectedOfficeId);
      } else {
        userOfficeIds.forEach((officeId) => {
          params.append('office', officeId);
        });
      }
      
      if (selectedStatuses.length > 0) {
        selectedStatuses.forEach((status) => params.append('status', status));
      }
      if (selectedPriorities.length > 0) {
        selectedPriorities.forEach((priority) => params.append('priority', priority));
      }
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      params.append('page_size', '10000'); // Get all items

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
    setPage(1);
  }, [debouncedQuery, selectedOfficeId, selectedStatuses, selectedPriorities, sortBy, sortOrder, dateFrom, dateTo, pageSize]);

  useEffect(() => {
    if (!hydrated || !currentUser || !userOfficeIds.length) {
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
        const params = new URLSearchParams();
        if (debouncedQuery) params.append('search', debouncedQuery);
        
        // Filter by office(s)
        if (selectedOfficeId !== 'all') {
          params.append('office', selectedOfficeId);
        } else {
          // Include all user's offices
          userOfficeIds.forEach((officeId) => {
            params.append('office', officeId);
          });
        }
        
        if (selectedStatuses.length > 0) {
          selectedStatuses.forEach((status) => params.append('status', status));
        }
        if (selectedPriorities.length > 0) {
          selectedPriorities.forEach((priority) => params.append('priority', priority));
        }
        if (dateFrom && !dateError) params.append('date_from', dateFrom);
        if (dateTo && !dateError) params.append('date_to', dateTo);
        params.append('sort_by', sortBy);
        params.append('sort_order', sortOrder);
        params.append('page', String(page));
        params.append('page_size', String(pageSize));

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
  }, [hydrated, currentUser, userOfficeIds, page, pageSize, debouncedQuery, selectedOfficeId, selectedStatuses, selectedPriorities, dateFrom, dateTo, sortBy, sortOrder, dateError]);

  const pageCount = Math.max(1, Math.ceil(count / pageSize));

  const handleGoToPage = () => {
    const pageNum = parseInt(goToPageInput, 10);
    if (pageNum >= 1 && pageNum <= pageCount) {
      setPage(pageNum);
      setGoToPageInput('');
    }
  };

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
      setPage(1);
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
      setPage(1);
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

  if (!hydrated || !currentUser) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!userOfficeIds.length) {
    return (
      <DashboardLayout>
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
            <h1 className="text-3xl font-bold">Office Outbox</h1>
            <p className="text-muted-foreground mt-1">
              Correspondence sent from your office(s)
            </p>
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
              disabled={exporting || outboxItems.length === 0 || loading}
              aria-label="Export to CSV"
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
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

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Filters</CardTitle>
                {activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={clearAllFilters}>Clear All</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {selectableOffices.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Office</label>
                    <Select value={selectedOfficeId} onValueChange={setSelectedOfficeId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Offices</SelectItem>
                        {selectableOffices.map((office) => (
                          <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Status</Label>
                  <div className="flex flex-wrap gap-1">
                    {['pending', 'in-progress'].map((status) => (
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
                  <Label className="text-sm font-medium mb-2 block">Date From</Label>
                  <Input 
                    type="date" 
                    value={dateFrom} 
                    onChange={(e) => handleDateFromChange(e.target.value)}
                    aria-invalid={dateError ? 'true' : 'false'}
                    aria-describedby={dateError ? 'date-error' : undefined}
                  />
                  {dateError && (
                    <p id="date-error" className="text-xs text-destructive mt-1">{dateError}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Date To</Label>
                  <Input 
                    type="date" 
                    value={dateTo} 
                    onChange={(e) => handleDateToChange(e.target.value)}
                    aria-invalid={dateError ? 'true' : 'false'}
                    aria-describedby={dateError ? 'date-error' : undefined}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Sort By</Label>
                  <Select 
                    value={`${sortBy}-${sortOrder}`} 
                    onValueChange={(value) => {
                      const [by, order] = value.split('-');
                      setSortBy(by);
                      setSortOrder(order as 'asc' | 'desc');
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="priority-desc">Priority (Urgent First)</SelectItem>
                      <SelectItem value="updated-desc">Last Updated (Newest)</SelectItem>
                      <SelectItem value="updated-asc">Last Updated (Oldest)</SelectItem>
                      <SelectItem value="created-desc">Created (Newest)</SelectItem>
                      <SelectItem value="subject-asc">Subject (A-Z)</SelectItem>
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
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by subject, reference, sender..." className="pl-10" />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total in Queue', value: summary.total, icon: Send, bgClass: 'bg-primary/10', iconClass: 'text-primary' },
            { label: 'Urgent', value: summary.urgent, icon: AlertCircle, bgClass: 'bg-destructive/10', iconClass: 'text-destructive' },
            { label: 'Pending', value: summary.pending, icon: Clock, bgClass: 'bg-warning/10', iconClass: 'text-warning' },
            { label: 'In Progress', value: summary.inProgress, icon: Mail, bgClass: 'bg-info/10', iconClass: 'text-info' },
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

        {/* Outbox Items */}
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading outbox items…
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-4 text-sm text-destructive" role="alert">{error}</CardContent>
          </Card>
        ) : outboxItems.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground text-sm">
              {debouncedQuery || activeFilterCount > 0
                ? 'No office outbox items match your filters.'
                : 'No correspondence found in your office outbox.'}
              {(debouncedQuery || activeFilterCount > 0) && (
                <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4 block mx-auto">
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {outboxItems.map((item) => {
              const owningOffice = item.owningOfficeId
                ? offices.find((office) => office.id === item.owningOfficeId)
                : undefined;
              const division = item.divisionId ? divisions.find((div) => div.id === item.divisionId) : undefined;
              const currentApprover = item.currentApproverId ? organizationUsers.find((user) => user.id === item.currentApproverId) : undefined;
              const daysPending = calculateDaysPending(item);

              return (
                <div key={item.id as string} className="border border-border rounded-lg p-4 hover:bg-muted/50 hover:shadow-soft transition-all">
                  <Link href={`/correspondence/${item.id as string}`} className="block">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${item.priority === 'urgent' ? 'bg-destructive/10' : item.priority === 'high' ? 'bg-warning/10' : 'bg-primary/10'}`}>
                        <Mail className={`h-5 w-5 ${item.priority === 'urgent' ? 'text-destructive' : item.priority === 'high' ? 'text-warning' : 'text-primary'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate mb-1">{item.subject}</h3>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={getPriorityColor(item.priority)}>{item.priority.toUpperCase()}</Badge>
                              <FlowTypeBadge
                                flowType={item.flowType}
                                isInward={item.isInward}
                                isOutward={item.isOutward}
                                isInternal={item.isInternal}
                                isExternal={item.isExternal}
                              />
                              <Badge variant={getStatusBadgeVariant(item.status as string)}>{(item.status as string).replace('-', ' ')}</Badge>
                              {daysPending > 0 && <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{daysPending} day{daysPending === 1 ? '' : 's'} pending</Badge>}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{item.updatedAt ? formatDateShort(item.updatedAt) : '—'}</span>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /><span>Ref: {item.referenceNumber}</span></div>
                          {item.senderName && <div className="flex items-center gap-2"><UserIcon className="h-3.5 w-3.5" /><span>From: {item.senderName}</span></div>}
                          {owningOffice && <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /><span>Office: {owningOffice.name}</span></div>}
                          {division && <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /><span>Division: {division.name}</span></div>}
                          {currentApprover && <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /><span>Current Approver: {currentApprover.name}</span></div>}
                        </div>
                      </div>
                    </div>
                  </Link>
                  {/* Action Menu */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    {item.status as string === 'pending' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                          e.preventDefault();
                          router.push(`/correspondence/register?edit=${item.id as string}`);
                        }}
                      >
                        Edit Draft
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        handleWithdrawClick(item);
                      }}
                      disabled={item.status as string !== 'pending' || isProcessing}
                    >
                      Withdraw
                    </Button>
                    {item.status as string === 'pending' && isAdmin && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteClick(item);
                        }}
                        disabled={isProcessing}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">Showing {count === 0 ? 0 : `${(page - 1) * pageSize + 1}-${Math.min(count, (page - 1) * pageSize + outboxItems.length)}`} of {count} items</p>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Per page:</label>
              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1 || loading}><ChevronLeft className="h-4 w-4" />Previous</Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                let pageNum: number;
                if (pageCount <= 5) pageNum = i + 1;
                else if (page <= 3) pageNum = i + 1;
                else if (page >= pageCount - 2) pageNum = pageCount - 4 + i;
                else pageNum = page - 2 + i;
                if (pageNum > pageCount) return null;
                return <Button key={pageNum} variant={page === pageNum ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setPage(pageNum)} disabled={loading}>{pageNum}</Button>;
              })}
            </div>
            {pageCount > 5 && (
              <div className="flex items-center gap-1">
                <Input type="number" min={1} max={pageCount} value={goToPageInput} onChange={(e) => setGoToPageInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleGoToPage(); }} placeholder="Page" className="w-16 h-8 text-xs" />
                <Button variant="outline" size="sm" className="h-8" onClick={handleGoToPage} disabled={loading}>Go</Button>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))} disabled={page >= pageCount || loading}>Next<ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

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
      </DashboardLayout>
    </ErrorBoundary>
  );
};

export default OfficeOutboxPage;


