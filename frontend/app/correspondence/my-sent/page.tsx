"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Correspondence } from '@/lib/npa-structure';
import { apiFetch, isAbortError } from '@/lib/api-client';
import { CorrespondenceProvider, mapApiCorrespondence, mapApiMinute, useCorrespondence } from '@/contexts/CorrespondenceContext';
import type { Minute } from '@/lib/npa-structure';
import { RecallMinuteModal } from '@/components/correspondence/RecallMinuteModal';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DocumentCard } from './components/DocumentCard';
import { SentCorrespondenceCard } from './components/SentCorrespondenceCard';
import {
  correspondenceQueueListStackClass,
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from '@/components/shared/registry-queue-styles';
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
import { logError } from '@/lib/client-logger';
import { getDocumentsSharedByUser, type DocumentRecord } from '@/lib/dms-storage';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';

const OutboxPageContent = () => {
  const router = useRouter();
  const {currentUser} = useCurrentUser();
  const { divisions, users: organizationUsers } = useOrganization();
  const { dataVersion } = useCorrespondence();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Use pagination hook
  const [count, setCount] = useState(0);
  const pagination = usePagination({
    initialPage: 1,
    totalCount: count,
  });

  const [sentItems, setSentItems] = useState<Correspondence[]>([]);
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
  const [selectedMinute, setSelectedMinute] = useState<Minute | null>(null);
  const [recallModalOpen, setRecallModalOpen] = useState(false);
  const [recallLoading, setRecallLoading] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStatus !== '') count++;
    if (selectedPriority !== '') count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [selectedStatus, selectedPriority, dateFrom, dateTo]);

  const clearFilters = () => {
    setSelectedStatus('');
    setSelectedPriority('');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, selectedStatus, selectedPriority, sortBy, sortOrder, dateFrom, dateTo, pagination.pageSize]);

  useEffect(() => {
    // Fetch data immediately after login (don't wait for currentUser hydration)
    if (!currentUser?.id) return;

    const abortController = new AbortController();

    const fetchOutbox = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (debouncedQuery) params.append('search', debouncedQuery);
        if (selectedStatus) params.append('status', selectedStatus);
        if (selectedPriority !== '') {
          params.append('priority', selectedPriority);
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
          apiFetch<Record<string, unknown>>(`/correspondence/items/my-sent/?${params.toString()}`, { signal: abortController.signal }),
          getDocumentsSharedByUser(currentUser.id, {
            search: debouncedQuery || undefined,
            pageSize: 50, // Get recent shared documents
            signal: abortController.signal,
          }),
        ]);

        const corrResults = Array.isArray(corrResponse.results) ? corrResponse.results : [];
        setSentItems(corrResults.map(mapApiCorrespondence));
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
        if (isAbortError(err)) {
          return;
        }
        // Handle backend errors gracefully, especially for unsupported params
        const errorMessage = (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') ? err.message : 'Failed to load sent items.';
        if (errorMessage.includes('date_from') || errorMessage.includes('date_to')) {
          setError('Date range filtering may not be supported. Please try without date filters.');
        } else {
          setError(errorMessage);
        }
        setSentItems([]);
        setSharedDocuments([]);
        setSummary({ total: 0, urgent: 0, pending: 0, inProgress: 0 });
        setCount(0);
        setDocumentCount(0);
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchOutbox();
    return () => { abortController.abort(); };
  }, [currentUser?.id, debouncedQuery, selectedStatus, selectedPriority, sortBy, sortOrder, dateFrom, dateTo, pagination.page, pagination.pageSize, refreshKey, dataVersion]);

  const handleWithdrawClick = useCallback((item: Correspondence) => {
    if (item.status !== 'pending' && item.status !== 'in-progress') {
      toast.error('Only pending drafts can be cancelled');
      return;
    }
    setSelectedItem(item);
    setWithdrawDialogOpen(true);
  }, []);

  const confirmWithdraw = async () => {
    if (!selectedItem || !withdrawReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }
    setIsProcessing(true);
    try {
      await apiFetch(`/correspondence/items/${selectedItem.id}/cancel-draft/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: withdrawReason.trim() }),
      });
      toast.success('Draft cancelled successfully. You can edit and resend it later.');
      setWithdrawDialogOpen(false);
      setWithdrawReason('');
      setSelectedItem(null);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel draft';
      toast.error(`Failed to cancel draft: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResendDraft = useCallback(async (item: Correspondence) => {
    if (item.status !== 'withdrawn') {
      toast.error('Only cancelled drafts can be resent');
      return;
    }
    setIsProcessing(true);
    try {
      await apiFetch(`/correspondence/items/${item.id}/resend-draft/`, { method: 'POST' });
      toast.success('Draft restored. You can edit and dispatch it again.');
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend draft';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleRecallClick = useCallback(async (item: Correspondence) => {
    if (!currentUser) {
      toast.error('You must be logged in to recall a minute');
      return;
    }

    setRecallLoading(true);
    try {
      const response = await apiFetch<Record<string, unknown>>(`/correspondence/minutes/?correspondence=${item.id}`);
      const rawMinutes = Array.isArray(response.results) ? response.results : [];
      const minutes = rawMinutes.filter((m): m is Record<string, unknown> => typeof m === 'object' && m !== null).map(mapApiMinute);

      const recallable = minutes
        .filter(m => m.userId === currentUser.id && m.canBeRecalled && !m.isRecalled && !m.recalledAt)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (recallable.length === 0) {
        toast.error('No recallable minute found for this correspondence');
        return;
      }

      setSelectedMinute(recallable[0]);
      setRecallModalOpen(true);
    } catch (err: unknown) {
      logError('Failed to fetch minutes for recall', err);
      toast.error('Failed to check recall eligibility');
    } finally {
      setRecallLoading(false);
    }
  }, [currentUser]);

  const handleDeleteClick = useCallback((item: Correspondence) => {
    if (item.status !== 'pending') {
      toast.error('Only pending correspondence can be deleted');
      return;
    }
      setSelectedItem(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleEditCorrespondence = useCallback((item: Correspondence) => {
    router.push(`/correspondence/register?edit=${item.id}`);
  }, [router]);

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
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete correspondence';
      toast.error(`Failed to delete: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        {!currentUser ? (
          <LoadingState message="Loading sent items…" />
        ) : (
          <>
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">My Sent</h1>
            <p className="text-muted-foreground mt-1">Correspondence you created and documents you've shared</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" asChild><Link href="/correspondence/register"><Mail className="h-4 w-4 mr-2" />Register New</Link></Button>
          </div>
        </div>

        {/* Stats Cards */}
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

        {/* Inline Filter Bar */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-2">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by subject, reference, sender..." value={query} onChange={(e) => setQuery(e.target.value)} className="h-8 pl-8 text-xs" />
            </div>
            <Select value={selectedStatus || 'all'} onValueChange={(v) => setSelectedStatus(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => { const [by, order] = value.split('-'); setSortBy(by); setSortOrder(order as 'asc' | 'desc'); }}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="priority-desc">Priority (Urgent First)</SelectItem>
                <SelectItem value="updated-desc">Last Updated (Newest)</SelectItem>
                <SelectItem value="updated-asc">Last Updated (Oldest)</SelectItem>
                <SelectItem value="created-desc">Created (Newest)</SelectItem>
                <SelectItem value="subject-asc">Subject (A-Z)</SelectItem>
              </SelectContent>
            </Select>
            {activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">Clear</Button>}
          </CardContent>
        </Card>

        {error && <ErrorState message={error} variant="inline" />}

        {/* Sent Items */}
        {loading ? (
          <LoadingState message="Loading sent items…" />
            ) : sentItems.length === 0 && sharedDocuments.length === 0 ? (
          <EmptyState
            icon="inbox"
            title={debouncedQuery || activeFilterCount > 0 ? 'No items match your filters' : 'No correspondence or documents'}
            message={debouncedQuery || activeFilterCount > 0 ? 'Try adjusting your search or filters' : 'You have no correspondence or shared documents at the moment.'}
            actionLabel={debouncedQuery || activeFilterCount > 0 ? 'Clear Filters' : undefined}
            onAction={debouncedQuery || activeFilterCount > 0 ? clearFilters : undefined}
          />
            ) : (
          <div className={correspondenceQueueListStackClass}>
            {sentItems.map((item) => (
              <SentCorrespondenceCard
                key={item.id}
                item={item}
                divisions={divisions}
                organizationUsers={organizationUsers}
                isProcessing={isProcessing}
                recallLoading={recallLoading}
                onEdit={handleEditCorrespondence}
                onResend={handleResendDraft}
                onWithdraw={handleWithdrawClick}
                onRecall={handleRecallClick}
                onDelete={handleDeleteClick}
              />
            ))}
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
        </>
      )}

        {/* Cancel Draft Confirmation Dialog */}
        <AlertDialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Draft</AlertDialogTitle>
              <AlertDialogDescription>
                Cancelling this draft will allow you to edit and resend it later. The draft will be marked as cancelled.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label htmlFor="withdraw-reason" className="text-sm font-medium">
                  Reason for Cancellation <span className="text-destructive">*</span>
                </label>
                <Input
                  id="withdraw-reason"
                  placeholder="Please provide a reason for cancelling this draft…"
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
                {isProcessing ? 'Cancelling…' : 'Confirm Cancellation'}
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

        {/* Recall Minute Modal */}
        <RecallMinuteModal
          minute={selectedMinute}
          isOpen={recallModalOpen}
          onClose={() => {
            setRecallModalOpen(false);
            setSelectedMinute(null);
          }}
          onSuccess={() => {
            setSelectedMinute(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      </div>
    </>
  );
};

const OutboxPage = () => (
  <CorrespondenceProvider>
    <OutboxPageContent />
  </CorrespondenceProvider>
);

export default OutboxPage;
