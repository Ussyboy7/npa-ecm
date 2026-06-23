"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Archive, Calendar, User as UserIcon, FileText, Shield } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Correspondence } from '@/lib/npa-structure';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { logError } from '@/lib/client-logger';
import { formatDateShort } from '@/lib/correspondence-helpers';

export default function ArchivedCorrespondenceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { currentUser, hydrated } = useCurrentUser();
  const { users } = useOrganization();

  const [item, setItem] = useState<Correspondence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !hydrated) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch<Record<string, unknown>>(`/correspondence/items/archive-records/${id}/`);
        setItem(mapApiCorrespondence(response as Record<string, unknown>));
      } catch (err) {
        logError('Failed to load archived correspondence', err);
        setError('Failed to load archived correspondence.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, hydrated]);

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading archived correspondence..." />
      </DashboardLayout>
    );
  }

  if (error || !item) {
    return (
      <DashboardLayout>
        <ErrorState message={error ?? 'Correspondence not found'} onRetry={() => router.refresh()} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-4xl p-4 sm:p-6 space-y-6">
        <Button variant="ghost" onClick={() => router.push('/correspondence/archived')} className="w-fit">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Archived
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xl">{item.subject}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Reference: {item.referenceNumber ?? 'N/A'}
                </p>
              </div>
              <Badge variant="secondary">
                <Archive className="h-3 w-3 mr-1" />
                Archived
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Sender</p>
                <p className="text-sm">{item.senderName || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Recipient</p>
                <p className="text-sm">{item.recipientName || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Priority</p>
                <p className={`text-sm font-medium ${getPriorityColor(item.priority)}`}>
                  {item.priority ? item.priority.charAt(0).toUpperCase() + item.priority.slice(1) : 'N/A'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Document Type</p>
                <p className="text-sm capitalize">{item.documentType || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Direction</p>
                <p className="text-sm capitalize">{item.direction || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Date Received</p>
                <p className="text-sm">{item.receivedDate ? formatDateShort(item.receivedDate) : 'N/A'}</p>
              </div>
              {item.dispatchDate && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Date Dispatched</p>
                  <p className="text-sm">{formatDateShort(item.dispatchDate)}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Status</p>
                <Badge variant="outline">{item.status}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
