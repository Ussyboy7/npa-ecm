"use client";

import { useState, useEffect } from 'react';
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
  CheckCircle2,
  AlertCircle,
  User as UserIcon
} from 'lucide-react';
import { MOCK_CORRESPONDENCE, MOCK_USERS, type User as NPAUser, type Correspondence } from '@/lib/npa-structure';
import { formatDateShort } from '@/lib/correspondence-helpers';

const ExecutiveInbox = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<NPAUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [myItems, setMyItems] = useState<Correspondence[]>([]);

  useEffect(() => {
    const savedUserId = localStorage.getItem('npa_demo_user_id');
    if (savedUserId) {
      const user = MOCK_USERS.find(u => u.id === savedUserId);
      if (user) {
        setCurrentUser(user);
        // Filter items assigned to this executive
        const items = MOCK_CORRESPONDENCE.filter(
          c => c.currentApproverId === user.id || c.divisionId === user.division
        );
        setMyItems(items);
      }
    }
  }, []);

  const filteredItems = myItems.filter(c =>
    c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      default: return 'secondary';
    }
  };

  const ItemCard = ({ corr }: { corr: Correspondence }) => (
    <div 
      onClick={() => router.push(`/correspondence/${corr.id}`)}
      className="p-4 border border-border rounded-lg hover:bg-muted/50 hover:shadow-soft transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-foreground mb-2">{corr.subject}</h4>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={getPriorityColor(corr.priority)}>
              {corr.priority.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="gap-1">
              {corr.direction === 'downward' ? '↓ Downward' : '↑ Upward'}
            </Badge>
            {corr.status === 'pending' && (
              <Badge variant="outline" className="gap-1 text-warning bg-warning/10">
                <Clock className="h-3 w-3" />
                Awaiting Action
              </Badge>
            )}
          </div>
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
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-warning/10">
                  <AlertCircle className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">
                    {filterByStatus('pending').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-info/10">
                  <Mail className="h-6 w-6 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold">
                    {filterByStatus('in-progress').length}
                  </p>
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
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">
                    {filterByStatus('completed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-destructive/10">
                  <Clock className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Urgent</p>
                  <p className="text-2xl font-bold">
                    {filteredItems.filter(c => c.priority === 'urgent').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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
            <TabsTrigger value="completed">
              Completed ({filterByStatus('completed').length})
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

          <TabsContent value="completed" className="space-y-3">
            {filterByStatus('completed').map(corr => (
              <ItemCard key={corr.id} corr={corr} />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ExecutiveInbox;
