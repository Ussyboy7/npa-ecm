"use client";

import { useEffect, useState, forwardRef, useImperativeHandle, useMemo, useCallback } from 'react';
import { logError } from '@/lib/client-logger';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  Zap,
  Mail,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Play,
  Power,
  PowerOff,
  Users,
  Building2,
  ArrowUpRight,
} from 'lucide-react';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  correspondenceQueueBadgeClass,
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueListStackClass,
  correspondenceQueueMetaIconClass,
  correspondenceQueueMetaItemClass,
  correspondenceQueueMetaRowClass,
  correspondenceQueueSubjectClass,
  registryQueueEmptyIconClass,
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from '@/components/shared/registry-queue-styles';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/datetime';
import {
  type EscalationRule,
  type EscalationRuleInput,
  type EscalationRuleChoices,
  type EscalationRuleTestResult,
  type Escalation,
  type EscalationSummary,
  fetchEscalationRules,
  fetchEscalationRuleChoices,
  createEscalationRule,
  updateEscalationRule,
  deleteEscalationRule,
  toggleEscalationRule,
  testEscalationRule,
  fetchEscalations,
  fetchEscalationSummary,
  acknowledgeEscalation,
  resolveEscalation,
} from '@/lib/sla-client';

const TRIGGER_ICONS: Record<string, React.ReactNode> = {
  sla_warning: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  sla_breach: <AlertTriangle className="h-4 w-4 text-red-500" />,
  sla_critical: <Zap className="h-4 w-4 text-red-600" />,
  stale: <Clock className="h-4 w-4 text-muted-foreground" />,
  priority_urgent: <ArrowUpRight className="h-4 w-4 text-orange-500" />,
  reassigned: <Users className="h-4 w-4 text-blue-500" />,
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  email_assignee: <Mail className="h-4 w-4" />,
  email_manager: <Mail className="h-4 w-4" />,
  email_division_head: <Mail className="h-4 w-4" />,
  email_custom: <Mail className="h-4 w-4" />,
  notification: <Bell className="h-4 w-4" />,
  auto_escalate: <ArrowUpRight className="h-4 w-4" />,
  daily_digest: <Clock className="h-4 w-4" />,
};

export type EscalationRulesTabHandle = {
  openAddRule: () => void;
};

export const EscalationRulesTab = forwardRef<
  EscalationRulesTabHandle,
  {
    searchQuery?: string;
    hideActivityOverview?: boolean;
    hideAddRuleButton?: boolean;
    onDataChange?: () => void;
  }
>(function EscalationRulesTab(
  {
    searchQuery = '',
    hideActivityOverview = false,
    hideAddRuleButton = false,
    onDataChange,
  },
  ref,
) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [summary, setSummary] = useState<EscalationSummary | null>(null);
  const [choices, setChoices] = useState<EscalationRuleChoices | null>(null);
  const [testResult, setTestResult] = useState<EscalationRuleTestResult | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null);
  const [formData, setFormData] = useState<EscalationRuleInput>({
    name: '',
    description: '',
    triggerType: 'sla_warning',
    triggerConditions: {},
    actionType: 'notification',
    actionConfig: {},
    emailSubjectTemplate: '[{priority}] SLA Alert: {subject}',
    emailBodyTemplate: '',
    isActive: true,
    priorityOrder: 100,
    cooldownHours: 24,
    divisions: [],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesData, choicesData, escalationsData, summaryData] = await Promise.all([
        fetchEscalationRules(),
        fetchEscalationRuleChoices(),
        fetchEscalations({ status: 'pending' }),
        fetchEscalationSummary(),
      ]);
      setRules(rulesData);
      setChoices(choicesData);
      setEscalations(escalationsData);
      setSummary(summaryData);
      onDataChange?.();
    } catch (error: unknown) {
      logError('Failed to load escalation data:', error);
    } finally {
      setLoading(false);
    }
  }, [onDataChange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenDialog = (rule?: EscalationRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        name: rule.name,
        description: rule.description,
        triggerType: rule.triggerType,
        triggerConditions: rule.triggerConditions,
        actionType: rule.actionType,
        actionConfig: rule.actionConfig,
        emailSubjectTemplate: rule.emailSubjectTemplate,
        emailBodyTemplate: rule.emailBodyTemplate,
        isActive: rule.isActive,
        priorityOrder: rule.priorityOrder,
        cooldownHours: rule.cooldownHours,
        divisions: rule.divisions,
      });
    } else {
      setEditingRule(null);
      setFormData({
        name: '',
        description: '',
        triggerType: 'sla_warning',
        triggerConditions: {},
        actionType: 'notification',
        actionConfig: {},
        emailSubjectTemplate: '[{priority}] SLA Alert: {subject}',
        emailBodyTemplate: '',
        isActive: true,
        priorityOrder: 100,
        cooldownHours: 24,
        divisions: [],
      });
    }
    setDialogOpen(true);
  };

  const handleSaveRule = async () => {
    setSaving(true);
    try {
      if (editingRule) {
        await updateEscalationRule(editingRule.id, formData);
      } else {
        await createEscalationRule(formData);
      }
      setDialogOpen(false);
      await loadData();
    } catch (error: unknown) {
      logError('Failed to save escalation rule:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this escalation rule?')) return;
    try {
      await deleteEscalationRule(id);
      await loadData();
    } catch (error: unknown) {
      logError('Failed to delete escalation rule:', error);
    }
  };

  const handleToggleRule = async (id: string) => {
    try {
      await toggleEscalationRule(id);
      await loadData();
    } catch (error: unknown) {
      logError('Failed to toggle escalation rule:', error);
    }
  };

  const handleTestRule = async (id: string) => {
    try {
      const result = await testEscalationRule(id);
      setTestResult(result);
      setTestDialogOpen(true);
    } catch (error: unknown) {
      logError('Failed to test escalation rule:', error);
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeEscalation(id);
      await loadData();
    } catch (error: unknown) {
      logError('Failed to acknowledge escalation:', error);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await resolveEscalation(id);
      await loadData();
    } catch (error: unknown) {
      logError('Failed to resolve escalation:', error);
    }
  };

  const activeRules = rules.filter((r) => r.isActive);
  const inactiveRules = rules.filter((r) => !r.isActive);

  useImperativeHandle(ref, () => ({
    openAddRule: () => handleOpenDialog(),
  }), []);

  const filteredRules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rules;
    return rules.filter((rule) => {
      return (
        rule.name.toLowerCase().includes(query)
        || rule.triggerTypeDisplay.toLowerCase().includes(query)
        || rule.actionTypeDisplay.toLowerCase().includes(query)
        || (rule.description?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [rules, searchQuery]);

  const filteredEscalations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return escalations;
    return escalations.filter((esc) => {
      return (
        esc.correspondenceReference.toLowerCase().includes(query)
        || esc.correspondenceSubject.toLowerCase().includes(query)
        || (esc.triggerReason?.toLowerCase().includes(query) ?? false)
        || (esc.ruleName?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [escalations, searchQuery]);

  if (loading) {
    return <LoadingState message="Loading escalation rules…" />;
  }

  return (
    <ClientErrorBoundary>
      <div className="space-y-8">
        {!hideActivityOverview ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Activity overview</CardTitle>
            <CardDescription>
              Snapshot of automation health. Pending items need acknowledgement or resolution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: 'Active rules',
                  value: activeRules.length,
                  sub: `${inactiveRules.length} inactive`,
                  icon: Power,
                  box: 'bg-success/10',
                  iconClass: 'text-success',
                },
                {
                  label: 'Pending escalations',
                  value: summary?.pending ?? 0,
                  sub: `${summary?.active ?? 0} total active`,
                  icon: AlertTriangle,
                  box: 'bg-warning/10',
                  iconClass: 'text-warning',
                },
                {
                  label: 'Triggered this week',
                  value: summary?.triggeredThisWeek ?? 0,
                  sub: 'Rule firings',
                  icon: Bell,
                  box: 'bg-primary/10',
                  iconClass: 'text-primary',
                },
                {
                  label: 'Resolved today',
                  value: summary?.resolvedToday ?? 0,
                  sub: 'Issues closed',
                  icon: CheckCircle,
                  box: 'bg-success/10',
                  iconClass: 'text-success',
                },
              ].map(({ label, value, sub, icon: Icon, box, iconClass }) => (
                <Card key={label}>
                  <CardContent className={registryQueueStatCardContentClass}>
                    <div className="flex items-center gap-4">
                      <div className={cn(registryQueueStatIconBoxClass, box)}>
                        <Icon className={cn(registryQueueStatIconClass, iconClass)} />
                      </div>
                      <div>
                        <p className={registryQueueStatLabelClass}>{label}</p>
                        <p className={registryQueueStatValueClass}>{value}</p>
                        <p className="text-xs text-muted-foreground">{sub}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
        ) : null}

        <section className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Escalation rules ({filteredRules.length})</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                When a trigger matches, the action runs. Lower priority order runs first. Use Test before going live.
              </p>
            </div>
            {!hideAddRuleButton ? (
              <Button size="sm" onClick={() => handleOpenDialog()} className="shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                Add rule
              </Button>
            ) : null}
          </div>
            {rules.length === 0 ? (
              <EmptyState
                icon={<Zap className={registryQueueEmptyIconClass} />}
                title="No escalation rules yet"
                message="Create a rule to notify assignees, managers, or division heads when SLAs slip or other triggers fire."
                actionLabel={hideAddRuleButton ? undefined : "Add rule"}
                onAction={hideAddRuleButton ? undefined : () => handleOpenDialog()}
                variant="dashed"
              />
            ) : filteredRules.length === 0 ? (
              <EmptyState
                icon={<Zap className={registryQueueEmptyIconClass} />}
                title="No rules match your search"
                message="Try a different name, trigger type, or action keyword."
                variant="dashed"
              />
            ) : (
              <div className={correspondenceQueueListStackClass}>
                {filteredRules.map((rule) => (
                  <div key={rule.id} className={cn(!rule.isActive && 'opacity-60')}>
                    <ListRowCard
                      density="compact"
                      leading={(
                        <div className={cn(correspondenceQueueLeadingBoxClass, 'bg-muted [&_svg]:size-4')}>
                          {TRIGGER_ICONS[rule.triggerType] ?? <Zap className="h-4 w-4 text-muted-foreground" />}
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
                                aria-label="Test rule"
                                onClick={() => handleTestRule(rule.id)}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Test</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                aria-label={rule.isActive ? 'Disable rule' : 'Enable rule'}
                                onClick={() => handleToggleRule(rule.id)}
                              >
                                {rule.isActive ? (
                                  <PowerOff className="h-4 w-4" />
                                ) : (
                                  <Power className="h-4 w-4 text-success" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">{rule.isActive ? 'Disable' : 'Enable'}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                aria-label="Edit rule"
                                onClick={() => handleOpenDialog(rule)}
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
                                onClick={() => handleDeleteRule(rule.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Delete</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                    >
                      <h4 className={correspondenceQueueSubjectClass}>{rule.name}</h4>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <Badge variant={rule.isActive ? 'default' : 'secondary'} className={correspondenceQueueBadgeClass}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {rule.escalationCount > 0 ? (
                          <Badge variant="outline" className={correspondenceQueueBadgeClass}>
                            {rule.escalationCount} triggered
                          </Badge>
                        ) : null}
                      </div>
                      {rule.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{rule.description}</p>
                      ) : null}
                      <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
                        <span className={correspondenceQueueMetaItemClass}>
                          <span className="inline-flex items-center gap-0.5">
                            {TRIGGER_ICONS[rule.triggerType]}
                            {rule.triggerTypeDisplay}
                          </span>
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className={correspondenceQueueMetaItemClass}>
                          <span className="inline-flex items-center gap-0.5">
                            {ACTION_ICONS[rule.actionType]}
                            {rule.actionTypeDisplay}
                          </span>
                        </span>
                        <span className={correspondenceQueueMetaItemClass}>
                          <Clock className={correspondenceQueueMetaIconClass} />
                          Cooldown {rule.cooldownHours}h
                        </span>
                        <span className={correspondenceQueueMetaItemClass}>
                          Order {rule.priorityOrder}
                        </span>
                        {rule.divisionsDetail.length > 0 ? (
                          <span className={correspondenceQueueMetaItemClass}>
                            <Building2 className={correspondenceQueueMetaIconClass} />
                            <span className="truncate">
                              {rule.divisionsDetail.map((d) => d.code || d.name).join(', ')}
                            </span>
                          </span>
                        ) : null}
                      </div>
                    </ListRowCard>
                  </div>
                ))}
              </div>
            )}
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Pending escalations ({filteredEscalations.length})</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Items waiting for acknowledgement or resolution.
            </p>
          </div>
            {escalations.length === 0 ? (
              <EmptyState
                icon={<CheckCircle className={registryQueueEmptyIconClass} />}
                title="No pending escalations"
                message="When rules fire, open items appear here for your team to acknowledge or resolve."
                variant="dashed"
              />
            ) : filteredEscalations.length === 0 ? (
              <EmptyState
                icon={<CheckCircle className={registryQueueEmptyIconClass} />}
                title="No pending escalations match your search"
                message="Try a different reference, subject, or rule name."
                variant="dashed"
              />
            ) : (
              <div className={correspondenceQueueListStackClass}>
                {filteredEscalations.map((esc) => (
                  <ListRowCard
                    key={esc.id}
                    density="compact"
                    leading={(
                      <div className={cn(correspondenceQueueLeadingBoxClass, 'bg-warning/10')}>
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      </div>
                    )}
                    actions={(
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => handleAcknowledge(esc.id)}
                        >
                          Acknowledge
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8"
                          onClick={() => handleResolve(esc.id)}
                        >
                          Resolve
                        </Button>
                      </div>
                    )}
                  >
                    <div className="flex flex-wrap items-start gap-2">
                      <Badge variant="outline" className={cn(correspondenceQueueBadgeClass, 'shrink-0')}>
                        {esc.correspondenceReference}
                      </Badge>
                      <h4 className={correspondenceQueueSubjectClass}>{esc.correspondenceSubject}</h4>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {esc.triggerReason || `Triggered by: ${esc.ruleName}`}
                    </p>
                    <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
                      <span className={correspondenceQueueMetaItemClass}>
                        <Clock className={correspondenceQueueMetaIconClass} />
                        {formatDateTime(esc.triggeredAt)}
                      </span>
                    </div>
                  </ListRowCard>
                ))}
              </div>
            )}
        </section>

        {/* Add/Edit Rule Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent size="lg" height="fill">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Edit Escalation Rule' : 'Create Escalation Rule'}
              </DialogTitle>
              <DialogDescription>
                Configure when and how to escalate correspondence items
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Rule Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., SLA Breach Alert"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this rule does..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="triggerType">Trigger Type *</Label>
                    <Select
                      value={formData.triggerType}
                      onValueChange={(value) => setFormData({ ...formData, triggerType: value })}
                    >
                      <SelectTrigger id="triggerType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(choices?.triggerTypes || []).map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            <span className="flex items-center gap-2">
                              {TRIGGER_ICONS[t.value]}
                              {t.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="actionType">Action Type *</Label>
                    <Select
                      value={formData.actionType}
                      onValueChange={(value) => setFormData({ ...formData, actionType: value })}
                    >
                      <SelectTrigger id="actionType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(choices?.actionTypes || []).map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            <span className="flex items-center gap-2">
                              {ACTION_ICONS[t.value]}
                              {t.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priorityOrder">Priority Order</Label>
                    <Input
                      id="priorityOrder"
                      type="number"
                      value={formData.priorityOrder}
                      onChange={(e) => setFormData({ ...formData, priorityOrder: parseInt(e.target.value) || 100 })}
                      min={1}
                      max={1000}
                    />
                    <p className="text-xs text-muted-foreground">Lower numbers execute first</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cooldownHours">Cooldown (hours)</Label>
                    <Input
                      id="cooldownHours"
                      type="number"
                      value={formData.cooldownHours}
                      onChange={(e) => setFormData({ ...formData, cooldownHours: parseInt(e.target.value) || 24 })}
                      min={1}
                      max={168}
                    />
                    <p className="text-xs text-muted-foreground">Wait before re-triggering</p>
                  </div>
                </div>

                {formData.actionType.startsWith('email') && (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium">Email Template</h4>
                    <div className="space-y-2">
                      <Label htmlFor="emailSubject">Subject Template</Label>
                      <Input
                        id="emailSubject"
                        value={formData.emailSubjectTemplate}
                        onChange={(e) => setFormData({ ...formData, emailSubjectTemplate: e.target.value })}
                        placeholder="[{priority}] SLA Alert: {subject}"
                      />
                      <p className="text-xs text-muted-foreground">
                        Variables: {'{priority}'}, {'{subject}'}, {'{reference}'}, {'{days_pending}'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emailBody">Body Template (HTML)</Label>
                      <Textarea
                        id="emailBody"
                        value={formData.emailBodyTemplate}
                        onChange={(e) => setFormData({ ...formData, emailBodyTemplate: e.target.value })}
                        placeholder="<p>The correspondence {reference} requires your attention...</p>"
                        rows={4}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">Active</Label>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveRule} disabled={saving || !formData.name}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Test Result Dialog */}
        <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Results: {testResult?.ruleName}</DialogTitle>
              <DialogDescription>
                Items that would match this escalation rule
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="text-3xl font-bold">{testResult?.matchesCount || 0}</div>
                <p className="text-muted-foreground">matching items</p>
              </div>

              {testResult?.matches && testResult.matches.length > 0 && (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {testResult.matches.map((match) => (
                      <div key={match.id} className="p-2 border rounded text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{match.reference}</Badge>
                          <Badge>{match.priority}</Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 truncate">{match.subject}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setTestDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientErrorBoundary>
  );
});

