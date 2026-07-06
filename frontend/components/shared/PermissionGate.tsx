"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePermissionCheck } from "@/hooks/use-permission-check";
import { PermissionDeniedCard } from "@/components/shared/PermissionDeniedCard";

type PermissionGateProps = {
  permission: string;
  title?: string;
  loadingMessage?: string;
  fallbackMessage?: string;
  children: ReactNode;
};

export function PermissionGate({
  permission,
  title,
  loadingMessage = "Loading…",
  fallbackMessage,
  children,
}: PermissionGateProps) {
  const { currentUser } = useCurrentUser();
  const { result, loading } = usePermissionCheck(permission, Boolean(currentUser));

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {loadingMessage}
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Checking your permissions…
        </CardContent>
      </Card>
    );
  }

  if (result && !result.allowed) {
    return (
      <PermissionDeniedCard
        title={title}
        check={result}
        fallbackMessage={fallbackMessage}
      />
    );
  }

  return <>{children}</>;
}
