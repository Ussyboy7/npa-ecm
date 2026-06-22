"use client";

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { ListRowCard } from '@/components/shared/ListRowCard';
import {
  correspondenceQueueBadgeClass,
  correspondenceQueueDateClass,
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueListStackClass,
  correspondenceQueueMetaIconClass,
  correspondenceQueueMetaItemClass,
  correspondenceQueueMetaRowClass,
  correspondenceQueueSubjectClass,
  registryQueueSearchStatsShellContentClass,
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from '@/components/shared/registry-queue-styles';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
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

function getSeverityVariant(severity: ActivityLog['severity']) {
  switch (severity) {
    case 'critical':
    case 'error':
      return 'destructive' as const;
    case 'warning':
      return 'default' as const;
    case 'info':
    default:
      return 'secondary' as const;
  }
}

function getActionIconForLog(action: string) {
  if (action.includes('login') || action.includes('logout')) return UserIcon;
  if (action.includes('document')) return FileText;
  if (action.includes('permission')) return Shield;
  return Activity;
}

function AuditLogRow({
  log,
  getUserName,
}: {
  log: ActivityLog;
  getUserName: (userId?: string) => string;
}) {
  const ActionIcon = getActionIconForLog(log.action);
  const isError = log.severity === 'error' || log.severity === 'critical' || !log.success;
  const leadingBg = isError
    ? 'bg-destructive/10'
    : log.severity === 'warning'
      ? 'bg-amber-500/10'
      : 'bg-primary/10';
  const leadingIcon = isError
    ? 'text-destructive'
    : log.severity === 'warning'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-primary';

  return (
    <ListRowCard
      density="compact"
      leading={
        <div className={cn(correspondenceQueueLeadingBoxClass, leadingBg)}>
          <ActionIcon className={cn(correspondenceQueueLeadingIconClass, leadingIcon)} />
        </div>
      }
    >
      <h4 className={correspondenceQueueSubjectClass}>
        {log.actionDisplay ||
          log.action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
      </h4>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          <Badge variant={getSeverityVariant(log.severity)} className={correspondenceQueueBadgeClass}>
            {log.severityDisplay || log.severity.toUpperCase()}
          </Badge>
          {log.module ? (
            <Badge variant="outline" className={correspondenceQueueBadgeClass}>
              {log.module.toUpperCase()}
            </Badge>
          ) : null}
          {log.success ? (
            <Badge
              variant="outline"
              className={cn(
                correspondenceQueueBadgeClass,
                'gap-0.5 text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400',
              )}
            >
              <CheckCircle2 className="h-2.5 w-2.5" />
              Success
            </Badge>
          ) : (
            <Badge variant="destructive" className={correspondenceQueueBadgeClass}>
              <XCircle className="h-2.5 w-2.5" />
              Failed
            </Badge>
          )}
        </div>
        <span className={correspondenceQueueDateClass}>{formatDateTime(log.timestamp)}</span>
      </div>
      <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
        <span className={correspondenceQueueMetaItemClass}>
          <UserIcon className={correspondenceQueueMetaIconClass} />
          <span className="truncate">User: {log.userName || getUserName(log.user)}</span>
        </span>
        {log.description ? (
          <span className={correspondenceQueueMetaItemClass}>
            <Activity className={correspondenceQueueMetaIconClass} />
            <span className="truncate">{log.description}</span>
          </span>
        ) : null}
        {log.objectType && log.objectRepr ? (
          <span className={correspondenceQueueMetaItemClass}>
            <FileText className={correspondenceQueueMetaIconClass} />
            <span className="truncate">
              {log.objectType}: {log.objectRepr}
            </span>
          </span>
        ) : null}
        {log.errorMessage ? (
          <span className={cn(correspondenceQueueMetaItemClass, 'text-destructive')}>
            <AlertCircle className={correspondenceQueueMetaIconClass} />
            <span className="truncate">{log.errorMessage}</span>
          </span>
        ) : null}
        {log.ipAddress ? (
          <span className={correspondenceQueueMetaItemClass}>
            <Clock className={correspondenceQueueMetaIconClass} />
            <span className="truncate">IP: {log.ipAddress}</span>
          </span>
        ) : null}
      </div>
    </ListRowCard>
  );
}

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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('timestamp');

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summaryStats, setSummaryStats] = useState<AuditSummary>(DEFAULT_SUMMARY);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [goToPageInput, setGoToPageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasActiveFilters = useMemo(() => !!(
    debouncedSearch ||
    actionFilter !== 'all' ||
    moduleFilter !== 'all' ||
    severityFilter !== 'all' ||
    successFilter !== 'all' ||
    dateFrom ||
    dateTo
  ), [debouncedSearch, actionFilter, moduleFilter, severityFilter, successFilter, dateFrom, dateTo]);

  // Debounce search
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, actionFilter, moduleFilter, severityFilter, successFilter, sortOrder, pageSize, dateFrom, dateTo]);

  // Build date range params
  const getDateRangeParams = () => {
    const params: Record<string, unknown> = {};
    if (dateFrom) params.from_date = dateFrom;
    if (dateTo) params.to_date = dateTo;
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

  // Export logs to CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch all logs for export (without pagination)
      const dateParams = getDateRangeParams();
      const params: Record<string, unknown> = {
        page: 1,
        pageSize: 10000, // Large limit for export
        ordering: sortOrder === 'desc' ? '-timestamp' : 'timestamp',
        ...dateParams,
      };
      if (actionFilter !== 'all') params.action = actionFilter;
      if (moduleFilter !== 'all') params.module = moduleFilter;
      if (severityFilter !== 'all') params.severity = severityFilter;
      if (successFilter !== 'all') params.success = successFilter === 'true';
      if (debouncedSearch) params.search = debouncedSearch;

      const data = await getActivityLogs(params);
      
      const exportData = data.results.map((log) => ({
        'Timestamp': formatDateTime(log.timestamp),
        'Action': log.action || 'N/A',
        'Module': log.module || 'N/A',
        'User': log.user || 'N/A',
        'Description': log.description || 'N/A',
        'Severity': log.severity || 'info',
        'Success': log.success ? 'Yes' : 'No',
        'IP Address': log.ipAddress || 'N/A',
        'User Agent': log.userAgent || 'N/A',
      }));

      exportToCSV(exportData, [
        { key: 'Timestamp' as keyof typeof exportData[0], label: 'Timestamp' },
        { key: 'Action' as keyof typeof exportData[0], label: 'Action' },
        { key: 'Module' as keyof typeof exportData[0], label: 'Module' },
        { key: 'User' as keyof typeof exportData[0], label: 'User' },
        { key: 'Description' as keyof typeof exportData[0], label: 'Description' },
        { key: 'Severity' as keyof typeof exportData[0], label: 'Severity' },
        { key: 'Success' as keyof typeof exportData[0], label: 'Success' },
        { key: 'IP Address' as keyof typeof exportData[0], label: 'IP Address' },
        { key: 'User Agent' as keyof typeof exportData[0], label: 'User Agent' },
      ], { filename: `audit-logs-${new Date().toISOString().split('T')[0]}.csv` });

      toast.success('Audit logs exported successfully');
    } catch (err) {
      logError('Failed to export audit logs', err);
      toast.error('Failed to export audit logs');
    } finally {
      setExporting(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, currentUser, page, pageSize, debouncedSearch, actionFilter, moduleFilter, severityFilter, successFilter, sortOrder, dateFrom, dateTo]);

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

  const clearFilters = () => {
    setSearchQuery('');
    setActionFilter('all');
    setModuleFilter('all');
    setSeverityFilter('all');
    setSuccessFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <DashboardLayout>
      {!hydrated || !currentUser ? (
        <div className="container mx-auto p-6">
          <LoadingState message="Loading audit trail…" />
        </div>
      ) : (
        <div className="container mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Audit Trail</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              Track and monitor all system activities, user actions, and security events.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <ContextualHelp
                title="Using the audit trail"
                description="Search and filter events across modules. Export filtered results as CSV from More for audits and compliance."
                steps={[
                  'Use the search box for user names, actions, descriptions, or object text.',
                  'Use the filter bar to narrow by action type, module, severity, status, or date.',
                  'Clear filters from the filter bar or empty state when no rows match.',
                ]}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="mr-2 h-4 w-4" />
                    More
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => void fetchLogs()} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExport} disabled={exporting || loading || logs.length === 0}>
                    <Download className={`h-4 w-4 mr-2 ${exporting ? 'animate-spin' : ''}`} />
                    {exporting ? 'Exporting...' : 'Export CSV'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <HelpGuideCard
          title="Workspace guide"
          description="Summary counts respect your current search and filters (except action type, which is broken out in the list). Cross-check unusual activity in User Management."
          links={[
            { label: 'User Management', href: '/admin/users-roles?tab=users' },
            { label: 'System Settings', href: '/settings' },
          ]}
        />

        <Card>
          <CardContent className={registryQueueSearchStatsShellContentClass}>
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
                  <CardContent className={registryQueueStatCardContentClass}>
                    <div className="flex items-center gap-4">
                      <div className={cn(registryQueueStatIconBoxClass, bgClass)}>
                        <Icon className={cn(registryQueueStatIconClass, iconClass)} />
                      </div>
                      <div>
                        <p className={registryQueueStatLabelClass}>{label}</p>
                        <p className={registryQueueStatValueClass}>{value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-2">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by user, action, description, object…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 pl-8 text-xs" />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="All Actions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {ACTION_TYPES.map((action) => (
                  <SelectItem key={action.value} value={action.value}>{action.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="All Modules" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {MODULES.map((module) => (
                  <SelectItem key={module.value} value={module.value}>{module.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="All Severities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                {SEVERITIES.map((severity) => (
                  <SelectItem key={severity.value} value={severity.value}>{severity.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={successFilter} onValueChange={setSuccessFilter}>
              <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Success</SelectItem>
                <SelectItem value="false">Failed</SelectItem>
              </SelectContent>
            </Select>
            <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => { const [by, order] = value.split('-'); setSortBy(by); setSortOrder(order as 'asc' | 'desc'); }}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="timestamp-desc">Newest First</SelectItem>
                <SelectItem value="timestamp-asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">Clear</Button>}
          </CardContent>
        </Card>

        {error ? (
          <ErrorState
            title="Could not load audit logs"
            message={error}
            onRetry={() => void fetchLogs()}
            retryLabel="Try again"
          />
        ) : loading ? (
          <LoadingState message="Loading audit logs…" />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={hasActiveFilters ? 'search' : 'file'}
            title={hasActiveFilters ? 'No matching events' : 'No audit logs yet'}
            message={
              hasActiveFilters
                ? 'No audit logs match your search or filters. Try clearing filters or broadening the date range.'
                : 'Activity will appear here as users interact with the system.'
            }
            actionLabel={hasActiveFilters ? 'Clear filters' : undefined}
            onAction={hasActiveFilters ? clearFilters : undefined}
            variant="dashed"
          />
        ) : (
          <div className={correspondenceQueueListStackClass}>
            {logs.map((log) => (
              <AuditLogRow key={log.id} log={log} getUserName={getUserName} />
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
    )}
  </DashboardLayout>
  );
};

export default AuditTrailPage;
