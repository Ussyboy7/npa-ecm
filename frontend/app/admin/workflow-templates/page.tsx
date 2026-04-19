"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { LoadingState } from "@/components/shared/LoadingState";

/**
 * List/edit UX lives in Templates Hub. This path is kept for bookmarks and nav
 * that expect /admin/workflow-templates without an id.
 */
export default function Page() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/templates-hub?tab=workflows");
  }, [router]);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <LoadingState message="Opening workflow templates…" />
      </div>
    </DashboardLayout>
  );
}
