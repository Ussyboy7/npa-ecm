"use client";

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useOrganization } from '@/contexts/OrganizationContext';
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
  stale: <Clock className="h-4 w-4 text-gray-500" />,
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

export default function EscalationRulesPage() {
  const { divisions } = useOrganization();
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
    } catch (error) {
      console.error('Failed to load escalation data:', error);
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error) {
      console.error('Failed to save escalation rule:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this escalation rule?')) return;
    try {
      await deleteEscalationRule(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete escalation rule:', error);
    }
  };

  const handleToggleRule = async (id: string) => {
    try {
      await toggleEscalationRule(id);
      await loadData();
    } catch (error) {
      console.error('Failed to toggle escalation rule:', error);
    }
  };

  const handleTestRule = async (id: string) => {
    try {
      const result = await testEscalationRule(id);
      setTestResult(result);
      setTestDialogOpen(true);
    } catch (error) {
      console.error('Failed to test escalation rule:', error);
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeEscalation(id);
      await loadData();
    } catch (error) {
      console.error('Failed to acknowledge escalation:', error);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await resolveEscalation(id);
      await loadData();
    } catch (error) {
      console.error('Failed to resolve escalation:', error);
    }
  };

  const activeRules = rules.filter((r) => r.isActive);
  const inactiveRules = rules.filter((r) => !r.isActive);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Zap className="h-8 w-8 text-primary" />
              Escalation Rules
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure automatic escalations and notifications for SLA breaches
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
              <Power className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeRules.length}</div>
              <p className="text-xs text-muted-foreground">
                {inactiveRules.length} inactive
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Escalations</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.pending || 0}</div>
              <p className="text-xs text-muted-foreground">
                {summary?.active || 0} total active
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Bell className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.triggeredThisWeek || 0}</div>
              <p className="text-xs text-muted-foreground">Escalations triggered</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.resolvedToday || 0}</div>
              <p className="text-xs text-muted-foreground">Issues addressed</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="rules" className="space-y-4">
          <TabsList>
            <TabsTrigger value="rules">Rules ({rules.length})</TabsTrigger>
            <TabsTrigger value="pending">
              Pending Escalations ({escalations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-4">
            {rules.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">No escalation rules configured yet.</p>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Rule
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {rules.map((rule) => (
                  <Card key={rule.id} className={!rule.isActive ? 'opacity-60' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-muted">
                            {TRIGGER_ICONS[rule.triggerType] || <Zap className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{rule.name}</h3>
                              <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                                {rule.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                              {rule.escalationCount > 0 && (
                                <Badge variant="outline">{rule.escalationCount} triggered</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {rule.description || `Trigger: ${rule.triggerTypeDisplay} → Action: ${rule.actionTypeDisplay}`}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                {TRIGGER_ICONS[rule.triggerType]}
                                {rule.triggerTypeDisplay}
                              </span>
                              <span>→</span>
                              <span className="flex items-center gap-1">
                                {ACTION_ICONS[rule.actionType]}
                                {rule.actionTypeDisplay}
                              </span>
                              <span>•</span>
                              <span>Cooldown: {rule.cooldownHours}h</span>
                              <span>•</span>
                              <span>Priority: {rule.priorityOrder}</span>
                              {rule.divisionsDetail.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {rule.divisionsDetail.map((d) => d.code || d.name).join(', ')}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestRule(rule.id)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Test
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleRule(rule.id)}
                          >
                            {rule.isActive ? (
                              <PowerOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Power className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {escalations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p className="text-muted-foreground">No pending escalations. All clear!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {escalations.map((esc) => (
                  <Card key={esc.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{esc.correspondenceReference}</Badge>
                            <span className="font-medium">{esc.correspondenceSubject}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {esc.triggerReason || `Triggered by: ${esc.ruleName}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(esc.triggeredAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledge(esc.id)}
                          >
                            Acknowledge
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleResolve(esc.id)}
                          >
                            Resolve
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Add/Edit Rule Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
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
    </DashboardLayout>
  );
}

