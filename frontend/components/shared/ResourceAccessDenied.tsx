"use client";

import { useRouter } from "next/navigation";
import { PermissionDeniedCard } from "@/components/shared/PermissionDeniedCard";
import type { PermissionCheckResult } from "@/hooks/use-permission-check";

type ResourceAccessDeniedProps = {
  title?: string;
  check: PermissionCheckResult | null;
  loading?: boolean;
  backHref: string;
  backLabel?: string;
};

export function ResourceAccessDenied({
  title = "Access Restricted",
  check,
  loading = false,
  backHref,
  backLabel = "Go Back",
}: ResourceAccessDeniedProps) {
  const router = useRouter();

  return (
    <div className="container mx-auto p-6 flex items-center justify-center min-h-[50vh]">
      <PermissionDeniedCard
        title={title}
        check={check}
        loading={loading}
        fallbackMessage="You do not have permission to view this item, or it does not exist."
        onBack={() => router.push(backHref)}
        backLabel={backLabel}
      />
    </div>
  );
}
