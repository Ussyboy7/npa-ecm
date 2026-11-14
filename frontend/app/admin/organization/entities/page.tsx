"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { OrganizationTabList } from "@/components/admin/OrganizationTabList";
import { StatStrip } from "@/components/shared/StatStrip";
import { ListRowCard } from "@/components/shared/ListRowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { PermissionDeniedCard } from "@/components/shared/PermissionDeniedCard";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import {
  createExternalEntity,
  deleteExternalEntity,
  fetchExternalEntities,
  updateExternalEntity,
  type ExternalEntity,
  type ExternalEntityInput,
  type ExternalEntityType,
} from "@/lib/external-entities-api";
import { logError } from "@/lib/client-logger";
import { Building2, Plus, Search } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const ENTITY_TYPES: { value: ExternalEntityType; label: string }[] = [
  { value: "ministry", label: "Ministry" },
  { value: "agency", label: "Agency / Parastatal" },
  { value: "company", label: "Private Company" },
  { value: "individual", label: "Individual" },
  { value: "other", label: "Other" },
];

const emptyForm: ExternalEntityInput = {
  name: "",
  acronym: "",
  entity_type: "ministry",
  contact_email: "",
  contact_phone: "",
  address: "",
  is_active: true,
};

export default function ExternalEntitiesPage() {
  const { currentUser } = useCurrentUser();
  const permissions = useUserPermissions(currentUser ?? undefined);
  const canManage =
    permissions.canAccessAdministration ||
    permissions.canRegisterCorrespondence ||
    currentUser?.isSuperuser;

  const [entities, setEntities] = useState<ExternalEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExternalEntity | null>(null);
  const [form, setForm] = useState<ExternalEntityInput>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { results } = await fetchExternalEntities({ search: search || undefined, pageSize: 100 });
      setEntities(results);
    } catch (err) {
      logError("Failed to load external entities", err);
      toast.error("Failed to load external entities");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (canManage) void load();
  }, [canManage, load]);

  const statItems = useMemo(
    () => [
      { key: "total", label: "Total Entities", value: entities.length },
      { key: "active", label: "Active", value: entities.filter((e) => e.is_active).length },
      { key: "ministries", label: "Ministries", value: entities.filter((e) => e.entity_type === "ministry").length },
      { key: "agencies", label: "Agencies", value: entities.filter((e) => e.entity_type === "agency").length },
    ],
    [entities],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (entity: ExternalEntity) => {
    setEditing(entity);
    setForm({
      name: entity.name,
      acronym: entity.acronym,
      entity_type: entity.entity_type,
      contact_email: entity.contact_email,
      contact_phone: entity.contact_phone,
      address: entity.address,
      is_active: entity.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateExternalEntity(editing.id, form);
        toast.success("Entity updated");
      } else {
        await createExternalEntity(form);
        toast.success("Entity created");
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      logError("Failed to save external entity", err);
      toast.error("Failed to save entity");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entity: ExternalEntity) => {
    if (!confirm(`Delete "${entity.name}"?`)) return;
    try {
      await deleteExternalEntity(entity.id);
      toast.success("Entity deleted");
      await load();
    } catch (err) {
      logError("Failed to delete external entity", err);
      toast.error("Failed to delete entity");
    }
  };

  if (!currentUser) return null;

  if (!canManage) {
    return (
      <AdminPageShell
        title="Organization"
        subtitle="Directory of ministries, agencies, and external organizations for correspondence registration"
        icon={Building2}
      >
        <div className="mt-4">
          <OrganizationTabList />
        </div>
        <PermissionDeniedCard
          check={null}
          fallbackMessage="External entity management requires administration or registry permissions."
        />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Organization"
      subtitle="Directory of ministries, agencies, and external organizations for correspondence registration"
      icon={Building2}
      stats={<StatStrip items={statItems} />}
      actions={
        <Button size="compact" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Entity
        </Button>
      }
    >
      <div className="mt-4">
        <OrganizationTabList />
      </div>

      <ClientErrorBoundary>
        <div className="space-y-4 mt-4">

          <div className="rounded-xl bg-muted/30 p-2">
            <div className="relative min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-8 pl-8 text-xs"
                placeholder="Search entities…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void load()}
              />
            </div>
          </div>

          {loading ? (
            <LoadingState message="Loading external entities…" />
          ) : (
            entities.length === 0 ? (
              <div className="rounded-xl border border-border/60 p-4">
                <EmptyState
                  icon={<Building2 className="h-10 w-10 opacity-50" />}
                  title="No external entities yet"
                  message="Add ministries, agencies, and organizations used in correspondence."
                  variant="dashed"
                />
              </div>
            ) : (
              <div className="space-y-2">
                {entities.map((entity) => (
                  <ListRowCard
                    key={entity.id}
                    density="dense"
                    leading={<div className="rounded-md bg-primary/10 p-2 text-primary"><Building2 className="h-4 w-4" /></div>}
                    actions={
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs" onClick={() => openEdit(entity)}>Edit</Button>
                        <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs text-destructive hover:text-destructive" onClick={() => void handleDelete(entity)}>Delete</Button>
                      </div>
                    }
                  >
                    <div className="space-y-1.5">
                      <p className="truncate text-sm font-semibold tracking-tight">{entity.name}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {entity.acronym ? <span className="text-xs text-muted-foreground">{entity.acronym}</span> : null}
                        <Badge variant="outline" className="text-[10px] capitalize">{entity.entity_type.replace("_", " ")}</Badge>
                        <Badge variant={entity.is_active ? "default" : "secondary"} className="text-[10px]">
                          {entity.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {entity.contact_email || entity.contact_phone ? (
                        <p className="text-xs text-muted-foreground">{entity.contact_email || entity.contact_phone}</p>
                      ) : null}
                    </div>
                  </ListRowCard>
                ))}
              </div>
            )
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Entity" : "Add External Entity"}</DialogTitle>
              <DialogDescription>Enter the external entity's details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="entity-name">Name *</Label>
                <Input
                  id="entity-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entity-acronym">Acronym</Label>
                  <Input
                    id="entity-acronym"
                    value={form.acronym}
                    onChange={(e) => setForm((f) => ({ ...f, acronym: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={form.entity_type}
                    onValueChange={(v) => setForm((f) => ({ ...f, entity_type: v as ExternalEntityType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="entity-email">Contact Email</Label>
                <Input
                  id="entity-email"
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entity-phone">Contact Phone</Label>
                <Input
                  id="entity-phone"
                  value={form.contact_phone}
                  onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="entity-active">Active</Label>
                <Switch
                  id="entity-active"
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, is_active: checked }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Saving…" : editing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ClientErrorBoundary>
    </AdminPageShell>
  );
}
