"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";
import { getPlatformHomePath } from "@/lib/platform-navigation";

/** Platform hub lands on the first tab the user can access. */
export default function PlatformIndexPage() {
  const router = useRouter();
  const visibility = useSidebarVisibility();

  useEffect(() => {
    const target = getPlatformHomePath(visibility);
    if (target) router.replace(target);
  }, [router, visibility]);

  return null;
}
