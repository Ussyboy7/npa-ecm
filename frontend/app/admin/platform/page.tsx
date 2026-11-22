"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { PermissionDeniedCard } from "@/components/shared/PermissionDeniedCard";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";
import { getPlatformHomePath } from "@/lib/platform-navigation";

/** Platform hub lands on the first tab the user can access. */
export default function PlatformIndexPage() {
  const router = useRouter();
  const visibility = useSidebarVisibility();
  const target = getPlatformHomePath(visibility);

  useEffect(() => {
    if (target) router.replace(target);
  }, [router, target]);

  if (!visibility.isVisibilityReady) return null;

  if (!target) {
    return (
      <AdminPageShell
        title="Platform"
        subtitle="Platform administration"
        icon={Activity}
      >
        <PermissionDeniedCard
          title="Platform access required"
          check={null}
          fallbackMessage="Your role does not include platform administration access."
        />
      </AdminPageShell>
    );
  }

  return null;
}
