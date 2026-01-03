"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { FileClock, Plus, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import {
  getRetentionPolicies,
  createRetentionPolicy,
  updateRetentionPolicy,
  type RetentionPolicy,
} from '@/lib/records-storage';
import { logError } from '@/lib/client-logger';

export const RetentionPolicyManager = () => {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<RetentionPolicy | null>(null);
  const [formData, setFormData] = useState<Partial<RetentionPolicy>>({
    name: '',
    description: '',
    retention_period_days: 365,
    trigger_event: 'creation',
    applies_to: 'document',
    disposition_action: 'archive',
    requires_approval: false,
    is_active: true,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      const data = await getRetentionPolicies({ signal: controller.signal });
      
      if (controller.signal.aborted) {
        return;
      }
      // Ensure data is an array
      if (Array.isArray(data)) {
        setPolicies(data);
      } else {
        logError('Expected array but got:', data);
        setPolicies([]);
        toast.error('Invalid response format from server');
      }
      } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      logError('Failed to load retention policies', error);
      toast.error('Failed to load retention policies');
      setPolicies([]); // Set to empty array on error
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPolicy) {
        await updateRetentionPolicy(editingPolicy.id, formData);
        toast.success('Retention policy updated');
      } else {
        await createRetentionPolicy(formData);
        toast.success('Retention policy created');
      }
      setIsDialogOpen(false);
      setEditingPolicy(null);
      setFormData({
        name: '',
        description: '',
        retention_period_days: 365,
        trigger_event: 'creation',
        applies_to: 'document',
        disposition_action: 'archive',
        requires_approval: false,
        is_active: true,
      });
      loadPolicies();
      } catch (error: unknown) {
      logError('Failed to save retention policy', error);
      toast.error('Failed to save retention policy');
    }
  };

  const handleEdit = (policy: RetentionPolicy) => {
    setEditingPolicy(policy);
    setFormData(policy);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingPolicy(null);
    setFormData({
      name: '',
      description: '',
      retention_period_days: 365,
      trigger_event: 'creation',
      applies_to: 'document',
      disposition_action: 'archive',
      requires_approval: false,
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileClock className="h-5 w-5" />
              Retention Policies
            </CardTitle>
            <CardDescription>
              Manage document retention policies and disposition rules
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                New Policy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>
                  {editingPolicy ? 'Edit Retention Policy' : 'Create Retention Policy'}
                </DialogTitle>
                <DialogDescription>
                  Configure retention period, trigger events, and disposition actions
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Policy Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="retention_period_days">Retention Period (Days) *</Label>
                    <Input
                      id="retention_period_days"
                      type="number"
                      value={formData.retention_period_days}
                      onChange={(e) =>
                        setFormData({ ...formData, retention_period_days: parseInt(e.target.value) })
                      }
                      required
                      min={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trigger_event">Trigger Event *</Label>
                    <Select
                      value={formData.trigger_event}
                      onValueChange={(value: Record<string, unknown>) =>
                        setFormData({ ...formData, trigger_event: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="creation">Creation</SelectItem>
                        <SelectItem value="completion">Completion</SelectItem>
                        <SelectItem value="last_access">Last Access</SelectItem>
                        <SelectItem value="last_modified">Last Modified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="applies_to">Applies To *</Label>
                    <Select
                      value={formData.applies_to}
                      onValueChange={(value: Record<string, unknown>) =>
                        setFormData({ ...formData, applies_to: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="document">Documents</SelectItem>
                        <SelectItem value="correspondence">Correspondence</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="disposition_action">Disposition Action *</Label>
                    <Select
                      value={formData.disposition_action}
                      onValueChange={(value: Record<string, unknown>) =>
                        setFormData({ ...formData, disposition_action: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="archive">Archive</SelectItem>
                        <SelectItem value="delete">Delete</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="requires_approval"
                    checked={formData.requires_approval}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, requires_approval: checked })
                    }
                  />
                  <Label htmlFor="requires_approval">Requires Approval</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingPolicy ? 'Update' : 'Create'} Policy
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading policies...</div>
        ) : policies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No retention policies found. Create your first policy to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Retention Period</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead>Disposition</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => (
                <TableRow key={policy.id}>
                  <TableCell className="font-medium">{policy.name}</TableCell>
                  <TableCell>{policy.retention_period_days} days</TableCell>
                  <TableCell className="capitalize">{policy.trigger_event.replace('_', ' ')}</TableCell>
                  <TableCell className="capitalize">{policy.applies_to}</TableCell>
                  <TableCell className="capitalize">{policy.disposition_action}</TableCell>
                  <TableCell>
                    {policy.is_active ? (
                      <Badge variant="default" className="bg-green-500">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(policy)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

