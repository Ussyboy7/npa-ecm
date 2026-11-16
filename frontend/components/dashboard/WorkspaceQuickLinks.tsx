"use client";

import Link from 'next/link';
import { APP_ROUTES } from '@/lib/authorization';

interface WorkspaceQuickLinksProps {
  showOfficeInbox?: boolean;
}

export function WorkspaceQuickLinks({ showOfficeInbox }: WorkspaceQuickLinksProps) {
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <Link href="/inbox" className="text-primary hover:underline">Inbox</Link>
      <Link href="/correspondence/my-sent" className="text-primary hover:underline">Sent</Link>
      <Link href={APP_ROUTES.casesMy} className="text-primary hover:underline">Cases</Link>
      <Link href={APP_ROUTES.documents} className="text-primary hover:underline">Documents</Link>
      {showOfficeInbox ? (
        <Link href="/correspondence/inbox" className="text-primary hover:underline">Office inbox</Link>
      ) : null}
    </p>
  );
}
