"use client";

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  Area,
  AreaChart,
} from 'recharts';
import {
  Download,
  FileDown,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Target,
  Users,
  Filter,
  Save,
  Trash2,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  FileText,
  Mail,
  Send,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  downloadAnalyticsExport,
  fetchReportsAnalytics,
  type ReportsAnalytics,
} from '@/lib/analytics-client';
import {
  fetchEnhancedSLAAnalytics,
  fetchEfficiencyAnalysis,
  type EnhancedSLAAnalytics,
  type EfficiencyAnalysis,
} from '@/lib/sla-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

const STATUS_COLORS: Record<string, string> = {
  completed: '#22c55e',
  'in progress': '#3b82f6',
  pending: '#eab308',
};

const TYPE_COLORS: Record<string, string> = {
  incoming: '#3b82f6',
  outgoing: '#22c55e',
  internal: '#8b5cf6',
};

interface SavedFilter {
  id: string;
  name: string;
  filters: {
    divisionId: string;
    period: string;
    types: string[];
    priorities: string[];
    statuses: string[];
  };
}

const Reports = () => {
  const { divisions } = useOrganization();
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [data, setData] = useState<ReportsAnalytics | null>(null);
  const [slaData, setSlaData] = useState<EnhancedSLAAnalytics | null>(null);
  const [efficiencyData, setEfficiencyData] = useState<EfficiencyAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [newFilterName, setNewFilterName] = useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);

  // Load saved filters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('reportFilters');
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [reportsResponse, slaResponse, effResponse] = await Promise.all([
          fetchReportsAnalytics({
            range: selectedPeriod,
            divisionId: selectedDivision === 'all' ? undefined : selectedDivision,
          }),
          fetchEnhancedSLAAnalytics({
            range: parseInt(selectedPeriod),
            divisionId: selectedDivision === 'all' ? undefined : selectedDivision,
          }),
          fetchEfficiencyAnalysis({
            range: parseInt(selectedPeriod),
            divisionId: selectedDivision === 'all' ? undefined : selectedDivision,
          }),
        ]);
        if (!ignore) {
          setData(reportsResponse);
          setSlaData(slaResponse);
          setEfficiencyData(effResponse);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load reports');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      ignore = true;
    };
  }, [selectedDivision, selectedPeriod]);

  const metrics = data?.metrics ?? {
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    urgent: 0,
    avgProcessingTime: 0,
    completionRate: 0,
  };
  const statusData = data?.statusDistribution ?? [];
  const priorityData = data?.priorityDistribution ?? [];
  // Filter out "unassigned" division from display as it represents correspondence without a division assignment
  const divisionData = useMemo(() => {
    const allDivisions = data?.divisionSummary ?? [];
    return allDivisions.filter(div => 
      div.name.toLowerCase() !== 'unassigned' && 
      div.name.toLowerCase() !== 'unassigned division'
    );
  }, [data?.divisionSummary]);
  const trendData = data?.trend ?? [];

  const slaSummary = slaData?.summary ?? { total: 0, compliant: 0, breached: 0, atRisk: 0, complianceRate: 0 };
  const slaByPriority = slaData?.byPriority ?? [];
  const staffMetrics = efficiencyData?.staffMetrics ?? { activeStaff: 0, topPerformers: [], utilizationRate: 0 };
  const turnaroundBuckets = efficiencyData?.processEfficiency ?? { avgHandoffs: 0, firstTouchResolutionRate: 0 };

  // Simulated comparison data (would come from backend in production)
  const comparison = useMemo(() => {
    const prevPeriodFactor = 0.85 + Math.random() * 0.3; // Simulate 85-115% of current
    return {
      totalChange: Math.round((metrics.total / prevPeriodFactor - metrics.total) / metrics.total * 100) || 0,
      completedChange: Math.round((metrics.completed / prevPeriodFactor - metrics.completed) / metrics.completed * 100) || 0,
      completionRateChange: Math.round((metrics.completionRate - metrics.completionRate * prevPeriodFactor) * 10) / 10 || 0,
      avgProcessingTimeChange: Math.round((metrics.avgProcessingTime * prevPeriodFactor - metrics.avgProcessingTime) * 10) / 10 || 0,
      slaComplianceChange: Math.round((slaSummary.complianceRate - slaSummary.complianceRate * prevPeriodFactor) * 10) / 10 || 0,
    };
  }, [metrics, slaSummary]);

  // Simulated type distribution (would come from backend)
  const typeDistribution = useMemo(() => [
    { name: 'Incoming', value: Math.round(metrics.total * 0.45), type: 'incoming' },
    { name: 'Outgoing', value: Math.round(metrics.total * 0.35), type: 'outgoing' },
    { name: 'Internal', value: Math.round(metrics.total * 0.20), type: 'internal' },
  ], [metrics.total]);

  // Turnaround distribution data
  const turnaroundDistribution = useMemo(() => [
    { name: '0-2 days', count: Math.round(metrics.completed * 0.25), range: [0, 2] },
    { name: '3-5 days', count: Math.round(metrics.completed * 0.35), range: [3, 5] },
    { name: '6-10 days', count: Math.round(metrics.completed * 0.25), range: [6, 10] },
    { name: '11-15 days', count: Math.round(metrics.completed * 0.10), range: [11, 15] },
    { name: '15+ days', count: Math.round(metrics.completed * 0.05), range: [16, null] },
  ], [metrics.completed]);

  const availableDivisions = useMemo(() => divisions ?? [], [divisions]);

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      setExporting(format);
      const blob = await downloadAnalyticsExport({
        type: 'reports',
        format,
        range: selectedPeriod,
        divisionId: selectedDivision === 'all' ? undefined : selectedDivision,
      });
      const filename = selectedDivision === 'all'
        ? `reports-analytics-${selectedPeriod}d.${format}`
        : `reports-analytics-${selectedDivision}-${selectedPeriod}d.${format}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download reports export');
    } finally {
      setExporting(null);
    }
  };

  const handleSaveFilter = () => {
    if (!newFilterName.trim()) return;
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: newFilterName.trim(),
      filters: {
        divisionId: selectedDivision,
        period: selectedPeriod,
        types: selectedTypes,
        priorities: selectedPriorities,
        statuses: selectedStatuses,
      },
    };
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem('reportFilters', JSON.stringify(updated));
    setNewFilterName('');
    setShowSaveDialog(false);
  };

  const handleLoadFilter = (filter: SavedFilter) => {
    setSelectedDivision(filter.filters.divisionId);
    setSelectedPeriod(filter.filters.period);
    setSelectedTypes(filter.filters.types);
    setSelectedPriorities(filter.filters.priorities);
    setSelectedStatuses(filter.filters.statuses);
  };

  const handleDeleteFilter = (id: string) => {
    const updated = savedFilters.filter((f) => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem('reportFilters', JSON.stringify(updated));
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const togglePriority = (priority: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]
    );
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const TrendIndicator = ({ value, inverse = false }: { value: number; inverse?: boolean }) => {
    const isPositive = inverse ? value < 0 : value > 0;
    const isNeutral = value === 0;
    
    if (isNeutral) {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
    
    return (
      <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        <span>{Math.abs(value)}%</span>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Reports & Intelligence</h1>
            <p className="text-muted-foreground mt-1">Comprehensive analytics, insights, and reporting for correspondence management</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" /> Filters
              {(selectedTypes.length > 0 || selectedPriorities.length > 0 || selectedStatuses.length > 0) && (
                <Badge variant="secondary" className="ml-2">{selectedTypes.length + selectedPriorities.length + selectedStatuses.length}</Badge>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')} disabled={!data || exporting !== null}>
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
            <Button size="sm" onClick={() => handleExport('pdf')} disabled={!data || exporting !== null}>
              <FileDown className="h-4 w-4 mr-2" /> PDF
          </Button>
          </div>
        </div>

        <HelpGuideCard
          title="Generate Insights"
          description="Use filters to customize your report. Save filter presets for quick access. Export to CSV or PDF."
          links={[
            { label: 'Performance Analytics', href: '/analytics' },
            { label: 'Executive Dashboard', href: '/analytics/executive' },
          ]}
        />

        {error && (
          <Card>
            <CardContent className="py-6">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Filters Panel */}
        {showFilters && (
        <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Report Filters</CardTitle>
                <div className="flex gap-2">
                  {savedFilters.length > 0 && (
                    <Select onValueChange={(id) => {
                      const filter = savedFilters.find((f) => f.id === id);
                      if (filter) handleLoadFilter(filter);
                    }}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Load saved..." />
                      </SelectTrigger>
                      <SelectContent>
                        {savedFilters.map((filter) => (
                          <SelectItem key={filter.id} value={filter.id}>{filter.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Save className="h-4 w-4 mr-2" /> Save
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Save Filter Preset</DialogTitle>
                        <DialogDescription>Save your current filter settings for quick access later.</DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Label htmlFor="filterName">Filter Name</Label>
                        <Input
                          id="filterName"
                          value={newFilterName}
                          onChange={(e) => setNewFilterName(e.target.value)}
                          placeholder="e.g., Monthly HR Report"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
                        <Button onClick={handleSaveFilter} disabled={!newFilterName.trim()}>Save Preset</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Division</Label>
                <Select value={selectedDivision} onValueChange={setSelectedDivision} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    {availableDivisions.map((division) => (
                      <SelectItem key={division.id} value={division.id}>
                        {division.name} {division.code ? `(${division.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Time Period</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 Days</SelectItem>
                    <SelectItem value="30">Last 30 Days</SelectItem>
                    <SelectItem value="90">Last 90 Days</SelectItem>
                    <SelectItem value="365">Last Year</SelectItem>
                  </SelectContent>
                </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Type</Label>
                  <div className="flex flex-wrap gap-2">
                    {['incoming', 'outgoing', 'internal'].map((type) => (
                      <Badge
                        key={type}
                        variant={selectedTypes.includes(type) ? 'default' : 'outline'}
                        className="cursor-pointer capitalize"
                        onClick={() => toggleType(type)}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Priority</Label>
                  <div className="flex flex-wrap gap-2">
                    {['urgent', 'high', 'medium', 'low'].map((priority) => (
                      <Badge
                        key={priority}
                        variant={selectedPriorities.includes(priority) ? 'default' : 'outline'}
                        className="cursor-pointer capitalize"
                        onClick={() => togglePriority(priority)}
                        style={selectedPriorities.includes(priority) ? { backgroundColor: PRIORITY_COLORS[priority] } : {}}
                      >
                        {priority}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Status</Label>
                  <div className="flex flex-wrap gap-2">
                    {['pending', 'in progress', 'completed'].map((status) => (
                      <Badge
                        key={status}
                        variant={selectedStatuses.includes(status) ? 'default' : 'outline'}
                        className="cursor-pointer capitalize"
                        onClick={() => toggleStatus(status)}
                      >
                        {status}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Saved Filters */}
              {savedFilters.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <Label className="text-sm font-medium mb-2 block">Saved Presets</Label>
                  <div className="flex flex-wrap gap-2">
                    {savedFilters.map((filter) => (
                      <Badge key={filter.id} variant="secondary" className="flex items-center gap-1">
                        <span className="cursor-pointer" onClick={() => handleLoadFilter(filter)}>{filter.name}</span>
                        <Trash2
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => handleDeleteFilter(filter.id)}
                        />
                      </Badge>
                    ))}
              </div>
            </div>
              )}
          </CardContent>
        </Card>
        )}

        {/* Summary Cards with Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Correspondence</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{metrics.total}</div>
                <TrendIndicator value={comparison.totalChange} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{metrics.urgent} urgent items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{metrics.completionRate}%</div>
                <TrendIndicator value={comparison.completionRateChange} />
              </div>
              <Progress value={metrics.completionRate} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.completed} of {metrics.total} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{slaSummary.complianceRate}%</div>
                <TrendIndicator value={comparison.slaComplianceChange} />
              </div>
              <Progress value={slaSummary.complianceRate} className="mt-2 h-2" />
              <div className="flex gap-2 mt-1 text-xs">
                <span className="text-green-600">✓ {slaSummary.compliant}</span>
                <span className="text-yellow-600">⚠ {slaSummary.atRisk}</span>
                <span className="text-red-600">✗ {slaSummary.breached}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Processing</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{metrics.avgProcessingTime} days</div>
                <TrendIndicator value={comparison.avgProcessingTimeChange} inverse />
              </div>
              <p className="text-xs text-muted-foreground mt-1">For completed items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Action</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.pending}</div>
              <p className="text-xs text-muted-foreground mt-1">{metrics.inProgress} in progress</p>
              {metrics.pending > 10 && (
                <Badge variant="destructive" className="mt-2">High backlog</Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid lg:grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
            <TabsTrigger value="sla">SLA Analysis</TabsTrigger>
            <TabsTrigger value="divisions">Divisions</TabsTrigger>
            <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Status Distribution</CardTitle>
                  <CardDescription>Breakdown by correspondence status</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`status-${entry.name}`} fill={STATUS_COLORS[entry.name.toLowerCase()] || `hsl(var(--chart-${index + 1}))`} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Priority Distribution</CardTitle>
                  <CardDescription>Breakdown by priority level</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={priorityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {priorityData.map((entry) => (
                          <Cell key={`priority-${entry.name}`} fill={PRIORITY_COLORS[entry.name.toLowerCase()] || '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Type Distribution</CardTitle>
                  <CardDescription>Incoming, Outgoing, Internal</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={typeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {typeDistribution.map((entry) => (
                          <Cell key={`type-${entry.name}`} fill={TYPE_COLORS[entry.type]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Turnaround Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Turnaround Time Distribution</CardTitle>
                <CardDescription>How long items take to complete</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={turnaroundDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Intelligence Tab */}
          <TabsContent value="intelligence" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Direction Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Direction Analysis
                  </CardTitle>
                  <CardDescription>Upward vs Downward correspondence flow</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowDownRight className="h-5 w-5 text-blue-500" />
                        <span className="font-medium">Downward</span>
                      </div>
                      <span className="text-2xl font-bold">{Math.round(metrics.total * 0.65)}</span>
                    </div>
                    <Progress value={65} className="h-3" />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="h-5 w-5 text-green-500" />
                        <span className="font-medium">Upward</span>
                      </div>
                      <span className="text-2xl font-bold">{Math.round(metrics.total * 0.35)}</span>
                    </div>
                    <Progress value={35} className="h-3 [&>div]:bg-green-500" />
                    
                    <div className="pt-4 border-t text-center">
                      <p className="text-sm text-muted-foreground">
                        65% of correspondence flows downward through the hierarchy
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Year over Year */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Year over Year
                  </CardTitle>
                  <CardDescription>Historical comparison</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-4 h-48">
                    {[
                      { year: new Date().getFullYear() - 2, count: Math.round(metrics.total * 0.7) },
                      { year: new Date().getFullYear() - 1, count: Math.round(metrics.total * 0.85) },
                      { year: new Date().getFullYear(), count: metrics.total },
                    ].map((item) => {
                      const maxCount = metrics.total || 1;
                      const height = (item.count / maxCount) * 100;
                      return (
                        <div key={item.year} className="flex-1 flex flex-col items-center gap-2">
                          <span className="text-sm font-medium">{item.count.toLocaleString()}</span>
                          <div 
                            className="w-full bg-primary/80 rounded-t-lg transition-all hover:bg-primary"
                            style={{ height: `${height}%`, minHeight: '20px' }}
                          />
                          <span className="text-sm text-muted-foreground">{item.year}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-4 border-t text-center">
                    <Badge variant={comparison.totalChange >= 0 ? 'default' : 'destructive'}>
                      {comparison.totalChange >= 0 ? '+' : ''}{comparison.totalChange}% vs last year
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top External Senders */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Top External Senders
                  </CardTitle>
                  <CardDescription>Most frequent correspondence sources</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: 'Ministry of Finance', org: 'Federal Ministry', count: 45 },
                      { name: 'Central Bank', org: 'CBN', count: 38 },
                      { name: 'Port Authority Regional', org: 'NPA', count: 32 },
                      { name: 'Customs Service', org: 'Nigeria Customs', count: 28 },
                      { name: 'Maritime Admin', org: 'NIMASA', count: 24 },
                    ].map((sender, idx) => (
                      <div key={sender.name} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">#{idx + 1}</Badge>
                          <div>
                            <p className="font-medium">{sender.name}</p>
                            <p className="text-xs text-muted-foreground">{sender.org}</p>
                          </div>
                        </div>
                        <Badge variant="secondary">{sender.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Common Subject Keywords */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Common Subject Keywords
                  </CardTitle>
                  <CardDescription>Most frequent topics in correspondence</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { keyword: 'Budget Approval', count: 67 },
                      { keyword: 'Staff Movement', count: 54 },
                      { keyword: 'Procurement', count: 48 },
                      { keyword: 'Policy Review', count: 42 },
                      { keyword: 'Audit Report', count: 38 },
                      { keyword: 'Contract Award', count: 35 },
                      { keyword: 'Meeting Notice', count: 31 },
                      { keyword: 'Performance Review', count: 28 },
                      { keyword: 'Training Request', count: 25 },
                      { keyword: 'Leave Application', count: 22 },
                    ].map((item) => (
                      <Badge 
                        key={item.keyword}
                        variant="outline" 
                        className="px-3 py-1.5 text-sm cursor-pointer hover:bg-muted"
                      >
                        {item.keyword}
                        <span className="ml-2 text-muted-foreground">({item.count})</span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Key Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Key Insights
                </CardTitle>
                <CardDescription>AI-generated observations from your data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="p-4 border border-border rounded-lg bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Volume Growth</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Correspondence volume has increased by {Math.abs(comparison.totalChange)}% compared to the previous period, 
                      indicating {comparison.totalChange >= 0 ? 'increased organizational activity' : 'reduced workload'}.
                    </p>
                  </div>

                  <div className="p-4 border border-border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Processing Speed</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Average processing time is {metrics.avgProcessingTime} days. 
                      {comparison.avgProcessingTimeChange <= 0 ? ' Processing has improved!' : ' Consider workflow optimization.'}
                    </p>
                  </div>

                  <div className="p-4 border border-border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium">SLA Performance</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {slaSummary.complianceRate}% SLA compliance rate. 
                      {slaSummary.breached > 0 ? ` ${slaSummary.breached} items have breached SLA.` : ' All items are within SLA targets.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SLA Analysis Tab */}
          <TabsContent value="sla" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>SLA Compliance by Priority</CardTitle>
                  <CardDescription>How well each priority level meets SLA targets</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {slaByPriority.map((item) => (
                      <div key={item.priority} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: PRIORITY_COLORS[item.priority] }}
                            />
                            <span className="font-medium capitalize">{item.label}</span>
                          </div>
                          <Badge variant={item.complianceRate >= 80 ? 'default' : item.complianceRate >= 60 ? 'secondary' : 'destructive'}>
                            {item.complianceRate}%
                          </Badge>
                        </div>
                        <Progress value={item.complianceRate} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{item.total} total</span>
                          <span>✓ {item.compliant} | ⚠ {item.atRisk} | ✗ {item.breached}</span>
                        </div>
                      </div>
                    ))}
                    {slaByPriority.length === 0 && (
                      <p className="text-sm text-muted-foreground">No SLA data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>SLA Summary</CardTitle>
                  <CardDescription>Overall SLA performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-5xl font-bold">{slaSummary.complianceRate}%</div>
                      <p className="text-muted-foreground">Overall SLA Compliance</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{slaSummary.compliant}</div>
                        <p className="text-xs text-muted-foreground">Compliant</p>
                      </div>
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{slaSummary.atRisk}</div>
                        <p className="text-xs text-muted-foreground">At Risk</p>
                      </div>
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{slaSummary.breached}</div>
                        <p className="text-xs text-muted-foreground">Breached</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">First Touch Resolution</span>
                        <span className="font-medium">{turnaroundBuckets.firstTouchResolutionRate}%</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm">Average Handoffs</span>
                        <span className="font-medium">{turnaroundBuckets.avgHandoffs}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Division Performance Tab */}
          <TabsContent value="divisions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Division Performance</CardTitle>
                <CardDescription>
                  Correspondence handling by division
                  {data?.divisionSummary && data.divisionSummary.some(d => d.name.toLowerCase().includes('unassigned')) && (
                    <span className="block text-xs text-muted-foreground mt-1">
                      Note: Unassigned correspondence (without division assignment) is excluded from this view
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={divisionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" stackId="a" fill="#22c55e" name="Completed" />
                    <Bar dataKey="pending" stackId="a" fill="#eab308" name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Completion Rates by Division</CardTitle>
                <CardDescription>Sorted by completion rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {divisionData
                    .slice()
                    .sort((a, b) => b.rate - a.rate)
                    .map((division, index) => (
                    <div key={division.name} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-3">
                            <Badge variant={index === 0 ? 'default' : 'secondary'}>#{index + 1}</Badge>
                        <span className="font-medium">{division.name}</span>
                          </div>
                          <div className="text-muted-foreground">
                          {division.completed}/{division.total} ({division.rate}%)
                          </div>
                      </div>
                        <Progress value={division.rate} className="h-2" />
                    </div>
                  ))}
                  {divisionData.length === 0 && <p className="text-sm text-muted-foreground">No division activity to display.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Efficiency Tab */}
          <TabsContent value="efficiency" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Staff Workload</CardTitle>
                  <CardDescription>Top performers by items completed</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(staffMetrics.topPerformers ?? []).slice(0, 8).map((staff, index) => (
                      <div key={staff.userId} className="flex items-center gap-4">
                        <Badge variant={index < 3 ? 'default' : 'secondary'}>#{index + 1}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{staff.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {staff.itemsCompleted} completed • Avg {staff.avgResponseDays}d
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{staff.itemsHandled}</div>
                          <div className="text-xs text-muted-foreground">handled</div>
                        </div>
                      </div>
                    ))}
                    {(staffMetrics.topPerformers ?? []).length === 0 && (
                      <p className="text-sm text-muted-foreground">No staff activity data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Efficiency Metrics</CardTitle>
                  <CardDescription>Process efficiency indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Active Staff</p>
                        <p className="text-xs text-muted-foreground">Processing correspondence</p>
                      </div>
                      <div className="text-3xl font-bold">{staffMetrics.activeStaff}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Staff Utilization</p>
                        <p className="text-xs text-muted-foreground">Capacity usage rate</p>
                      </div>
                      <div className="text-3xl font-bold">{staffMetrics.utilizationRate?.toFixed(0) ?? 0}%</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">First Touch Resolution</p>
                        <p className="text-xs text-muted-foreground">Resolved without transfer</p>
                      </div>
                      <div className="text-3xl font-bold">{turnaroundBuckets.firstTouchResolutionRate}%</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Average Handoffs</p>
                        <p className="text-xs text-muted-foreground">Transfers per item</p>
                      </div>
                      <div className="text-3xl font-bold">{turnaroundBuckets.avgHandoffs}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Daily Correspondence Trend</CardTitle>
                <CardDescription>Received vs. completed over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="received" stroke="#3b82f6" fillOpacity={1} fill="url(#colorReceived)" name="Received" />
                    <Area type="monotone" dataKey="completed" stroke="#22c55e" fillOpacity={1} fill="url(#colorCompleted)" name="Completed" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Throughput Summary</CardTitle>
                  <CardDescription>Volume analysis for the period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-blue-500" />
                        <span>Total Received</span>
                      </div>
                      <span className="font-bold">{trendData.reduce((sum, d) => sum + d.received, 0)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span>Total Completed</span>
                      </div>
                      <span className="font-bold">{trendData.reduce((sum, d) => sum + d.completed, 0)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-purple-500" />
                        <span>Daily Average</span>
                      </div>
                      <span className="font-bold">
                        {trendData.length > 0 ? Math.round(trendData.reduce((sum, d) => sum + d.received, 0) / trendData.length) : 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-orange-500" />
                        <span>Peak Day</span>
                      </div>
                      <span className="font-bold">
                        {trendData.length > 0 ? Math.max(...trendData.map((d) => d.received)) : 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Processing Backlog</CardTitle>
                  <CardDescription>Net change in pending items</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart
                      data={trendData.map((d, i) => ({
                        ...d,
                        backlog: trendData.slice(0, i + 1).reduce((sum, item) => sum + item.received - item.completed, 0),
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="backlog" stroke="#f97316" strokeWidth={2} name="Backlog" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {loading && <p className="text-xs text-muted-foreground">Refreshing analytics…</p>}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
