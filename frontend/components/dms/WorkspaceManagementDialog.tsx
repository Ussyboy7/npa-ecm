"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, X, Users, Trash2, Edit2, Save } from "lucide-react";
import { toast } from "sonner";
import { logError } from "@/lib/client-logger";
import { apiFetch } from "@/lib/api-client";
import type { DocumentWorkspace } from "@/lib/dms-storage";
import { useOrganization } from "@/contexts/OrganizationContext";

interface WorkspaceManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces: DocumentWorkspace[];
  onWorkspaceChange: () => void;
}

export const WorkspaceManagementDialog = ({
  open,
  onOpenChange,
  workspaces,
  onWorkspaceChange,
}: WorkspaceManagementDialogProps) => {
  const { users: organizationUsers } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#2563eb",
    memberIds: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setFormData({ name: "", description: "", color: "#2563eb", memberIds: [] });
      setErrors({});
    }
  }, [open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Workspace name is required";
    }
    if (formData.name.length > 255) {
      newErrors.name = "Name must be less than 255 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await apiFetch("/dms/workspaces/", {
        method: "POST",
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          color: formData.color,
          member_ids: formData.memberIds,
        }),
      });
      toast.success("Workspace created successfully");
      setFormData({ name: "", description: "", color: "#2563eb", memberIds: [] });
      onWorkspaceChange();
    } catch (error: any) {
      logError("Failed to create workspace", error);
      toast.error(error?.response?.data?.detail || "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (workspaceId: string) => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await apiFetch(`/dms/workspaces/${workspaceId}/`, {
        method: "PATCH",
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          color: formData.color,
          member_ids: formData.memberIds,
        }),
      });
      toast.success("Workspace updated successfully");
      setEditingId(null);
      setFormData({ name: "", description: "", color: "#2563eb", memberIds: [] });
      onWorkspaceChange();
    } catch (error: any) {
      logError("Failed to update workspace", error);
      toast.error(error?.response?.data?.detail || "Failed to update workspace");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (workspaceId: string, workspaceName: string) => {
    if (!confirm(`Are you sure you want to delete "${workspaceName}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      await apiFetch(`/dms/workspaces/${workspaceId}/`, {
        method: "DELETE",
      });
      toast.success("Workspace deleted successfully");
      onWorkspaceChange();
    } catch (error: any) {
      logError("Failed to delete workspace", error);
      toast.error(error?.response?.data?.detail || "Failed to delete workspace");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (workspace: DocumentWorkspace) => {
    setEditingId(workspace.id);
    setFormData({
      name: workspace.name,
      description: workspace.description || "",
      color: workspace.color,
      memberIds: workspace.memberIds || [],
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: "", description: "", color: "#2563eb", memberIds: [] });
    setErrors({});
  };

  const toggleMember = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(userId)
        ? prev.memberIds.filter((id) => id !== userId)
        : [...prev.memberIds, userId],
    }));
  };

  const availableUsers = organizationUsers.filter((u) => u.active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Workspaces</DialogTitle>
          <DialogDescription>
            Create, edit, and manage document workspaces. Workspaces help organize documents and control access.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Create/Edit Form */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-sm">
              {editingId ? "Edit Workspace" : "Create New Workspace"}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="workspace-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="workspace-name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: "" });
                  }}
                  placeholder="Enter workspace name"
                  aria-label="Workspace name"
                  aria-required="true"
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspace-color">Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="workspace-color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-16 h-10"
                    aria-label="Workspace color"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#2563eb"
                    className="flex-1"
                    aria-label="Color hex code"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspace-description">Description</Label>
              <Textarea
                id="workspace-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter workspace description (optional)"
                rows={2}
                aria-label="Workspace description"
              />
            </div>
            <div className="space-y-2">
              <Label>Members</Label>
              <ScrollArea className="h-32 border rounded-md p-2">
                <div className="space-y-2">
                  {availableUsers.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={formData.memberIds.includes(user.id)}
                        onChange={() => toggleMember(user.id)}
                        className="rounded"
                        aria-label={`Add ${user.name} to workspace`}
                      />
                      <span className="text-sm">{user.name}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="flex justify-end gap-2">
              {editingId && (
                <Button variant="outline" onClick={cancelEdit} disabled={loading}>
                  Cancel
                </Button>
              )}
              <Button
                onClick={() => (editingId ? handleUpdate(editingId) : handleCreate())}
                disabled={loading}
                aria-label={editingId ? "Save workspace changes" : "Create workspace"}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingId ? "Saving..." : "Creating..."}
                  </>
                ) : (
                  <>
                    {editingId ? (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Workspace
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Workspaces List */}
          <ScrollArea className="flex-1 border rounded-lg">
            <div className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">Existing Workspaces</h3>
              {workspaces.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No workspaces yet. Create one above to get started.
                </p>
              ) : (
                workspaces.map((workspace) => {
                  const isEditing = editingId === workspace.id;
                  const members = workspace.memberIds
                    .map((id) => organizationUsers.find((u) => u.id === id))
                    .filter(Boolean);

                  return (
                    <div
                      key={workspace.id}
                      className="border rounded-lg p-4 space-y-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: workspace.color }}
                            aria-label={`Workspace color: ${workspace.color}`}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{workspace.name}</h4>
                            {workspace.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {workspace.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className="gap-1">
                            <Users className="h-3 w-3" />
                            {members.length}
                          </Badge>
                          {!isEditing && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => startEdit(workspace)}
                                aria-label={`Edit ${workspace.name}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(workspace.id, workspace.name)}
                                disabled={loading}
                                aria-label={`Delete ${workspace.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {members.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {members.map((member) => (
                            <Badge key={member?.id} variant="secondary" className="text-xs">
                              {member?.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

