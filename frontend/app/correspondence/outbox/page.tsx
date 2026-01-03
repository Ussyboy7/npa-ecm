"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';
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
  Send,
  AlertCircle,
  Clock,
  User as UserIcon,
  ArrowDown,
  ArrowUp,
  Filter,
  Calendar,
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { formatDateShort, formatDateTime } from '@/lib/correspondence-helpers';
import type { Correspondence } from '@/lib/npa-structure';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FlowTypeBadge } from '@/components/correspondence/FlowTypeBadge';
import { getDocumentsSharedByUser, type DocumentRecord } from '@/lib/dms-storage';
import { FileText } from 'lucide-react';

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

const OutboxPage = () => {
  const router = useRouter();
  const { currentUser, hydrated } = useCurrentUser();
  const { divisions, users: organizationUsers } = useOrganization();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['pending', 'in-progress']);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [goToPageInput, setGoToPageInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [outboxItems, setOutboxItems] = useState<Correspondence[]>([]);
  const [sharedDocuments, setSharedDocuments] = useState<DocumentRecord[]>([]);
  const [summary, setSummary] = useState({ total: 0, urgent: 0, pending: 0, inProgress: 0 });
  const [documentCount, setDocumentCount] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStatuses.length > 0 && !(selectedStatuses.length === 2 && selectedStatuses.includes('pending') && selectedStatuses.includes('in-progress'))) count++;
    if (selectedPriorities.length > 0) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [selectedStatuses, selectedPriorities, dateFrom, dateTo]);

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) => prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]);
  };

  const togglePriority = (priority: string) => {
    setSelectedPriorities((prev) => prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]);
  };

  const clearAllFilters = () => {
    setSelectedStatuses(['pending', 'in-progress']);
    setSelectedPriorities([]);
    setDateFrom('');
    setDateTo('');
    setQuery('');
  };

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, selectedStatuses, selectedPriorities, sortBy, sortOrder, dateFrom, dateTo, pageSize]);

  useEffect(() => {
    if (!hydrated || !currentUser) return;

    const fetchOutbox = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (debouncedQuery) params.append('search', debouncedQuery);
        if (selectedStatuses.length > 0) {
          selectedStatuses.forEach((status) => params.append('status', status));
        }
        if (selectedPriorities.length > 0) {
          selectedPriorities.forEach((priority) => params.append('priority', priority));
        }
        // Date range filters - backend should support these params
        if (dateFrom) {
          params.append('date_from', dateFrom);
        }
        if (dateTo) {
          params.append('date_to', dateTo);
        }
        params.append('sort_by', sortBy);
        params.append('sort_order', sortOrder);
        params.append('page', String(page));
        params.append('page_size', String(pageSize));

        const [corrResponse, docsResponse] = await Promise.all([
          apiFetch<Record<string, unknown>>(`/correspondence/items/outbox/?${params.toString()}`),
          getDocumentsSharedByUser(currentUser.id, {
            search: debouncedQuery || undefined,
            pageSize: 50, // Get recent shared documents
          }),
        ]);

        const corrResults = Array.isArray(corrResponse.results) ? corrResponse.results : [];
        setOutboxItems(corrResults.map(mapApiCorrespondence));
        const responseObj = corrResponse as Record<string, unknown>;
        const summaryObj = responseObj.summary as Record<string, unknown> | undefined;
        setSummary({
          total: (summaryObj && typeof summaryObj.total === 'number') ? summaryObj.total : ((responseObj && typeof responseObj.count === 'number') ? responseObj.count : corrResults.length),
          urgent: (summaryObj && typeof summaryObj.urgent === 'number') ? summaryObj.urgent : 0,
          pending: (summaryObj && typeof summaryObj.pending === 'number') ? summaryObj.pending : 0,
          inProgress: (summaryObj && typeof summaryObj.in_progress === 'number') ? summaryObj.in_progress : 0,
        });
        setCount((responseObj && typeof responseObj.count === 'number') ? responseObj.count : corrResults.length);

        // Set shared documents
        setSharedDocuments(docsResponse.results || []);
        setDocumentCount(docsResponse.count || 0);
      } catch (err: unknown) {
        // Handle backend errors gracefully, especially for unsupported params
        const errorMessage = (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') ? err.message : 'Failed to load outbox items.';
        if (errorMessage.includes('date_from') || errorMessage.includes('date_to')) {
          setError('Date range filtering may not be supported. Please try without date filters.');
        } else {
          setError(errorMessage);
        }
        setOutboxItems([]);
        setSharedDocuments([]);
        setSummary({ total: 0, urgent: 0, pending: 0, inProgress: 0 });
        setCount(0);
        setDocumentCount(0);
      } finally {
        setLoading(false);
      }
    };

    void fetchOutbox();
  }, [hydrated, currentUser, debouncedQuery, selectedStatuses, selectedPriorities, sortBy, sortOrder, dateFrom, dateTo, page, pageSize]);

  const pageCount = Math.max(1, Math.ceil(count / pageSize));

  const handleGoToPage = () => {
    const pageNum = parseInt(goToPageInput, 10);
    if (pageNum >= 1 && pageNum <= pageCount) {
      setPage(pageNum);
      setGoToPageInput('');
    }
  };

  // Consistent badge variants for status
  const getStatusBadgeVariant = (status: string): 'destructive' | 'secondary' | 'default' | 'outline' => {
    if (status === 'pending') return 'destructive';
    if (status === 'in-progress') return 'secondary';
    if (status === 'completed') return 'default';
    return 'outline';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const DocumentCard = ({ doc }: { doc: DocumentRecord }) => {
    const sharedDate = doc.permissions[0]?.createdAt || doc.updatedAt;
    
    return (
      <div onClick={() => router.push(`/dms/${doc.id}`)} className="border border-border rounded-lg p-4 hover:bg-muted/50 hover:shadow-soft transition-all cursor-pointer">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-blue-500/10">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate mb-1">{doc.title}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="gap-1"><FileText className="h-3 w-3" />Document</Badge>
                  <Badge variant="secondary">{doc.documentType}</Badge>
                  <Badge variant={doc.status === 'published' ? 'default' : 'outline'}>{doc.status}</Badge>
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateShort(sharedDate)}</span>
            </div>
            {doc.description && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{doc.description}</p>
            )}
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" /><span>Type: {doc.documentType}</span></div>
              {doc.referenceNumber && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /><span>Ref: {doc.referenceNumber}</span></div>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!hydrated || !currentUser) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading outbox…</CardContent></Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Outbox</h1>
            <p className="text-muted-foreground mt-1">Correspondence you created and documents you've shared</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" /> Filters
              {activeFilterCount > 0 && <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>}
          </Button>
            <Button size="sm" asChild><Link href="/correspondence/register"><Mail className="h-4 w-4 mr-2" />Register New</Link></Button>
          </div>
        </div>

        <HelpGuideCard
          title="Your Outbox"
          description="Items you've sent or shared: correspondence you created and documents you've shared with others. Track their status and follow up as needed."
          links={[{ label: 'My Documents', href: '/documents' }, { label: 'Help & Guides', href: '/help' }]}
        />

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Outbox Filters</CardTitle>
                {activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={clearAllFilters}>Clear All</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Status</Label>
                  <div className="flex flex-wrap gap-1">
                    {['pending', 'in-progress'].map((status) => (
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
                <div>
                  <Label className="text-sm font-medium mb-2 block">Date From</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Date To</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Sort By</Label>
                  <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => { const [by, order] = value.split('-'); setSortBy(by); setSortOrder(order as 'asc' | 'desc'); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority-desc">Priority (Urgent First)</SelectItem>
                  <SelectItem value="updated-desc">Last Updated (Newest)</SelectItem>
                  <SelectItem value="updated-asc">Last Updated (Oldest)</SelectItem>
                  <SelectItem value="created-desc">Created (Newest)</SelectItem>
                  <SelectItem value="subject-asc">Subject (A-Z)</SelectItem>
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
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by subject, reference, sender..." className="pl-10" />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Total in Queue', value: summary.total, icon: Mail, bgClass: 'bg-primary/10', iconClass: 'text-primary' },
            { label: 'Shared Documents', value: documentCount, icon: FileText, bgClass: 'bg-blue-500/10', iconClass: 'text-blue-600 dark:text-blue-400' },
            { label: 'Urgent', value: summary.urgent, icon: AlertCircle, bgClass: 'bg-destructive/10', iconClass: 'text-destructive' },
            { label: 'Pending', value: summary.pending, icon: Clock, bgClass: 'bg-warning/10', iconClass: 'text-warning' },
            { label: 'In Progress', value: summary.inProgress, icon: Send, bgClass: 'bg-info/10', iconClass: 'text-info' },
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

        {error && <Card><CardContent className="py-4 text-sm text-destructive flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</CardContent></Card>}

        {/* Outbox Items */}
        {loading ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading outbox items...</CardContent></Card>
            ) : outboxItems.length === 0 && sharedDocuments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
                <Send className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-2">{debouncedQuery || activeFilterCount > 0 ? 'No items match your filters' : 'You have no correspondence or shared documents at the moment.'}</p>
              {(debouncedQuery || activeFilterCount > 0) && <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4">Clear Filters</Button>}
            </CardContent>
          </Card>
            ) : (
          <div className="space-y-3">
            {outboxItems.map((item) => {
              const division = item.divisionId ? divisions.find((div) => div.id === item.divisionId) : undefined;
              const currentApprover = item.currentApproverId ? organizationUsers.find((user) => user.id === item.currentApproverId) : undefined;
                const daysPending = calculateDaysPending(item);

                return (
                <div key={item.id as string} className="border border-border rounded-lg p-4 hover:bg-muted/50 hover:shadow-soft transition-all">
                  <Link href={`/correspondence/${item.id as string}`} className="block">
                    <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${item.priority === 'urgent' ? 'bg-destructive/10' : item.priority === 'high' ? 'bg-warning/10' : 'bg-primary/10'}`}>
                      <Mail className={`h-5 w-5 ${item.priority === 'urgent' ? 'text-destructive' : item.priority === 'high' ? 'text-warning' : 'text-primary'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate mb-1">{item.subject}</h3>
                            <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={getPriorityColor(item.priority)}>{item.priority.toUpperCase()}</Badge>
                            <FlowTypeBadge
                              flowType={item.flowType}
                              isInward={item.isInward}
                              isOutward={item.isOutward}
                              isInternal={item.isInternal}
                              isExternal={item.isExternal}
                            />
                            <Badge variant={getStatusBadgeVariant(item.status as string)}>{item.status as string.replace('-', ' ')}</Badge>
                            {daysPending > 0 && <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{daysPending} day{daysPending === 1 ? '' : 's'} pending</Badge>}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{item.updatedAt ? formatDateShort(item.updatedAt) : '—'}</span>
                      </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /><span>Ref: {item.referenceNumber}</span></div>
                        {item.senderName && <div className="flex items-center gap-2"><UserIcon className="h-3.5 w-3.5" /><span>From: {item.senderName}</span></div>}
                        {division && <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /><span>Division: {division.name}</span></div>}
                        {currentApprover && <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /><span>Current Approver: {currentApprover.name}</span></div>}
                      </div>
                      </div>
                    </div>
                  </Link>
                  {/* Action Menu */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    {item.status as string === 'pending' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                          e.preventDefault();
                          router.push(`/correspondence/register?edit=${item.id as string}`);
                        }}
                      >
                        Edit Draft
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        toast.info('Withdraw functionality coming soon');
                      }}
                    >
                      Withdraw
                    </Button>
                    {item.status as string === 'pending' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          toast.info('Delete functionality coming soon');
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
                );
            })}
            {sharedDocuments.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">Showing {count === 0 && documentCount === 0 ? 0 : `${(page - 1) * pageSize + 1}-${Math.min(count + documentCount, (page - 1) * pageSize + outboxItems.length + sharedDocuments.length)}`} of {count + documentCount} items</p>
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

export default OutboxPage;
