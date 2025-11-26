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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Target,
  Plus,
  Edit,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle,
  Settings,
  Loader2,
  Save,
} from 'lucide-react';
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

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

export default function SLAConfigurationPage() {
  const { divisions } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState<SLAConfiguration[]>([]);
  const [targets, setTargets] = useState<SLATargets>({ urgent: 2, high: 3, medium: 5, low: 7 });
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
    targetDays: 5,
    warningThresholdPercent: 75,
    criticalThresholdPercent: 90,
    division: null,
    isActive: true,
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
    } catch (error) {
      console.error('Failed to load SLA data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTargets = async () => {
    setSaving(true);
    try {
      await updateSLATargets(tempTargets);
      setTargets(tempTargets);
      setEditingTargets(false);
      await loadData();
    } catch (error) {
      console.error('Failed to save SLA targets:', error);
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
        targetDays: 5,
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
    } catch (error) {
      console.error('Failed to save SLA configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SLA configuration?')) return;
    try {
      await deleteSLAConfiguration(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete SLA configuration:', error);
    }
  };

  const globalConfigs = configs.filter((c) => !c.division);
  const divisionConfigs = configs.filter((c) => c.division);

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
              <Target className="h-8 w-8 text-primary" />
              SLA Configuration
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure Service Level Agreement targets and thresholds
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add SLA Rule
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Urgent SLA</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{targets.urgent} days</div>
              <p className="text-xs text-muted-foreground">Maximum response time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High SLA</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{targets.high} days</div>
              <p className="text-xs text-muted-foreground">Maximum response time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Medium SLA</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{targets.medium} days</div>
              <p className="text-xs text-muted-foreground">Maximum response time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low SLA</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{targets.low} days</div>
              <p className="text-xs text-muted-foreground">Maximum response time</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="global" className="space-y-4">
          <TabsList>
            <TabsTrigger value="global">Global SLA Targets</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Rules ({configs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Default SLA Targets</CardTitle>
                    <CardDescription>
                      These targets apply to all correspondence unless overridden by advanced rules
                    </CardDescription>
                  </div>
                  {!editingTargets ? (
                    <Button variant="outline" onClick={() => setEditingTargets(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Targets
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => {
                        setTempTargets(targets);
                        setEditingTargets(false);
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveTargets} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(['urgent', 'high', 'medium', 'low'] as const).map((priority) => (
                    <div key={priority} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Badge className={PRIORITY_COLORS[priority]}>{priority.toUpperCase()}</Badge>
                          Priority
                        </Label>
                        <span className="text-lg font-semibold">
                          {editingTargets ? tempTargets[priority] : targets[priority]} days
                        </span>
                      </div>
                      {editingTargets && (
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[tempTargets[priority]]}
                            onValueChange={([value]) => setTempTargets({ ...tempTargets, [priority]: value })}
                            min={1}
                            max={30}
                            step={1}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={tempTargets[priority]}
                            onChange={(e) => setTempTargets({ ...tempTargets, [priority]: parseInt(e.target.value) || 1 })}
                            className="w-20"
                            min={1}
                            max={30}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Advanced SLA Rules</CardTitle>
                <CardDescription>
                  Create specific SLA rules for different correspondence types or divisions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {configs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No advanced SLA rules configured yet.</p>
                    <Button variant="outline" className="mt-4" onClick={() => handleOpenDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Rule
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Warning</TableHead>
                        <TableHead>Division</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configs.map((config) => (
                        <TableRow key={config.id}>
                          <TableCell className="font-medium">{config.name}</TableCell>
                          <TableCell>
                            <Badge className={PRIORITY_COLORS[config.priority]}>
                              {config.priorityDisplay}
                            </Badge>
                          </TableCell>
                          <TableCell>{config.correspondenceTypeDisplay}</TableCell>
                          <TableCell>{config.targetDays} days</TableCell>
                          <TableCell>{config.warningThresholdPercent}%</TableCell>
                          <TableCell>
                            {config.divisionDetail?.name || <span className="text-muted-foreground">Global</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant={config.isActive ? 'default' : 'secondary'}>
                              {config.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(config)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteConfig(config.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
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
                <Label htmlFor="targetDays">Target Days</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[formData.targetDays]}
                    onValueChange={([value]) => setFormData({ ...formData, targetDays: value })}
                    min={1}
                    max={30}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={formData.targetDays}
                    onChange={(e) => setFormData({ ...formData, targetDays: parseInt(e.target.value) || 1 })}
                    className="w-20"
                    min={1}
                    max={30}
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
                    Alert at {Math.round((formData.targetDays * (formData.warningThresholdPercent || 75)) / 100)} days
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
                    Critical at {Math.round((formData.targetDays * (formData.criticalThresholdPercent || 90)) / 100)} days
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
    </DashboardLayout>
  );
}

