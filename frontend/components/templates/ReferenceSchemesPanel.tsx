"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, Hash, Network, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { ListRowCard } from "@/components/shared/ListRowCard";
import { TemplateHubRowActions } from "@/components/templates/TemplateHubRowActions";
import {
  correspondenceQueueBadgeClass,
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueMetaRowClass,
  correspondenceQueueSubjectClass,
  registryQueueEmptyIconClass,
} from "@/components/shared/registry-queue-styles";
import { useOrganizationCatalogs } from "@/hooks/use-organization-catalogs";
import { logError } from "@/lib/client-logger";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import {
  createReferenceScheme,
  deleteReferenceScheme,
  listReferenceSchemes,
  updateReferenceScheme,
  type ReferenceClassification,
  type ReferenceScheme,
  type ReferenceSchemeInput,
  type ReferenceScopeType,
} from "@/lib/api/reference-schemes";

const SCOPE_ORDER: ReferenceScopeType[] = ["directorate", "division", "department"];
const SCOPE_LABELS: Record<ReferenceScopeType, string> = {
  directorate: "Directorate",
  division: "Division",
  department: "Department",
};
const DEFAULT_AUTHORITY: Record<ReferenceScopeType, string> = {
  directorate: "ED",
  division: "GM",
  department: "AGM",
};

const DEFAULT_CLASSIFICATIONS: ReferenceClassification[] = [
  { code: "AD", label: "Administrative", next_serial: 1, is_active: true },
  { code: "OP", label: "Operations", next_serial: 1, is_active: true },
  { code: "CON", label: "Confidential", next_serial: 1, is_active: true },
];

function cleanSegment(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9&]+/g, "");
}

function padSerial(value: number, length: number): string {
  return String(Math.max(1, value)).padStart(length, "0");
}

interface FormState {
  scope_type: ReferenceScopeType;
  unit_id: string;
  location_code: string;
  authority_code: string;
  unit_code: string;
  serial_length: number;
  description: string;
  is_active: boolean;
  classifications: ReferenceClassification[];
}

const EMPTY_FORM: FormState = {
  scope_type: "division",
  unit_id: "",
  location_code: "HQ",
  authority_code: "GM",
  unit_code: "",
  serial_length: 3,
  description: "",
  is_active: true,
  classifications: DEFAULT_CLASSIFICATIONS,
};

export const REFERENCE_SCHEME_ACTION_SLOT_ID = "templates-hub-reference-scheme-action";

function unitIdOf(scheme: ReferenceScheme): string {
  if (scheme.scope_type === "directorate") return scheme.directorate ?? "";
  if (scheme.scope_type === "division") return scheme.division ?? "";
  return scheme.department ?? "";
}

export function ReferenceSchemesPanel({
  onStatsChange,
}: {
  onStatsChange?: (stats: { total: number; active: number; classifications: number }) => void;
}) {
  const { directorates, divisions, departments } = useOrganizationCatalogs('directorates', 'divisions', 'departments');
  const [schemes, setSchemes] = useState<ReferenceScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"all" | ReferenceScopeType>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ReferenceScheme | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [actionPortalTarget, setActionPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setActionPortalTarget(document.getElementById(REFERENCE_SCHEME_ACTION_SLOT_ID));
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listReferenceSchemes({ pageSize: 200 });
      setSchemes(data.results ?? []);
    } catch (err) {
      logError("Failed to load reference schemes", err);
      setError("Could not load reference schemes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!onStatsChange || loading || error) return;
    onStatsChange({
      total: schemes.length,
      active: schemes.filter((scheme) => scheme.is_active).length,
      classifications: schemes.reduce(
        (total, scheme) => total + scheme.classifications.filter((item) => item.is_active).length,
        0
      ),
    });
  }, [schemes, onStatsChange, loading, error]);

  const unitOptions = useMemo(() => {
    if (form.scope_type === "directorate") {
      return directorates.map((item) => ({ id: item.id, name: item.name, code: item.code }));
    }
    if (form.scope_type === "division") {
      return divisions.map((item) => ({ id: item.id, name: item.name, code: item.code }));
    }
    return departments.map((item) => ({ id: item.id, name: item.name, code: item.code }));
  }, [form.scope_type, directorates, divisions, departments]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return schemes.filter((scheme) => {
      if (scopeFilter !== "all" && scheme.scope_type !== scopeFilter) return false;
      if (!query) return true;
      return [
        scheme.unit_name,
        scheme.unit_code,
        scheme.authority_code,
        scheme.location_code,
        scheme.reference_preview,
        scheme.description,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [schemes, scopeFilter, search]);

  const grouped = useMemo(
    () =>
      SCOPE_ORDER.map((scope) => ({
        scope,
        rows: filtered.filter((scheme) => scheme.scope_type === scope),
      })).filter((group) => group.rows.length > 0),
    [filtered]
  );

  const openCreate = () => {
    const first = divisions[0];
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      unit_id: first?.id ?? "",
      unit_code: cleanSegment(first?.code ?? ""),
      classifications: DEFAULT_CLASSIFICATIONS.map((item) => ({ ...item })),
    });
    setDialogOpen(true);
  };

  const openEdit = (scheme: ReferenceScheme) => {
    setEditing(scheme);
    setForm({
      scope_type: scheme.scope_type,
      unit_id: unitIdOf(scheme),
      location_code: scheme.location_code,
      authority_code: scheme.authority_code,
      unit_code: scheme.unit_code,
      serial_length: scheme.serial_length,
      description: scheme.description || "",
      is_active: scheme.is_active,
      classifications: scheme.classifications.map((item) => ({ ...item })),
    });
    setDialogOpen(true);
  };

  const handleScopeChange = (scope: ReferenceScopeType) => {
    const options =
      scope === "directorate" ? directorates : scope === "division" ? divisions : departments;
    const first = options[0];
    setForm((current) => ({
      ...current,
      scope_type: scope,
      unit_id: first?.id ?? "",
      authority_code: DEFAULT_AUTHORITY[scope],
      unit_code: cleanSegment(first?.code ?? ""),
    }));
  };

  const handleUnitChange = (unitId: string) => {
    const option = unitOptions.find((item) => item.id === unitId);
    setForm((current) => ({
      ...current,
      unit_id: unitId,
      unit_code: current.unit_code || cleanSegment(option?.code ?? ""),
    }));
  };

  const updateClassification = (
    index: number,
    changes: Partial<ReferenceClassification>
  ) => {
    setForm((current) => ({
      ...current,
      classifications: current.classifications.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item
      ),
    }));
  };

  const formPreview = useMemo(() => {
    const classification = form.classifications.find((item) => item.is_active);
    if (!classification) return "";
    const segments = [
      cleanSegment(form.location_code) || "HQ",
      cleanSegment(form.authority_code) || "GM",
    ];
    const unit = cleanSegment(form.unit_code);
    if (unit) segments.push(unit);
    segments.push(
      cleanSegment(classification.code) || "CL",
      padSerial(classification.next_serial, form.serial_length)
    );
    return segments.join("/");
  }, [form]);

  const handleSave = async () => {
    if (!form.unit_id) {
      toast.error("Select the unit this scheme belongs to");
      return;
    }
    if (!cleanSegment(form.authority_code)) {
      toast.error("Authority code is required");
      return;
    }
    if (form.classifications.length === 0) {
      toast.error("Add at least one classification");
      return;
    }

    const payload: ReferenceSchemeInput = {
      scope_type: form.scope_type,
      directorate: form.scope_type === "directorate" ? form.unit_id : null,
      division: form.scope_type === "division" ? form.unit_id : null,
      department: form.scope_type === "department" ? form.unit_id : null,
      location_code: cleanSegment(form.location_code) || "HQ",
      authority_code: cleanSegment(form.authority_code),
      unit_code: cleanSegment(form.unit_code),
      serial_length: form.serial_length,
      description: form.description.trim(),
      is_active: form.is_active,
      classifications: form.classifications.map((item) => ({
        ...(item.id ? { id: item.id } : {}),
        code: cleanSegment(item.code),
        label: item.label.trim() || item.code,
        next_serial: Math.max(1, Number(item.next_serial) || 1),
        is_active: item.is_active,
      })),
    };

    setSaving(true);
    try {
      if (editing) {
        await updateReferenceScheme(editing.id, payload);
        toast.success("Reference scheme updated");
      } else {
        await createReferenceScheme(payload);
        toast.success("Reference scheme created");
      }
      setDialogOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      logError("Failed to save reference scheme", err);
      toast.error("Could not save the reference scheme");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    try {
      await deleteReferenceScheme(editing.id);
      toast.success("Reference scheme deleted");
      setDialogOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      logError("Failed to delete reference scheme", err);
      toast.error("Could not delete the reference scheme");
    }
  };

  if (loading) {
    return <LoadingState message="Loading reference schemes…" />;
  }

  if (error) {
    return (
      <EmptyState
        icon="file"
        title="Could not load reference schemes"
        message={error}
        actionLabel="Retry"
        onAction={() => void load()}
      />
    );
  }

  return (
    <div className="space-y-4">
      {actionPortalTarget
        ? createPortal(
            <Button size="compact" onClick={openCreate}>
              <Plus className="h-4 w-4" /> New reference scheme
            </Button>,
            actionPortalTarget,
          )
        : null}

      <div className="rounded-xl bg-muted/30 p-2">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={scopeFilter}
            onValueChange={(value) => setScopeFilter(value as "all" | ReferenceScopeType)}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Scheme scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All units</SelectItem>
              <SelectItem value="directorate">Directorates</SelectItem>
              <SelectItem value="division">Divisions</SelectItem>
              <SelectItem value="department">Departments</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search units or reference codes…"
              aria-label="Search reference schemes"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-8 pl-8 pr-8 text-xs"
            />
            {search ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {schemes.length} schemes
          </span>
        </div>
      </div>

      {schemes.length === 0 ? (
        <EmptyState
          icon={<Hash className={registryQueueEmptyIconClass} />}
          title="No reference schemes yet"
          message="Create a scheme for a directorate, division or department to start issuing classified reference numbers."
          actionLabel="New reference scheme"
          onAction={openCreate}
          variant="dashed"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title="No matching schemes"
          message="Try another unit name, code, or reference segment."
          variant="dashed"
        />
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <div key={group.scope} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {SCOPE_LABELS[group.scope]}s
              </h3>
              <div className="space-y-1.5">
                {group.rows.map((scheme) => (
                  <ListRowCard
                    key={scheme.id}
                    density="dense"
                    onRowClick={() => openEdit(scheme)}
                    leading={
                      <div className={cn(correspondenceQueueLeadingBoxClass, "p-1.5", "bg-primary/10")}>
                        {scheme.scope_type === "directorate" ? (
                          <Building2 className={cn(correspondenceQueueLeadingIconClass, "text-primary")} />
                        ) : (
                          <Network className={cn(correspondenceQueueLeadingIconClass, "text-primary")} />
                        )}
                      </div>
                    }
                    actions={
                      <TemplateHubRowActions
                        actions={[
                          {
                            label: "Edit scheme",
                            icon: <Pencil className="h-4 w-4" />,
                            onSelect: () => openEdit(scheme),
                          },
                        ]}
                      />
                    }
                  >
                    <h4 className={correspondenceQueueSubjectClass}>{scheme.unit_name}</h4>
                    <p className="mt-0.5 truncate font-mono text-sm leading-tight text-muted-foreground">
                      {scheme.reference_preview || "No active classification"}
                    </p>
                    <div className={cn(correspondenceQueueMetaRowClass, "mt-1 gap-1.5 pt-1")}>
                      <Badge
                        variant="outline"
                        className={correspondenceQueueBadgeClass}
                      >
                        {scheme.scope_label}
                      </Badge>
                      {!scheme.is_active ? (
                        <Badge
                          variant="secondary"
                          className={correspondenceQueueBadgeClass}
                        >
                          Inactive
                        </Badge>
                      ) : null}
                      {scheme.classifications
                        .filter((item) => item.is_active)
                        .map((item) => (
                          <Badge
                            key={item.id ?? item.code}
                            variant="outline"
                            className={cn(correspondenceQueueBadgeClass, "gap-1")}
                          >
                            {item.code}
                            <span className="text-muted-foreground">
                              {padSerial(item.next_serial, scheme.serial_length)}
                            </span>
                          </Badge>
                        ))}
                    </div>
                  </ListRowCard>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="full" height="scroll">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit reference scheme — ${editing.unit_name}` : "New reference scheme"}
            </DialogTitle>
            <DialogDescription>
              Segments build each number as location/authority/unit/classification/serial.
              Each classification keeps its own continuous counter.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Unit type</Label>
                <Select
                  value={form.scope_type}
                  onValueChange={(value) => handleScopeChange(value as ReferenceScopeType)}
                >
                  <SelectTrigger aria-label="Unit type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="directorate">Directorate</SelectItem>
                    <SelectItem value="division">Division</SelectItem>
                    <SelectItem value="department">Department</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {form.scope_type.charAt(0).toUpperCase() + form.scope_type.slice(1)}
                </Label>
                <Select value={form.unit_id} onValueChange={handleUnitChange}>
                  <SelectTrigger aria-label="Unit">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference-description">Description (optional)</Label>
                <Input
                  id="reference-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="e.g. ICT administrative correspondence"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="reference-location">Location</Label>
                <Input
                  id="reference-location"
                  value={form.location_code}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, location_code: event.target.value }))
                  }
                  placeholder="HQ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference-authority">Authority</Label>
                <Input
                  id="reference-authority"
                  value={form.authority_code}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, authority_code: event.target.value }))
                  }
                  placeholder="GM"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference-unit">Unit code (optional)</Label>
                <Input
                  id="reference-unit"
                  value={form.unit_code}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, unit_code: event.target.value }))
                  }
                  placeholder="ICT"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to omit the unit segment, e.g. HQ/MD/AD/001.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference-serial-length">Serial digits</Label>
                <Input
                  id="reference-serial-length"
                  type="number"
                  min={2}
                  max={6}
                  value={form.serial_length}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      serial_length: Math.min(6, Math.max(2, Number(event.target.value) || 3)),
                    }))
                  }
                />
              </div>
            </div>

            <div className="rounded-lg border border-border/70">
              <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Classifications</p>
                  <p className="text-xs text-muted-foreground">
                    Codes such as AD (Administrative), OP (Operations), CON (Confidential).
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      classifications: [
                        ...current.classifications,
                        { code: "", label: "", next_serial: 1, is_active: true },
                      ],
                    }))
                  }
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
              <div className="divide-y divide-border/60">
                {form.classifications.map((classification, index) => (
                  <div
                    key={classification.id ?? `new-${index}`}
                    className="grid items-end gap-2 px-3 py-2 md:grid-cols-[90px_1fr_110px_90px]"
                  >
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Code</Label>
                      <Input
                        value={classification.code}
                        onChange={(event) =>
                          updateClassification(index, { code: event.target.value })
                        }
                        placeholder="AD"
                        className="h-8 text-xs uppercase"
                        aria-label={`Classification ${index + 1} code`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Meaning</Label>
                      <Input
                        value={classification.label}
                        onChange={(event) =>
                          updateClassification(index, { label: event.target.value })
                        }
                        placeholder="Administrative"
                        className="h-8 text-xs"
                        aria-label={`Classification ${index + 1} label`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Next serial</Label>
                      <Input
                        type="number"
                        min={1}
                        value={classification.next_serial}
                        onChange={(event) =>
                          updateClassification(index, {
                            next_serial: Math.max(1, Number(event.target.value) || 1),
                          })
                        }
                        className="h-8 text-xs"
                        aria-label={`Classification ${index + 1} next serial`}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 pb-1.5">
                      <label className="flex items-center gap-1.5 text-xs">
                        <Checkbox
                          checked={classification.is_active}
                          onCheckedChange={(checked) =>
                            updateClassification(index, { is_active: checked === true })
                          }
                        />
                        Active
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        aria-label={`Remove classification ${index + 1}`}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            classifications: current.classifications.filter(
                              (_, itemIndex) => itemIndex !== index
                            ),
                          }))
                        }
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Next number preview
                </p>
                <p className="font-mono text-base">{formPreview || "—"}</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.is_active}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, is_active: checked === true }))
                  }
                />
                Active scheme
              </label>
            </div>
          </div>

          <DialogFooter className="items-center justify-between gap-2 sm:justify-between">
            <div>
              {editing ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive">
                      <Trash2 className="mr-1 h-4 w-4" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this reference scheme?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Numbers already issued stay on their records. The counter for this unit
                        will be removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete scheme
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editing ? "Save scheme" : "Create scheme"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
