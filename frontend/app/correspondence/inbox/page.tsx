"use client";

import { useState, useEffect } from 'react';
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
  Calendar,
  User as UserIcon,
  ArrowDown,
  ArrowUp,
  Clock,
  AlertCircle
} from 'lucide-react';
import { MOCK_CORRESPONDENCE, MOCK_USERS, getDivisionById, type User as NPAUser, type Correspondence } from '@/lib/npa-structure';
import { formatDateShort } from '@/lib/correspondence-helpers';
import Link from 'next/link';
import { ContextualHelp } from '@/components/help/ContextualHelp';

const CorrespondenceInbox = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<NPAUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCorrespondence, setFilteredCorrespondence] = useState<Correspondence[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let savedUserId = localStorage.getItem('npa_demo_user_id');
    
    // If no user is saved, default to MD
    if (!savedUserId) {
      const md = MOCK_USERS.find(u => u.gradeLevel === 'MDCS');
      if (md) {
        savedUserId = md.id;
        localStorage.setItem('npa_demo_user_id', md.id);
      }
    }
    
    if (savedUserId) {
      const user = MOCK_USERS.find(u => u.id === savedUserId);
      if (user) {
        setCurrentUser(user);
        // Show all correspondence for demo purposes
        setFilteredCorrespondence(MOCK_CORRESPONDENCE);
      }
    }
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setFilteredCorrespondence(MOCK_CORRESPONDENCE);
      return;
    }

    const filtered = MOCK_CORRESPONDENCE.filter(c =>
      c.subject.toLowerCase().includes(query.toLowerCase()) ||
      c.referenceNumber.toLowerCase().includes(query.toLowerCase()) ||
      c.senderName.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredCorrespondence(filtered);
  };

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
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const CorrespondenceCard = ({ corr }: { corr: Correspondence }) => {
    const division = getDivisionById(corr.divisionId);
    const currentApprover = corr.currentApproverId ? MOCK_USERS.find(u => u.id === corr.currentApproverId) : null;

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

  const filterByStatus = (status: string) => {
    if (status === 'all') return filteredCorrespondence;
    return filteredCorrespondence.filter(c => c.status === status);
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
          <TabsList>
            <TabsTrigger value="all">
              All ({filteredCorrespondence.length})
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
            {filteredCorrespondence.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Mail className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No correspondence found</p>
                </CardContent>
              </Card>
            ) : (
              filteredCorrespondence.map(corr => (
                <CorrespondenceCard key={corr.id} corr={corr} />
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-3">
            {filterByStatus('pending').map(corr => (
              <CorrespondenceCard key={corr.id} corr={corr} />
            ))}
          </TabsContent>

          <TabsContent value="in-progress" className="space-y-3">
            {filterByStatus('in-progress').map(corr => (
              <CorrespondenceCard key={corr.id} corr={corr} />
            ))}
          </TabsContent>

          <TabsContent value="completed" className="space-y-3">
            {filterByStatus('completed').map(corr => (
              <CorrespondenceCard key={corr.id} corr={corr} />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CorrespondenceInbox;

