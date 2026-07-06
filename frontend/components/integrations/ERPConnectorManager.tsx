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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Database, Plus, Edit, Trash2, Loader2, RefreshCw } from "lucide-react";
import {
  createERPConnector,
  deleteERPConnector,
  getERPConnectors,
  syncFromERP,
  updateERPConnector,
  type ERPConnector,
} from "@/lib/integrations-storage";
import { logError } from "@/lib/client-logger";

const defaultForm = {
  name: "",
  erp_type: "oracle" as ERPConnector["erp_type"],
  base_url: "",
  username: "",
  password: "",
  api_key: "",
  is_active: true,
  sync_enabled: false,
  sync_interval_minutes: 60,
};

export function ERPConnectorManager() {
  const [connectors, setConnectors] = useState<ERPConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ERPConnector | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setConnectors(await getERPConnectors());
    } catch (error) {
      logError("Failed to load ERP connectors", error);
      toast.error("Failed to load ERP connectors");
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

  const openEdit = (connector: ERPConnector) => {
    setEditing(connector);
    setForm({
      name: connector.name,
      erp_type: connector.erp_type,
      base_url: connector.base_url,
      username: "",
      password: "",
      api_key: "",
      is_active: connector.is_active,
      sync_enabled: connector.sync_enabled,
      sync_interval_minutes: connector.sync_interval_minutes,
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
        await updateERPConnector(editing.id, payload);
      } else {
        await createERPConnector(payload);
      }
      toast.success(editing ? "ERP connector updated" : "ERP connector created");
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save ERP connector");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this ERP connector?")) return;
    try {
      await deleteERPConnector(id);
      toast.success("ERP connector deleted");
      await load();
    } catch {
      toast.error("Failed to delete ERP connector");
    }
  };

  const handleSync = async (id: string) => {
    setSyncingId(id);
    try {
      const result = await syncFromERP(id);
      if (result.success) {
        toast.success(
          `ERP sync: ${result.documents_created ?? 0} created, ${result.documents_updated ?? 0} updated`,
        );
      } else {
        toast.error(result.error || "ERP sync failed");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ERP sync failed");
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
              <Database className="h-5 w-5" />
              ERP Connectors
            </CardTitle>
            <CardDescription>Link Oracle, SAP, or custom ERP APIs for document sync</CardDescription>
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
          <p className="text-sm text-muted-foreground text-center py-8">No ERP connectors configured yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Base URL</TableHead>
                <TableHead>Sync</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {connectors.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="capitalize">{c.erp_type}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs">{c.base_url}</TableCell>
                  <TableCell>{c.sync_enabled ? `Every ${c.sync_interval_minutes}m` : "Manual"}</TableCell>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit ERP Connector" : "New ERP Connector"}</DialogTitle>
            <DialogDescription>API keys and passwords are encrypted at rest.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>ERP Type</Label>
              <Select value={form.erp_type} onValueChange={(v) => setForm({ ...form, erp_type: v as ERPConnector["erp_type"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="oracle">Oracle</SelectItem>
                  <SelectItem value="sap">SAP</SelectItem>
                  <SelectItem value="custom">Custom API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} required placeholder="https://erp.npa.gov.ng/api" />
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
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.sync_enabled} onCheckedChange={(v) => setForm({ ...form, sync_enabled: v })} />
                Auto sync
              </label>
            </div>
            <div className="space-y-2">
              <Label>Sync interval (minutes)</Label>
              <Input type="number" min={5} value={form.sync_interval_minutes} onChange={(e) => setForm({ ...form, sync_interval_minutes: Number(e.target.value) })} />
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
