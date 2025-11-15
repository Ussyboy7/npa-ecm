"use client";

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Inbox,
  Search,
  Mail,
  Clock,
  AlertCircle,
  User as UserIcon,
} from 'lucide-react';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { Correspondence } from '@/lib/npa-structure';
import { formatDateShort } from '@/lib/correspondence-helpers';

const ExecutiveInbox = () => {
  const router = useRouter();
  const { correspondence } = useCorrespondence();
  const { currentUser, hydrated } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');

  const inboxItems = useMemo(() => {
    if (!currentUser) return [];
    const userDivisionId = currentUser.division;

    return correspondence
      .filter((item) => {
        if (item.status === 'completed') return false;
        if (item.currentApproverId === currentUser.id) return true;
        if (userDivisionId && item.divisionId === userDivisionId) return true;
        return false;
      })
      .sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime());
  }, [correspondence, currentUser]);

  const filteredItems = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (term.length === 0) {
      return inboxItems;
    }
    return inboxItems.filter((item) => {
      const subject = item.subject?.toLowerCase() ?? '';
      const reference = item.referenceNumber?.toLowerCase() ?? '';
      return subject.includes(term) || reference.includes(term);
    });
  }, [searchQuery, inboxItems]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      default: return 'secondary';
    }
  };

  const metricTotals = useMemo(() => {
    const total = inboxItems.length;
    const pending = inboxItems.filter((item) => item.status === 'pending').length;
    const inProgress = inboxItems.filter((item) => item.status === 'in-progress').length;
    const urgent = inboxItems.filter((item) => item.priority === 'urgent').length;
    return { total, pending, inProgress, urgent };
  }, [inboxItems]);

  if (!hydrated) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <Card className="shadow-soft">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Loading inbox…
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentUser) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <HelpGuideCard
            title="Select a persona"
            description="Use the Role Switcher to choose a user context before viewing your inbox."
            links={[{ label: 'Role Switcher', href: '/settings' }]}
          />
        </div>
      </DashboardLayout>
    );
  }

  const ItemCard = ({ corr }: { corr: Correspondence }) => {
    const statusBadge =
      corr.status === 'pending'
        ? { label: 'Awaiting action', variant: 'warning' as const }
        : corr.status === 'in-progress'
        ? { label: 'In progress', variant: 'info' as const }
        : { label: corr.status, variant: 'outline' as const };
    const statusBadgeVariant: 'destructive' | 'secondary' | 'default' | 'outline' =
      statusBadge.variant === 'warning'
        ? 'destructive'
        : statusBadge.variant === 'info'
          ? 'secondary'
          : 'outline';

    return (
      <div
        onClick={() => router.push(`/correspondence/${corr.id}`)}
        className="p-4 border border-border rounded-lg hover:bg-muted/50 hover:shadow-soft transition-all cursor-pointer"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant={getPriorityColor(corr.priority)}>
                {corr.priority.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="gap-1">
                {corr.direction === 'downward' ? '↓ Downward' : '↑ Upward'}
              </Badge>
              <Badge
                variant={statusBadgeVariant}
                className={
                  statusBadge.variant === 'warning'
                    ? 'bg-warning/10 text-warning gap-1'
                    : statusBadge.variant === 'info'
                    ? 'bg-info/10 text-info gap-1'
                    : 'gap-1'
                }
              >
                <Clock className="h-3 w-3" />
                {statusBadge.label}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Mail className="h-3 w-3" />
                {corr.archiveLevel ? `${corr.archiveLevel} archive` : 'Active queue'}
              </Badge>
            </div>
            <h4 className="font-semibold text-foreground mb-2">{corr.subject}</h4>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDateShort(corr.receivedDate)}
          </span>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5" />
            <span>Ref: {corr.referenceNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <UserIcon className="h-3.5 w-3.5" />
            <span>From: {corr.senderName}</span>
          </div>
        </div>
      </div>
    );
  };

  const filterByStatus = (status: string) => {
    if (status === 'all') return filteredItems;
    return filteredItems.filter(c => c.status === status);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Inbox className="h-8 w-8 text-primary" />
            My Inbox
          </h1>
          <p className="text-muted-foreground mt-1">
            All correspondence requiring your attention
          </p>
        </div>

        <HelpGuideCard
          title="Focus on Your Assignments"
          description="This inbox narrows the correspondence list to items routed directly to you or your division. Scan priority, direction, and arrival date, then drill into a record to minute, approve, or delegate."
          links={[
            { label: "Correspondence Inbox", href: "/correspondence/inbox" },
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Items awaiting you',
              value: metricTotals.total,
              Icon: Inbox,
              badgeClass: 'bg-primary/10',
              iconClass: 'text-primary',
            },
            {
              label: 'Pending',
              value: metricTotals.pending,
              Icon: AlertCircle,
              badgeClass: 'bg-warning/10',
              iconClass: 'text-warning',
            },
            {
              label: 'In progress',
              value: metricTotals.inProgress,
              Icon: Mail,
              badgeClass: 'bg-info/10',
              iconClass: 'text-info',
            },
            {
              label: 'Urgent',
              value: metricTotals.urgent,
              Icon: Clock,
              badgeClass: 'bg-destructive/10',
              iconClass: 'text-destructive',
            },
          ].map(({ label, value, Icon, badgeClass, iconClass }) => (
            <Card key={label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${badgeClass}`}>
                    <Icon className={`h-6 w-6 ${iconClass}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search correspondence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              All ({filteredItems.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({filterByStatus('pending').length})
            </TabsTrigger>
            <TabsTrigger value="in-progress">
              In Progress ({filterByStatus('in-progress').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            {filteredItems.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Inbox className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No items in your inbox</p>
                </CardContent>
              </Card>
            ) : (
              filteredItems.map(corr => (
                <ItemCard key={corr.id} corr={corr} />
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-3">
            {filterByStatus('pending').map(corr => (
              <ItemCard key={corr.id} corr={corr} />
            ))}
          </TabsContent>

          <TabsContent value="in-progress" className="space-y-3">
            {filterByStatus('in-progress').map(corr => (
              <ItemCard key={corr.id} corr={corr} />
            ))}
          </TabsContent>

        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ExecutiveInbox;
