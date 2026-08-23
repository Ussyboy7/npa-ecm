"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import Link from "next/link";
import type { UsersByRoleResponse } from "@/lib/admin-dashboard-api";

interface UsersByRoleGridProps {
  data: UsersByRoleResponse | null;
}

export function UsersByRoleGrid({ data }: UsersByRoleGridProps) {
  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Users by Role
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {data.roles.map((role) => (
            <Link
              key={role.id ?? "unassigned"}
              href={role.id ? `/admin/users-roles?tab=users&role=${role.id}` : "/admin/users-roles?tab=users"}
              className="block"
            >
              <div className="rounded-lg border p-3 hover:bg-accent transition-colors">
                <div className="text-2xl font-bold">{role.count}</div>
                <div className="text-xs text-muted-foreground truncate">{role.name}</div>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Total: {data.total_users} users
        </div>
      </CardContent>
    </Card>
  );
}
