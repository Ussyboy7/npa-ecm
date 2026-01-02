"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Shield, Briefcase, Loader2 } from "lucide-react";

// Import Users Management
import { UsersManagementTab } from "@/components/admin/UsersManagementTab";
// Import Roles Management  
import { RolesManagementTab } from "@/components/admin/RolesManagementTab";
// Import Assistants Management
import { AssistantsManagementTab } from "@/components/admin/AssistantsManagementTab";

export default function UsersRolesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>("users");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["users", "roles", "assistants"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/admin/users-roles?tab=${value}`, { scroll: false });
  };

  // Dynamic header based on active tab
  const headerConfig = useMemo(() => {
    switch (activeTab) {
      case "users":
        return {
          icon: Users,
          title: "User Management",
          description: "View key users across the NPA organizational structure and their assignments.",
        };
      case "roles":
        return {
          icon: Shield,
          title: "Roles Management",
          description: "Manage system roles and their assignments across the organization.",
        };
      case "assistants":
        return {
          icon: Briefcase,
          title: "Assistants Management",
          description: "Manage Technical Assistants (TAs) and Personal Assistants (PAs) for executives",
        };
      default:
        return {
          icon: Users,
          title: "Users & Roles",
          description: "Manage users, system roles, and assistant assignments",
        };
    }
  }, [activeTab]);

  const HeaderIcon = headerConfig.icon;

  return (
    <ClientErrorBoundary>
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <HeaderIcon className="h-8 w-8 text-primary" />
              {headerConfig.title}
            </h1>
            <p className="text-muted-foreground mt-1">
              {headerConfig.description}
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Roles
              </TabsTrigger>
              <TabsTrigger value="assistants" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Assistants
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-6">
              <Suspense fallback={
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              }>
                <UsersManagementTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="roles" className="mt-6">
              <RolesManagementTab />
            </TabsContent>

            <TabsContent value="assistants" className="mt-6">
              <AssistantsManagementTab />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ClientErrorBoundary>
  );
}
