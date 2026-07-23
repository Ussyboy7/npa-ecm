"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Shield, Plus, Pencil, Eye, Trash2, CheckCircle2, XCircle, Search } from "lucide-react";
import { toast } from "sonner";
import {
  createDrmPolicy,
  updateDrmPolicy,
  deleteDrmPolicy,
  fetchDrmPolicies,
  type DocumentRightsPolicy,
} from "@/lib/drm-api";
import { cn } from "@/lib/utils";
import {
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from "@/components/shared/registry-queue-styles";

const defaultForm = {
  name: "",
  description: "",
  allow_download: true,
  allow_print: true,
  allow_external_share: false,
  view_only: false,
  watermark_text: "",
  expires_after_days: "",
};

export default function DrmPoliciesPage() {
  const [policies, setPolicies] = useState<DocumentRightsPolicy[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState<DocumentRightsPolicy | null>(null);
  const [viewing, setViewing] = useState<DocumentRightsPolicy | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const load = async () => {
    setPolicies(await fetchDrmPolicies());
  };

  useEffect(() => {
    void load();
  }, []);

  const resetForm = () => {
    setForm(defaultForm);
    setEditing(null);
  };

  const openEdit = (policy: DocumentRightsPolicy) => {
    setEditing(policy);
    setForm({
      name: policy.name,
      description: policy.description,
      allow_download: policy.allow_download,
      allow_print: policy.allow_print,
      allow_external_share: policy.allow_external_share,
      view_only: policy.view_only,
      watermark_text: policy.watermark_text,
      expires_after_days: policy.expires_after_days?.toString() ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Policy name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description,
        allow_download: form.allow_download,
        allow_print: form.allow_print,
        allow_external_share: form.allow_external_share,
        view_only: form.view_only,
        watermark_text: form.watermark_text,
        expires_after_days: form.expires_after_days ? Number(form.expires_after_days) : null,
      };

      if (editing) {
        await updateDrmPolicy(editing.id, payload);
        toast.success("Policy updated");
      } else {
        await createDrmPolicy(payload);
        toast.success("Policy created");
      }

      setDialogOpen(false);
      resetForm();
      await load();
    } catch {
      toast.error(editing ? "Failed to update policy" : "Failed to create policy");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (policy: DocumentRightsPolicy) => {
    try {
      await updateDrmPolicy(policy.id, { is_active: !policy.is_active });
      toast.success(policy.is_active ? "Policy deactivated" : "Policy activated");
      await load();
    } catch {
      toast.error("Failed to update policy");
    }
  };

  const handleDelete = async (policy: DocumentRightsPolicy) => {
    try {
      await deleteDrmPolicy(policy.id);
      toast.success("Policy deleted");
      await load();
    } catch {
      toast.error("Failed to delete policy");
    }
  };

  const boolLabel = (v: boolean) => (v ? "Yes" : "No");

  const filteredPolicies = useMemo(() => {
    if (!searchQuery.trim()) return policies;
    const q = searchQuery.trim().toLowerCase();
    return policies.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
    );
  }, [policies, searchQuery]);

  return (
    <AdminPageShell title="DRM Policies" subtitle="Control document download, print, watermark, sharing, and expiry." icon={Shield}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" /> New Policy
              </Button>
            </DialogTrigger>
            <DialogContent size="md">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Policy" : "New Policy"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Policy name</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Confidential — View Only" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="What this policy is for..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Switch id="dl" checked={form.allow_download} onCheckedChange={(v) => setForm({ ...form, allow_download: v })} />
                    <Label htmlFor="dl">Allow download</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="pr" checked={form.allow_print} onCheckedChange={(v) => setForm({ ...form, allow_print: v })} />
                    <Label htmlFor="pr">Allow print</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="ext" checked={form.allow_external_share} onCheckedChange={(v) => setForm({ ...form, allow_external_share: v })} />
                    <Label htmlFor="ext">External sharing</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="vo" checked={form.view_only} onCheckedChange={(v) => setForm({ ...form, view_only: v })} />
                    <Label htmlFor="vo">View only</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wm">Watermark text</Label>
                  <Input id="wm" value={form.watermark_text} onChange={(e) => setForm({ ...form, watermark_text: e.target.value })} placeholder="e.g. CONFIDENTIAL" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exp">Expires after (days, leave empty for no expiry)</Label>
                  <Input id="exp" type="number" min="1" value={form.expires_after_days} onChange={(e) => setForm({ ...form, expires_after_days: e.target.value })} placeholder="e.g. 90" />
                </div>
                <Button className="w-full" onClick={() => void handleSave()} disabled={saving}>
                  {saving ? "Saving..." : editing ? "Update policy" : "Create policy"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Policies", value: policies.length, icon: Shield, bgClass: "bg-primary/10", iconClass: "text-primary" },
            { label: "Active", value: policies.filter((p) => p.is_active).length, icon: CheckCircle2, bgClass: "bg-green-500/10", iconClass: "text-green-600" },
            { label: "Inactive", value: policies.filter((p) => !p.is_active).length, icon: XCircle, bgClass: "bg-slate-500/10", iconClass: "text-slate-600" },
          ].map(({ label, value, icon: Icon, bgClass, iconClass }) => (
            <Card key={label}>
              <CardContent className={registryQueueStatCardContentClass}>
                <div className="flex items-center gap-4">
                  <div className={cn(registryQueueStatIconBoxClass, bgClass)}>
                    <Icon className={cn(registryQueueStatIconClass, iconClass)} />
                  </div>
                  <div>
                    <p className={registryQueueStatLabelClass}>{label}</p>
                    <p className={registryQueueStatValueClass}>{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter bar */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-2">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search policies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPolicies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      {searchQuery.trim() ? "No policies match your search." : "No policies yet. Create one to get started."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPolicies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell>
                        <p className="font-medium">{policy.name}</p>
                        {policy.description && (
                          <p className="text-xs text-muted-foreground">{policy.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={policy.is_active}
                          onCheckedChange={() => void toggleActive(policy)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="View">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent size="md">
                              <DialogHeader>
                                <DialogTitle>{policy.name}</DialogTitle>
                              </DialogHeader>
                              {policy.description && (
                                <p className="text-sm text-muted-foreground -mt-1 mb-3">{policy.description}</p>
                              )}
                              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                <div className="space-y-0.5">
                                  <Label className="text-xs text-muted-foreground">Allow download</Label>
                                  <p className="font-medium">{boolLabel(policy.allow_download)}</p>
                                </div>
                                <div className="space-y-0.5">
                                  <Label className="text-xs text-muted-foreground">Allow print</Label>
                                  <p className="font-medium">{boolLabel(policy.allow_print)}</p>
                                </div>
                                <div className="space-y-0.5">
                                  <Label className="text-xs text-muted-foreground">External sharing</Label>
                                  <p className="font-medium">{boolLabel(policy.allow_external_share)}</p>
                                </div>
                                <div className="space-y-0.5">
                                  <Label className="text-xs text-muted-foreground">View only</Label>
                                  <p className="font-medium">{boolLabel(policy.view_only)}</p>
                                </div>
                                <div className="space-y-0.5">
                                  <Label className="text-xs text-muted-foreground">Watermark</Label>
                                  <p className="font-medium">{policy.watermark_text || "—"}</p>
                                </div>
                                <div className="space-y-0.5">
                                  <Label className="text-xs text-muted-foreground">Expires after</Label>
                                  <p className="font-medium">{policy.expires_after_days ? `${policy.expires_after_days} days` : "Never"}</p>
                                </div>
                                <div className="space-y-0.5">
                                  <Label className="text-xs text-muted-foreground">Status</Label>
                                  <p className="font-medium">{policy.is_active ? "Active" : "Inactive"}</p>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(policy)} title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete policy?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete <strong>{policy.name}</strong>. Documents currently using this policy will lose their DRM restrictions.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => void handleDelete(policy)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
