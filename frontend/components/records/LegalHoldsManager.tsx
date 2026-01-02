"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Shield, Plus, Search, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { getLegalHolds, createLegalHold, checkLegalHold } from '@/lib/records-storage';
import { toast } from 'sonner';
import { formatDate } from '@/lib/correspondence-helpers';
import { Alert, AlertDescription } from '@/components/ui/alert';

import type { LegalHold } from '@/lib/records-storage';

export const LegalHoldsManager = () => {
  const [legalHolds, setLegalHolds] = useState<LegalHold[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [formData, setFormData] = useState({
    case_number: '',
    case_name: '',
    description: '',
  });

  useEffect(() => {
    loadLegalHolds();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const loadLegalHolds = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      
      const holds = await getLegalHolds({ is_active: true });
      setLegalHolds(holds);
    } catch (error: Record<string, unknown>) {
      if (error.name === 'AbortError') return;
      logError('Failed to load legal holds:', error);
      toast.error('Failed to load legal holds');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreate = useCallback(async () => {
    if (!formData.description.trim()) {
      toast.error('Description is required');
      return;
    }

    try {
      setCreating(true);
      await createLegalHold({
        name: formData.case_name || 'Legal Hold',
        reason: formData.description,
        case_number: formData.case_number || undefined,
        is_active: true,
        start_date: new Date().toISOString(),
      });

      toast.success('Legal hold created successfully');
      setShowCreateDialog(false);
      setFormData({ case_number: '', case_name: '', description: '' });
      await loadLegalHolds();
    } catch (error: Record<string, unknown>) {
      logError('Failed to create legal hold:', error);
      toast.error('Failed to create legal hold', {
        description: error.message || 'Please try again',
      });
    } finally {
      setCreating(false);
    }
  }, [formData, loadLegalHolds]);

  const filteredHolds = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return legalHolds.filter((hold) => (
      hold.case_number?.toLowerCase().includes(searchLower) ||
      hold.name?.toLowerCase().includes(searchLower) ||
      hold.reason.toLowerCase().includes(searchLower)
    ));
  }, [legalHolds, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Legal Holds</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Prevent document deletion or archival during legal proceedings
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Legal Hold
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Legal Hold</DialogTitle>
              <DialogDescription>
                Create a legal hold to prevent records from being deleted or archived
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="case_number">Case Number (Optional)</Label>
                <Input
                  id="case_number"
                  value={formData.case_number}
                  onChange={(e) =>
                    setFormData({ ...formData, case_number: e.target.value })
                  }
                  placeholder="e.g., CASE-2025-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="case_name">Case Name (Optional)</Label>
                <Input
                  id="case_name"
                  value={formData.case_name}
                  onChange={(e) =>
                    setFormData({ ...formData, case_name: e.target.value })
                  }
                  placeholder="e.g., Investigation XYZ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe the legal hold and why it's needed..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Legal Holds</CardTitle>
              <CardDescription>
                {filteredHolds.length} active legal hold{filteredHolds.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search legal holds..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                  aria-label="Search legal holds"
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
          ) : filteredHolds.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? (
                <>
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No legal holds found matching your search</p>
                </>
              ) : (
                <>
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No active legal holds</p>
                  <p className="text-sm mt-1">Create a legal hold to prevent record deletion</p>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                  <TableRow>
                  <TableHead>Case Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHolds.map((hold) => (
                  <TableRow key={hold.id}>
                    <TableCell className="font-mono text-sm">
                      {hold.case_number || 'N/A'}
                    </TableCell>
                    <TableCell>{hold.name || 'N/A'}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {hold.reason}
                    </TableCell>
                    <TableCell>{formatDate(hold.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant={hold.is_active ? 'default' : 'secondary'}>
                        {hold.is_active ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <X className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

