"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function UsersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/users-roles?tab=users");
  }, [router]);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Redirecting to Users & Roles...</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


