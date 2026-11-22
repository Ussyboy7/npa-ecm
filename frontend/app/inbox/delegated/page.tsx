"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logError } from '@/lib/client-logger';
import { toast } from "@/components/ui/sonner";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users2,
  Search,
  Mail,
  User as UserIcon,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  FileText,
  Calendar,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { apiFetch } from '@/lib/api-client';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { ListSkeleton } from '@/components/shared/PageSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { QueuePageShell } from '@/components/shared/QueuePageShell';
import { StatStrip } from '@/components/shared/StatStrip';
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
} from '@/components/shared/registry-queue-styles';
import { cn } from '@/lib/utils';

interface DelegatedItem {
  id: string;
  correspondence: {
    id: string;
    reference_number: string;
    subject: string;
    correspondence_type: string;
    status: string;
    priority: string;
  };
  principal: {
    id: number;
    first_name: string;
    last_name: string;
  };
  notes: string;
  status: string;
  delegated_at: string;
  expires_at: string | null;
  is_active: boolean;
}

const DelegatedInbox = () => {
  const router = useRouter();
  const {currentUser, hydrated: _hydrated } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [delegatedItems, setDelegatedItems] = useState<DelegatedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchDelegatedItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch<DelegatedItem[]>('/correspondence/correspondence-delegations/my_delegated_items/');
        setDelegatedItems(Array.isArray(response) ? response : []);
      } catch (err) {
        logError('Failed to fetch delegated items:', err);
        setError('Failed to load delegated items. Please try again.');
        setDelegatedItems([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchDelegatedItems();
  }, [currentUser?.id]);

  const filteredItems = searchQuery
    ? delegatedItems.filter(item =>
        item.correspondence.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.correspondence.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${item.principal.first_name} ${item.principal.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : delegatedItems;

  const handleMarkComplete = async (delegationId: string) => {
    setCompletingIds(prev => new Set(prev).add(delegationId));
    try {
      await apiFetch(`/correspondence/correspondence-delegations/${delegationId}/complete/`, {
        method: 'POST',
      });
      // Remove from list only after successful API call
      setDelegatedItems(prev => prev.filter(item => item.id as string !== delegationId));
    } catch (err) {
      logError('Failed to mark delegation as complete:', err);
      toast.error('Failed to mark delegation as complete');
    } finally {
      setCompletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(delegationId);
        return newSet;
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <>
      {!currentUser ? null : (
        <QueuePageShell
          title="Delegated to Me"
          subtitle="Correspondence items delegated to you by executives for handling on their behalf"
          actions={(
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          stats={(
            <StatStrip
              items={[
                { key: 'active', label: 'Active', value: delegatedItems.length },
              ]}
            />
          )}
        >
        {/* Search */}
        <div className="rounded-xl bg-muted/30 p-2" role="search" aria-label="Delegated inbox filters">
          <div className="relative max-w-xl">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by subject, reference, or delegator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-border/60 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <ListSkeleton rows={5} />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="No delegated items"
            message={
              searchQuery
                ? 'No items match your search criteria.'
                : 'No executives have delegated correspondence to you yet.'
            }
            actionLabel="Go to My Inbox"
            onAction={() => router.push('/inbox')}
          />
        ) : (
          <div className={correspondenceQueueListStackClass}>
            {filteredItems.map((item) => (
              <ListRowCard
                key={item.id as string}
                density="compact"
                href={`/correspondence/${item.correspondence.id}`}
                leading={(
                  <div className={cn(correspondenceQueueLeadingBoxClass, "bg-amber-500/10")}>
                    <Users2 className={cn(correspondenceQueueLeadingIconClass, "text-amber-600 dark:text-amber-400")} />
                  </div>
                )}
                footer={(
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        router.push(`/correspondence/${item.correspondence.id}`);
                      }}
                      className="flex-1 h-8 text-xs"
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      View & Handle
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleMarkComplete(item.id as string);
                      }}
                      disabled={completingIds.has(item.id as string)}
                      className="h-8 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-500/10"
                    >
                      {completingIds.has(item.id as string) ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      )}
                      Mark Complete
                    </Button>
                  </div>
                )}
              >
                <h4 className={correspondenceQueueSubjectClass}>{item.correspondence.subject}</h4>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                    <Badge variant={getPriorityColor(item.correspondence.priority)} className={correspondenceQueueBadgeClass}>
                      {item.correspondence.priority.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className={cn(correspondenceQueueBadgeClass, 'gap-1')}>
                      <FileText className="h-2.5 w-2.5" />
                      {item.correspondence.correspondence_type}
                    </Badge>
                    {item.expires_at && (
                      <Badge variant="outline" className={cn(correspondenceQueueBadgeClass, 'gap-1')}>
                        <Calendar className="h-2.5 w-2.5" />
                        Expires: {formatDateShort(item.expires_at)}
                      </Badge>
                    )}
                  </div>
                  <span className={correspondenceQueueDateClass}>
                    {formatDateShort(item.delegated_at)}
                  </span>
                </div>
                <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
                  <span className={correspondenceQueueMetaItemClass}>
                    <FileText className={correspondenceQueueMetaIconClass} />
                    <span className="truncate">Ref: {item.correspondence.reference_number}</span>
                  </span>
                  <span className={correspondenceQueueMetaItemClass}>
                    <UserIcon className={correspondenceQueueMetaIconClass} />
                    <span className="truncate">Delegated by: {item.principal.first_name} {item.principal.last_name}</span>
                  </span>
                  {item.notes && (
                    <span className={cn(correspondenceQueueMetaItemClass, 'italic')}>
                      <span className="truncate">“{item.notes}”</span>
                    </span>
                  )}
                </div>
              </ListRowCard>
            ))}
          </div>
        )}
        </QueuePageShell>
      )}
    </>
  );
};

export default DelegatedInbox;

