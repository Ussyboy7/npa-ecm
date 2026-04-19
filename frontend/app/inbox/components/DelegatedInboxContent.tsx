"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logError } from '@/lib/client-logger';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import {
  Users2,
  Search,
  Mail,
  Clock,
  AlertCircle,
  User as UserIcon,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  FileText,
  Calendar,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { formatDateShort, formatDateTime } from '@/lib/correspondence-helpers';
import { apiFetch } from '@/lib/api-client';

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
  const { currentUser, hydrated } = useCurrentUser();
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
      // Remove from list
      setDelegatedItems(prev => prev.filter(item => item.id as string !== delegationId));
    } catch (err) {
      logError('Failed to mark delegation as complete:', err);
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

  if (!currentUser?.id) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Loading...
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentUser) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <HelpGuideCard
            title="Select a persona"
            description="Use the Role Switcher to choose a user context before viewing delegated items."
            links={[{ label: 'Role Switcher', href: '/settings' }]}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Back Button and Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users2 className="h-8 w-8 text-amber-600" />
              <h1 className="text-3xl font-bold">Delegated to Me</h1>
            </div>
            <p className="text-muted-foreground">
              Correspondence items delegated to you by executives for handling on their behalf
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            {delegatedItems.length} Active
          </Badge>
        </div>

        <HelpGuideCard
          title="Your Delegated Tasks"
          description="Executives have delegated these correspondence items to you. Review each item, take the required action, and mark as complete when done. The executive will be notified of your progress."
          links={[
            { label: 'My Inbox', href: '/inbox' },
            { label: 'Help & Guides', href: '/help' },
          ]}
        />

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
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <Card key={item.id as string} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Badge variant={getPriorityColor(item.correspondence.priority)}>
                          {item.correspondence.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <FileText className="h-3 w-3" />
                          {item.correspondence.correspondence_type}
                        </Badge>
                        {item.expires_at && (
                          <Badge variant="secondary" className="gap-1">
                            <Calendar className="h-3 w-3" />
                            Expires: {formatDateShort(item.expires_at)}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">
                        {item.correspondence.subject}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Ref: {item.correspondence.reference_number}
                      </CardDescription>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Delegated</p>
                      <p className="font-medium">{formatDateShort(item.delegated_at)}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="bg-muted/50 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <UserIcon className="h-4 w-4" />
                      <span>Delegated by:</span>
                      <span className="font-medium text-foreground">
                        {item.principal.first_name} {item.principal.last_name}
                      </span>
                    </div>
                    {item.notes && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-sm font-medium mb-1">Instructions:</p>
                        <p className="text-sm text-muted-foreground italic">"{item.notes}"</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => router.push(`/correspondence/${item.correspondence.id}`)}
                      className="flex-1"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      View & Handle Correspondence
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleMarkComplete(item.id as string)}
                      disabled={completingIds.has(item.id as string)}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-500/10"
                    >
                      {completingIds.has(item.id as string) ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Mark Complete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DelegatedInbox;

