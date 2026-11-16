"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { QueuePageShell } from "@/components/shared/QueuePageShell";
import { ActingWorkspace } from "@/components/acting/ActingWorkspace";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function ActingSelfServicePage() {
  const { currentUser } = useCurrentUser();
  const { offices, officeMemberships } = useOrganization();

  if (!currentUser) {
    return (
      <QueuePageShell title="Acting capacity" subtitle="Office seat succession">
        <EmptyState
          icon="inbox"
          title="Sign in required"
          message="Sign in to manage acting appointments for your office."
        />
      </QueuePageShell>
    );
  }

  return (
    <QueuePageShell
      title="Acting"
      subtitle="Appoint someone to hold your seat while you are away, or request Super Admin help when a seat holder is unreachable."
    >
      <ActingWorkspace
        mode="self-service"
        currentUser={currentUser}
        offices={offices}
        officeMemberships={officeMemberships}
      />
    </QueuePageShell>
  );
}
