"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Archive, Search, Loader2, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { getDispositions, approveDisposition } from '@/lib/records-storage';
import { toast } from 'sonner';
import { formatDate } from '@/lib/correspondence-helpers';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logError } from '@/lib/client-logger';
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

import type { Disposition } from '@/lib/records-storage';

export const DispositionsManager = () => {
  const [dispositions, setDispositions] = useState<Disposition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedDisposition, setSelectedDisposition] = useState<Disposition | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadDispositions();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const loadDispositions = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      
      const params: { status?: string } = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      const items = await getDispositions(params);
      setDispositions(items);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      logError('Failed to load dispositions:', error);
      toast.error('Failed to load dispositions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadDispositions();
  }, [loadDispositions]);

  const handleApprove = useCallback(async () => {
    if (!selectedDisposition) return;

    try {
      setApprovingId(selectedDisposition.id);
      await approveDisposition(selectedDisposition.id);
      toast.success('Disposition approved successfully');
      setShowApproveDialog(false);
      setSelectedDisposition(null);
      await loadDispositions();
    } catch (error: unknown) {
      logError('Failed to approve disposition:', error);
      toast.error('Failed to approve disposition', {
        description: (error instanceof Error ? error.message : "Unknown error") || 'Please try again',
      });
    } finally {
      setApprovingId(null);
    }
  }, [selectedDisposition, loadDispositions]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
      case 'scheduled':
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            {status === 'pending' ? 'Pending' : 'Scheduled'}
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="secondary">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'blocked':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Blocked
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'delete':
        return <Badge variant="destructive">Delete</Badge>;
      case 'archive':
        return <Badge variant="secondary">Archive</Badge>;
      case 'review':
        return <Badge variant="outline">Review</Badge>;
      case 'transfer':
        return <Badge variant="outline">Transfer</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const filteredDispositions = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return dispositions.filter((disp) => (
      disp.record_id.toLowerCase().includes(searchLower) ||
      disp.record_type.toLowerCase().includes(searchLower) ||
      disp.policy?.name?.toLowerCase().includes(searchLower)
    ));
  }, [dispositions, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Dispositions</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage disposition workflows for records that have reached their retention end date
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Disposition Workflows</CardTitle>
              <CardDescription>
                {filteredDispositions.length} disposition{filteredDispositions.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search dispositions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                  aria-label="Search dispositions"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDispositions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || statusFilter !== 'all' ? (
                <>
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No dispositions found matching your filters</p>
                </>
              ) : (
                <>
                  <Archive className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No dispositions found</p>
                  <p className="text-sm mt-1">Dispositions are automatically created when retention periods end</p>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Record</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDispositions.map((disp) => (
                  <TableRow key={disp.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{disp.record_id}</div>
                        {disp.blocked_by_legal_hold && (
                          <Badge variant="destructive" className="mt-1 text-xs">
                            On Legal Hold
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{disp.record_type}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(disp.scheduled_date)}</TableCell>
                    <TableCell>{getActionBadge(disp.action)}</TableCell>
                    <TableCell>{getStatusBadge(disp.status)}</TableCell>
                    <TableCell>{formatDate(disp.created_at)}</TableCell>
                    <TableCell>
                      {(disp.status === 'pending' || disp.status === 'scheduled') && !disp.blocked_by_legal_hold && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDisposition(disp);
                            setShowApproveDialog(true);
                          }}
                          aria-label={`Approve disposition for ${disp.record_id}`}
                        >
                          {approvingId === disp.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Disposition</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this disposition? This will {selectedDisposition?.action} the record
              "{selectedDisposition?.record_id}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={approvingId !== null}>
              {approvingId && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

