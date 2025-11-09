"use client";
import { useState, useEffect } from 'react';
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
import { MOCK_USERS, type User as NPAUser, type Correspondence } from '@/lib/npa-structure';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { formatDateShort } from '@/lib/correspondence-helpers';

const ApprovalsInbox = () => {
  const router = useRouter();
  const { correspondence } = useCorrespondence();
  const [currentUser, setCurrentUser] = useState<NPAUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingApprovals, setPendingApprovals] = useState<Correspondence[]>([]);

  useEffect(() => {
    const savedUserId = localStorage.getItem('npa_demo_user_id');
    if (savedUserId) {
      const user = MOCK_USERS.find(u => u.id === savedUserId);
      if (user) {
        setCurrentUser(user);
        // Filter items pending this user's approval
        const pending = correspondence.filter(
          c => c.currentApproverId === user.id && c.status !== 'completed'
        );
        setPendingApprovals(pending);
      }
    }
  }, [correspondence]);

  const filteredItems = pendingApprovals.filter(c =>
    c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApprove = (corrId: string) => {
    toast.success('Item approved successfully', {
      description: 'Forwarded to next approver in the chain'
    });
    setPendingApprovals(prev => prev.filter(c => c.id !== corrId));
  };

  const handleReject = (corrId: string) => {
    toast.error('Item rejected', {
      description: 'Returned to sender for revision'
    });
    setPendingApprovals(prev => prev.filter(c => c.id !== corrId));
  };

  const handleDelegate = (corrId: string) => {
    toast.info('Item delegated', {
      description: 'Assigned to your assistant'
    });
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
          onClick={() => handleApprove(corr.id)}
          className="flex-1 bg-gradient-primary"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Approve
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => handleReject(corr.id)}
        >
          <XCircle className="h-4 w-4 mr-2" />
          Reject
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => handleDelegate(corr.id)}
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
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-warning/10">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{pendingApprovals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-success/10">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Approved Today</p>
                  <p className="text-2xl font-bold">8</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-destructive/10">
                  <XCircle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-info/10">
                  <UserCheck className="h-6 w-6 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Delegated</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
            <TabsTrigger value="approved">
              Approved
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected
            </TabsTrigger>
            <TabsTrigger value="delegated">
              Delegated
            </TabsTrigger>
            <TabsTrigger value="all">
              All
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

          <TabsContent value="approved" className="space-y-3">
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-success" />
                <p className="text-muted-foreground">No approved items yet</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rejected" className="space-y-3">
            <Card>
              <CardContent className="text-center py-12">
                <XCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
                <p className="text-muted-foreground">No rejected items yet</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="delegated" className="space-y-3">
            <Card>
              <CardContent className="text-center py-12">
                <UserCheck className="h-12 w-12 mx-auto mb-3 text-info" />
                <p className="text-muted-foreground">No delegated items yet</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all" className="space-y-3">
            {filteredItems.map(corr => (
              <ApprovalCard key={corr.id} corr={corr} />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ApprovalsInbox;
