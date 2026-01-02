"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useUserPermissions } from '@/hooks/use-user-permissions';

/**
 * Redirect /analytics to appropriate default page
 * Analytics are now separate pages instead of tabs
 */
export default function AnalyticsPage() {
  const router = useRouter();
  const { currentUser, hydrated } = useCurrentUser();
  const permissions = useUserPermissions(currentUser ?? undefined);

  useEffect(() => {
    if (!hydrated) return;
    
    // Default to performance analytics if user has access, otherwise executive dashboard
    if (permissions.canAccessAnalytics) {
      router.replace('/analytics/performance');
    } else if (permissions.canAccessExecutiveDashboard) {
      router.replace('/analytics/executive');
    } else if (permissions.canAccessReports) {
      router.replace('/analytics/reports');
    } else {
      router.replace('/analytics/cases');
    }
  }, [hydrated, permissions, router]);

  return null;
}

