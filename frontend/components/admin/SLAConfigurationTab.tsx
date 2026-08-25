"use client";

import { useEffect, useState, forwardRef, useImperativeHandle, useMemo, useCallback } from 'react';
import { logError } from '@/lib/client-logger';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Plus,
  Edit,
  Trash2,
  Clock,
  Settings,
  Loader2,
  Save,
} from 'lucide-react';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  correspondenceQueueBadgeClass,
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueListStackClass,
  correspondenceQueueMetaIconClass,
  correspondenceQueueMetaItemClass,
  correspondenceQueueMetaRowClass,
  correspondenceQueueSubjectClass,
  registryQueueEmptyIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from '@/components/shared/registry-queue-styles';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  type SLAConfiguration,
  type SLAConfigurationInput,
  type SLATargets,
  type SLAChoices,
  fetchSLAConfigurations,
  fetchSLATargets,
  updateSLATargets,
  createSLAConfiguration,
  updateSLAConfiguration,
  deleteSLAConfiguration,
  fetchSLAChoices,
} from '@/lib/sla-client';

const getPriorityBadgeVariant = (
  priority: string,
): 'destructive' | 'default' | 'secondary' | 'outline' => {
  switch (priority) {
    case 'urgent':
      return 'destructive';
    case 'high':
      return 'default';
    case 'medium':
      return 'secondary';
    default:
      return 'outline';
  }
};

export type SLAConfigurationTabHandle = {
  openAddRule: () => void;
};

export const SLAConfigurationTab = forwardRef<
  SLAConfigurationTabHandle,
  {
    searchQuery?: string;
    hideAddRuleButton?: boolean;
    onDataChange?: () => void;
  }
>(function SLAConfigurationTab(
  { searchQuery = '', hideAddRuleButton = false, onDataChange },
  ref,
) {
  const { divisions } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState<SLAConfiguration[]>([]);
  const [targets, setTargets] = useState<SLATargets>({ urgent: 48, high: 72, medium: 120, low: 168 });
  const [choices, setChoices] = useState<SLAChoices | null>(null);
  const [editingTargets, setEditingTargets] = useState(false);
  const [tempTargets, setTempTargets] = useState<SLATargets>(targets);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SLAConfiguration | null>(null);
  const [formData, setFormData] = useState<SLAConfigurationInput>({
    name: '',
    priority: 'medium',
    correspondenceType: 'all',
    targetDays: 120,  // Default: 5 days = 120 hours
    warningThresholdPercent: 75,
    criticalThresholdPercent: 90,
    division: null,
    isActive: true,
    description: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configsData, targetsData, choicesData] = await Promise.all([
        fetchSLAConfigurations(),
        fetchSLATargets(),
        fetchSLAChoices(),
      ]);
      setConfigs(configsData);
      setTargets(targetsData);
      setTempTargets(targetsData);
      setChoices(choicesData);
      onDataChange?.();
    } catch (error: unknown) {
      logError('Failed to load SLA data:', error);
    } finally {
      setLoading(false);
    }
  }, [onDataChange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveTargets = async () => {
    setSaving(true);
    try {
      await updateSLATargets(tempTargets);
      setTargets(tempTargets);
      setEditingTargets(false);
      await loadData();
    } catch (error: unknown) {
      logError('Failed to save SLA targets:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDialog = (config?: SLAConfiguration) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        name: config.name,
        priority: config.priority,
        correspondenceType: config.correspondenceType,
        targetDays: config.targetDays,
        warningThresholdPercent: config.warningThresholdPercent,
        criticalThresholdPercent: config.criticalThresholdPercent,
        division: config.division,
        isActive: config.isActive,
        description: config.description,
      });
    } else {
      setEditingConfig(null);
      setFormData({
        name: '',
        priority: 'medium',
        correspondenceType: 'all',
        targetDays: 120,  // Default: 5 days = 120 hours
        warningThresholdPercent: 75,
        criticalThresholdPercent: 90,
        division: null,
        isActive: true,
        description: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      if (editingConfig) {
        await updateSLAConfiguration(editingConfig.id, formData);
      } else {
        await createSLAConfiguration(formData);
      }
      setDialogOpen(false);
      await loadData();
    } catch (error: unknown) {
      logError('Failed to save SLA configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SLA configuration?')) return;
    try {
      await deleteSLAConfiguration(id);
      await loadData();
    } catch (error: unknown) {
      logError('Failed to delete SLA configuration:', error);
    }
  };

  useImperativeHandle(ref, () => ({
    openAddRule: () => handleOpenDialog(),
  }), []);

  const filteredConfigs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return configs;
    return configs.filter((config) => {
      return (
        config.name.toLowerCase().includes(query)
        || config.priorityDisplay.toLowerCase().includes(query)
        || config.correspondenceTypeDisplay.toLowerCase().includes(query)
        || (config.description?.toLowerCase().includes(query) ?? false)
        || (config.divisionDetail?.name.toLowerCase().includes(query) ?? false)
      );
    });
  }, [configs, searchQuery]);

  if (loading) {
    return <LoadingState message="Loading SLA settings…" />;
  }

  return (
    <ClientErrorBoundary>
      <div className="space-y-8">
        <section className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Default SLA targets</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Maximum response time (hours) before a priority is overdue. Advanced rules can override these for specific types or divisions.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {!editingTargets ? (
                <Button variant="outline" size="compact" onClick={() => setEditingTargets(true)}>
                  <Edit className="h-4 w-4" />
                  Edit targets
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="compact"
                    onClick={() => {
                      setTempTargets(targets);
                      setEditingTargets(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="compact" onClick={handleSaveTargets} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(['urgent', 'high', 'medium', 'low'] as const).map((priority) => {
              const hours = editingTargets ? tempTargets[priority] : targets[priority];
              return (
                <div
                  key={priority}
                  className="rounded-xl border border-border/60 bg-muted/30 p-4"
                >
                  <div className="min-w-0 space-y-2">
                      <Badge
                        variant={getPriorityBadgeVariant(priority)}
                        className={correspondenceQueueBadgeClass}
                      >
                        {priority.toUpperCase()}
                      </Badge>
                      <p className={registryQueueStatLabelClass}>Max response</p>
                      <p className={registryQueueStatValueClass}>{hours}h</p>
                      {editingTargets ? (
                        <div className="space-y-2 border-t border-border/60 pt-3">
                          <Slider
                            value={[tempTargets[priority]]}
                            onValueChange={([value]) =>
                              setTempTargets({ ...tempTargets, [priority]: value })
                            }
                            min={1}
                            max={720}
                            step={1}
                          />
                          <Input
                            type="number"
                            value={tempTargets[priority]}
                            onChange={(e) =>
                              setTempTargets({
                                ...tempTargets,
                                [priority]: parseInt(e.target.value, 10) || 1,
                              })
                            }
                            className="h-8"
                            min={1}
                            max={720}
                          />
                        </div>
                      ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Advanced SLA rules ({filteredConfigs.length})</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Overrides for correspondence types, divisions, or combinations.
              </p>
            </div>
            {!hideAddRuleButton ? (
              <Button size="compact" onClick={() => handleOpenDialog()} className="shrink-0">
                <Plus className="h-4 w-4" />
                Add rule
              </Button>
            ) : null}
          </div>
            {configs.length === 0 ? (
              <EmptyState
                icon={<Settings className={registryQueueEmptyIconClass} />}
                title="No advanced rules yet"
                message="Organization-wide defaults apply until you add a rule for a specific priority, correspondence type, or division."
                actionLabel={hideAddRuleButton ? undefined : "Add rule"}
                onAction={hideAddRuleButton ? undefined : () => handleOpenDialog()}
                variant="dashed"
              />
            ) : filteredConfigs.length === 0 ? (
              <EmptyState
                icon={<Settings className={registryQueueEmptyIconClass} />}
                title="No rules match your search"
                message="Try a different name, priority, or correspondence type keyword."
                variant="dashed"
              />
            ) : (
              <div className={correspondenceQueueListStackClass}>
                {filteredConfigs.map((config) => (
                  <ListRowCard
                    key={config.id}
                    density="compact"
                    leading={(
                      <div className={cn(correspondenceQueueLeadingBoxClass, 'bg-muted')}>
                        <Settings className={cn(correspondenceQueueLeadingIconClass, 'text-muted-foreground')} />
                      </div>
                    )}
                    actions={(
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              aria-label="Edit rule"
                              onClick={() => handleOpenDialog(config)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">Edit</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              aria-label="Delete rule"
                              onClick={() => handleDeleteConfig(config.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">Delete</TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  >
                    <h4 className={correspondenceQueueSubjectClass}>{config.name}</h4>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <Badge
                        variant={getPriorityBadgeVariant(config.priority)}
                        className={correspondenceQueueBadgeClass}
                      >
                        {config.priorityDisplay}
                      </Badge>
                      <Badge variant="outline" className={correspondenceQueueBadgeClass}>
                        {config.correspondenceTypeDisplay}
                      </Badge>
                      <Badge variant={config.isActive ? 'default' : 'secondary'} className={correspondenceQueueBadgeClass}>
                        {config.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
                      <span className={correspondenceQueueMetaItemClass}>
                        <Clock className={correspondenceQueueMetaIconClass} />
                        Target {config.targetDays}h
                      </span>
                      <span className={correspondenceQueueMetaItemClass}>
                        Warning {config.warningThresholdPercent}%
                      </span>
                      <span className={correspondenceQueueMetaItemClass}>
                        <span className="opacity-80">Division:</span>{' '}
                        {config.divisionDetail?.name ?? (
                          <span className="text-muted-foreground">Global</span>
                        )}
                      </span>
                    </div>
                  </ListRowCard>
                ))}
              </div>
            )}
        </section>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent size="md">
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? 'Edit SLA Rule' : 'Create SLA Rule'}
              </DialogTitle>
              <DialogDescription>
                Configure SLA target for specific priority, type, or division
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Rule Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Urgent Internal Memos"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(choices?.priorities || []).map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="correspondenceType">Correspondence Type</Label>
                  <Select
                    value={formData.correspondenceType}
                    onValueChange={(value) => setFormData({ ...formData, correspondenceType: value })}
                  >
                    <SelectTrigger id="correspondenceType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(choices?.correspondenceTypes || []).map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetDays">Target Hours</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[formData.targetDays]}
                    onValueChange={([value]) => setFormData({ ...formData, targetDays: value })}
                    min={1}
                    max={720}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={formData.targetDays}
                    onChange={(e) => setFormData({ ...formData, targetDays: parseInt(e.target.value) || 1 })}
                    className="w-24"
                    min={1}
                    max={720}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="warningThreshold">Warning Threshold (%)</Label>
                  <Input
                    id="warningThreshold"
                    type="number"
                    value={formData.warningThresholdPercent}
                    onChange={(e) => setFormData({ ...formData, warningThresholdPercent: parseInt(e.target.value) || 75 })}
                    min={1}
                    max={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Alert at {Math.round((formData.targetDays * (formData.warningThresholdPercent || 75)) / 100)} hours
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="criticalThreshold">Critical Threshold (%)</Label>
                  <Input
                    id="criticalThreshold"
                    type="number"
                    value={formData.criticalThresholdPercent}
                    onChange={(e) => setFormData({ ...formData, criticalThresholdPercent: parseInt(e.target.value) || 90 })}
                    min={1}
                    max={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Critical at {Math.round((formData.targetDays * (formData.criticalThresholdPercent || 90)) / 100)} hours
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="division">Division (Optional)</Label>
                <Select
                  value={formData.division || 'global'}
                  onValueChange={(value) => setFormData({ ...formData, division: value === 'global' ? null : value })}
                >
                  <SelectTrigger id="division">
                    <SelectValue placeholder="Global (All Divisions)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (All Divisions)</SelectItem>
                    {divisions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description for this SLA rule..."
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveConfig} disabled={saving || !formData.name}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {editingConfig ? 'Update Rule' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientErrorBoundary>
  );
});

