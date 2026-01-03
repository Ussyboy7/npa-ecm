"use client";

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Activity,
  Search,
  User as UserIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Shield,
  FileText,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatDateTime } from '@/lib/correspondence-helpers';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getActivityLogs, type ActivityLog } from '@/lib/audit-storage';
import { logError, logWarn } from '@/lib/client-logger';
import { exportToCSV } from '@/lib/admin-export';
import { toast } from 'sonner';

const ACTION_TYPES = [
  { value: 'user_login', label: 'User Login' },
  { value: 'user_logout', label: 'User Logout' },
  { value: 'document_created', label: 'Document Created' },
  { value: 'document_updated', label: 'Document Updated' },
  { value: 'document_deleted', label: 'Document Deleted' },
  { value: 'document_viewed', label: 'Document Viewed' },
  { value: 'document_downloaded', label: 'Document Downloaded' },
  { value: 'document_shared', label: 'Document Shared' },
  { value: 'correspondence_created', label: 'Correspondence Created' },
  { value: 'correspondence_routed', label: 'Correspondence Routed' },
  { value: 'correspondence_approved', label: 'Correspondence Approved' },
  { value: 'permission_granted', label: 'Permission Granted' },
  { value: 'permission_revoked', label: 'Permission Revoked' },
];

const MODULES = [
  { value: 'accounts', label: 'Accounts' },
  { value: 'dms', label: 'Document Management' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'system', label: 'System' },
];

const SEVERITIES = [
  { value: 'info', label: 'Information', color: 'secondary' },
  { value: 'warning', label: 'Warning', color: 'default' },
  { value: 'error', label: 'Error', color: 'destructive' },
  { value: 'critical', label: 'Critical', color: 'destructive' },
];

type AuditSummary = {
  total: number;
  logins: number;
  errors: number;
  actions: number;
};

const DEFAULT_SUMMARY: AuditSummary = {
  total: 0,
  logins: 0,
  errors: 0,
  actions: 0,
};

const AuditTrailPage = () => {
  const { currentUser, hydrated } = useCurrentUser();
  const { users: organizationUsers } = useOrganization();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [successFilter, setSuccessFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'last7' | 'last30' | 'last90' | 'custom'>('all');
  const [customDateFrom, setCustomDateFrom] = useState<string>('');
  const [customDateTo, setCustomDateTo] = useState<string>('');

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summaryStats, setSummaryStats] = useState<AuditSummary>(DEFAULT_SUMMARY);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [goToPageInput, setGoToPageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, actionFilter, moduleFilter, severityFilter, successFilter, sortOrder, pageSize, dateRangeFilter, customDateFrom, customDateTo]);

  // Build date range params
  const getDateRangeParams = () => {
    const params: Record<string, unknown> = {};
    
    if (dateRangeFilter === 'last7') {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 7);
      params.from_date = fromDate.toISOString().split('T')[0];
    } else if (dateRangeFilter === 'last30') {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 30);
      params.from_date = fromDate.toISOString().split('T')[0];
    } else if (dateRangeFilter === 'last90') {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 90);
      params.from_date = fromDate.toISOString().split('T')[0];
    } else if (dateRangeFilter === 'custom') {
      if (customDateFrom) params.from_date = customDateFrom;
      if (customDateTo) params.to_date = customDateTo;
    }
    
    return params;
  };

  // Fetch logs
  const fetchLogs = async () => {
    if (!hydrated || !currentUser) return;
    
    setLoading(true);
    setError(null);
    try {
      const dateParams = getDateRangeParams();
      const params: Record<string, unknown> = {
        page,
        pageSize,
        ordering: sortOrder === 'desc' ? '-timestamp' : 'timestamp',
        ...dateParams,
      };
      if (actionFilter !== 'all') params.action = actionFilter;
      if (moduleFilter !== 'all') params.module = moduleFilter;
      if (severityFilter !== 'all') params.severity = severityFilter;
      if (successFilter !== 'all') params.success = successFilter === 'true';
      if (debouncedSearch) params.search = debouncedSearch;

      const data = await getActivityLogs(params);
      setLogs(data.results);
      setTotalCount(data.count);
    } catch (err) {
      logError('Failed to load audit logs', err);
      setError('Failed to load audit logs. Please try again.');
      setLogs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch summary stats separately
  const fetchSummaryStats = async () => {
    if (!hydrated || !currentUser) return;
    
    try {
      const dateParams = getDateRangeParams();
      const baseParams: Record<string, unknown> = {
        page: 1,
        pageSize: 1, // Just need count
        ...dateParams,
      };
      if (moduleFilter !== 'all') baseParams.module = moduleFilter;
      if (severityFilter !== 'all') baseParams.severity = severityFilter;
      if (successFilter !== 'all') baseParams.success = successFilter === 'true';
      if (debouncedSearch) baseParams.search = debouncedSearch;

      // Fetch counts for each stat
      const [allResponse, loginResponse, errorResponse] = await Promise.all([
        getActivityLogs(baseParams),
        getActivityLogs({ ...baseParams, action: 'user_login' }),
        getActivityLogs({ ...baseParams, severity: 'error' }),
      ]);

      // Get failed count (success = false)
      const failedResponse = await getActivityLogs({ ...baseParams, success: false });
      
      // Get action count (excluding login/logout) - use total minus logins/logouts
      const logoutResponse = await getActivityLogs({ ...baseParams, action: 'user_logout' });
      const actionCount = Math.max(0, allResponse.count - loginResponse.count - logoutResponse.count);

      setSummaryStats({
        total: allResponse.count,
        logins: loginResponse.count,
        errors: errorResponse.count + failedResponse.count,
        actions: actionCount,
      });
    } catch (err) {
      // Silently fail - summary is not critical
      logWarn('Failed to load summary stats:', err);
    }
  };

  useEffect(() => {
    void fetchLogs();
    void fetchSummaryStats();
  }, [hydrated, currentUser, page, debouncedSearch, actionFilter, moduleFilter, severityFilter, successFilter, sortOrder, dateRangeFilter, customDateFrom, customDateTo]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleGoToPage = () => {
    const pageNum = parseInt(goToPageInput, 10);
    if (pageNum >= 1 && pageNum <= totalPages) {
      setPage(pageNum);
      setGoToPageInput('');
    }
  };

  // Use summary stats from API
  const summary = summaryStats;

  const getUserName = (userId?: string) => {
    if (!userId) return 'System';
    const user = organizationUsers.find((u) => u.id === userId);
    return user?.name || userId;
  };

  const getSeverityColor = (severity: ActivityLog['severity']) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
      default:
        return 'secondary';
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('login') || action.includes('logout')) return UserIcon;
    if (action.includes('document')) return FileText;
    if (action.includes('permission')) return Shield;
    return Activity;
  };

  const LogCard = ({ log }: { log: ActivityLog }) => {
    const ActionIcon = getActionIcon(log.action);
    const isError = log.severity === 'error' || log.severity === 'critical' || !log.success;
    
    return (
      <div className="p-4 border border-border rounded-lg hover:bg-muted/50 hover:shadow-soft transition-all">
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-lg ${
              isError
                ? 'bg-destructive/10'
                : log.severity === 'warning'
                  ? 'bg-warning/10'
                  : 'bg-primary/10'
            }`}
          >
            <ActionIcon
              className={`h-5 w-5 ${
                isError
                  ? 'text-destructive'
                  : log.severity === 'warning'
                    ? 'text-warning'
                    : 'text-primary'
              }`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground mb-1">
                  {log.actionDisplay || log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={getSeverityColor(log.severity)}>
                    {log.severityDisplay || log.severity.toUpperCase()}
                  </Badge>
                  {log.module && (
                    <Badge variant="outline">
                      {log.module.toUpperCase()}
                    </Badge>
                  )}
                  {log.success ? (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Success
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Failed
                    </Badge>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDateTime(log.timestamp)}
              </span>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <UserIcon className="h-3.5 w-3.5" />
                <span>User: {log.userName || getUserName(log.user)}</span>
              </div>
              {log.description && (
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5" />
                  <span>{log.description}</span>
                </div>
              )}
              {log.objectType && log.objectRepr && (
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  <span>{log.objectType}: {log.objectRepr}</span>
                </div>
              )}
              {log.errorMessage && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{log.errorMessage}</span>
                </div>
              )}
              {log.ipAddress && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>IP: {log.ipAddress}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!hydrated || !currentUser) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Loading audit trail…
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Activity className="h-8 w-8 text-primary" />
              Audit Trail
            </h1>
            <p className="text-muted-foreground mt-1">
              Track and monitor all system activities, user actions, and security events.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void fetchLogs()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExport}
              disabled={exporting || loading || logs.length === 0}
            >
              {exporting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Help Guide */}
        <HelpGuideCard
          title="Understanding the Audit Trail"
          description="The audit trail provides a comprehensive record of all activities in the system. Use filters to find specific events, track user actions, and investigate security incidents."
          links={[
            { label: 'User Management', href: '/admin/users-roles?tab=users' },
            { label: 'System Settings', href: '/settings' },
          ]}
        />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Total Events',
              value: summary.total,
              icon: Activity,
              bgClass: 'bg-primary/10',
              iconClass: 'text-primary',
            },
            {
              label: 'User Logins',
              value: summary.logins,
              icon: UserIcon,
              bgClass: 'bg-info/10',
              iconClass: 'text-info',
            },
            {
              label: 'Errors & Failures',
              value: summary.errors,
              icon: AlertCircle,
              bgClass: 'bg-destructive/10',
              iconClass: 'text-destructive',
            },
            {
              label: 'System Actions',
              value: summary.actions,
              icon: Shield,
              bgClass: 'bg-success/10',
              iconClass: 'text-success',
            },
          ].map(({ label, value, icon: Icon, bgClass, iconClass }) => (
            <Card key={label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${bgClass}`}>
                    <Icon className={`h-6 w-6 ${iconClass}`} />
                  </div>
        <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-semibold">{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search Bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="relative max-w-xl w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
              placeholder="Search by user, action, description, object..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
                />
              </div>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Label>
            <div className="flex flex-wrap gap-4">
              <div className="w-full md:w-48 space-y-1">
                <Label className="text-xs text-muted-foreground">Action Type</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                    <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {ACTION_TYPES.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>
              <div className="w-full md:w-48 space-y-1">
                <Label className="text-xs text-muted-foreground">Module</Label>
                <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger>
                    <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    {MODULES.map((module) => (
                      <SelectItem key={module.value} value={module.value}>
                        {module.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              </div>
              <div className="w-full md:w-40 space-y-1">
                <Label className="text-xs text-muted-foreground">Severity</Label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                    <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    {SEVERITIES.map((severity) => (
                      <SelectItem key={severity.value} value={severity.value}>
                        {severity.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>
              <div className="w-full md:w-36 space-y-1">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={successFilter} onValueChange={setSuccessFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Success</SelectItem>
                    <SelectItem value="false">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-48 space-y-1">
                <Label className="text-xs text-muted-foreground">Date Range</Label>
                <Select value={dateRangeFilter} onValueChange={(v) => setDateRangeFilter(v as typeof dateRangeFilter)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="last7">Last 7 Days</SelectItem>
                    <SelectItem value="last30">Last 30 Days</SelectItem>
                    <SelectItem value="last90">Last 90 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                {dateRangeFilter === 'custom' && (
                  <div className="mt-2 space-y-2">
                    <Input
                      type="date"
                      placeholder="From"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      className="w-full"
                    />
                    <Input
                      type="date"
                      placeholder="To"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
              <div className="w-full md:w-48 space-y-1">
                <Label className="text-xs text-muted-foreground">Sort Order</Label>
                <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="desc">Newest First</SelectItem>
                    <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
              </div>
              {(actionFilter !== 'all' || moduleFilter !== 'all' || severityFilter !== 'all' || successFilter !== 'all' || debouncedSearch || dateRangeFilter !== 'all') && (
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setActionFilter('all');
                      setModuleFilter('all');
                      setSeverityFilter('all');
                      setSuccessFilter('all');
                      setDateRangeFilter('all');
                      setCustomDateFrom('');
                      setCustomDateTo('');
                    }}
                    className="text-xs"
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card>
            <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Loading audit logs…
            </CardContent>
          </Card>
        ) : logs.length === 0 ? (
          /* Empty State */
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground mb-2">
                {debouncedSearch || actionFilter !== 'all' || moduleFilter !== 'all' || severityFilter !== 'all' || successFilter !== 'all' || dateRangeFilter !== 'all'
                  ? 'No audit logs match your filters'
                  : 'No audit logs recorded yet.'}
              </p>
              {(debouncedSearch || actionFilter !== 'all' || moduleFilter !== 'all' || severityFilter !== 'all' || successFilter !== 'all' || dateRangeFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setActionFilter('all');
                    setModuleFilter('all');
                    setSeverityFilter('all');
                    setSuccessFilter('all');
                    setDateRangeFilter('all');
                    setCustomDateFrom('');
                    setCustomDateTo('');
                  }}
                  className="mt-4"
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Log List */
          <div className="space-y-3">
            {logs.map((log) => (
              <LogCard key={log.id} log={log} />
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Showing{' '}
              {totalCount === 0
                ? 0
                : `${(page - 1) * pageSize + 1}-${Math.min(totalCount, (page - 1) * pageSize + logs.length)}`}{' '}
              of {totalCount} audit logs
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="audit-page-size" className="text-sm text-muted-foreground">
                Per page:
              </label>
              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger id="audit-page-size" className="w-20 h-8" aria-label="Items per page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1 || loading}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            {/* Page number buttons */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                
                if (pageNum > totalPages) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setPage(pageNum)}
                    disabled={loading}
                    aria-label={`Go to page ${pageNum}`}
                    aria-current={page === pageNum ? 'page' : undefined}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            {/* Go to page input */}
            {totalPages > 5 && (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={goToPageInput}
                  onChange={(e) => setGoToPageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleGoToPage();
                    }
                  }}
                  placeholder="Page"
                  className="w-16 h-8 text-xs"
                  aria-label="Go to page number"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={handleGoToPage}
                  disabled={loading}
                  aria-label="Go to page"
                >
                  Go
                </Button>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
              aria-label="Next page"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
                      </div>
                    </div>
      </div>
    </DashboardLayout>
  );
};

export default AuditTrailPage;
