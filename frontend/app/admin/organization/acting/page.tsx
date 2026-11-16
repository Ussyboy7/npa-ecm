"use client";

import { useRef } from "react";
import { Plus, UserCheck } from "lucide-react";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { ActingWorkspace, type ActingWorkspaceHandle } from "@/components/acting/ActingWorkspace";
import { OrganizationTabList } from "@/components/admin/OrganizationTabList";
import { PermissionDeniedCard } from "@/components/shared/PermissionDeniedCard";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useOrgUsers } from "@/hooks/use-org-users";
import { getOrganizationActingCapabilities } from "@/lib/acting-permissions";
import type { User } from "@/lib/npa-structure";

const SUBTITLE =
  "Appoint an officer to temporarily hold an office seat. Open My Inbox items for that seat move to the acting officer and return automatically when the appointment ends.";

export default function ActingAppointmentsPage() {
  const { currentUser } = useCurrentUser();
  const capabilities = getOrganizationActingCapabilities(currentUser);

  if (!currentUser || !capabilities.canAccess) {
    return (
      <AdminPageShell
        title="Organization"
        subtitle={SUBTITLE}
        icon={UserCheck}
        tabs={<OrganizationTabList />}
      >
        <PermissionDeniedCard
          title="Organization Acting access required"
          check={null}
          fallbackMessage="Only organization administrators can manage acting appointments here. Use Tools → Acting for your own appointments and requests."
        />
      </AdminPageShell>
    );
  }

  return (
    <OrganizationActingContent
      currentUser={currentUser}
      canManageAppointments={capabilities.canManageAppointments}
    />
  );
}

function OrganizationActingContent({
  currentUser,
  canManageAppointments,
}: {
  currentUser: User;
  canManageAppointments: boolean;
}) {
  const workspaceRef = useRef<ActingWorkspaceHandle>(null);
  const { offices, officeMemberships } = useOrganization();
  const { users } = useOrgUsers();

  return (
    <AdminPageShell
      title="Organization"
      subtitle={SUBTITLE}
      icon={UserCheck}
      tabs={<OrganizationTabList />}
      actions={
        canManageAppointments ? (
          <Button size="compact" onClick={() => workspaceRef.current?.openAppointment()}>
            <Plus className="h-4 w-4" />
            Appoint acting
          </Button>
        ) : null
      }
    >
      <ActingWorkspace
        ref={workspaceRef}
        mode="admin"
        currentUser={currentUser}
        offices={offices}
        officeMemberships={officeMemberships}
        users={users}
      />
    </AdminPageShell>
  );
}
