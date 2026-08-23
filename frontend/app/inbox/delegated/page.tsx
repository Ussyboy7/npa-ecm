"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logError } from '@/lib/client-logger';
import { toast } from "@/components/ui/sonner";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { QueuePageShell } from '@/components/shared/QueuePageShell';
import { StatStrip } from '@/components/shared/StatStrip';
import {
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueListStackClass,
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
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by subject, reference, or delegator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {error && (
          <Card>
            <CardContent className="py-4 text-sm text-destructive">
              {error}
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-sm text-muted-foreground">Loading delegated items...</p>
            </CardContent>
          </Card>
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-2">No delegated items</p>
              <p className="text-xs text-muted-foreground">
                {searchQuery
                  ? 'No items match your search criteria'
                  : 'No executives have delegated correspondence to you yet.'
                }
              </p>
              <Button variant="outline" size="sm" onClick={() => router.push('/inbox')} className="mt-4">
                Go to My Inbox
              </Button>
            </CardContent>
          </Card>
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
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={getPriorityColor(item.correspondence.priority)} className="h-5 rounded-md border px-1.5 py-0 text-[10px] font-semibold leading-none">
                      {item.correspondence.priority.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="h-5 rounded-md border px-1.5 py-0 text-[10px] font-semibold leading-none gap-1">
                      <FileText className="h-3 w-3" />
                      {item.correspondence.correspondence_type}
                    </Badge>
                    {item.expires_at && (
                      <Badge variant="secondary" className="h-5 rounded-md border px-1.5 py-0 text-[10px] font-semibold leading-none gap-1">
                        <Calendar className="h-3 w-3" />
                        Expires: {formatDateShort(item.expires_at)}
                      </Badge>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {formatDateShort(item.delegated_at)}
                  </span>
                </div>
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                  {item.correspondence.subject}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ref: {item.correspondence.reference_number}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5 border-t border-border/60 pt-1.5 text-[11px] leading-tight text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <UserIcon className="h-3 w-3 shrink-0 opacity-80" />
                    <span>Delegated by: {item.principal.first_name} {item.principal.last_name}</span>
                  </span>
                  {item.notes && (
                    <span className="inline-flex items-center gap-1 italic max-w-full truncate">
                      “{item.notes}”
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

