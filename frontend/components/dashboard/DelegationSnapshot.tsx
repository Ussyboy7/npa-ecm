"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import {
  correspondenceQueueBadgeClass,
  correspondenceQueueListStackClass,
} from '@/components/shared/registry-queue-styles';

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
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        Delegation
      </CardTitle>
      <p className="text-sm text-muted-foreground">
        Principals, secretariat, and acting assignments by office.
      </p>
    </CardHeader>
    <CardContent className="space-y-2">
      {delegationSnapshot.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No delegation snapshot for your offices.
        </p>
      ) : (
        <div className={correspondenceQueueListStackClass}>
          {delegationSnapshot.map((entry) => (
            <div
              key={entry.officeId}
              className="rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/40"
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
    </CardContent>
  </Card>
);
