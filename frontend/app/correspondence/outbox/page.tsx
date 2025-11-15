"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { Mail, Search, Send, AlertCircle } from 'lucide-react';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { useCurrentUser } from '@/hooks/use-current-user';
import { formatDateShort } from '@/lib/correspondence-helpers';

const OutboxPage = () => {
  const { correspondence, syncFromApi } = useCorrespondence();
  const { currentUser } = useCurrentUser();
  const [query, setQuery] = useState('');

  useEffect(() => {
    void syncFromApi();
  }, [syncFromApi]);

  const outboxItems = useMemo(() => {
    if (!currentUser) return [];
    const lowered = query.toLowerCase();
    return correspondence
      .filter((item) => {
        const isOwner = item.createdById === currentUser.id;
        if (!isOwner) return false;
        const isPending =
          item.status === 'pending' || item.status === 'in-progress' || item.status === 'archived'
            ? true
            : false;
        if (!isPending) return false;
        if (!lowered) return true;
        return (
          item.subject.toLowerCase().includes(lowered) ||
          item.referenceNumber.toLowerCase().includes(lowered) ||
          item.senderName.toLowerCase().includes(lowered)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt ?? b.receivedDate ?? '').getTime() -
          new Date(a.updatedAt ?? a.receivedDate ?? '').getTime(),
      );
  }, [correspondence, currentUser, query]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Send className="h-7 w-7 text-primary" />
              Outbox / Pending Dispatch
            </h1>
            <p className="text-muted-foreground">
              Drafts and correspondence you created that are awaiting approval or dispatch.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/correspondence/register">Register New</Link>
          </Button>
        </div>

        <HelpGuideCard
          title="Managing Pending Dispatch"
          description="Track memos you drafted or registered. Use this list to follow up on approvals, resend reminders, or withdraw drafts that need editing."
          links={[
            { label: 'Correspondence Inbox', href: '/correspondence/inbox' },
            { label: 'Help & Guides', href: '/help' },
          ]}
        />

        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search drafts by subject, reference, or recipient..."
            className="pl-10"
          />
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Mail className="h-5 w-5 text-primary" />
              {outboxItems.length} pending item{outboxItems.length === 1 ? '' : 's'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {outboxItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                You have no drafts or pending dispatch items at the moment.
              </div>
            ) : (
              outboxItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/correspondence/${item.id}`}
                  className="block border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground truncate">{item.subject}</h3>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ref: {item.referenceNumber} • Last updated:{' '}
                    {item.updatedAt ? formatDateShort(item.updatedAt) : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Received: {item.receivedDate ? formatDateShort(item.receivedDate) : '—'}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default OutboxPage;


