"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FolderKanban, Plus, Search, Pencil, Trash2, Users, Loader2, FileText, Palette, ChevronRight } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { HelpGuideCard } from "@/components/help/HelpGuideCard";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { mapWorkspace } from "@/lib/dms-types";
import type { DocumentWorkspace } from "@/lib/dms-storage";

const DEFAULT_COLOR = "#2563eb";

export default function WorkspacesPage() {

  const [workspaces, setWorkspaces] = useState<DocumentWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<DocumentWorkspace | null>(null);
  const [deleting, setDeleting] = useState<DocumentWorkspace | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState(DEFAULT_COLOR);

  const loadWorkspaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiFetch<unknown>("/dms/workspaces/");
      const items = (Array.isArray(payload) ? payload : []) as Record<string, unknown>[];
      setWorkspaces(items.map(mapWorkspace));
    } catch (_err) {
      setError("Failed to load workspaces.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return workspaces;
    const q = searchQuery.toLowerCase();
    return workspaces.filter(
      (w) => w.name.toLowerCase().includes(q) || (w.description ?? "").toLowerCase().includes(q)
    );
  }, [workspaces, searchQuery]);

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormColor(DEFAULT_COLOR);
  };

  const openCreate = () => {
    resetForm();
    setEditing(null);
    setShowCreate(true);
  };

  const openEdit = (ws: DocumentWorkspace) => {
    setFormName(ws.name);
    setFormDescription(ws.description ?? "");
    setFormColor(ws.color || DEFAULT_COLOR);
    setEditing(ws);
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Workspace name is required");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        color: formColor,
      };
      if (editing) {
        await apiFetch(`/dms/workspaces/${editing.id}/`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast.success("Workspace updated");
      } else {
        const created = await apiFetch<Record<string, unknown>>("/dms/workspaces/", {
          method: "POST",
          body: JSON.stringify({ ...body, member_ids: [] }),
        });
        setWorkspaces((prev) => [...prev, mapWorkspace(created)]);
        toast.success("Workspace created");
      }
      setShowCreate(false);
      resetForm();
      await loadWorkspaces();
    } catch (_err) {
      toast.error(editing ? "Failed to update workspace" : "Failed to create workspace");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSubmitting(true);
    try {
      await apiFetch(`/dms/workspaces/${deleting.id}/`, { method: "DELETE" });
      setWorkspaces((prev) => prev.filter((w) => w.id !== deleting.id));
      toast.success("Workspace deleted");
      setDeleting(null);
      await loadWorkspaces();
    } catch (_err) {
      toast.error("Failed to delete workspace");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <FolderKanban className="h-6 w-6 text-primary" />
              Workspaces
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Organize documents into project workspaces.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            New Workspace
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <HelpGuideCard title="About Workspaces" description="Workspaces are for grouping related documents by project or theme. For workflow-based grouping (complaints, requests, legal matters), use Cases instead." />

          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workspaces..."
              className="pl-9 h-9"
            />
          </div>

          {loading ? (
            <LoadingState message="Loading workspaces..." />
          ) : error ? (
            <ErrorState message={error} onRetry={loadWorkspaces} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<FolderKanban className="h-8 w-8" />}
              title={searchQuery ? "No matching workspaces" : "No workspaces yet"}
              message={
                searchQuery
                  ? "Try a different search term."
                  : "Create your first workspace to organize related documents."
              }
              actionLabel={!searchQuery ? "Create Workspace" : undefined}
              onAction={!searchQuery ? openCreate : undefined}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((ws) => (
                <Link key={ws.id} href={`/workspaces/${ws.id}`} className="block">
                  <Card className="group hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full shrink-0 mt-0.5"
                            style={{ backgroundColor: ws.color || DEFAULT_COLOR }}
                          />
                          <CardTitle className="text-sm font-semibold truncate">
                            {ws.name}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => { e.preventDefault(); openEdit(ws); }}
                            aria-label="Edit workspace"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={(e) => { e.preventDefault(); setDeleting(ws); }}
                            aria-label="Delete workspace"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      {ws.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{ws.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {typeof ws.documentCount === 'number' ? `${ws.documentCount} ${ws.documentCount === 1 ? 'document' : 'documents'}` : 'Documents'}
                        </span>
                        {ws.memberIds.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {ws.memberIds.length} {ws.memberIds.length === 1 ? "member" : "members"}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              {editing ? "Edit Workspace" : "Create Workspace"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "Update the workspace name, description, or color." : "Create a new workspace to organize related documents."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ws-name">Name *</Label>
              <Input
                id="ws-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Project Alpha"
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-desc">Description</Label>
              <Textarea
                id="ws-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-color">Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="ws-color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="h-8 w-16 rounded border cursor-pointer"
                />
                <Input
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="h-8 text-sm font-mono"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={submitting || !formName.trim()}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleting?.name}</strong>? Documents in this workspace will not be deleted, but they will lose this workspace association.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
