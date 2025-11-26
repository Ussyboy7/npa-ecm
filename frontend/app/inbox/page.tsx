"use client";

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import {
  Inbox,
  Search,
  Mail,
  Clock,
  AlertCircle,
  User as UserIcon,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { Correspondence } from '@/lib/npa-structure';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

const calculateDaysPending = (item: Correspondence): number => {
  if (!item.receivedDate) return 0;
  const received = new Date(item.receivedDate).getTime();
  return Math.floor((Date.now() - received) / (1000 * 60 * 60 * 24));
};

const ExecutiveInbox = () => {
  const router = useRouter();
  const { currentUser, hydrated } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [goToPageInput, setGoToPageInput] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['pending', 'in-progress']);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  
  const [inboxItems, setInboxItems] = useState<Correspondence[]>([]);
  const [summary, setSummary] = useState({ total: 0, urgent: 0, overdue: 0, pending: 0, inProgress: 0 });
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStatuses.length > 0 && !(selectedStatuses.length === 2 && selectedStatuses.includes('pending') && selectedStatuses.includes('in-progress'))) count++;
    if (selectedPriorities.length > 0) count++;
    return count;
  }, [selectedStatuses, selectedPriorities]);

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) => prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]);
  };

  const togglePriority = (priority: string) => {
    setSelectedPriorities((prev) => prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]);
  };

  const clearAllFilters = () => {
    setSelectedStatuses(['pending', 'in-progress']);
    setSelectedPriorities([]);
    setSearchQuery('');
  };

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedStatuses, selectedPriorities, sortBy, sortOrder, pageSize]);

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
        params.append('sort_by', sortBy);
        params.append('sort_order', sortOrder);
        params.append('page', String(page));
        params.append('page_size', String(pageSize));

        const response = await apiFetch<any>(`/correspondence/items/my-inbox/?${params.toString()}`);
        const results = Array.isArray(response.results) ? response.results : [];
        setInboxItems(results.map(mapApiCorrespondence));
        setSummary({
          total: response.summary?.total ?? response.count ?? results.length,
          urgent: response.summary?.urgent ?? 0,
          overdue: response.summary?.overdue ?? 0,
          pending: response.summary?.pending ?? 0,
          inProgress: response.summary?.in_progress ?? 0,
        });
        setCount(response.count ?? results.length);
      } catch (err) {
        setError('Failed to load inbox. Please try again.');
        setInboxItems([]);
        setSummary({ total: 0, urgent: 0, overdue: 0, pending: 0, inProgress: 0 });
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    void fetchInbox();
  }, [hydrated, currentUser, debouncedSearch, selectedStatuses, selectedPriorities, sortBy, sortOrder, page, pageSize]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      default: return 'secondary';
    }
  };

  const pageCount = Math.max(1, Math.ceil(count / pageSize));

  const handleGoToPage = () => {
    const pageNum = parseInt(goToPageInput, 10);
    if (pageNum >= 1 && pageNum <= pageCount) {
      setPage(pageNum);
      setGoToPageInput('');
    }
  };

  if (!hydrated) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading inbox…</CardContent></Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentUser) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <HelpGuideCard title="Select a persona" description="Use the Role Switcher to choose a user context before viewing your inbox." links={[{ label: 'Role Switcher', href: '/settings' }]} />
        </div>
      </DashboardLayout>
    );
  }

  const ItemCard = ({ corr }: { corr: Correspondence }) => {
    const daysPending = calculateDaysPending(corr);
    const statusBadge = corr.status === 'pending' ? { label: 'Awaiting action', variant: 'warning' as const } : corr.status === 'in-progress' ? { label: 'In progress', variant: 'info' as const } : { label: corr.status, variant: 'outline' as const };
    const statusBadgeVariant: 'destructive' | 'secondary' | 'default' | 'outline' = statusBadge.variant === 'warning' ? 'destructive' : statusBadge.variant === 'info' ? 'secondary' : 'outline';
    const daysPendingColor = daysPending > 5 ? 'destructive' : daysPending > 2 ? 'default' : 'secondary';

    return (
      <div onClick={() => router.push(`/correspondence/${corr.id}`)} className="p-4 border border-border rounded-lg hover:bg-muted/50 hover:shadow-soft transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant={getPriorityColor(corr.priority)}>{corr.priority.toUpperCase()}</Badge>
              <Badge variant="outline" className="gap-1">{corr.direction === 'downward' ? '↓ Downward' : '↑ Upward'}</Badge>
              <Badge variant={statusBadgeVariant} className={statusBadge.variant === 'warning' ? 'bg-warning/10 text-warning gap-1' : statusBadge.variant === 'info' ? 'bg-info/10 text-info gap-1' : 'gap-1'}>
                <Clock className="h-3 w-3" />{statusBadge.label}
              </Badge>
              {daysPending > 0 && <Badge variant={daysPendingColor} className="gap-1"><Clock className="h-3 w-3" />{daysPending} day{daysPending !== 1 ? 's' : ''} pending</Badge>}
            </div>
            <h4 className="font-semibold text-foreground mb-2">{corr.subject}</h4>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateShort(corr.receivedDate)}</span>
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /><span>Ref: {corr.referenceNumber}</span></div>
          <div className="flex items-center gap-2"><UserIcon className="h-3.5 w-3.5" /><span>From: {corr.senderName}</span></div>
          {corr.currentOfficeName && <div className="flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5" /><span>Office: {corr.currentOfficeName}</span></div>}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">My Inbox</h1>
            <p className="text-muted-foreground mt-1">All correspondence requiring your attention</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" /> Filters
              {activeFilterCount > 0 && <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>}
            </Button>
          </div>
        </div>

        <HelpGuideCard
          title="Focus on Your Assignments"
          description="This inbox narrows the correspondence list to items routed directly to you or your division. Scan priority, direction, and arrival date, then drill into a record to minute, approve, or delegate."
          links={[{ label: 'Correspondence Inbox', href: '/correspondence/inbox' }, { label: 'Help & Guides', href: '/help' }]}
        />

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Inbox Filters</CardTitle>
                {activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={clearAllFilters}>Clear All</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Status</Label>
                  <div className="flex flex-wrap gap-1">
                    {['pending', 'in-progress', 'completed'].map((status) => (
                      <Badge key={status} variant={selectedStatuses.includes(status) ? 'default' : 'outline'} className="cursor-pointer capitalize text-xs" onClick={() => toggleStatus(status)}>
                        {status.replace('-', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Priority</Label>
                  <div className="flex flex-wrap gap-1">
                    {['urgent', 'high', 'medium', 'low'].map((priority) => (
                      <Badge key={priority} variant={selectedPriorities.includes(priority) ? 'default' : 'outline'} className="cursor-pointer capitalize text-xs" onClick={() => togglePriority(priority)} style={selectedPriorities.includes(priority) ? { backgroundColor: PRIORITY_COLORS[priority] } : {}}>
                        {priority}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium mb-2 block">Sort By</Label>
                  <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => { const [by, order] = value.split('-'); setSortBy(by); setSortOrder(order as 'asc' | 'desc'); }}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="priority-desc">Priority (Urgent First)</SelectItem>
                      <SelectItem value="days_pending-desc">Days Pending (Oldest)</SelectItem>
                      <SelectItem value="updated-desc">Last Updated (Newest)</SelectItem>
                      <SelectItem value="updated-asc">Last Updated (Oldest)</SelectItem>
                      <SelectItem value="reference-asc">Reference (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by subject, reference, sender, office..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Items Awaiting You', value: summary.total, Icon: Inbox, badgeClass: 'bg-primary/10', iconClass: 'text-primary' },
            { label: 'Pending', value: summary.pending, Icon: AlertCircle, badgeClass: 'bg-warning/10', iconClass: 'text-warning' },
            { label: 'In Progress', value: summary.inProgress, Icon: Mail, badgeClass: 'bg-info/10', iconClass: 'text-info' },
            { label: 'Urgent', value: summary.urgent, Icon: Clock, badgeClass: 'bg-destructive/10', iconClass: 'text-destructive' },
          ].map(({ label, value, Icon, badgeClass, iconClass }) => (
            <Card key={label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${badgeClass}`}><Icon className={`h-6 w-6 ${iconClass}`} /></div>
                  <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {error && <Card><CardContent className="py-4 text-sm text-destructive">{error}</CardContent></Card>}

        {loading ? (
          <Card><CardContent className="py-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" /><p className="text-sm text-muted-foreground">Loading inbox...</p></CardContent></Card>
        ) : inboxItems.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Inbox className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-2">No items in your inbox</p>
              <p className="text-xs text-muted-foreground">{debouncedSearch || activeFilterCount > 0 ? 'Try adjusting your filters' : 'All caught up! No correspondence requires your attention.'}</p>
              {(debouncedSearch || activeFilterCount > 0) && <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4">Clear Filters</Button>}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">{inboxItems.map(corr => <ItemCard key={corr.id} corr={corr} />)}</div>
        )}

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">Showing {count === 0 ? 0 : `${(page - 1) * pageSize + 1}-${Math.min(count, (page - 1) * pageSize + inboxItems.length)}`} of {count} items</p>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Per page:</label>
              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1 || loading}><ChevronLeft className="h-4 w-4" />Previous</Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                let pageNum: number;
                if (pageCount <= 5) pageNum = i + 1;
                else if (page <= 3) pageNum = i + 1;
                else if (page >= pageCount - 2) pageNum = pageCount - 4 + i;
                else pageNum = page - 2 + i;
                if (pageNum > pageCount) return null;
                return <Button key={pageNum} variant={page === pageNum ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setPage(pageNum)} disabled={loading}>{pageNum}</Button>;
              })}
            </div>
            {pageCount > 5 && (
              <div className="flex items-center gap-1">
                <Input type="number" min={1} max={pageCount} value={goToPageInput} onChange={(e) => setGoToPageInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleGoToPage(); }} placeholder="Page" className="w-16 h-8 text-xs" />
                <Button variant="outline" size="sm" className="h-8" onClick={handleGoToPage} disabled={loading}>Go</Button>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))} disabled={page >= pageCount || loading}>Next<ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ExecutiveInbox;
