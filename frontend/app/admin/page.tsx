"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/shared/LoadingState";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";
import { getAdminHomePath } from "@/lib/admin-navigation";

export default function AdminLandingRedirect() {
  const router = useRouter();
  const visibility = useSidebarVisibility();
  const adminHome = useMemo(() => getAdminHomePath(visibility), [visibility]);

  useEffect(() => {
    router.replace(adminHome);
  }, [router, adminHome]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <LoadingState message="Opening administration…" />
    </div>
  );
}
