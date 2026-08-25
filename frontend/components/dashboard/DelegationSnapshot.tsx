"use client";

import { Badge } from '@/components/ui/badge';
import {
  correspondenceQueueBadgeClass,
  correspondenceQueueListStackClass,
} from '@/components/shared/registry-queue-styles';
import { appType } from '@/lib/app-type';

interface DelegationMember {
  userId: string;
  name: string;
  role: string;
  isPrimary: boolean;
}

interface DelegationEntry {
  officeId: string;
  officeName: string;
  members: DelegationMember[];
}

interface DelegationSnapshotProps {
  delegationSnapshot: DelegationEntry[];
}

export const DelegationSnapshot = ({ delegationSnapshot }: DelegationSnapshotProps) => (
  <div className="rounded-xl border border-border/60">
    <div className="border-b border-border/60 px-4 py-3">
      <h2 className={appType.panelTitle}>Delegation</h2>
      <p className={appType.caption}>
        Principals, secretariat, and acting assignments by office.
      </p>
    </div>
    <div className="space-y-2 p-4">
      {delegationSnapshot.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No delegation snapshot for your offices.
        </p>
      ) : (
        <div className={correspondenceQueueListStackClass}>
          {delegationSnapshot.map((entry) => (
            <div
              key={entry.officeId}
              className="rounded-xl border border-border/60 bg-muted/20 p-3 transition-colors hover:bg-muted/40"
            >
              <p className="text-sm font-semibold">{entry.officeName}</p>
              <p className="text-xs text-muted-foreground">
                {entry.members.length} active assignment
                {entry.members.length === 1 ? '' : 's'}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {entry.members.map((member) => (
                  <Badge
                    key={member.userId + member.role}
                    variant={member.isPrimary ? 'secondary' : 'outline'}
                    className={correspondenceQueueBadgeClass}
                  >
                    {member.name} · {member.role}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);
