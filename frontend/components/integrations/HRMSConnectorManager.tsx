"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Users, Plus, Edit, Trash2, Loader2, RefreshCw } from "lucide-react";
import {
  createHRMSConnector,
  deleteHRMSConnector,
  getHRMSConnectors,
  syncFromHRMS,
  updateHRMSConnector,
  type HRMSConnector,
} from "@/lib/integrations-storage";
import { logError } from "@/lib/client-logger";

const defaultForm = {
  name: "",
  base_url: "",
  staff_endpoint: "/api/staff",
  org_endpoint: "/api/organization",
  username: "",
  password: "",
  api_key: "",
  is_active: true,
  sync_enabled: false,
  sync_interval_minutes: 360,
  deactivate_exited_staff: true,
};

export function HRMSConnectorManager() {
  const [connectors, setConnectors] = useState<HRMSConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HRMSConnector | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setConnectors(await getHRMSConnectors());
    } catch (error) {
      logError("Failed to load HRMS connectors", error);
      toast.error("Failed to load HRMS connectors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setOpen(true);
  };

  const openEdit = (connector: HRMSConnector) => {
    setEditing(connector);
    setForm({
      name: connector.name,
      base_url: connector.base_url,
      staff_endpoint: connector.staff_endpoint,
      org_endpoint: connector.org_endpoint,
      username: "",
      password: "",
      api_key: "",
      is_active: connector.is_active,
      sync_enabled: connector.sync_enabled,
      sync_interval_minutes: connector.sync_interval_minutes,
      deactivate_exited_staff: connector.deactivate_exited_staff,
    });
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!payload.password) delete payload.password;
      if (!payload.api_key) delete payload.api_key;
      if (!payload.username) delete payload.username;

      if (editing) {
        await updateHRMSConnector(editing.id, payload);
      } else {
        await createHRMSConnector(payload);
      }
      toast.success(editing ? "HRMS connector updated" : "HRMS connector created");
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save HRMS connector");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this HRMS connector?")) return;
    try {
      await deleteHRMSConnector(id);
      toast.success("HRMS connector deleted");
      await load();
    } catch {
      toast.error("Failed to delete HRMS connector");
    }
  };

  const handleSync = async (id: string) => {
    setSyncingId(id);
    try {
      const result = await syncFromHRMS(id);
      if (result.success) {
        toast.success(
          `HRMS sync: ${result.staff_created ?? 0} created, ${result.staff_updated ?? 0} updated`,
        );
        await load();
      } else {
        toast.error(result.error || "HRMS sync failed");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "HRMS sync failed");
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              HRMS Connectors
            </CardTitle>
            <CardDescription>
              Sync staff profiles and org structure from NPA HRMS; deactivate exited staff automatically
            </CardDescription>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Connector
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : connectors.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No HRMS connectors configured yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Base URL</TableHead>
                <TableHead>Sync</TableHead>
                <TableHead>Last synced</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {connectors.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs">{c.base_url}</TableCell>
                  <TableCell>{c.sync_enabled ? `Every ${c.sync_interval_minutes}m` : "Manual"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.last_synced_at ? new Date(c.last_synced_at).toLocaleString() : "Never"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.is_active ? "default" : "secondary"}>
                      {c.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={syncingId === c.id}
                      onClick={() => handleSync(c.id)}
                      aria-label="Sync now"
                    >
                      <RefreshCw className={`h-4 w-4 ${syncingId === c.id ? "animate-spin" : ""}`} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label="Edit">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md" height="fill">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit HRMS Connector" : "New HRMS Connector"}</DialogTitle>
            <DialogDescription>API credentials are encrypted at rest.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input
                value={form.base_url}
                onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                required
                placeholder="https://hrms.npa.gov.ng"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Staff endpoint</Label>
                <Input
                  value={form.staff_endpoint}
                  onChange={(e) => setForm({ ...form, staff_endpoint: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Org endpoint</Label>
                <Input
                  value={form.org_endpoint}
                  onChange={(e) => setForm({ ...form, org_endpoint: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>API Key {editing && "(leave blank to keep)"}</Label>
              <Input type="password" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sync interval (minutes)</Label>
              <Input
                type="number"
                min={30}
                value={form.sync_interval_minutes}
                onChange={(e) => setForm({ ...form, sync_interval_minutes: Number(e.target.value) })}
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.sync_enabled} onCheckedChange={(v) => setForm({ ...form, sync_enabled: v })} />
                Auto sync
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.deactivate_exited_staff}
                  onCheckedChange={(v) => setForm({ ...form, deactivate_exited_staff: v })}
                />
                Deactivate exited staff
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
