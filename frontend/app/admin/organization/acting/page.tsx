"use client";

import { forwardRef, useRef } from "react";
import type { ComponentProps } from "react";
import { Plus, UserCheck } from "lucide-react";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { ActingWorkspace, type ActingWorkspaceHandle } from "@/components/acting/ActingWorkspace";
import { OrganizationTabList } from "@/components/admin/OrganizationTabList";
import { PermissionDeniedCard } from "@/components/shared/PermissionDeniedCard";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getActingOfficeScope, getOrganizationActingCapabilities } from "@/lib/acting-permissions";
import type { Office, OfficeMembership } from "@/lib/organization-types";
import type { User } from "@/lib/npa-structure";

const SUBTITLE =
  "Manage acting appointments and requests for your office, or across the organization when you have admin access.";

export default function ActingAppointmentsPage() {
  const { currentUser } = useCurrentUser();
  const capabilities = getOrganizationActingCapabilities(currentUser);
  const { myOfficeMemberships, offices } = useOrganization();
  const { memberOffices, principalOffices } = getActingOfficeScope(currentUser?.id, myOfficeMemberships);

  if (!currentUser || (!capabilities.canAccess && memberOffices.length === 0)) {
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
          fallbackMessage="Organization Acting is available to administrators and active office members."
        />
      </AdminPageShell>
    );
  }

  return (
    <OrganizationActingContent
      currentUser={currentUser}
      offices={offices}
      officeMemberships={myOfficeMemberships}
      memberOffices={memberOffices}
      principalOffices={principalOffices}
      mode={capabilities.canAccess ? "admin" : "self-service"}
      canManageAppointments={capabilities.canManageAppointments}
    />
  );
}

function OrganizationActingContent({
  currentUser,
  offices,
  officeMemberships,
  memberOffices,
  principalOffices,
  mode,
  canManageAppointments,
}: {
  currentUser: User;
  offices: Office[];
  officeMemberships: OfficeMembership[];
  memberOffices: OfficeMembership[];
  principalOffices: OfficeMembership[];
  mode: "admin" | "self-service";
  canManageAppointments: boolean;
}) {
  const workspaceRef = useRef<ActingWorkspaceHandle>(null);

  return (
    <AdminPageShell
      title="Organization"
      subtitle={SUBTITLE}
      icon={UserCheck}
      tabs={<OrganizationTabList />}
      actions={
        <>
          {mode === "self-service" && principalOffices.length > 0 ? (
            <Button size="compact" onClick={() => workspaceRef.current?.openAppointment()}>
              <Plus className="h-4 w-4" />
              Appoint acting
            </Button>
          ) : null}
          {mode === "self-service" && memberOffices.length > 0 ? (
            <Button variant="outline" size="compact" onClick={() => workspaceRef.current?.openRequest()}>
              <Plus className="h-4 w-4" />
              Request acting
            </Button>
          ) : null}
          {mode === "admin" && canManageAppointments ? (
            <Button size="compact" onClick={() => workspaceRef.current?.openAppointment()}>
              <Plus className="h-4 w-4" />
              Appoint acting
            </Button>
          ) : null}
        </>
      }
    >
      {mode === "admin" ? (
        <AdminActingWorkspace
          ref={workspaceRef}
          currentUser={currentUser}
          offices={offices}
        />
      ) : (
        <ActingWorkspace
          ref={workspaceRef}
          mode="self-service"
          currentUser={currentUser}
          offices={offices}
          officeMemberships={officeMemberships}
        />
      )}
    </AdminPageShell>
  );
}

const AdminActingWorkspace = forwardRef<
  ActingWorkspaceHandle,
  Omit<ComponentProps<typeof ActingWorkspace>, "mode" | "officeMemberships">
>(function AdminActingWorkspace(props, ref) {
  return <ActingWorkspace {...props} ref={ref} mode="admin" />;
});
