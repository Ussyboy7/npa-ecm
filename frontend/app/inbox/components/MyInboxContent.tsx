"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { useSidebarCounts } from '@/hooks/use-sidebar-counts';
import { Inbox, Mail, Users2, UserCheck } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import inbox components to reduce initial bundle size
const OfficeInboxContent = dynamic(() => import('./OfficeInboxContent'), {
  loading: () => <div className="p-6 text-center text-muted-foreground">Loading office inbox...</div>,
  ssr: false,
});

// MyInboxContent is the same as the /inbox page content (ExecutiveInbox)
const MyInboxContent = dynamic(() => import('../../inbox/page').then(mod => ({ default: mod.default })), {
  loading: () => <div className="p-6 text-center text-muted-foreground">Loading my inbox...</div>,
  ssr: false,
});

const DelegatedInboxContent = dynamic(() => import('./DelegatedInboxContent'), {
  loading: () => <div className="p-6 text-center text-muted-foreground">Loading delegated items...</div>,
  ssr: false,
});

const ExecutiveSupportInboxContent = dynamic(() => import('./ExecutiveSupportInboxContent'), {
  loading: () => <div className="p-6 text-center text-muted-foreground">Loading executive support inbox...</div>,
  ssr: false,
});

const UnifiedInbox = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, hydrated } = useCurrentUser();
  const { officeMemberships, assistantAssignments } = useOrganization();
  const permissions = useUserPermissions(currentUser ?? undefined);
  const { counts, loading: countsLoading } = useSidebarCounts();

  const [activeTab, setActiveTab] = useState<string>('my');

  const userOfficeIds = useMemo(() => {
    if (!currentUser) return [];
    return officeMemberships
      .filter((membership) => membership.userId === currentUser.id && membership.isActive)
      .map((membership) => membership.officeId);
  }, [currentUser, officeMemberships]);

  const hasCorrespondenceAccess =
    permissions.canViewCorrespondenceRegistry ||
    permissions.canDistribute ||
    userOfficeIds.length > 0;

  const hasAssistantAssignments = useMemo(() => {
    if (!currentUser) return false;
    return assistantAssignments.some(
      (assignment) => String(assignment.assistantId) === String(currentUser.id)
    );
  }, [assistantAssignments, currentUser]);

  const officeInboxCount = counts.officeInbox;
  const myInboxCount = counts.myInbox;
  const delegatedCount = counts.delegated;
  const secretaryInboxCount = counts.secretaryInbox || 0;

  const isSecretary = useMemo(() => {
    if (!currentUser?.systemRole) return false;
    const role = typeof currentUser.systemRole === 'string'
      ? currentUser.systemRole
      : (currentUser.systemRole as Record<string, unknown>).name as string;
    return role?.toLowerCase() === 'secretary';
  }, [currentUser?.systemRole]);

  // Set initial tab from URL or default
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['office', 'my', 'delegated', 'executive-support'].includes(tab)) {
      setActiveTab(tab);
    } else {
      // Default to office inbox if user has access, otherwise my inbox
      // Secretaries default to executive support if they have items
      if (isSecretary && secretaryInboxCount > 0) {
        setActiveTab('executive-support');
      } else {
        setActiveTab(hasCorrespondenceAccess ? 'office' : 'my');
      }
    }
  }, [searchParams, hasCorrespondenceAccess, isSecretary, secretaryInboxCount]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL without navigation
    const newUrl = `/inbox?tab=${value}`;
    router.replace(newUrl, { scroll: false });
  };

  if (!currentUser?.id) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <div className="text-center text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Inbox</h1>
            <p className="text-muted-foreground mt-1">
              Manage all your correspondence in one place
            </p>
          </div>
          <div className="flex items-center gap-4">
            {!countsLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Total:</span>
                <Badge variant="destructive">
                  {officeInboxCount + myInboxCount + delegatedCount + secretaryInboxCount}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className={`grid w-full max-w-2xl ${isSecretary ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {hasCorrespondenceAccess && (
              <TabsTrigger value="office" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Office Inbox
                {!countsLoading && officeInboxCount > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {officeInboxCount > 99 ? '99+' : officeInboxCount}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="my" className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              My Inbox
              {!countsLoading && myInboxCount > 0 && (
                <Badge variant="default" className="ml-1">
                  {myInboxCount > 99 ? '99+' : myInboxCount}
                </Badge>
              )}
            </TabsTrigger>
            {(delegatedCount > 0 || hasAssistantAssignments) && (
              <TabsTrigger value="delegated" className="flex items-center gap-2">
                <Users2 className="h-4 w-4" />
                Delegated
                {!countsLoading && delegatedCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  >
                    {delegatedCount > 99 ? '99+' : delegatedCount}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            {isSecretary && (
              <TabsTrigger value="executive-support" className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Executive Support
                {!countsLoading && secretaryInboxCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  >
                    {secretaryInboxCount > 99 ? '99+' : secretaryInboxCount}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {hasCorrespondenceAccess && (
            <TabsContent value="office" className="mt-6">
              <OfficeInboxContent />
            </TabsContent>
          )}

          <TabsContent value="my" className="mt-6">
            <MyInboxContent />
          </TabsContent>

          {(delegatedCount > 0 || hasAssistantAssignments) && (
            <TabsContent value="delegated" className="mt-6">
              <DelegatedInboxContent />
            </TabsContent>
          )}
          {isSecretary && (
            <TabsContent value="executive-support" className="mt-6">
              <ExecutiveSupportInboxContent />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default UnifiedInbox;
