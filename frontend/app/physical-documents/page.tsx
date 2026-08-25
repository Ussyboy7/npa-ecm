"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { PageSuspenseFallback } from '@/components/shared/PageSuspenseFallback';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  BookOpen,
  RefreshCw,
  LogOut,
  LogIn,
  MapPin,
  User as UserIcon,
  History,
  Plus,
  Trash2,
  RotateCcw,
  AlertTriangle,
  MoreVertical,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { unwrapResults } from '@/lib/type-utils';
import { fetchAllCatalogPaginated } from '@/lib/pagination-utils';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { toast } from "@/components/ui/sonner";
import { logError } from '@/lib/client-logger';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { QueuePageShell } from '@/components/shared/QueuePageShell';
import { RegistryTabList } from '@/components/registry/RegistryTabList';
import { StatStrip } from '@/components/shared/StatStrip';
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
} from '@/components/shared/registry-queue-styles';
import { cn } from '@/lib/utils';
import { formatDateShort, formatDateTime } from '@/lib/datetime';

interface Location {
  id: string;
  building: string;
  floor: string;
  room: string;
  description: string;
  is_active: boolean;
  display_name: string;
}

interface UserBrief {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
}

interface PhysicalDocument {
  id: string;
  tracking_number: string;
  barcode: string;
  correspondence: string | null;
  correspondence_ref: string | null;
  document: string | null;
  location: string;
  location_name: string;
  status: 'filed' | 'checked_out' | 'archived' | 'destroyed' | 'missing';
  description: string;
  checked_out_to: UserBrief | null;
  checked_out_at: string | null;
  expected_return_at: string | null;
  notes: string;
  created_at: string;
}

interface CheckOutEvent {
  id: string;
  physical_document: string;
  user: string;
  user_name: string;
  action: 'checked_out' | 'returned';
  purpose: string;
  notes: string;
  created_at: string;
}

function PhysicalDocumentsForm() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [documents, setDocuments] = useState<PhysicalDocument[]>([]);
  const [count, setCount] = useState(0);
  const pagination = usePagination({ totalCount: count });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [users, setUsers] = useState<UserBrief[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Check-out state
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [checkOutDoc, setCheckOutDoc] = useState<PhysicalDocument | null>(null);
  const [checkOutUserId, setCheckOutUserId] = useState('');
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [expectedReturnAt, setExpectedReturnAt] = useState('');

  // Register document state
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    location_id: '',
    description: '',
  });

  // History dialog state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDoc, setHistoryDoc] = useState<PhysicalDocument | null>(null);
  const [historyEvents, setHistoryEvents] = useState<CheckOutEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    pagination.goToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedLocation]);

  const fetchLocations = async () => {
    try {
      const data = await apiFetch<unknown>('/correspondence/locations/');
      setLocations(unwrapResults<Location>(data));
    } catch (err) {
      logError('Failed to fetch locations', err);
    }
  };

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        page_size: String(pagination.pageSize),
      });
      if (selectedLocation !== 'all') params.append('location', selectedLocation);
      if (debouncedSearch) params.append('search', debouncedSearch);
      const data = await apiFetch<{ results?: PhysicalDocument[]; count?: number }>(
        `/correspondence/physical-documents/?${params.toString()}`,
      );
      const rows = unwrapResults<PhysicalDocument>(data);
      setDocuments(rows);
      setCount(typeof data.count === 'number' ? data.count : rows.length);
    } catch (err) {
      logError('Failed to fetch physical documents', err);
      setError('Failed to load physical documents.');
      setDocuments([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation, debouncedSearch, pagination.page, pagination.pageSize]);

  const fetchUsers = async () => {
    try {
      const list = await fetchAllCatalogPaginated<UserBrief>('/accounts/users/?is_active=true');
      setUsers(list);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchLocations();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleCheckOut = async () => {
    if (!checkOutDoc || !checkOutUserId) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { user_id: checkOutUserId, purpose: checkOutNotes };
      if (expectedReturnAt) body.expected_return_at = expectedReturnAt;
      await apiFetch(`/correspondence/physical-documents/${checkOutDoc.id}/check-out/`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success('Document checked out successfully');
      setCheckOutOpen(false);
      setCheckOutDoc(null);
      setCheckOutUserId('');
      setCheckOutNotes('');
      setExpectedReturnAt('');
      fetchDocuments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to check out document';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckIn = async (doc: PhysicalDocument) => {
    try {
      await apiFetch(`/correspondence/physical-documents/${doc.id}/check-in/`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Returned via physical documents dashboard' }),
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success('Document checked in successfully');
      fetchDocuments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to check in document';
      toast.error(msg);
    }
  };

  const handleRegister = async () => {
    if (!registerForm.location_id || !registerForm.description.trim()) {
      toast.error('Location and description are required.');
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        location: registerForm.location_id,
        description: registerForm.description.trim(),
      };
      await apiFetch('/correspondence/physical-documents/', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success('Physical document registered');
      setRegisterOpen(false);
      setRegisterForm({ location_id: '', description: '' });
      fetchDocuments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register document';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (doc: PhysicalDocument, newStatus: PhysicalDocument['status']) => {
    try {
      await apiFetch(`/correspondence/physical-documents/${doc.id}/update-status/`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus }),
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success(`Document marked as ${newStatus.replace('_', ' ')}`);
      fetchDocuments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      toast.error(msg);
    }
  };

  const handleViewHistory = async (doc: PhysicalDocument) => {
    setHistoryDoc(doc);
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryEvents([]);
    try {
      const events = await apiFetch<CheckOutEvent[]>(
        `/correspondence/physical-documents/${doc.id}/checkout-events/`,
      );
      setHistoryEvents(events);
    } catch (err) {
      logError('Failed to fetch checkout history', err);
      toast.error('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'checked_out':
        return <Badge variant="destructive" className={correspondenceQueueBadgeClass}>Checked Out</Badge>;
      case 'filed':
        return (
          <Badge
            variant="outline"
            className={cn(
              correspondenceQueueBadgeClass,
              'border-emerald-700/40 bg-emerald-50 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-950 dark:text-emerald-100',
            )}
          >
            Filed
          </Badge>
        );
      case 'archived':
        return <Badge variant="secondary" className={correspondenceQueueBadgeClass}>Archived</Badge>;
      case 'destroyed':
        return <Badge variant="outline" className={correspondenceQueueBadgeClass}>Destroyed</Badge>;
      case 'missing':
        return <Badge variant="destructive" className={correspondenceQueueBadgeClass}>Missing</Badge>;
      default:
        return <Badge variant="outline" className={correspondenceQueueBadgeClass}>{status}</Badge>;
    }
  };

  const pageStats = useMemo(() => {
    let filed = 0;
    let checkedOut = 0;
    let other = 0;
    for (const doc of documents) {
      if (doc.status === 'filed') filed += 1;
      else if (doc.status === 'checked_out') checkedOut += 1;
      else other += 1;
    }
    return { filed, checkedOut, other };
  }, [documents]);

  return (
    <>
      <QueuePageShell
        title="Physical"
        subtitle="Track physical document locations, check-outs, and returns"
        tabs={<RegistryTabList />}
        actions={(
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="compact">
                  <MoreVertical className="h-4 w-4" />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { fetchDocuments(); fetchLocations(); }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="compact" onClick={() => setRegisterOpen(true)}>
              <Plus className="h-4 w-4" /> Register
            </Button>
          </>
        )}
        stats={(
          <StatStrip
            items={[
              { key: 'total', label: 'Total', value: count },
              { key: 'filed', label: 'Filed', value: pageStats.filed },
              { key: 'out', label: 'Checked out', value: pageStats.checkedOut },
            ]}
          />
        )}
      >
        <div className="rounded-xl bg-muted/30 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by tracking number or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
                aria-label="Search physical documents"
              />
            </div>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.display_name || `${loc.building}${loc.floor ? ` / ${loc.floor}` : ''}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div aria-live="polite">
          {loading ? (
            <LoadingState message="Loading documents…" />
          ) : error ? (
            <ErrorState message={error} variant="inline" onRetry={fetchDocuments} retryLabel="Retry" />
          ) : documents.length === 0 ? (
            <EmptyState
              icon={<BookOpen className={registryQueueEmptyIconClass} />}
              title="No physical documents found"
              message={debouncedSearch ? 'Try adjusting your search.' : 'Register a physical copy to start tracking.'}
            />
          ) : (
            <div className={correspondenceQueueListStackClass} role="list">
              {documents.map((doc) => {
                const assigneeName = doc.checked_out_to
                  ? (doc.checked_out_to.name
                    || `${doc.checked_out_to.first_name || ''} ${doc.checked_out_to.last_name || ''}`.trim()
                    || 'Unknown')
                  : null;
                const primaryAction =
                  doc.status === 'filed' ? (
                    <Button
                      size="compact"
                      variant="outline"
                      onClick={() => { setCheckOutDoc(doc); setCheckOutOpen(true); }}
                    >
                      <LogOut className="h-4 w-4" /> Check Out
                    </Button>
                  ) : doc.status === 'checked_out' ? (
                    <Button size="compact" onClick={() => void handleCheckIn(doc)}>
                      <LogIn className="h-4 w-4" /> Check In
                    </Button>
                  ) : doc.status === 'missing' ? (
                    <Button size="compact" variant="outline" onClick={() => void handleUpdateStatus(doc, 'filed')}>
                      <RotateCcw className="h-4 w-4" /> Recovered
                    </Button>
                  ) : null;

                return (
                  <div key={doc.id} role="listitem">
                    <ListRowCard
                      density="compact"
                      leading={(
                        <div className={cn(correspondenceQueueLeadingBoxClass, 'bg-primary/10')}>
                          <BookOpen className={cn(correspondenceQueueLeadingIconClass, 'text-primary')} />
                        </div>
                      )}
                      actions={(
                        <div className="flex items-center gap-1.5">
                          {primaryAction}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" aria-label="More actions">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => void handleViewHistory(doc)}>
                                <History className="h-4 w-4 mr-2" /> History
                              </DropdownMenuItem>
                              {doc.status === 'filed' ? (
                                <>
                                  <DropdownMenuItem onClick={() => void handleUpdateStatus(doc, 'archived')}>
                                    <RotateCcw className="h-4 w-4 mr-2" /> Archive
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => void handleUpdateStatus(doc, 'destroyed')}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Destroy
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                              {doc.status === 'checked_out' ? (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => void handleUpdateStatus(doc, 'missing')}
                                >
                                  <AlertTriangle className="h-4 w-4 mr-2" /> Mark Missing
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    >
                      <h4 className={correspondenceQueueSubjectClass}>
                        {doc.description || doc.tracking_number}
                      </h4>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                          {statusBadge(doc.status)}
                          <Badge variant="outline" className={correspondenceQueueBadgeClass}>
                            {doc.tracking_number}
                          </Badge>
                        </div>
                        {doc.checked_out_at ? (
                          <span className={correspondenceQueueDateClass}>{formatDateShort(doc.checked_out_at)}</span>
                        ) : null}
                      </div>
                      <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
                        {doc.correspondence_ref && doc.correspondence ? (
                          <Link
                            href={`/correspondence/${doc.correspondence}`}
                            className={cn(correspondenceQueueMetaItemClass, 'text-primary hover:underline')}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <BookOpen className={correspondenceQueueMetaIconClass} />
                            <span className="truncate">{doc.correspondence_ref}</span>
                          </Link>
                        ) : doc.correspondence_ref ? (
                          <span className={correspondenceQueueMetaItemClass}>
                            <BookOpen className={correspondenceQueueMetaIconClass} />
                            <span className="truncate">{doc.correspondence_ref}</span>
                          </span>
                        ) : null}
                        <span className={correspondenceQueueMetaItemClass}>
                          <MapPin className={correspondenceQueueMetaIconClass} />
                          <span className="truncate">{doc.location_name || '—'}</span>
                        </span>
                        {assigneeName ? (
                          <span className={correspondenceQueueMetaItemClass}>
                            <UserIcon className={correspondenceQueueMetaIconClass} />
                            <span className="truncate">{assigneeName}</span>
                          </span>
                        ) : null}
                        {doc.expected_return_at ? (
                          <span className={cn(correspondenceQueueMetaItemClass, 'text-amber-600')}>
                            Due {formatDateShort(doc.expected_return_at)}
                          </span>
                        ) : null}
                      </div>
                    </ListRowCard>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Register Document Dialog */}
        <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register Physical Document</DialogTitle>
              <DialogDescription>
                A tracking number will be auto-generated. Required fields are marked.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reg-location">Location *</Label>
                <Select
                  value={registerForm.location_id}
                  onValueChange={(v) => setRegisterForm({ ...registerForm, location_id: v })}
                >
                  <SelectTrigger id="reg-location">
                    <SelectValue placeholder="Select a location..." />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.display_name || `${loc.building}${loc.floor ? ` / ${loc.floor}` : ''}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-desc">Description *</Label>
                <Input
                  id="reg-desc"
                  value={registerForm.description}
                  onChange={(e) => setRegisterForm({ ...registerForm, description: e.target.value })}
                  placeholder="e.g. Original signed contract"
                />
              </div>
              <Button className="w-full" onClick={handleRegister} disabled={submitting}>
                {submitting ? 'Registering...' : 'Register Document'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Check Out Dialog */}
        <Dialog open={checkOutOpen} onOpenChange={(open) => { setCheckOutOpen(open); if (!open) setCheckOutDoc(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Check Out Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Document</Label>
                <p className="text-sm text-muted-foreground">
                  {checkOutDoc?.description || checkOutDoc?.tracking_number || '—'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="check-out-user">Check Out To</Label>
                <Select value={checkOutUserId} onValueChange={setCheckOutUserId}>
                  <SelectTrigger id="check-out-user">
                    <SelectValue placeholder="Select a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="check-out-notes">Purpose / Notes</Label>
                <Input
                  id="check-out-notes"
                  value={checkOutNotes}
                  onChange={(e) => setCheckOutNotes(e.target.value)}
                  placeholder="e.g. Court hearing, review, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="check-out-return">Expected Return Date (optional)</Label>
                <Input
                  id="check-out-return"
                  type="date"
                  value={expectedReturnAt}
                  onChange={(e) => setExpectedReturnAt(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCheckOut}
                disabled={!checkOutUserId || submitting}
              >
                {submitting ? 'Checking Out...' : 'Confirm Check Out'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogContent size="md">
            <DialogHeader>
              <DialogTitle>Check-Out History</DialogTitle>
              <DialogDescription>
                {historyDoc?.description || historyDoc?.tracking_number || ''}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto min-h-0">
              {historyLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading history...</div>
              ) : historyEvents.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No checkout events recorded.</div>
              ) : (
                <div className="relative pl-6 space-y-0">
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                  {historyEvents.map((event) => (
                    <div key={event.id} className="relative pb-5 last:pb-0">
                      <div className={cn(
                        "absolute -left-[17px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-background",
                        event.action === 'checked_out' ? "bg-destructive" : "bg-success"
                      )} />
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(event.created_at)}
                      </div>
                      <div className="text-sm font-medium mt-0.5">
                        {event.action === 'checked_out' ? 'Checked Out' : 'Returned'}
                        {event.user_name ? ` — ${event.user_name}` : ''}
                      </div>
                      {event.purpose && (
                        <div className="text-xs text-muted-foreground mt-0.5">{event.purpose}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {count > 0 && <PaginationControls pagination={pagination} className="mt-4" />}
      </QueuePageShell>
    </>
  );
}

const PhysicalDocumentsPage = () => (
  <Suspense fallback={<PageSuspenseFallback message="Loading..." />}>
    <PhysicalDocumentsForm />
  </Suspense>
);

export default PhysicalDocumentsPage;
