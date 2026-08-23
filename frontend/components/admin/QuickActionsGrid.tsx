"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Activity, Shield, Puzzle, HelpCircle, Zap } from "lucide-react";
import Link from "next/link";
import type { SidebarVisibility } from "@/hooks/use-sidebar-visibility";

interface QuickActionsGridProps {
  visibility: SidebarVisibility;
}

interface QuickAction {
  label: string;
  href: string;
  icon: React.ElementType;
  show: boolean;
}

export function QuickActionsGrid({ visibility }: QuickActionsGridProps) {
  const actions: QuickAction[] = [
    { label: "Users & Roles", href: "/admin/users-roles", icon: Users, show: visibility.showUsersRoles },
    { label: "Organization", href: "/admin/organization", icon: Building2, show: visibility.showOrganizationOffices },
    { label: "System Health", href: "/admin/system-health", icon: Activity, show: visibility.showSystemHealth },
    { label: "Audit & Compliance", href: "/audit", icon: Shield, show: visibility.showAuditCompliance },
    { label: "Integrations", href: "/admin/integrations", icon: Puzzle, show: visibility.showIntegrationHub },
    { label: "Templates", href: "/admin/templates-hub", icon: Zap, show: visibility.showTemplates },
    { label: "Helpdesk", href: "/helpdesk", icon: HelpCircle, show: visibility.showHelpdeskQueue },
  ].filter((a) => a.show);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent transition-colors text-sm"
            >
              <action.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{action.label}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
