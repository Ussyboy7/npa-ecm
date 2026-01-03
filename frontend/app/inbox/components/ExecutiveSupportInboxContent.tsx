"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logError } from '@/lib/client-logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Mail,
  Search,
  Clock,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Correspondence } from '@/lib/npa-structure';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/shared/PaginationControls';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

const SLA_THRESHOLDS: Record<string, number> = {
  urgent: 2,
  high: 5,
  medium: 10,
  low: 14,
  default: 10,
};

const isOverdue = (item: Correspondence): boolean => {
  if (!item.receivedDate) return false;
  const priority = item.priority ?? 'default';
  const threshold = SLA_THRESHOLDS[priority] ?? SLA_THRESHOLDS.default;
  const received = new Date(item.receivedDate).getTime();
  const daysOpen = (Date.now() - received) / (1000 * 60 * 60 * 24);
  return daysOpen > threshold && item.status as string !== 'completed';
};

type InboxSummary = {
  total: number;
  urgent: number;
  overdue: number;
  assigned_to_user: number;
};

const DEFAULT_SUMMARY: InboxSummary = {
  total: 0,
  urgent: 0,
  overdue: 0,
  assigned_to_user: 0,
};

const ExecutiveSupportInboxContent = () => {
  const router = useRouter();
  const { currentUser, hydrated } = useCurrentUser();
  const { users: organizationUsers } = useOrganization();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [count, setCount] = useState(0);
  const pagination = usePagination({
    initialPage: 1,
    initialPageSize: 25,
    totalCount: count,
  });
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['pending', 'in-progress']);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const [inboxItems, setInboxItems] = useState<Correspondence[]>([]);
  const [summary, setSummary] = useState<InboxSummary>(DEFAULT_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch inbox items
  useEffect(() => {
    if (!hydrated || !currentUser) return;

    const fetchInbox = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (selectedStatuses.length > 0) {
          selectedStatuses.forEach((status) => params.append('status', status));
        }
        if (selectedPriorities.length > 0) {
          selectedPriorities.forEach((priority) => params.append('priority', priority));
        }
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        params.append('sort_by', sortBy);
        params.append('sort_order', sortOrder);
        params.append('page', String(pagination.page));
        params.append('page_size', String(pagination.pageSize));

        const response = await apiFetch<Record<string, unknown>>(`/correspondence/items/secretary-inbox/?${params.toString()}`);
        const results = Array.isArray(response.results) ? response.results : [];
        setInboxItems(results.map(mapApiCorrespondence));
        const summary = response.summary as Record<string, unknown> as Record<string, unknown> | undefined;
        setSummary({
          total: (summary && typeof summary.total === 'number') ? summary.total : (response.count as number as number ?? results.length),
          urgent: (summary && typeof summary.urgent === 'number') ? summary.urgent : 0,
          overdue: (summary && typeof summary.overdue === 'number') ? summary.overdue : 0,
          assigned_to_user: (summary && typeof summary.assigned_to_user === 'number') ? summary.assigned_to_user : 0,
        });
        setCount((response.count as number as number) ?? results.length);
      } catch (err: unknown) {
        logError('Failed to fetch executive support inbox:', err);
        setError((err instanceof Error ? err.message : 'Failed to load executive support inbox'));
        setInboxItems([]);
        setSummary(DEFAULT_SUMMARY);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    void fetchInbox();
  }, [
    hydrated,
    currentUser,
    debouncedSearch,
    selectedStatuses,
    selectedPriorities,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    pagination.page,
    pagination.pageSize,
  ]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStatuses.length > 0 && selectedStatuses.length < 4) count++;
    if (selectedPriorities.length > 0) count++;
    if (dateFrom || dateTo) count++;
    return count;
  }, [selectedStatuses, selectedPriorities, dateFrom, dateTo]);

  const getPriorityColor = (priority: string) => {
    return PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in-progress':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (!hydrated || !currentUser) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Help Guide */}
      <HelpGuideCard
        title="Executive Support Inbox"
        description="Correspondence where you have acted on behalf of executives. This helps you track and manage your executive support activities."
        links={[
          { label: 'Inbox Help', href: '/help' },
        ]}
        dismissible
        dismissKey="executive-support-inbox-guide"
      />

      {/* Header with Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search correspondence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          <ContextualHelp
            title="Executive Support Inbox"
            description="This inbox shows correspondence where you have acted on behalf of executives. Use filters to find specific items."
            steps={[
              'View correspondence where you have taken actions as a secretary',
              'Filter by status, priority, or date range',
              'Click on any item to view details and take further actions',
            ]}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Urgent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary.urgent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summary.overdue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {inboxItems.filter((item) => item.status as string === 'pending' || item.status as string === 'in-progress').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={selectedStatuses.join(',')}
                  onValueChange={(value) => setSelectedStatuses(value ? value.split(',') : [])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={selectedPriorities.join(',')}
                  onValueChange={(value) => setSelectedPriorities(value ? value.split(',') : [])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Date To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedStatuses(['pending', 'in-progress']);
                  setSelectedPriorities([]);
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inbox Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Executive Support Correspondence ({count})</CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Sort by:</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="days_pending">Days Pending</SelectItem>
                  <SelectItem value="updated">Last Updated</SelectItem>
                  <SelectItem value="reference">Reference</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              {error}
            </div>
          ) : inboxItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No executive support correspondence</p>
              <p className="text-sm mt-2">
                Correspondence where you have acted on behalf of executives will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {inboxItems.map((item) => (
                  <Link
                    key={item.id as string}
                    href={`/correspondence/${item.id as string}`}
                    className="block"
                  >
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-medium">
                                {item.referenceNumber}
                              </span>
                              <Badge variant={getStatusBadgeVariant(item.status as string)}>
                                {item.status as string.replace('-', ' ').toUpperCase()}
                              </Badge>
                              {item.priority && (
                                <Badge
                                  variant="outline"
                                  style={{
                                    borderColor: getPriorityColor(item.priority),
                                    color: getPriorityColor(item.priority),
                                  }}
                                >
                                  {item.priority.toUpperCase()}
                                </Badge>
                              )}
                              {isOverdue(item) && (
                                <Badge variant="destructive">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Overdue
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-foreground line-clamp-2">
                              {item.subject}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {item.receivedDate && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDateShort(item.receivedDate)}
                                </div>
                              )}
                              {item.senderName && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {item.senderName}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {count > 0 && (
                <PaginationControls
                  pagination={pagination}
                  showPageSizeSelector={true}
                  showGoToPage={true}
                  className="border-t border-border/60 pt-4 mt-4"
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExecutiveSupportInboxContent;

