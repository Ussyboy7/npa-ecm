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
  Shield,
  FileText,
  ArrowDown,
  ArrowUp,
  ChevronRight,
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
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
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
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from '@/components/shared/registry-queue-styles';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Use pagination hook
  const [count, setCount] = useState(0);
  const pagination = usePagination({
    initialPage: 1,
    initialPageSize: 25,
    totalCount: count,
  });

  const [inboxItems, setInboxItems] = useState<Correspondence[]>([]);
  const [sharedDocuments, setSharedDocuments] = useState<DocumentRecord[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [summary, setSummary] = useState({ total: 0, urgent: 0, overdue: 0, pending: 0, inProgress: 0, dueSoon: 0 });
  const [documentCount, setDocumentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slaTargets, setSlaTargets] = useState<{ urgent: number; high: number; medium: number; low: number } | null>(null);
  const [focusOnTasks, setFocusOnTasks] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStatuses.length > 0) count++;
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
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setSearchQuery('');
  };

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    pagination.goToFirstPage();
  }, [debouncedSearch, selectedStatuses, selectedPriorities, sortBy, sortOrder, pagination.pageSize]);

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
    if (!currentUser?.id) return;

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
        params.append('page', String(pagination.page));
        params.append('page_size', String(pagination.pageSize));

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

        const summary = corrResponse.summary as Record<string, unknown> | undefined;
        setSummary({
          total: (summary && typeof summary.total === 'number') ? summary.total : (corrResponse.count as number ?? corrResults.length),
          urgent: (summary && typeof summary.urgent === 'number') ? summary.urgent : 0,
          overdue: slaStats.overdue,
          pending: (summary && typeof summary.pending === 'number') ? summary.pending : 0,
          inProgress: (summary && typeof summary.in_progress === 'number') ? summary.in_progress : 0,
          dueSoon: slaStats.dueSoon,
        });
        setCount((corrResponse.count as number) ?? corrResults.length);

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
  }, [currentUser?.id, debouncedSearch, selectedStatuses, selectedPriorities, sortBy, sortOrder, pagination.page, pagination.pageSize, slaTargets]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      default: return 'secondary';
    }
  };

  if (!currentUser?.id) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <LoadingState message="Loading inbox…" />
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

  const openCorrespondenceAction = (id: string) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label="Open correspondence"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push(`/correspondence/${id}`);
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">Open correspondence</TooltipContent>
    </Tooltip>
  );

  const ItemCard = ({ corr, showSLA = true }: { corr: Correspondence; showSLA?: boolean }) => {
    const daysPending = calculateDaysPending(corr, slaTargets || undefined);
    const statusBadge = getStatusBadge(corr.status);
    const statusBadgeVariant = getStatusBadgeVariant(corr.status);
    const slaStatus = showSLA ? calculateSLAStatus(corr, slaTargets || undefined) : null;

    return (
      <ListRowCard
        density="compact"
        href={`/correspondence/${corr.id}`}
        leading={(
          <div
            className={cn(
              correspondenceQueueLeadingBoxClass,
              corr.priority === 'urgent'
                ? 'bg-destructive/10'
                : corr.priority === 'high'
                  ? 'bg-warning/10'
                  : 'bg-primary/10',
            )}
          >
            <Mail
              className={cn(
                correspondenceQueueLeadingIconClass,
                corr.priority === 'urgent'
                  ? 'text-destructive'
                  : corr.priority === 'high'
                    ? 'text-warning'
                    : 'text-primary',
              )}
            />
          </div>
        )}
        actions={openCorrespondenceAction(corr.id)}
      >
        <h4 className={correspondenceQueueSubjectClass}>{corr.subject}</h4>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            <Badge variant="outline" className={cn(correspondenceQueueBadgeClass, 'gap-0.5')}>
              <Mail className="h-2.5 w-2.5" />
              Correspondence
            </Badge>
            <Badge variant={getPriorityColor(corr.priority)} className={correspondenceQueueBadgeClass}>
              {corr.priority.toUpperCase()}
            </Badge>
            <Badge variant="outline" className={cn(correspondenceQueueBadgeClass, 'gap-0.5')}>
              {corr.direction === 'downward' ? (
                <><ArrowDown className="h-2.5 w-2.5 text-info" />Downward</>
              ) : (
                <><ArrowUp className="h-2.5 w-2.5 text-success" />Upward</>
              )}
            </Badge>
            <Badge variant={statusBadgeVariant} className={cn(correspondenceQueueBadgeClass, 'gap-0.5')}>
              <Clock className="h-2.5 w-2.5" />
              {statusBadge.label}
            </Badge>
            {slaStatus && slaStatus.status === 'overdue' && (
              <Badge variant="destructive" className={cn(correspondenceQueueBadgeClass, 'gap-0.5')}>
                <AlertCircle className="h-2.5 w-2.5" />
                Overdue {slaStatus.daysOverdue} day{slaStatus.daysOverdue !== 1 ? 's' : ''}
              </Badge>
            )}
            {slaStatus && slaStatus.status === 'due-soon' && (
              <Badge
                variant="default"
                className={cn(
                  correspondenceQueueBadgeClass,
                  'gap-0.5 bg-orange-500 hover:bg-orange-600',
                )}
              >
                <Clock className="h-2.5 w-2.5" />
                Due in {slaStatus.daysUntilDue} day{slaStatus.daysUntilDue !== 1 ? 's' : ''}
              </Badge>
            )}
            {!slaStatus && daysPending > 0 && (
              <Badge variant="secondary" className={cn(correspondenceQueueBadgeClass, 'gap-0.5')}>
                <Clock className="h-2.5 w-2.5" />
                {daysPending} day{daysPending !== 1 ? 's' : ''} pending
              </Badge>
            )}
          </div>
          <span className={correspondenceQueueDateClass}>{formatDateShort(corr.receivedDate)}</span>
        </div>
        <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
          <span className={correspondenceQueueMetaItemClass}>
            <Mail className={correspondenceQueueMetaIconClass} />
            <span className="truncate">Ref: {corr.referenceNumber}</span>
          </span>
          <span className={correspondenceQueueMetaItemClass}>
            <UserIcon className={correspondenceQueueMetaIconClass} />
            <span className="truncate">From: {corr.senderName}</span>
          </span>
          {corr.currentOfficeName && (
            <span className={correspondenceQueueMetaItemClass}>
              <AlertCircle className={correspondenceQueueMetaIconClass} />
              <span className="truncate">Office: {corr.currentOfficeName}</span>
            </span>
          )}
        </div>
      </ListRowCard>
    );
  };

  const ApprovalCard = ({ approval }: { approval: PendingApproval }) => {
    const approvalStatus = approval.due_date ? calculateTaskStatus(approval.due_date) : { status: 'pending' as const };
    const cid = approval.correspondenceId || approval.correspondence?.id || '';

    return (
      <ListRowCard
        density="compact"
        href={`/correspondence/${cid}`}
        className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
        leading={(
          <div className={cn(correspondenceQueueLeadingBoxClass, 'bg-amber-100/90 dark:bg-amber-950/50')}>
            <Shield className={cn(correspondenceQueueLeadingIconClass, 'text-amber-700 dark:text-amber-400')} />
          </div>
        )}
        actions={openCorrespondenceAction(cid)}
      >
        <h4 className={correspondenceQueueSubjectClass}>
          {approval.correspondence?.subject || 'Pending Approval'}
        </h4>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            <Badge
              variant="outline"
              className={cn(
                correspondenceQueueBadgeClass,
                'gap-0.5 border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
              )}
            >
              <Shield className="h-2.5 w-2.5" />
              Pending Approval
            </Badge>
            {approvalStatus.status === 'overdue' && (
              <Badge variant="destructive" className={cn(correspondenceQueueBadgeClass, 'gap-0.5')}>
                <AlertCircle className="h-2.5 w-2.5" />
                Overdue {approvalStatus.daysOverdue} day{approvalStatus.daysOverdue !== 1 ? 's' : ''}
              </Badge>
            )}
            {approvalStatus.status === 'due-soon' && (
              <Badge
                variant="default"
                className={cn(correspondenceQueueBadgeClass, 'gap-0.5 bg-orange-500 hover:bg-orange-600')}
              >
                <Clock className="h-2.5 w-2.5" />
                Due in {approvalStatus.daysUntilDue} day{approvalStatus.daysUntilDue !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <span className={correspondenceQueueDateClass}>
            {formatDateShort(approval.created_at)}
          </span>
        </div>
        {approval.correspondence?.reference_number ? (
          <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
            <span className={correspondenceQueueMetaItemClass}>
              <Mail className={correspondenceQueueMetaIconClass} />
              <span className="truncate">Ref: {approval.correspondence.reference_number}</span>
            </span>
          </div>
        ) : null}
      </ListRowCard>
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
      <ListRowCard
        density="compact"
        href={`/dms/${doc.id}`}
        leading={(
          <div className={cn(correspondenceQueueLeadingBoxClass, 'bg-primary/10')}>
            <FileText className={cn(correspondenceQueueLeadingIconClass, 'text-primary')} />
          </div>
        )}
        actions={(
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="Open document"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/dms/${doc.id}`);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Open document</TooltipContent>
          </Tooltip>
        )}
      >
        <h4 className={correspondenceQueueSubjectClass}>{doc.title}</h4>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            <Badge variant="outline" className={cn(correspondenceQueueBadgeClass, 'gap-0.5')}>
              <FileText className="h-2.5 w-2.5" />
              Document
            </Badge>
            <Badge variant="secondary" className={correspondenceQueueBadgeClass}>
              {doc.documentType}
            </Badge>
            <Badge
              variant={doc.status === 'published' ? 'default' : 'outline'}
              className={correspondenceQueueBadgeClass}
            >
              {doc.status}
            </Badge>
          </div>
          <span className={correspondenceQueueDateClass}>{formatDateShort(sharedDate)}</span>
        </div>
        {doc.description ? (
          <p className="mt-1 line-clamp-1 text-[11px] leading-snug text-muted-foreground">
            {doc.description}
          </p>
        ) : null}
        <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
          <span className={correspondenceQueueMetaItemClass}>
            <FileText className={correspondenceQueueMetaIconClass} />
            <span className="truncate">Type: {doc.documentType}</span>
          </span>
          {doc.referenceNumber ? (
            <span className={correspondenceQueueMetaItemClass}>
              <Mail className={correspondenceQueueMetaIconClass} />
              <span className="truncate">Ref: {doc.referenceNumber}</span>
            </span>
          ) : null}
        </div>
      </ListRowCard>
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
                <CardTitle className="text-lg">My Inbox Filters</CardTitle>
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

        {error && <ErrorState message={error} variant="inline" />}

        {loading ? (
          <LoadingState message="Loading inbox…" />
        ) : inboxItems.length === 0 && sharedDocuments.length === 0 && pendingApprovals.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="No items in your inbox"
            message={debouncedSearch || activeFilterCount > 0 
              ? 'No items match your current filters. Try adjusting your search or filter criteria.' 
              : 'All caught up! No correspondence or documents require your attention.'}
            actionLabel={debouncedSearch || activeFilterCount > 0 ? 'Clear Filters' : undefined}
            onAction={debouncedSearch || activeFilterCount > 0 ? clearAllFilters : undefined}
          />
        ) : (
          <div className="space-y-6">
            {/* Pending Approvals Section */}
            {pendingApprovals.length > 0 && (
              <div className={correspondenceQueueListStackClass}>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <h2 className="text-lg font-semibold text-amber-600 dark:text-amber-400">Pending Approvals ({pendingApprovals.length})</h2>
                </div>
                {pendingApprovals.map(approval => <ApprovalCard key={approval.id} approval={approval} />)}
              </div>
            )}

            {/* All Items - correspondence (overdue/due-soon/pending) + documents, sorted by SLA priority */}
            {(() => {
              const slaPriority = (s: 'overdue' | 'due-soon' | 'pending') =>
                s === 'overdue' ? 0 : s === 'due-soon' ? 1 : 2;
              const sortedItems = [...inboxItems].sort((a, b) => {
                const aStatus = calculateSLAStatus(a, slaTargets || undefined).status;
                const bStatus = calculateSLAStatus(b, slaTargets || undefined).status;
                return slaPriority(aStatus) - slaPriority(bStatus);
              });

              const shouldShowDocuments = !focusOnTasks && sharedDocuments.length > 0;
              const totalCount = sortedItems.length + (shouldShowDocuments ? sharedDocuments.length : 0);

              return sortedItems.length > 0 || shouldShowDocuments ? (
                <div className={correspondenceQueueListStackClass}>
                  <div className="flex items-center gap-2">
                    <Inbox className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-lg font-semibold">
                      {focusOnTasks ? 'Pending Items' : 'All Items'} ({totalCount})
                    </h2>
                  </div>
                  {sortedItems.map(corr => <ItemCard key={corr.id} corr={corr} showSLA={true} />)}
                  {shouldShowDocuments && sharedDocuments.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* Pagination */}
        {count > 0 && (
          <PaginationControls
            pagination={pagination}
            showPageSizeSelector={true}
            showGoToPage={true}
            className="border-t border-border/60 pt-4"
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default ExecutiveInbox;
