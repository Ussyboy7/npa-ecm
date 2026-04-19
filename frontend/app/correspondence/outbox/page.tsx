"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
  Send,
  Pencil,
  Undo2,
  Trash2,
  AlertCircle,
  Clock,
  User as UserIcon,
  ArrowDown,
  ArrowUp,
  Filter,
  Calendar,
  Building2,
  Loader2,
  FileText,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { formatDateShort, formatDateTime } from '@/lib/correspondence-helpers';
import type { Correspondence } from '@/lib/npa-structure';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FlowTypeBadge } from '@/components/correspondence/FlowTypeBadge';
import { ListRowCard } from '@/components/shared/ListRowCard';
import {
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueListStackClass,
  registryQueueSearchStatsShellContentClass,
  registryQueueSearchInputWrapClass,
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
import { cn } from '@/lib/utils';
import { getDocumentsSharedByUser, type DocumentRecord } from '@/lib/dms-storage';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';

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

const OutboxPage = () => {
  const router = useRouter();
  const { currentUser, hydrated } = useCurrentUser();
  const { divisions, users: organizationUsers } = useOrganization();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Use pagination hook
  const [count, setCount] = useState(0);
  const pagination = usePagination({
    initialPage: 1,
    initialPageSize: 25,
    totalCount: count,
  });

  const [outboxItems, setOutboxItems] = useState<Correspondence[]>([]);
  const [sharedDocuments, setSharedDocuments] = useState<DocumentRecord[]>([]);
  const [summary, setSummary] = useState({ total: 0, urgent: 0, pending: 0, inProgress: 0 });
  const [documentCount, setDocumentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Correspondence | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStatuses.length > 0) count++;
    if (selectedPriorities.length > 0) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [selectedStatuses, selectedPriorities, dateFrom, dateTo]);

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) => prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]);
  };

  const togglePriority = (priority: string) => {
    setSelectedPriorities((prev) => prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]);
  };

  const clearAllFilters = () => {
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setDateFrom('');
    setDateTo('');
    setQuery('');
  };

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    pagination.goToFirstPage();
  }, [debouncedQuery, selectedStatuses, selectedPriorities, sortBy, sortOrder, dateFrom, dateTo, pagination.pageSize]);

  useEffect(() => {
    // Fetch data immediately after login (don't wait for currentUser hydration)
    if (!currentUser?.id) return;

    const fetchOutbox = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (debouncedQuery) params.append('search', debouncedQuery);
        if (selectedStatuses.length > 0) {
          selectedStatuses.forEach((status) => params.append('status', status));
        }
        if (selectedPriorities.length > 0) {
          selectedPriorities.forEach((priority) => params.append('priority', priority));
        }
        // Date range filters - backend should support these params
        if (dateFrom) {
          params.append('date_from', dateFrom);
        }
        if (dateTo) {
          params.append('date_to', dateTo);
        }
        params.append('sort_by', sortBy);
        params.append('sort_order', sortOrder);
        params.append('page', String(pagination.page));
        params.append('page_size', String(pagination.pageSize));

        const [corrResponse, docsResponse] = await Promise.all([
          apiFetch<Record<string, unknown>>(`/correspondence/items/outbox/?${params.toString()}`),
          getDocumentsSharedByUser(currentUser.id, {
            search: debouncedQuery || undefined,
            pageSize: 50, // Get recent shared documents
          }),
        ]);

        const corrResults = Array.isArray(corrResponse.results) ? corrResponse.results : [];
        setOutboxItems(corrResults.map(mapApiCorrespondence));
        const responseObj = corrResponse as Record<string, unknown>;
        const summaryObj = responseObj.summary as Record<string, unknown> | undefined;
        setSummary({
          total: (summaryObj && typeof summaryObj.total === 'number') ? summaryObj.total : ((responseObj && typeof responseObj.count === 'number') ? responseObj.count : corrResults.length),
          urgent: (summaryObj && typeof summaryObj.urgent === 'number') ? summaryObj.urgent : 0,
          pending: (summaryObj && typeof summaryObj.pending === 'number') ? summaryObj.pending : 0,
          inProgress: (summaryObj && typeof summaryObj.in_progress === 'number') ? summaryObj.in_progress : 0,
        });
        setCount((responseObj && typeof responseObj.count === 'number') ? responseObj.count : corrResults.length);

        // Set shared documents
        setSharedDocuments(docsResponse.results || []);
        setDocumentCount(docsResponse.count || 0);
      } catch (err: unknown) {
        // Handle backend errors gracefully, especially for unsupported params
        const errorMessage = (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') ? err.message : 'Failed to load outbox items.';
        if (errorMessage.includes('date_from') || errorMessage.includes('date_to')) {
          setError('Date range filtering may not be supported. Please try without date filters.');
        } else {
          setError(errorMessage);
        }
        setOutboxItems([]);
        setSharedDocuments([]);
        setSummary({ total: 0, urgent: 0, pending: 0, inProgress: 0 });
        setCount(0);
        setDocumentCount(0);
      } finally {
        setLoading(false);
      }
    };

    void fetchOutbox();
  }, [currentUser?.id, debouncedQuery, selectedStatuses, selectedPriorities, sortBy, sortOrder, dateFrom, dateTo, pagination.page, pagination.pageSize, refreshKey]);

  const handleWithdrawClick = (item: Correspondence) => {
    const status = item.status as string;
    if (status !== 'pending' && status !== 'in-progress') {
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
      await apiFetch(`/correspondence/items/${selectedItem.id}/withdraw/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: withdrawReason.trim() }),
      });
      toast.success('Correspondence withdrawn successfully. You can edit and resend it later.');
      setWithdrawDialogOpen(false);
      setWithdrawReason('');
      setSelectedItem(null);
      setRefreshKey((k) => k + 1);
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
    const status = item.status as string;
    if (status !== 'pending') {
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
      await apiFetch(`/correspondence/items/${selectedItem.id}/`, { method: 'DELETE' });
      toast.success('Correspondence deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedItem(null);
      setRefreshKey((k) => k + 1);
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

  // Consistent badge variants for status
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

  const DocumentCard = ({ doc }: { doc: DocumentRecord }) => {
    const sharedDate = doc.permissions[0]?.createdAt || doc.updatedAt;
    
    return (
      <div onClick={() => router.push(`/dms/${doc.id}`)} className="border border-border rounded-lg p-4 hover:bg-muted/50 hover:shadow-soft transition-all cursor-pointer">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-blue-500/10">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate mb-1">{doc.title}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="gap-1"><FileText className="h-3 w-3" />Document</Badge>
                  <Badge variant="secondary">{doc.documentType}</Badge>
                  <Badge variant={doc.status === 'published' ? 'default' : 'outline'}>{doc.status}</Badge>
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateShort(sharedDate)}</span>
            </div>
            {doc.description && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{doc.description}</p>
            )}
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" /><span>Type: {doc.documentType}</span></div>
              {doc.referenceNumber && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /><span>Ref: {doc.referenceNumber}</span></div>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!currentUser) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <LoadingState message="Loading outbox…" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Outbox</h1>
            <p className="text-muted-foreground mt-1">Correspondence you created and documents you've shared</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" /> Filters
              {activeFilterCount > 0 && <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>}
          </Button>
            <Button size="sm" asChild><Link href="/correspondence/register"><Mail className="h-4 w-4 mr-2" />Register New</Link></Button>
          </div>
        </div>

        <HelpGuideCard
          title="Your Outbox"
          description="Items you've sent or shared: correspondence you created and documents you've shared with others. Track their status and follow up as needed."
          links={[{ label: 'My Documents', href: '/documents' }, { label: 'Help & Guides', href: '/help' }]}
        />

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">My Outbox Filters</CardTitle>
                {activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={clearAllFilters}>Clear All</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Status</Label>
                  <div className="flex flex-wrap gap-1">
                    {['pending', 'in-progress'].map((status) => (
                      <Badge key={status} variant={selectedStatuses.includes(status) ? 'default' : 'outline'} className="cursor-pointer capitalize text-xs" onClick={() => toggleStatus(status)}>
                        {status.replace('-', ' ')}
                      </Badge>
                    ))}
                  </div>
          </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Priority</Label>
                  <div className="flex flex-wrap gap-1">
                    {['urgent', 'high', 'medium', 'low'].map((priority) => (
                      <Badge key={priority} variant={selectedPriorities.includes(priority) ? 'default' : 'outline'} className="cursor-pointer capitalize text-xs" onClick={() => togglePriority(priority)} style={selectedPriorities.includes(priority) ? { backgroundColor: PRIORITY_COLORS[priority] } : {}}>
                        {priority}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Date From</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Date To</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Sort By</Label>
                  <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => { const [by, order] = value.split('-'); setSortBy(by); setSortOrder(order as 'asc' | 'desc'); }}>
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

        {/* Search + Stats */}
        <Card>
          <CardContent className={registryQueueSearchStatsShellContentClass}>
            <div className={registryQueueSearchInputWrapClass}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by subject, reference, sender…"
                className="pl-10"
                aria-label="Search outbox"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                { label: 'Total items', value: summary.total + documentCount, icon: Mail, bgClass: 'bg-primary/10', iconClass: 'text-primary' },
                { label: 'Pending action', value: summary.pending, icon: AlertCircle, bgClass: 'bg-destructive/10', iconClass: 'text-destructive' },
                { label: 'In progress', value: summary.inProgress, icon: Send, bgClass: 'bg-blue-500/10', iconClass: 'text-blue-600 dark:text-blue-400' },
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
          </CardContent>
        </Card>

        {error && <ErrorState message={error} variant="inline" />}

        {/* Outbox Items */}
        {loading ? (
          <LoadingState message="Loading outbox items…" />
            ) : outboxItems.length === 0 && sharedDocuments.length === 0 ? (
          <EmptyState
            icon="inbox"
            title={debouncedQuery || activeFilterCount > 0 ? 'No items match your filters' : 'No correspondence or documents'}
            message={debouncedQuery || activeFilterCount > 0 ? 'Try adjusting your search or filters' : 'You have no correspondence or shared documents at the moment.'}
            actionLabel={debouncedQuery || activeFilterCount > 0 ? 'Clear Filters' : undefined}
            onAction={debouncedQuery || activeFilterCount > 0 ? clearAllFilters : undefined}
          />
            ) : (
          <div className={correspondenceQueueListStackClass}>
            {outboxItems.map((item) => {
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
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            aria-label="Withdraw correspondence"
                            disabled={(item.status as string) !== 'pending' && (item.status as string) !== 'in-progress'}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleWithdrawClick(item);
                            }}
                          >
                            <Undo2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          {(item.status as string) === 'pending' || (item.status as string) === 'in-progress'
                            ? 'Withdraw correspondence'
                            : 'Only pending or in-progress items can be withdrawn'}
                        </TooltipContent>
                      </Tooltip>
                      {item.status as string === 'pending' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              aria-label="Delete draft"
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
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{item.subject}</h3>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                      <Badge variant={getPriorityColor(item.priority)} className="h-5 rounded-md border px-1.5 py-0 text-[10px] font-semibold leading-none">
                        {item.priority.toUpperCase()}
                      </Badge>
                      <FlowTypeBadge
                        flowType={item.flowType}
                        isInward={item.isInward}
                        isOutward={item.isOutward}
                        isInternal={item.isInternal}
                        isExternal={item.isExternal}
                        compact
                        className="h-5 gap-0.5 rounded-md border px-1.5 py-0 text-[10px] font-semibold leading-none"
                      />
                      <Badge
                        variant={getStatusBadgeVariant(item.status as string)}
                        className="h-5 rounded-md border px-1.5 py-0 text-[10px] font-semibold leading-none"
                      >
                        {(item.status as string).replace('-', ' ')}
                      </Badge>
                      {daysPending > 0 && (
                        <Badge variant="outline" className="h-5 gap-0.5 rounded-md border px-1.5 py-0 text-[10px] font-semibold leading-none">
                          <Clock className="h-2.5 w-2.5" />
                          {daysPending} day{daysPending === 1 ? '' : 's'} pending
                        </Badge>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {item.updatedAt ? formatDateShort(item.updatedAt) : '—'}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 border-t border-border/60 pt-1.5 text-[11px] leading-tight text-muted-foreground">
                    <span className="inline-flex max-w-full items-center gap-1">
                      <Mail className="h-3 w-3 shrink-0 opacity-80" />
                      <span className="truncate">Ref: {item.referenceNumber}</span>
                    </span>
                    {item.senderName && (
                      <span className="inline-flex max-w-full items-center gap-1">
                        <UserIcon className="h-3 w-3 shrink-0 opacity-80" />
                        <span className="truncate">From: {item.senderName}</span>
                      </span>
                    )}
                    {division && (
                      <span className="inline-flex max-w-full items-center gap-1">
                        <Building2 className="h-3 w-3 shrink-0 opacity-80" />
                        <span className="truncate">Division: {division.name}</span>
                      </span>
                    )}
                    {currentApprover && (
                      <span className="inline-flex max-w-full items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0 opacity-80" />
                        <span className="truncate">Current Approver: {currentApprover.name}</span>
                      </span>
                    )}
                  </div>
                </ListRowCard>
                );
            })}
            {sharedDocuments.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
          </div>
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

        {/* Withdraw Confirmation Dialog */}
        <AlertDialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Withdraw Correspondence</AlertDialogTitle>
              <AlertDialogDescription>
                Withdrawing this correspondence will cancel it and allow you to edit and resend it later. The correspondence will be marked as withdrawn.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label htmlFor="withdraw-reason" className="text-sm font-medium">
                  Reason for Withdrawal <span className="text-destructive">*</span>
                </label>
                <Input
                  id="withdraw-reason"
                  placeholder="Please provide a reason for withdrawing this correspondence…"
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
                onClick={(e) => {
                  e.preventDefault();
                  void confirmWithdraw();
                }}
                disabled={!withdrawReason.trim() || isProcessing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isProcessing ? 'Withdrawing…' : 'Confirm Withdrawal'}
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
                Are you sure you want to permanently delete this draft? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {selectedItem && (
              <div className="py-4 text-sm text-muted-foreground">
                <p><strong>Subject:</strong> {selectedItem.subject}</p>
                <p><strong>Reference:</strong> {selectedItem.referenceNumber || '—'}</p>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedItem(null)} disabled={isProcessing}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); void confirmDelete(); }}
                disabled={isProcessing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isProcessing ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default OutboxPage;
