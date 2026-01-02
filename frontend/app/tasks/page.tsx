"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect /tasks to /inbox
 * My Tasks & Alerts functionality has been merged into My Inbox
 * with SLA-focused sections (Overdue, Due Soon, Pending Approvals)
 */
export default function TasksPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/inbox');
  }, [router]);

  return null;
}
