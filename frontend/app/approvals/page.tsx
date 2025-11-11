"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2,
  Clock,
  XCircle,
  UserCheck,
  Search,
  Mail,
  User as UserIcon,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { Correspondence } from '@/lib/npa-structure';
import { formatDateShort } from '@/lib/correspondence-helpers';

const ApprovalsInbox = () => {
  const router = useRouter();
  const { correspondence, updateCorrespondence, syncFromApi } = useCorrespondence();
  const { currentUser, hydrated } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingApprovals, setPendingApprovals] = useState<Correspondence[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const computedPending = useMemo(() => {
    if (!currentUser) return [];
    return correspondence
      .filter((item) => item.currentApproverId === currentUser.id && item.status !== 'completed')
      .sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime());
  }, [correspondence, currentUser]);

  useEffect(() => {
    setPendingApprovals(computedPending);
  }, [computedPending]);

  const filteredItems = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (term.length === 0) return pendingApprovals;
    return pendingApprovals.filter((item) => {
      const subject = item.subject?.toLowerCase() ?? '';
      const reference = item.referenceNumber?.toLowerCase() ?? '';
      return subject.includes(term) || reference.includes(term);
    });
  }, [pendingApprovals, searchQuery]);

  const stats = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const inProgress = correspondence.filter(
      (item) => item.currentApproverId === currentUser.id && item.status === 'in-progress',
    ).length;

    const completedToday = correspondence.filter((item) => {
      if (item.currentApproverId !== currentUser.id || item.status !== 'completed') return false;
      const referenceDate = item.updatedAt ?? item.receivedDate;
      return new Date(referenceDate).getTime() >= startOfToday.getTime();
    }).length;

    const urgentPending = pendingApprovals.filter((item) => item.priority === 'urgent').length;

    return [
      {
        title: 'Pending',
        value: pendingApprovals.length.toString(),
        icon: Clock,
        accent: 'bg-warning/10',
        color: 'text-warning',
      },
      {
        title: 'Completed Today',
        value: completedToday.toString(),
        icon: CheckCircle2,
        accent: 'bg-success/10',
        color: 'text-success',
      },
      {
        title: 'In Progress',
        value: inProgress.toString(),
        icon: ArrowRight,
        accent: 'bg-info/10',
        color: 'text-info',
      },
      {
        title: 'Urgent',
        value: urgentPending.toString(),
        icon: AlertCircle,
        accent: 'bg-destructive/10',
        color: 'text-destructive',
      },
    ];
  }, [correspondence, currentUser, pendingApprovals]);

  const applySearch = useCallback((items: Correspondence[]) => {
    const term = searchQuery.trim().toLowerCase();
    if (term.length === 0) return items;
    return items.filter((item) => {
      const subject = item.subject?.toLowerCase() ?? '';
      const reference = item.referenceNumber?.toLowerCase() ?? '';
      return subject.includes(term) || reference.includes(term);
    });
  }, [searchQuery]);

  const inProgressItems = useMemo(() => {
    if (!currentUser) return [];
    const items = correspondence.filter(
      (item) => item.currentApproverId === currentUser.id && item.status === 'in-progress',
    );
    return applySearch(items);
  }, [applySearch, correspondence, currentUser]);

  const completedItems = useMemo(() => {
    if (!currentUser) return [];
    const items = correspondence.filter(
      (item) => item.currentApproverId === currentUser.id && item.status === 'completed',
    );
    return applySearch(items);
  }, [applySearch, correspondence, currentUser]);

  const allItems = useMemo(() => {
    if (!currentUser) return [];
    const items = correspondence.filter((item) => item.currentApproverId === currentUser.id);
    return applySearch(items);
  }, [applySearch, correspondence, currentUser]);

  const handleApprove = async (corr: Correspondence) => {
    setProcessingId(corr.id);
    try {
      await updateCorrespondence(corr.id, {
        status: 'completed',
        currentApproverId: null,
      });
      setPendingApprovals((prev) => prev.filter((item) => item.id !== corr.id));
      toast.success('Item approved successfully', {
        description: 'Forwarded to next approver in the chain',
      });
      await syncFromApi();
    } catch (error) {
      console.error('Failed to approve correspondence', error);
      toast.error('Unable to approve correspondence', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (corr: Correspondence) => {
    setProcessingId(corr.id);
    try {
      await updateCorrespondence(corr.id, {
        status: 'in-progress',
        currentApproverId: corr.createdById ?? null,
      });
      setPendingApprovals((prev) => prev.filter((item) => item.id !== corr.id));
      toast.error('Item rejected', {
        description: 'Returned to originator for revision',
      });
      await syncFromApi();
    } catch (error) {
      console.error('Failed to reject correspondence', error);
      toast.error('Unable to reject correspondence', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelegate = (corr: Correspondence) => {
    router.push(`/correspondence/${corr.id}`);
  };

  const ApprovalCard = ({ corr }: { corr: Correspondence }) => (
    <div className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-all">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-foreground mb-2">{corr.subject}</h4>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={corr.priority === 'urgent' ? 'destructive' : 'secondary'}>
              {corr.priority.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="gap-1">
              {corr.direction === 'downward' ? '↓ Downward' : '↑ Upward'}
            </Badge>
            <Badge variant="outline" className="gap-1 text-warning bg-warning/10">
              <Clock className="h-3 w-3" />
              Awaiting Your Action
            </Badge>
          </div>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDateShort(corr.receivedDate)}
        </span>
      </div>

      <div className="text-sm text-muted-foreground space-y-1 mb-4">
        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5" />
          <span>Ref: {corr.referenceNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          <UserIcon className="h-3.5 w-3.5" />
          <span>From: {corr.senderName}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button 
          size="sm" 
          onClick={() => handleApprove(corr)}
          className="flex-1 bg-gradient-primary"
          disabled={processingId === corr.id}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          {processingId === corr.id ? 'Processing…' : 'Approve'}
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => handleReject(corr)}
          disabled={processingId === corr.id}
        >
          <XCircle className="h-4 w-4 mr-2" />
          {processingId === corr.id ? 'Processing…' : 'Reject'}
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => handleDelegate(corr)}
        >
          <UserCheck className="h-4 w-4 mr-2" />
          Delegate
        </Button>
        <Button 
          size="sm" 
          variant="ghost"
          onClick={() => router.push(`/correspondence/${corr.id}`)}
        >
          View
        </Button>
      </div>
    </div>
  );

  if (!hydrated) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <Card className="shadow-soft">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Loading approvals…
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
            description="Use the Role Switcher to choose a user context before managing approvals."
            links={[{ label: 'Role Switcher', href: '/settings' }]}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-primary" />
              Approvals
            </h1>
            <p className="text-muted-foreground mt-1">
              Review and approve items in your workflow
            </p>
          </div>
          <ContextualHelp
            title="Completing approvals"
            description="Approve, reject, or delegate items assigned to you. Delegations notify assistants, while approvals push the correspondence to the next step."
            steps={[
              'Filter pending items with the search box.',
              'Open an item to review the full routing chain.',
              'Approve to move forward, reject to send back, or delegate to your assistant.'
            ]}
            placement={{ align: 'end', side: 'bottom' }}
          />
        </div>

        <HelpGuideCard
          title="Guide to Approvals"
          description="Use the status cards and tabs to prioritise urgent or overdue correspondence. Open a record to minute, apply digital signatures, distribute (CC), delegate to assistants, or send downward decisions."
          links={[
            { label: "Delegation Settings", href: "/settings" },
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${stat.accent}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search approvals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({filteredItems.length})
            </TabsTrigger>
            <TabsTrigger value="in-progress">
              In Progress ({inProgressItems.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedItems.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({allItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3">
            {filteredItems.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-success" />
                  <p className="text-muted-foreground">All caught up! No pending approvals.</p>
                </CardContent>
              </Card>
            ) : (
              filteredItems.map(corr => (
                <ApprovalCard key={corr.id} corr={corr} />
              ))
            )}
          </TabsContent>

          <TabsContent value="in-progress" className="space-y-3">
            {inProgressItems.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <ArrowRight className="h-12 w-12 mx-auto mb-3 text-info" />
                  <p className="text-muted-foreground">No in-progress items currently assigned.</p>
                </CardContent>
              </Card>
            ) : (
              inProgressItems.map((corr) => <ApprovalCard key={corr.id} corr={corr} />)
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-3">
            {completedItems.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-success" />
                  <p className="text-muted-foreground">No completed items yet.</p>
                </CardContent>
              </Card>
            ) : (
              completedItems.map((corr) => <ApprovalCard key={corr.id} corr={corr} />)
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-3">
            {allItems.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Mail className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-60" />
                  <p className="text-muted-foreground">No correspondence routed to you yet.</p>
                </CardContent>
              </Card>
            ) : (
              allItems.map((corr) => <ApprovalCard key={corr.id} corr={corr} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ApprovalsInbox;
