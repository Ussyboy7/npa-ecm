"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Activity, Download as DownloadIcon, Eye, Filter, RefreshCw, Search, ArrowUpDown, Loader2, MoreVertical, ExternalLink } from 'lucide-react';
import { formatDateTime } from '@/lib/correspondence-helpers';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import type { DocumentAccessLog } from '@/lib/dms-storage';
import type { User } from '@/lib/npa-structure';

interface AccessActivityCardProps {
  documentId: string;
  accessLogs: DocumentAccessLog[];
  userLookup: Map<string, User>;
  getUserInitials: (userId: string) => string;
  onViewActivityDetails?: (log: DocumentAccessLog) => void;
  onRefresh?: () => Promise<void>;
  isLoading?: boolean;
}

type SortOption = 'recent' | 'oldest' | 'user' | 'action';

export const AccessActivityCard = ({
  documentId,
  accessLogs,
  userLookup,
  getUserInitials,
  onViewActivityDetails,
  onRefresh,
  isLoading = false,
}: AccessActivityCardProps) => {
  // Load filter state from localStorage
  const loadFilterState = () => {
    if (typeof window === 'undefined') return { filter: 'all', dateFilter: 'all', search: '', sort: 'recent' as SortOption };
    const stored = localStorage.getItem(`access-activity-filters-${documentId}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { filter: 'all', dateFilter: 'all', search: '', sort: 'recent' as SortOption };
      }
    }
    return { filter: 'all', dateFilter: 'all', search: '', sort: 'recent' as SortOption };
  };

  const initialState = loadFilterState();
  const [accessLogFilter, setAccessLogFilter] = useState<'all' | 'view' | 'download' | 'attempted-download'>(initialState.filter);
  const [accessLogDateFilter, setAccessLogDateFilter] = useState<'all' | 'today' | 'week' | 'month'>(initialState.dateFilter);
  const [searchQuery, setSearchQuery] = useState(initialState.search);
  const [sortOption, setSortOption] = useState<SortOption>(initialState.sort);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);

  const getDisplayUserName = (log: DocumentAccessLog): string =>
    userLookup.get(log.userId)?.name || log.userName || 'Unknown';

  const getDisplayUserInitials = (log: DocumentAccessLog): string => {
    const fallbackFromLookup = getUserInitials(log.userId);
    if (fallbackFromLookup && fallbackFromLookup !== '?') return fallbackFromLookup;
    const name = getDisplayUserName(log);
    if (!name || name === 'Unknown') return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Persist filter state to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      `access-activity-filters-${documentId}`,
      JSON.stringify({
        filter: accessLogFilter,
        dateFilter: accessLogDateFilter,
        search: searchQuery,
        sort: sortOption,
      })
    );
  }, [documentId, accessLogFilter, accessLogDateFilter, searchQuery, sortOption]);

  const handleExport = () => {
    // Properly escape CSV values
    const escapeCsvValue = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csv = [
      ['User', 'Action', 'Sensitivity', 'Timestamp'].map(escapeCsvValue).join(','),
      ...filtered.map((log) => {
        const userName = getDisplayUserName(log);
        return [
          escapeCsvValue(userName),
          escapeCsvValue(log.action),
          escapeCsvValue(log.sensitivity || 'N/A'),
          escapeCsvValue(log.timestamp),
        ].join(',');
      }),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `document-access-logs-${documentId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Access logs exported');
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
      toast.success('Access logs refreshed');
      } catch (_error: unknown) {
      toast.error('Failed to refresh access logs');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleViewClick = (log: DocumentAccessLog) => {
    if (onViewActivityDetails) {
      onViewActivityDetails(log);
    }
  };

  // Filter and sort logs
  const filtered = useMemo(() => {
    const now = new Date();
    let result = accessLogs.filter((log) => {
      // Action filter
      if (accessLogFilter !== 'all' && log.action !== accessLogFilter) return false;

      // Date filter
      if (accessLogDateFilter !== 'all') {
        const logDate = new Date(log.timestamp);
        const diffMs = now.getTime() - logDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (accessLogDateFilter === 'today' && diffDays >= 1) return false;
        if (accessLogDateFilter === 'week' && diffDays >= 7) return false;
        if (accessLogDateFilter === 'month' && diffDays >= 30) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const userName = getDisplayUserName(log).toLowerCase();
        const searchLower = searchQuery.toLowerCase();
        if (!userName.includes(searchLower)) return false;
      }

      return true;
    });

    // Sort logs
    result = [...result].sort((a, b) => {
      switch (sortOption) {
        case 'recent':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'oldest':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'user': {
          const userA = getDisplayUserName(a);
          const userB = getDisplayUserName(b);
          return userA.localeCompare(userB);
        }
        case 'action':
          return a.action.localeCompare(b.action);
        default:
          return 0;
      }
    });

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessLogs, accessLogFilter, accessLogDateFilter, searchQuery, sortOption]);

  // Calculate statistics from filtered logs
  const stats = useMemo(() => {
    return {
      views: filtered.filter((l) => l.action === 'view').length,
      downloads: filtered.filter((l) => l.action === 'download').length,
      attempted: filtered.filter((l) => l.action === 'attempted-download').length,
      users: new Set(filtered.map((l) => l.userId)).size,
    };
  }, [filtered]);

  // Format relative time
  const formatRelativeTime = (timestamp: string): string => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return formatDateTime(timestamp);
    }
  };

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Access Activity
              </CardTitle>
              <CardDescription className="mt-1">Recent views and download attempts</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {accessLogs.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {filtered.length} {filtered.length === 1 ? 'log' : 'logs'}
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    aria-label="Access activity options"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onRefresh && (
                    <DropdownMenuItem
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Refresh
                    </DropdownMenuItem>
                  )}
                  {accessLogs.length > 0 && (
                    <>
                      {onRefresh && <DropdownMenuSeparator />}
                      <DropdownMenuItem onClick={handleExport}>
                        <DownloadIcon className="h-3.5 w-3.5 mr-2" />
                        Export CSV
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground">Views</p>
                <p className="text-sm font-semibold">{stats.views}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Downloads</p>
                <p className="text-sm font-semibold">{stats.downloads}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Attempted</p>
                <p className="text-sm font-semibold">{stats.attempted}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Users</p>
                <p className="text-sm font-semibold">{stats.users}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs"
              onClick={() => setLogsDialogOpen(true)}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Activity Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Access Activity Logs</DialogTitle>
            <DialogDescription>
              {filtered.length} {filtered.length === 1 ? 'log' : 'logs'} for this document
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-3 overflow-y-auto">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-sm pl-7"
              />
            </div>
            {/* Filter Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={accessLogFilter}
                onValueChange={(value) => setAccessLogFilter(value as 'all' | 'view' | 'download' | 'attempted-download')}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="view">Views Only</SelectItem>
                  <SelectItem value="download">Downloads Only</SelectItem>
                  <SelectItem value="attempted-download">Attempted Downloads</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={accessLogDateFilter}
                onValueChange={(value) => setAccessLogDateFilter(value as 'all' | 'today' | 'week' | 'month')}
              >
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortOption}
                onValueChange={(value) => setSortOption(value as SortOption)}
              >
                <SelectTrigger className="w-36 h-8 text-xs">
                  <div className="flex items-center gap-1">
                    <ArrowUpDown className="h-3 w-3" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="user">By User</SelectItem>
                  <SelectItem value="action">By Action</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Logs Table */}
            <div className="space-y-1.5">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Loader2 className="h-6 w-6 text-muted-foreground mb-2 animate-spin" />
                  <p className="text-xs text-muted-foreground">Loading access logs...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  {accessLogs.length === 0 ? (
                    <>
                      <Activity className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                      <p className="text-xs font-medium text-muted-foreground mb-1">No access activity yet</p>
                      <p className="text-[10px] text-muted-foreground">Access logs will appear here when users view or download this document.</p>
                    </>
                  ) : (
                    <>
                      <Filter className="h-6 w-6 text-muted-foreground mb-2" />
                      <p className="text-xs font-medium text-muted-foreground mb-1">No logs match your filters</p>
                      <p className="text-[10px] text-muted-foreground">Try adjusting your filters or search query.</p>
                      {(accessLogFilter !== 'all' || accessLogDateFilter !== 'all' || searchQuery.trim()) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs mt-2"
                          onClick={() => {
                            setAccessLogFilter('all');
                            setAccessLogDateFilter('all');
                            setSearchQuery('');
                          }}
                        >
                          Clear filters
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                filtered.map((log) => {
                  const userName = getDisplayUserName(log);
                  const actionIcon = log.action === 'download' ? DownloadIcon : Eye;
                  const actionLabel =
                    log.action === 'download'
                      ? 'Downloaded'
                      : log.action === 'attempted-download'
                        ? 'Attempted'
                        : 'Viewed';
                  const actionVariant =
                    log.action === 'download'
                      ? 'default'
                      : log.action === 'attempted-download'
                        ? 'destructive'
                        : 'secondary';

                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-2.5 p-2.5 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {actionIcon === DownloadIcon ? (
                          <DownloadIcon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        ) : (
                          <button
                            onClick={() => handleViewClick(log)}
                            className="p-0.5 hover:bg-muted rounded transition-colors cursor-pointer"
                            title="View activity details"
                          >
                            <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-primary flex-shrink-0" />
                          </button>
                        )}
                        <Avatar className="h-5 w-5 flex-shrink-0">
                          <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                            {getDisplayUserInitials(log)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium truncate">{userName}</span>
                        <Badge variant={actionVariant} className="text-[10px] px-1.5 py-0 h-4">
                          {actionLabel}
                        </Badge>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap cursor-help">
                            {formatRelativeTime(log.timestamp)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{formatDateTime(log.timestamp)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

