"use client";

import { useCallback, useEffect, useState, useMemo, Suspense } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, BookOpen, RefreshCw, LogOut, LogIn } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { unwrapResults } from '@/lib/type-utils';
import { fetchAllCatalogPaginated } from '@/lib/pagination-utils';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { toast } from 'sonner';
import { logError } from '@/lib/client-logger';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';

interface Location {
  id: string;
  building: string;
  floor: string;
  room: string;
  shelf: string;
  cabinet: string;
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
  status: 'in_storage' | 'checked_out' | 'in_transit' | 'destroyed' | 'missing';
  description: string;
  checked_out_to: UserBrief | null;
  checked_out_at: string | null;
  expected_return_at: string | null;
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
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [checkOutDoc, setCheckOutDoc] = useState<PhysicalDocument | null>(null);
  const [checkOutUserId, setCheckOutUserId] = useState('');
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [users, setUsers] = useState<UserBrief[]>([]);
  const [submitting, setSubmitting] = useState(false);

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
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
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
  }, [selectedLocation, searchQuery, pagination.page, pagination.pageSize]);

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
  }, [selectedLocation, fetchDocuments]);

  const handleSearch = () => {
    fetchDocuments();
  };

  const handleCheckOut = async () => {
    if (!checkOutDoc || !checkOutUserId) return;
    setSubmitting(true);
    try {
      await apiFetch(`/correspondence/physical-documents/${checkOutDoc.id}/check-out/`, {
        method: 'POST',
        body: JSON.stringify({ user_id: checkOutUserId, purpose: checkOutNotes }),
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success('Document checked out successfully');
      setCheckOutOpen(false);
      setCheckOutDoc(null);
      setCheckOutUserId('');
      setCheckOutNotes('');
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

  const statusBadge = (status: string) => {
    switch (status) {
      case 'checked_out':
        return <Badge variant="destructive" className="whitespace-nowrap">Checked Out</Badge>;
      case 'in_storage':
        return <Badge variant="default" className="bg-success/10 text-success border-success/20 whitespace-nowrap">Available</Badge>;
      case 'in_transit':
        return <Badge variant="secondary" className="whitespace-nowrap">In Transit</Badge>;
      case 'destroyed':
        return <Badge variant="outline" className="whitespace-nowrap">Destroyed</Badge>;
      case 'missing':
        return <Badge variant="outline" className="text-destructive border-destructive/30 whitespace-nowrap">Missing</Badge>;
      default:
        return <Badge variant="outline" className="whitespace-nowrap">{status}</Badge>;
    }
  };

  const locationTabs = useMemo(() => {
    const tabs: { id: string; label: string }[] = [{ id: 'all', label: 'All Locations' }];
    for (const loc of locations) {
      tabs.push({ id: loc.id, label: loc.display_name || `${loc.building} ${loc.floor ? `/ ${loc.floor}` : ''}`.trim() });
    }
    return tabs;
  }, [locations]);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Physical Documents</h1>
            <p className="text-muted-foreground mt-1">Track physical document locations, check-outs, and returns</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { fetchDocuments(); fetchLocations(); }}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        <Tabs value={selectedLocation} onValueChange={setSelectedLocation}>
          <TabsList className="flex-wrap h-auto">
            {locationTabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title, barcode, or tracking number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              className="pl-10"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" /> Search
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">All Physical Documents</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6"><LoadingState message="Loading documents..." /></div>
            ) : error ? (
              <div className="p-6"><ErrorState message={error} variant="inline" onRetry={fetchDocuments} retryLabel="Retry" /></div>
            ) : documents.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<BookOpen className="h-12 w-12 text-muted-foreground" />}
                  title="No physical documents found"
                  message={searchQuery ? 'Try adjusting your search.' : 'No documents in this location.'}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title / Description</TableHead>
                      <TableHead>Barcode</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Shelf / Row</TableHead>
                      <TableHead>Checked Out To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {doc.description || doc.tracking_number}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {doc.barcode || '—'}
                        </TableCell>
                        <TableCell>{doc.location_name || '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">—</TableCell>
                        <TableCell>
                          {doc.checked_out_to ? (
                            <span className="text-sm">
                              {doc.checked_out_to.name || `${doc.checked_out_to.first_name || ''} ${doc.checked_out_to.last_name || ''}`.trim() || 'Unknown'}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>{statusBadge(doc.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {doc.status === 'in_storage' && (
                              <Dialog open={checkOutOpen && checkOutDoc?.id === doc.id} onOpenChange={(open) => { setCheckOutOpen(open); if (!open) setCheckOutDoc(null); }}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => { setCheckOutDoc(doc); setCheckOutOpen(true); }}
                                  >
                                    <LogOut className="h-3 w-3 mr-1" /> Check Out
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Check Out Document</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div>
                                      <Label>Document</Label>
                                      <p className="text-sm text-muted-foreground">{doc.description || doc.tracking_number}</p>
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
                            )}
                            {doc.status === 'checked_out' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => handleCheckIn(doc)}
                              >
                                <LogIn className="h-3 w-3 mr-1" /> Check In
                              </Button>
                            )}
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
        {count > 0 && <PaginationControls pagination={pagination} className="mt-4" />}
      </div>
    </DashboardLayout>
  );
}

const PhysicalDocumentsPage = () => (
  <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
    <PhysicalDocumentsForm />
  </Suspense>
);

export default PhysicalDocumentsPage;
