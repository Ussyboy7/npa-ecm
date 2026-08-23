"use client";

import { useCallback, useEffect, useState, Suspense } from 'react';
import { PageSuspenseFallback } from '@/components/shared/PageSuspenseFallback';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, BookOpen, RefreshCw, LogOut, LogIn, MapPin, User as UserIcon, History, Plus, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
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
import {
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueListStackClass,
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
        return <Badge variant="destructive" className="whitespace-nowrap">Checked Out</Badge>;
      case 'filed':
        return <Badge variant="default" className="bg-success/10 text-success border-success/20 whitespace-nowrap">Filed</Badge>;
      case 'archived':
        return <Badge variant="default" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 whitespace-nowrap">Archived</Badge>;
      case 'destroyed':
        return <Badge variant="outline" className="whitespace-nowrap">Destroyed</Badge>;
      case 'missing':
        return <Badge variant="outline" className="text-destructive border-destructive/30 whitespace-nowrap">Missing</Badge>;
      default:
        return <Badge variant="outline" className="whitespace-nowrap">{status}</Badge>;
    }
  };

  return (
    <>
      <QueuePageShell
        title="Physical Documents"
        subtitle="Track physical document locations, check-outs, and returns"
      >
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-2">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by tracking number or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
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
            <Button variant="secondary" size="sm" className="h-8 text-xs" onClick={() => setRegisterOpen(true)}>
              <Plus className="h-3 w-3 mr-1" /> Register
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { fetchDocuments(); fetchLocations(); }}>
              <RefreshCw className="h-3 w-3 mr-1" /> Refresh
            </Button>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold mb-3">All Physical Documents</h2>
          {loading ? (
            <div className="rounded-lg border bg-card p-6">
              <LoadingState message="Loading documents..." />
            </div>
          ) : error ? (
            <div className="rounded-lg border bg-card p-6">
              <ErrorState message={error} variant="inline" onRetry={fetchDocuments} retryLabel="Retry" />
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-lg border bg-card p-6">
              <EmptyState
                icon={<BookOpen className="h-12 w-12 text-muted-foreground" />}
                title="No physical documents found"
                message={debouncedSearch ? 'Try adjusting your search.' : 'No documents in this location.'}
              />
            </div>
          ) : (
            <div className={correspondenceQueueListStackClass}>
              {documents.map((doc) => (
                <ListRowCard
                  key={doc.id}
                  density="compact"
                  leading={(
                    <div className={cn(correspondenceQueueLeadingBoxClass, "bg-blue-500/10")}>
                      <BookOpen className={cn(correspondenceQueueLeadingIconClass, "text-blue-600 dark:text-blue-400")} />
                    </div>
                  )}
                  actions={
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs justify-start text-muted-foreground"
                        onClick={() => handleViewHistory(doc)}
                      >
                        <History className="h-3 w-3 mr-1" /> History
                      </Button>
                      {doc.status === 'filed' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => { setCheckOutDoc(doc); setCheckOutOpen(true); }}
                          >
                            <LogOut className="h-3 w-3 mr-1" /> Check Out
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleUpdateStatus(doc, 'archived')}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" /> Archive
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleUpdateStatus(doc, 'destroyed')}
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> Destroy
                          </Button>
                        </>
                      )}
                      {doc.status === 'checked_out' && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleCheckIn(doc)}
                          >
                            <LogIn className="h-3 w-3 mr-1" /> Check In
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleUpdateStatus(doc, 'missing')}
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" /> Mark Missing
                          </Button>
                        </>
                      )}
                      {doc.status === 'missing' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleUpdateStatus(doc, 'filed')}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> Recovered
                        </Button>
                      )}
                    </div>
                  }
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    {statusBadge(doc.status)}
                    <div className="flex gap-2 shrink-0">
                      {doc.checked_out_at && (
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {formatDateShort(doc.checked_out_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold leading-snug text-foreground line-clamp-1">
                    {doc.description || doc.tracking_number}
                  </h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground leading-tight">
                    {doc.correspondence_ref && doc.correspondence ? (
                      <Link
                        href={`/correspondence/${doc.correspondence}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        {doc.correspondence_ref}
                      </Link>
                    ) : doc.correspondence_ref ? (
                      <span className="inline-flex items-center gap-1">
                        {doc.correspondence_ref}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0 opacity-80" />
                      {doc.location_name || '—'}
                    </span>
                    {doc.checked_out_to && (
                      <span className="inline-flex items-center gap-1">
                        <UserIcon className="h-3 w-3 shrink-0 opacity-80" />
                        {doc.checked_out_to.name || `${doc.checked_out_to.first_name || ''} ${doc.checked_out_to.last_name || ''}`.trim() || 'Unknown'}
                      </span>
                    )}
                    {doc.expected_return_at && (
                      <span className="inline-flex items-center gap-1 text-amber-600">
                        Due {formatDateShort(doc.expected_return_at)}
                      </span>
                    )}
                  </div>
                </ListRowCard>
              ))}
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
