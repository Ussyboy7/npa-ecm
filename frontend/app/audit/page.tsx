"use client";

import { logError } from '@/lib/client-logger';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getActivityLogs, type ActivityLog } from '@/lib/audit-storage';
import { formatDateTime } from '@/lib/correspondence-helpers';
import { Search, Filter, Download, Activity } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';

export default function AuditTrailPage() {
  const { currentUser } = useCurrentUser();
  const { users } = useOrganization();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    objectType: '',
    module: '',
    severity: '',
    success: '',
    search: '',
  });

  useEffect(() => {
    loadLogs();
  }, [filters]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.action) params.action = filters.action;
      if (filters.objectType) params.objectType = filters.objectType;
      if (filters.module) params.module = filters.module;
      if (filters.severity) params.severity = filters.severity;
      if (filters.success !== '') params.success = filters.success === 'true';
      if (filters.search) params.search = filters.search;

      const data = await getActivityLogs(params);
      setLogs(data);
    } catch (error) {
      logError('Failed to load audit logs', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (userId?: string) => {
    if (!userId) return 'System';
    const user = users.find((u) => u.id === userId);
    return user?.name || userId;
  };

  const getSeverityColor = (severity: ActivityLog['severity']) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const actionTypes = [
    'document_created',
    'document_updated',
    'document_deleted',
    'document_viewed',
    'document_downloaded',
    'document_shared',
    'correspondence_created',
    'correspondence_routed',
    'correspondence_approved',
    'user_login',
    'user_logout',
    'permission_granted',
    'permission_revoked',
  ];

  const modules = ['dms', 'correspondence', 'accounts', 'workflow', 'system'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Audit Trail</h1>
          <p className="text-muted-foreground">Comprehensive activity log for all system actions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter audit logs by various criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-8"
                />
              </div>
              <Select value={filters.action} onValueChange={(value) => setFilters({ ...filters, action: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Actions</SelectItem>
                  {actionTypes.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.objectType}
                onValueChange={(value) => setFilters({ ...filters, objectType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Object Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="correspondence">Correspondence</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.module} onValueChange={(value) => setFilters({ ...filters, module: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Modules</SelectItem>
                  {modules.map((module) => (
                    <SelectItem key={module} value={module}>
                      {module.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.severity}
                onValueChange={(value) => setFilters({ ...filters, severity: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Severities</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.success}
                onValueChange={(value) => setFilters({ ...filters, success: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="true">Success</SelectItem>
                  <SelectItem value="false">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Logs
            </CardTitle>
            <CardDescription>
              {logs.length} log{logs.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading audit logs...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No audit logs found</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="divide-y">
                  {logs.map((log) => (
                    <div key={log.id} className="p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={getSeverityColor(log.severity)} className="text-xs">
                              {log.severityDisplay}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {log.actionDisplay}
                            </Badge>
                            {log.module && (
                              <Badge variant="secondary" className="text-xs">
                                {log.module.toUpperCase()}
                              </Badge>
                            )}
                            {log.success ? (
                              <Badge variant="outline" className="text-xs text-green-600">
                                Success
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                Failed
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(log.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{getUserName(log.user)}</span>
                            {log.objectType && log.objectRepr && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-sm text-muted-foreground">
                                  {log.objectType}: {log.objectRepr}
                                </span>
                              </>
                            )}
                          </div>
                          {log.description && (
                            <p className="text-sm text-muted-foreground mb-1">{log.description}</p>
                          )}
                          {log.errorMessage && (
                            <p className="text-sm text-red-600 dark:text-red-400">{log.errorMessage}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                            {log.userAgent && (
                              <span className="truncate max-w-xs" title={log.userAgent}>
                                {log.userAgent}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
