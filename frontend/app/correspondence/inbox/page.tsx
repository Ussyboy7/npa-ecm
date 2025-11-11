"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mail,
  Search,
  User as UserIcon,
  ArrowDown,
  ArrowUp,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Correspondence } from '@/lib/npa-structure';

const CorrespondenceInbox = () => {
  const router = useRouter();
  const { correspondence, syncFromApi } = useCorrespondence();
  const { currentUser } = useCurrentUser();
  const { divisions, users: organizationUsers } = useOrganization();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    void syncFromApi();
  }, [syncFromApi]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const filteredCorrespondence = useMemo(() => {
    const list = correspondence;
    if (!searchQuery.trim()) return list;
    const lowered = searchQuery.toLowerCase();
    return list.filter((item) =>
      item.subject.toLowerCase().includes(lowered) ||
      item.referenceNumber.toLowerCase().includes(lowered) ||
      item.senderName.toLowerCase().includes(lowered),
    );
  }, [correspondence, searchQuery]);

  const assignedToUser = useMemo(() => {
    if (!currentUser) return filteredCorrespondence;
    return filteredCorrespondence.filter((item) => item.currentApproverId === currentUser.id);
  }, [filteredCorrespondence, currentUser]);

  const createdByUser = useMemo(() => {
    if (!currentUser) return [];
    return filteredCorrespondence.filter((item) => item.createdById === currentUser.id);
  }, [filteredCorrespondence, currentUser]);

  const pending = useMemo(() => filteredCorrespondence.filter((item) => item.status === 'pending'), [filteredCorrespondence]);
  const inProgress = useMemo(() => filteredCorrespondence.filter((item) => item.status === 'in-progress'), [filteredCorrespondence]);
  const completed = useMemo(() => filteredCorrespondence.filter((item) => item.status === 'completed'), [filteredCorrespondence]);
  const archived = useMemo(() => filteredCorrespondence.filter((item) => item.status === 'archived'), [filteredCorrespondence]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-warning bg-warning/10';
      case 'in-progress': return 'text-info bg-info/10';
      case 'completed': return 'text-success bg-success/10';
      case 'archived': return 'text-muted-foreground bg-muted';
      default: return 'text-foreground bg-muted';
    }
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

  const CorrespondenceCard = ({ corr }: { corr: Correspondence }) => {
    const division = corr.divisionId ? divisions.find((div) => div.id === corr.divisionId) : undefined;
    const currentApprover = corr.currentApproverId
      ? organizationUsers.find((user) => user.id === corr.currentApproverId)
      : undefined;

    return (
      <Link
        href={`/correspondence/${corr.id}`}
        className="p-4 border border-border rounded-lg hover:bg-muted/50 hover:shadow-soft transition-all cursor-pointer block"
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`p-3 rounded-lg ${
            corr.priority === 'urgent' ? 'bg-destructive/10' :
            corr.priority === 'high' ? 'bg-warning/10' :
            'bg-primary/10'
          }`}>
            <Mail className={`h-5 w-5 ${
              corr.priority === 'urgent' ? 'text-destructive' :
              corr.priority === 'high' ? 'text-warning' :
              'text-primary'
            }`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground truncate mb-1">
                  {corr.subject}
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={getPriorityColor(corr.priority)}>
                    {corr.priority.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    {corr.direction === 'downward' ? (
                      <>
                        <ArrowDown className="h-3 w-3 text-info" />
                        Downward
                      </>
                    ) : (
                      <>
                        <ArrowUp className="h-3 w-3 text-success" />
                        Upward
                      </>
                    )}
                  </Badge>
                  <Badge variant="secondary" className={getStatusColor(corr.status)}>
                    {corr.status.replace('-', ' ')}
                  </Badge>
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDateShort(corr.receivedDate)}
              </span>
            </div>

            {/* Details */}
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <UserIcon className="h-3.5 w-3.5" />
                <span>From: {corr.senderName}</span>
                {corr.senderOrganization && (
                  <span className="text-xs">({corr.senderOrganization})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                <span>Ref: {corr.referenceNumber}</span>
              </div>
              {division && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Division: {division.name}</span>
                </div>
              )}
              {currentApprover && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Current: {currentApprover.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Mail className="h-8 w-8 text-primary" />
              Correspondence Inbox
            </h1>
            <p className="text-muted-foreground mt-1">
              Track and manage correspondence workflow
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => router.push('/correspondence/register')}
              className="bg-gradient-primary hover:opacity-90 transition-opacity"
            >
              Register New
            </Button>
            <ContextualHelp
              title="How to triage correspondence"
              description="Use search and the status tabs to focus on pending or in-progress memos. Open a card to minute, approve, delegate, or manage distribution."
              steps={[
                'Filter using the status tabs or search bar.',
                'Open a correspondence card to action routing and signatures.',
                'Switch to Archived to review completed items.',
              ]}
            />
          </div>
        </div>

        <HelpGuideCard
          title="Triaging Correspondence"
          description="Use search, status tabs, and quick filters to focus on the memos you need to treat or approve. Open a record to view minutes, apply signatures, manage CC distribution, and link DMS documents."
          links={[
            { label: "Archived Correspondence", href: "/correspondence/archived" },
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by subject, reference number, or sender..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="flex flex-wrap gap-2">
            <TabsTrigger value="all">All ({filteredCorrespondence.length})</TabsTrigger>
            <TabsTrigger value="assigned">Assigned to Me ({assignedToUser.length})</TabsTrigger>
            <TabsTrigger value="created">Registered by Me ({createdByUser.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress ({inProgress.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
            <TabsTrigger value="archived">Archived ({archived.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            {filteredCorrespondence.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Mail className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No correspondence found</p>
                </CardContent>
              </Card>
            ) : (
              filteredCorrespondence.map((corr) => <CorrespondenceCard key={corr.id} corr={corr} />)
            )}
          </TabsContent>

          <TabsContent value="assigned" className="space-y-3">
            {assignedToUser.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12 text-sm text-muted-foreground">
                  You have no correspondence awaiting your action.
                </CardContent>
              </Card>
            ) : (
              assignedToUser.map((corr) => <CorrespondenceCard key={corr.id} corr={corr} />)
            )}
          </TabsContent>

          <TabsContent value="created" className="space-y-3">
            {createdByUser.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12 text-sm text-muted-foreground">
                  You haven't registered any correspondence yet.
                </CardContent>
              </Card>
            ) : (
              createdByUser.map((corr) => <CorrespondenceCard key={corr.id} corr={corr} />)
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-3">
            {pending.map((corr) => <CorrespondenceCard key={corr.id} corr={corr} />)}
          </TabsContent>

          <TabsContent value="in-progress" className="space-y-3">
            {inProgress.map((corr) => <CorrespondenceCard key={corr.id} corr={corr} />)}
          </TabsContent>

          <TabsContent value="completed" className="space-y-3">
            {completed.map((corr) => <CorrespondenceCard key={corr.id} corr={corr} />)}
          </TabsContent>

          <TabsContent value="archived" className="space-y-3">
            {archived.map((corr) => <CorrespondenceCard key={corr.id} corr={corr} />)}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CorrespondenceInbox;

