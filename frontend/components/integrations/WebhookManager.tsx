"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Webhook, Plus, Edit, Trash2, TestTube, CheckCircle2, XCircle } from 'lucide-react';
import {
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  type Webhook as WebhookType,
} from '@/lib/integrations-storage';
import { logError } from '@/lib/client-logger';

export const WebhookManager = () => {
  const [webhooks, setWebhooks] = useState<WebhookType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookType | null>(null);
  const [formData, setFormData] = useState<Partial<WebhookType>>({
    name: '',
    description: '',
    url: '',
    events: [],
    secret: '',
    is_active: true,
    retry_count: 3,
    timeout_seconds: 30,
    headers: {},
  });

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      const data = await getWebhooks();
      // Ensure data is an array - handle paginated responses or errors
      if (Array.isArray(data)) {
        setWebhooks(data);
      } else if (data && typeof data === 'object') {
        // Handle paginated response with 'results' key
        if ('results' in data && Array.isArray((data as { results: unknown }).results)) {
          setWebhooks((data as { results: WebhookType[] }).results);
        } 
        // Handle wrapped response with 'data' key
        else if ('data' in data && Array.isArray((data as { data: unknown }).data)) {
          setWebhooks((data as { data: WebhookType[] }).data);
        } 
        // Fallback to empty array if data format is unexpected
        else {
          logError('Unexpected webhooks data format', data);
          setWebhooks([]);
        }
      } else {
        // Fallback to empty array if data is not an array or object
        logError('Unexpected webhooks data format', data);
        setWebhooks([]);
      }
    } catch (error) {
      logError('Failed to load webhooks', error);
      toast.error('Failed to load webhooks');
      setWebhooks([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingWebhook) {
        await updateWebhook(editingWebhook.id, formData);
        toast.success('Webhook updated');
      } else {
        await createWebhook(formData);
        toast.success('Webhook created');
      }
      setIsDialogOpen(false);
      setEditingWebhook(null);
      resetForm();
      loadWebhooks();
    } catch (error) {
      logError('Failed to save webhook', error);
      toast.error('Failed to save webhook');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return;
    }

    try {
      await deleteWebhook(id);
      toast.success('Webhook deleted');
      loadWebhooks();
    } catch (error) {
      logError('Failed to delete webhook', error);
      toast.error('Failed to delete webhook');
    }
  };

  const handleTest = async (id: string) => {
    try {
      const result = await testWebhook(id);
      if (result.status === 'success') {
        toast.success(result.message);
      } else {
        toast.error(result.error || 'Webhook test failed');
      }
    } catch (error) {
      logError('Failed to test webhook', error);
      toast.error('Failed to test webhook');
    }
  };

  const handleEdit = (webhook: WebhookType) => {
    setEditingWebhook(webhook);
    setFormData(webhook);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingWebhook(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      url: '',
      events: [],
      secret: '',
      is_active: true,
      retry_count: 3,
      timeout_seconds: 30,
      headers: {},
    });
  };

  const availableEvents = [
    'document.created',
    'document.updated',
    'correspondence.created',
    'correspondence.updated',
    'correspondence.completed',
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhooks
            </CardTitle>
            <CardDescription>
              Configure webhooks to receive notifications from external systems
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                New Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>
                  {editingWebhook ? 'Edit Webhook' : 'Create Webhook'}
                </DialogTitle>
                <DialogDescription>
                  Configure webhook URL, events, and security settings
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Webhook Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">Webhook URL *</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://example.com/webhook"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secret">Secret Key *</Label>
                  <Input
                    id="secret"
                    type="password"
                    value={formData.secret}
                    onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                    placeholder="Enter secret for HMAC signature"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Events *</Label>
                  <div className="grid grid-cols-2 gap-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                    {availableEvents.map((event) => (
                      <div key={event} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={event}
                          checked={formData.events?.includes(event) || false}
                          onChange={(e) => {
                            const events = formData.events || [];
                            if (e.target.checked) {
                              setFormData({ ...formData, events: [...events, event] });
                            } else {
                              setFormData({
                                ...formData,
                                events: events.filter((e) => e !== event),
                              });
                            }
                          }}
                        />
                        <Label htmlFor={event} className="text-sm font-normal cursor-pointer">
                          {event}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="retry_count">Retry Count</Label>
                    <Input
                      id="retry_count"
                      type="number"
                      value={formData.retry_count}
                      onChange={(e) =>
                        setFormData({ ...formData, retry_count: parseInt(e.target.value) })
                      }
                      min={0}
                      max={10}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timeout_seconds">Timeout (seconds)</Label>
                    <Input
                      id="timeout_seconds"
                      type="number"
                      value={formData.timeout_seconds}
                      onChange={(e) =>
                        setFormData({ ...formData, timeout_seconds: parseInt(e.target.value) })
                      }
                      min={1}
                      max={300}
                    />
                  </div>
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
                    {editingWebhook ? 'Update' : 'Create'} Webhook
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading webhooks...</div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No webhooks configured. Create your first webhook to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((webhook) => (
                <TableRow key={webhook.id}>
                  <TableCell className="font-medium">{webhook.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-xs">
                    {webhook.url}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.slice(0, 2).map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                      {webhook.events.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{webhook.events.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {webhook.is_active ? (
                      <Badge variant="default" className="bg-green-500">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTest(webhook.id)}
                      >
                        <TestTube className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(webhook)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(webhook.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

