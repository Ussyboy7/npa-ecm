"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FolderKanban, Plus, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { logError } from '@/lib/client-logger';
import { apiFetch } from '@/lib/api-client';
import type { DocumentRecord, DocumentWorkspace } from '@/lib/dms-storage';

const mapWorkspace = (item: Record<string, unknown>): DocumentWorkspace => ({
  id: String(item.id),
  name: item.name ?? 'Workspace',
  description: item.description ?? undefined,
  color: item.color ?? '#2563eb',
  memberIds: Array.isArray(item.member_ids)
    ? item.member_ids.map(String)
    : Array.isArray(item.members)
      ? item.members.map((member: Record<string, unknown>) => String(member.id ?? member))
      : [],
});

interface CollaborationPanelProps {
  document: DocumentRecord;
  documentWorkspaces: DocumentWorkspace[];
  workspaces: DocumentWorkspace[];
  onAddWorkspace: (workspaceId: string) => Promise<void>;
  onRemoveWorkspace: (workspaceId: string) => Promise<void>;
  workspaceManageOpen: boolean;
  onWorkspaceManageOpenChange: (open: boolean) => void;
  onWorkspacesRefreshed?: () => Promise<void>;
}

export const CollaborationPanel = ({
  document,
  documentWorkspaces,
  workspaces,
  onAddWorkspace,
  onRemoveWorkspace,
  workspaceManageOpen,
  onWorkspaceManageOpenChange,
  onWorkspacesRefreshed,
}: CollaborationPanelProps) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('');
  const [newWorkspaceColor, setNewWorkspaceColor] = useState('#2563eb');

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      toast.error('Workspace name is required');
      return;
    }

    setCreating(true);
    try {
      const response = await apiFetch<Record<string, unknown>>('/dms/workspaces/', {
        method: 'POST',
        body: JSON.stringify({
          name: newWorkspaceName.trim(),
          description: newWorkspaceDescription.trim() || undefined,
          color: newWorkspaceColor,
          member_ids: [],
        }),
      });

      const newWorkspace = mapWorkspace(response);
      toast.success('Workspace created successfully');
      
      // Reset form
      setNewWorkspaceName('');
      setNewWorkspaceDescription('');
      setNewWorkspaceColor('#2563eb');
      setShowCreateForm(false);

      // Refresh workspaces list
      if (onWorkspacesRefreshed) {
        await onWorkspacesRefreshed();
      }

      // Automatically add the new workspace to this document
      await onAddWorkspace(newWorkspace.id);
      toast.info('Workspace added to document');
    } catch (error: Record<string, unknown>) {
      logError('Failed to create workspace', error);
      toast.error(error?.response?.data?.detail || 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-primary" />
          Workspaces
        </CardTitle>
        <CardDescription className="mt-1">
          Organize documents into project workspaces. Workspaces are for grouping related documents by project or theme. For workflow-based grouping (complaints, requests, legal matters), use Cases instead.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Workspaces */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-xs font-medium text-muted-foreground">Workspaces</Label>
            <Dialog open={workspaceManageOpen} onOpenChange={onWorkspaceManageOpenChange}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" aria-label="Manage workspaces">
                  <Plus className="h-3 w-3" />
                  Manage
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-primary" />
                    Manage Workspaces
                  </DialogTitle>
                  <DialogDescription>Add or remove workspaces for this document.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Create New Workspace Section */}
                  <div className="space-y-2">
                    {!showCreateForm ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => setShowCreateForm(true)}
                      >
                        <Plus className="h-4 w-4" />
                        Create New Workspace
                      </Button>
                    ) : (
                      <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Create Workspace</Label>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              setShowCreateForm(false);
                              setNewWorkspaceName('');
                              setNewWorkspaceDescription('');
                              setNewWorkspaceColor('#2563eb');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <Label htmlFor="workspace-name" className="text-xs">Name *</Label>
                            <Input
                              id="workspace-name"
                              value={newWorkspaceName}
                              onChange={(e) => setNewWorkspaceName(e.target.value)}
                              placeholder="e.g. Project Alpha"
                              className="h-8 text-sm"
                              maxLength={255}
                            />
                          </div>
                          <div>
                            <Label htmlFor="workspace-description" className="text-xs">Description</Label>
                            <Textarea
                              id="workspace-description"
                              value={newWorkspaceDescription}
                              onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                              placeholder="Optional description"
                              rows={2}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor="workspace-color" className="text-xs">Color</Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                id="workspace-color"
                                value={newWorkspaceColor}
                                onChange={(e) => setNewWorkspaceColor(e.target.value)}
                                className="h-8 w-16 rounded border"
                              />
                              <Input
                                value={newWorkspaceColor}
                                onChange={(e) => setNewWorkspaceColor(e.target.value)}
                                placeholder="#2563eb"
                                className="h-8 text-sm font-mono"
                                maxLength={7}
                              />
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={handleCreateWorkspace}
                            disabled={creating || !newWorkspaceName.trim()}
                          >
                            {creating ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <Plus className="h-3 w-3 mr-2" />
                                Create & Add to Document
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Available Workspaces */}
                  <div className="space-y-2">
                    <Label>Available Workspaces</Label>
                    <ScrollArea className="max-h-[300px]">
                      <div className="space-y-2 pr-4">
                        {workspaces.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No workspaces available. Create one above.
                          </p>
                        ) : (
                          workspaces.map((workspace) => {
                            const isAssigned = document.workspaceIds.includes(workspace.id);
                            return (
                              <div
                                key={workspace.id}
                                className="flex items-center justify-between p-2.5 border rounded-md hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                  <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: workspace.color }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium">{workspace.name}</span>
                                    {workspace.description && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {workspace.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {isAssigned ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onRemoveWorkspace(workspace.id)}
                                    className="h-7 text-xs gap-1"
                                    aria-label={`Remove ${workspace.name} workspace`}
                                  >
                                    <X className="h-3 w-3" />
                                    Remove
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onAddWorkspace(workspace.id)}
                                    className="h-7 text-xs gap-1"
                                    aria-label={`Add ${workspace.name} workspace`}
                                  >
                                    <Plus className="h-3 w-3" />
                                    Add
                                  </Button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {documentWorkspaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed rounded-lg">
              <FolderKanban className="h-6 w-6 text-muted-foreground mb-2 opacity-50" />
              <p className="text-xs text-muted-foreground">No workspaces assigned</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-[300px] overflow-y-auto pr-2">
              {documentWorkspaces.map((workspace) => (
                <Badge
                  key={workspace.id}
                  variant="outline"
                  className="gap-1.5 text-xs py-1 px-2"
                  style={{ borderColor: workspace.color }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: workspace.color }}
                  />
                  {workspace.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


