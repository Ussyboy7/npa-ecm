"use client";

import { useMemo, useState, useEffect } from 'react';
import { fetchSLATargets } from '@/lib/sla-client';
import { logError } from '@/lib/client-logger';
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
  Shield,
  FileText,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { Correspondence } from '@/lib/npa-structure';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';
import { getSharedDocuments, type DocumentRecord } from '@/lib/dms-storage';
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

// Calculate days pending and SLA status
const calculateDaysPending = (item: Correspondence, slaTargets?: { urgent: number; high: number; medium: number; low: number }): number => {
  if (!item.receivedDate) return 0;
  
  const received = new Date(item.receivedDate).getTime();
  const daysSinceReceived = Math.floor((Date.now() - received) / (1000 * 60 * 60 * 24));
  
  return daysSinceReceived;
};

// Calculate SLA status (overdue, due-soon, pending) - targets are in hours
const calculateSLAStatus = (
  item: Correspondence,
  slaTargets?: { urgent: number; high: number; medium: number; low: number }
): { status: 'overdue' | 'due-soon' | 'pending'; daysOverdue?: number; daysUntilDue?: number } => {
  if (!item.receivedDate || !slaTargets) {
    return { status: 'pending' };
  }

  const received = new Date(item.receivedDate).getTime();
  const now = Date.now();
  const priority = item.priority?.toLowerCase() || 'medium';
  const targetHours = slaTargets[priority as keyof typeof slaTargets] || slaTargets.medium;
  const dueDate = received + (targetHours * 60 * 60 * 1000); // targetHours is in hours, convert to milliseconds
  const diffHours = (dueDate - now) / (1000 * 60 * 60); // Difference in hours
  const diffDays = Math.floor(diffHours / 24); // Convert to days for display

  if (diffDays < 0) {
    return { status: 'overdue', daysOverdue: Math.abs(diffDays) };
  } else if (diffDays <= 2) {
    return { status: 'due-soon', daysUntilDue: diffDays };
  } else {
    return { status: 'pending', daysUntilDue: diffDays };
  }
};

interface PendingApproval {
  id: string;
  correspondenceId: string;
  correspondence?: {
    id: string;
    subject: string;
    reference_number: string;
  };
  due_date?: string;
  created_at: string;
}

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
  const [sharedDocuments, setSharedDocuments] = useState<DocumentRecord[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [summary, setSummary] = useState({ total: 0, urgent: 0, overdue: 0, pending: 0, inProgress: 0, dueSoon: 0 });
  const [documentCount, setDocumentCount] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slaTargets, setSlaTargets] = useState<{ urgent: number; high: number; medium: number; low: number } | null>(null);
  const [focusOnTasks, setFocusOnTasks] = useState(false);

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

  // Load SLA targets on mount
  useEffect(() => {
    const loadSLATargets = async () => {
      try {
        const targets = await fetchSLATargets();
        setSlaTargets(targets);
      } catch (err) {
        logError('Failed to load SLA targets', err);
        // Use defaults if API fails
        setSlaTargets({ urgent: 2, high: 3, medium: 5, low: 7 });
      }
    };
    void loadSLATargets();
  }, []);

  useEffect(() => {
    if (!hydrated || !currentUser) return;

    const fetchInbox = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch correspondence
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

        const [corrResponse, docsResponse, approvalsResponse] = await Promise.all([
          apiFetch<Record<string, unknown>>(`/correspondence/items/my-inbox/?${params.toString()}`),
          getSharedDocuments(currentUser.id, {
            search: debouncedSearch || undefined,
            pageSize: 50, // Get recent shared documents
          }),
          apiFetch<Record<string, unknown>>('/correspondence/minutes/pending-approvals/?page_size=100').catch(() => ({ results: [] })),
        ]);

        const corrResults = Array.isArray(corrResponse.results) ? corrResponse.results : [];
        const mappedItems = corrResults.map(mapApiCorrespondence);
        setInboxItems(mappedItems);
        
        // Calculate SLA statistics
        const slaStats = mappedItems.reduce((acc, item) => {
          const slaStatus = calculateSLAStatus(item, slaTargets || undefined);
          if (slaStatus.status === 'overdue') acc.overdue++;
          if (slaStatus.status === 'due-soon') acc.dueSoon++;
          return acc;
        }, { overdue: 0, dueSoon: 0 });

        setSummary({
          total: corrResponse.summary?.total ?? corrResponse.count ?? corrResults.length,
          urgent: corrResponse.summary?.urgent ?? 0,
          overdue: slaStats.overdue,
          pending: corrResponse.summary?.pending ?? 0,
          inProgress: corrResponse.summary?.in_progress ?? 0,
          dueSoon: slaStats.dueSoon,
        });
        setCount(corrResponse.count ?? corrResults.length);

        // Set shared documents
        setSharedDocuments(docsResponse.results || []);
        setDocumentCount(docsResponse.count || 0);

        // Set pending approvals
        const approvals = Array.isArray(approvalsResponse.results) ? approvalsResponse.results : [];
        setPendingApprovals(approvals);
      } catch (err) {
        setError('Failed to load inbox. Please try again.');
        setInboxItems([]);
        setSharedDocuments([]);
        setPendingApprovals([]);
        setSummary({ total: 0, urgent: 0, overdue: 0, pending: 0, inProgress: 0, dueSoon: 0 });
        setCount(0);
        setDocumentCount(0);
      } finally {
        setLoading(false);
      }
    };

    void fetchInbox();
  }, [hydrated, currentUser, debouncedSearch, selectedStatuses, selectedPriorities, sortBy, sortOrder, page, pageSize, slaTargets]);

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

  // Type guard for status badge variant
  const getStatusBadgeVariant = (status: string): 'destructive' | 'secondary' | 'default' | 'outline' => {
    if (status === 'pending') return 'destructive';
    if (status === 'in-progress') return 'secondary';
    return 'outline';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'pending') return { label: 'Awaiting action', variant: 'destructive' as const };
    if (status === 'in-progress') return { label: 'In progress', variant: 'secondary' as const };
    return { label: status, variant: 'outline' as const };
  };

  const ItemCard = ({ corr, showSLA = true }: { corr: Correspondence; showSLA?: boolean }) => {
    const daysPending = calculateDaysPending(corr, slaTargets || undefined);
    const statusBadge = getStatusBadge(corr.status);
    const statusBadgeVariant = getStatusBadgeVariant(corr.status);
    const slaStatus = showSLA ? calculateSLAStatus(corr, slaTargets || undefined) : null;

    return (
      <div onClick={() => router.push(`/correspondence/${corr.id}`)} className="p-4 border border-border rounded-lg hover:bg-muted/50 hover:shadow-soft transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="outline" className="gap-1"><Mail className="h-3 w-3" />Correspondence</Badge>
              <Badge variant={getPriorityColor(corr.priority)}>{corr.priority.toUpperCase()}</Badge>
              <Badge variant="outline" className="gap-1">{corr.direction === 'downward' ? '↓ Downward' : '↑ Upward'}</Badge>
              <Badge variant={statusBadgeVariant} className={statusBadge.variant === 'warning' ? 'bg-warning/10 text-warning gap-1' : statusBadge.variant === 'info' ? 'bg-info/10 text-info gap-1' : 'gap-1'}>
                <Clock className="h-3 w-3" />{statusBadge.label}
              </Badge>
              {slaStatus && slaStatus.status === 'overdue' && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Overdue {slaStatus.daysOverdue} day{slaStatus.daysOverdue !== 1 ? 's' : ''}
                </Badge>
              )}
              {slaStatus && slaStatus.status === 'due-soon' && (
                <Badge variant="default" className="bg-orange-500 hover:bg-orange-600 gap-1">
                  <Clock className="h-3 w-3" />
                  Due in {slaStatus.daysUntilDue} day{slaStatus.daysUntilDue !== 1 ? 's' : ''}
                </Badge>
              )}
              {!slaStatus && daysPending > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />{daysPending} day{daysPending !== 1 ? 's' : ''} pending
                </Badge>
              )}
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

  const ApprovalCard = ({ approval }: { approval: PendingApproval }) => {
    const approvalStatus = approval.due_date ? calculateTaskStatus(approval.due_date) : { status: 'pending' as const };
    
    return (
      <div onClick={() => router.push(`/correspondence/${approval.correspondenceId || approval.correspondence?.id}`)} className="p-4 border border-border rounded-lg hover:bg-muted/50 hover:shadow-soft transition-all cursor-pointer bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="outline" className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                <Shield className="h-3 w-3" />Pending Approval
              </Badge>
              {approvalStatus.status === 'overdue' && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Overdue {approvalStatus.daysOverdue} day{approvalStatus.daysOverdue !== 1 ? 's' : ''}
                </Badge>
              )}
              {approvalStatus.status === 'due-soon' && (
                <Badge variant="default" className="bg-orange-500 hover:bg-orange-600 gap-1">
                  <Clock className="h-3 w-3" />
                  Due in {approvalStatus.daysUntilDue} day{approvalStatus.daysUntilDue !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <h4 className="font-semibold text-foreground mb-2">
              {approval.correspondence?.subject || 'Pending Approval'}
            </h4>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDateShort(approval.created_at)}
          </span>
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          {approval.correspondence?.reference_number && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              <span>Ref: {approval.correspondence.reference_number}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const calculateTaskStatus = (dueDate: string): { status: 'overdue' | 'due-soon' | 'pending'; daysOverdue?: number; daysUntilDue?: number } => {
    const due = new Date(dueDate).getTime();
    const now = Date.now();
    const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { status: 'overdue', daysOverdue: Math.abs(diffDays) };
    } else if (diffDays <= 2) {
      return { status: 'due-soon', daysUntilDue: diffDays };
    } else {
      return { status: 'pending', daysUntilDue: diffDays };
    }
  };

  const DocumentCard = ({ doc }: { doc: DocumentRecord }) => {
    const sharedDate = doc.permissions[0]?.createdAt || doc.updatedAt;
    
    return (
      <div onClick={() => router.push(`/dms/${doc.id}`)} className="p-4 border border-border rounded-lg hover:bg-muted/50 hover:shadow-soft transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="outline" className="gap-1"><FileText className="h-3 w-3" />Document</Badge>
              <Badge variant="secondary">{doc.documentType}</Badge>
              <Badge variant={doc.status === 'published' ? 'default' : 'outline'}>{doc.status}</Badge>
            </div>
            <h4 className="font-semibold text-foreground mb-2">{doc.title}</h4>
            {doc.description && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{doc.description}</p>
            )}
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateShort(sharedDate)}</span>
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" /><span>Type: {doc.documentType}</span></div>
          {doc.referenceNumber && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /><span>Ref: {doc.referenceNumber}</span></div>}
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
            <p className="text-muted-foreground mt-1">
              {focusOnTasks ? 'Tasks requiring your attention' : 'Correspondence and documents shared with you'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={focusOnTasks ? "default" : "outline"} 
              size="sm" 
              onClick={() => setFocusOnTasks(!focusOnTasks)}
            >
              {focusOnTasks ? (
                <>
                  <Inbox className="h-4 w-4 mr-2" /> Show All
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" /> Focus on Tasks
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" /> Filters
              {activeFilterCount > 0 && <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>}
            </Button>
          </div>
        </div>

        <HelpGuideCard
          title="Your Personal Inbox"
          description="Items requiring your attention: correspondence routed to you and documents shared with you. Click any item to view details and take action."
          links={[{ label: 'My Documents', href: '/documents' }, { label: 'Help & Guides', href: '/help' }]}
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
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total in Queue', value: summary.total, icon: Inbox, bgClass: 'bg-primary/10', iconClass: 'text-primary' },
            { label: 'Urgent Items', value: summary.urgent, icon: AlertCircle, bgClass: 'bg-destructive/10', iconClass: 'text-destructive' },
            { label: 'SLA Breaches', value: summary.overdue, icon: Clock, bgClass: 'bg-warning/10', iconClass: 'text-warning' },
            { label: 'Due Soon', value: summary.dueSoon, icon: AlertCircle, bgClass: 'bg-orange-500/10', iconClass: 'text-orange-600 dark:text-orange-400' },
          ].map(({ label, value, icon: Icon, bgClass, iconClass }) => (
            <Card key={label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${bgClass}`}><Icon className={`h-6 w-6 ${iconClass}`} /></div>
                  <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold">{value}</p></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {error && <Card><CardContent className="py-4 text-sm text-destructive">{error}</CardContent></Card>}

        {loading ? (
          <Card><CardContent className="py-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" /><p className="text-sm text-muted-foreground">Loading inbox...</p></CardContent></Card>
        ) : inboxItems.length === 0 && sharedDocuments.length === 0 && pendingApprovals.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Inbox className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-2">No items in your inbox</p>
              <p className="text-xs text-muted-foreground">
                {debouncedSearch || activeFilterCount > 0 
                  ? 'No items match your current filters. Try adjusting your search or filter criteria.' 
                  : 'All caught up! No correspondence or documents require your attention.'}
              </p>
              {(debouncedSearch || activeFilterCount > 0) && <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4">Clear Filters</Button>}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Overdue Section */}
            {(() => {
              const overdueItems = inboxItems.filter(corr => {
                const slaStatus = calculateSLAStatus(corr, slaTargets || undefined);
                return slaStatus.status === 'overdue';
              });
              return overdueItems.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <h2 className="text-lg font-semibold text-destructive">Overdue ({overdueItems.length})</h2>
                  </div>
                  {overdueItems.map(corr => <ItemCard key={corr.id} corr={corr} showSLA={true} />)}
                </div>
              ) : null;
            })()}

            {/* Due Soon Section */}
            {(() => {
              const dueSoonItems = inboxItems.filter(corr => {
                const slaStatus = calculateSLAStatus(corr, slaTargets || undefined);
                return slaStatus.status === 'due-soon';
              });
              return dueSoonItems.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    <h2 className="text-lg font-semibold text-orange-600 dark:text-orange-400">Due Soon ({dueSoonItems.length})</h2>
                  </div>
                  {dueSoonItems.map(corr => <ItemCard key={corr.id} corr={corr} showSLA={true} />)}
                </div>
              ) : null;
            })()}

            {/* Pending Approvals Section */}
            {pendingApprovals.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <h2 className="text-lg font-semibold text-amber-600 dark:text-amber-400">Pending Approvals ({pendingApprovals.length})</h2>
                </div>
                {pendingApprovals.map(approval => <ApprovalCard key={approval.id} approval={approval} />)}
              </div>
            )}

            {/* Regular Inbox Items - Only show if not focusing on tasks OR if there are pending items */}
            {(() => {
              const regularItems = inboxItems.filter(corr => {
                const slaStatus = calculateSLAStatus(corr, slaTargets || undefined);
                return slaStatus.status === 'pending';
              });
              
              // When focusing on tasks, only show pending correspondence (not documents)
              // When not focusing, show everything
              const shouldShowRegular = !focusOnTasks || regularItems.length > 0;
              const shouldShowDocuments = !focusOnTasks && sharedDocuments.length > 0;
              
              return shouldShowRegular || shouldShowDocuments ? (
                <div className="space-y-3">
                  {(regularItems.length > 0 || shouldShowDocuments) && (
                    <div className="flex items-center gap-2">
                      <Inbox className="h-5 w-5 text-muted-foreground" />
                      <h2 className="text-lg font-semibold">
                        {focusOnTasks ? 'Pending Items' : 'All Items'} ({regularItems.length + (shouldShowDocuments ? sharedDocuments.length : 0)})
                      </h2>
                    </div>
                  )}
                  {regularItems.map(corr => <ItemCard key={corr.id} corr={corr} showSLA={true} />)}
                  {shouldShowDocuments && sharedDocuments.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">Showing {count === 0 && documentCount === 0 ? 0 : `${(page - 1) * pageSize + 1}-${Math.min(count + documentCount, (page - 1) * pageSize + inboxItems.length + sharedDocuments.length)}`} of {count + documentCount} items</p>
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
