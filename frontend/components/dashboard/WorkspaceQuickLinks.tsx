"use client";

import Link from 'next/link';

interface WorkspaceQuickLinksProps {
  showOfficeInbox?: boolean;
}

export function WorkspaceQuickLinks({ showOfficeInbox }: WorkspaceQuickLinksProps) {
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <Link href="/inbox" className="text-primary hover:underline">Inbox</Link>
      <Link href="/correspondence/outbox" className="text-primary hover:underline">Outbox</Link>
      <Link href="/cases/my" className="text-primary hover:underline">Cases</Link>
      <Link href="/dms" className="text-primary hover:underline">Documents</Link>
      {showOfficeInbox ? (
        <Link href="/correspondence/inbox" className="text-primary hover:underline">Office inbox</Link>
      ) : null}
    </p>
  );
}
