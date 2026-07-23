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
import { Mail, Inbox, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import {
  createEmailConnector,
  deleteEmailConnector,
  getEmailConnectors,
  pollEmailInbox,
  updateEmailConnector,
  type EmailConnector,
} from "@/lib/integrations-storage";
import { logError } from "@/lib/client-logger";

const defaultForm = {
  name: "",
  connector_type: "smtp" as EmailConnector["connector_type"],
  host: "",
  port: 587,
  use_tls: true,
  use_ssl: false,
  username: "",
  password: "",
  is_active: true,
  is_incoming: false,
  is_outgoing: true,
  auto_create_correspondence: false,
  imap_folder: "INBOX",
};

export function EmailConnectorManager() {
  const [connectors, setConnectors] = useState<EmailConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmailConnector | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [pollingId, setPollingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setConnectors(await getEmailConnectors());
    } catch (error) {
      logError("Failed to load email connectors", error);
      toast.error("Failed to load email connectors");
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

  const openEdit = (connector: EmailConnector) => {
    setEditing(connector);
    setForm({
      name: connector.name,
      connector_type: connector.connector_type,
      host: connector.host,
      port: connector.port,
      use_tls: connector.use_tls,
      use_ssl: connector.use_ssl,
      username: connector.username,
      password: "",
      is_active: connector.is_active,
      is_incoming: connector.is_incoming,
      is_outgoing: connector.is_outgoing,
      auto_create_correspondence: connector.auto_create_correspondence,
      imap_folder: connector.imap_folder || "INBOX",
    });
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (editing && !payload.password) {
        const { password: _p, ...rest } = payload;
        await updateEmailConnector(editing.id, rest);
      } else if (editing) {
        await updateEmailConnector(editing.id, payload);
      } else {
        if (!payload.password) {
          toast.error("Password is required for new connectors");
          return;
        }
        await createEmailConnector(payload);
      }
      toast.success(editing ? "Connector updated" : "Connector created");
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save connector");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this email connector?")) return;
    try {
      await deleteEmailConnector(id);
      toast.success("Connector deleted");
      await load();
    } catch {
      toast.error("Failed to delete connector");
    }
  };

  const handlePoll = async (connector: EmailConnector) => {
    setPollingId(connector.id);
    try {
      const result = await pollEmailInbox(connector.id);
      if (result.success) {
        toast.success(
          `Inbox polled: ${result.correspondence_created ?? 0} correspondence created`,
        );
      } else {
        toast.error(result.error || "IMAP poll failed");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "IMAP poll failed");
    } finally {
      setPollingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Connectors
            </CardTitle>
            <CardDescription>Configure SMTP/IMAP gateways for outbound and inbound mail</CardDescription>
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
          <p className="text-sm text-muted-foreground text-center py-8">
            No email connectors configured yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {connectors.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="uppercase text-xs">{c.connector_type}</TableCell>
                  <TableCell>{c.host}:{c.port}</TableCell>
                  <TableCell className="text-xs">
                    {c.is_outgoing && "Out"}
                    {c.is_outgoing && c.is_incoming && " / "}
                    {c.is_incoming && "In"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.is_active ? "default" : "secondary"}>
                      {c.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {c.connector_type === "imap" && c.is_incoming && (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={pollingId === c.id}
                        onClick={() => void handlePoll(c)}
                        aria-label="Poll inbox"
                      >
                        <Inbox className={`h-4 w-4 ${pollingId === c.id ? "animate-pulse" : ""}`} />
                      </Button>
                    )}
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
            <DialogTitle>{editing ? "Edit Email Connector" : "New Email Connector"}</DialogTitle>
            <DialogDescription>Credentials are encrypted at rest on the server.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-name">Name</Label>
              <Input id="email-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.connector_type} onValueChange={(v) => setForm({ ...form, connector_type: v as EmailConnector["connector_type"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smtp">SMTP</SelectItem>
                    <SelectItem value="imap">IMAP</SelectItem>
                    <SelectItem value="pop3">POP3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-port">Port</Label>
                <Input id="email-port" type="number" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-host">Host</Label>
              <Input id="email-host" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-user">Username</Label>
              <Input id="email-user" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-pass">{editing ? "Password (leave blank to keep)" : "Password"}</Label>
              <Input id="email-pass" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.use_tls} onCheckedChange={(v) => setForm({ ...form, use_tls: v })} />
                TLS
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.use_ssl} onCheckedChange={(v) => setForm({ ...form, use_ssl: v })} />
                SSL
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_outgoing} onCheckedChange={(v) => setForm({ ...form, is_outgoing: v })} />
                Outgoing
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_incoming} onCheckedChange={(v) => setForm({ ...form, is_incoming: v })} />
                Incoming
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.auto_create_correspondence} onCheckedChange={(v) => setForm({ ...form, auto_create_correspondence: v })} />
                Auto-create correspondence
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                Active
              </label>
            </div>
            {form.connector_type === "imap" && form.is_incoming && (
              <div className="space-y-2">
                <Label htmlFor="imap-folder">IMAP folder</Label>
                <Input
                  id="imap-folder"
                  value={form.imap_folder}
                  onChange={(e) => setForm({ ...form, imap_folder: e.target.value })}
                />
              </div>
            )}
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
