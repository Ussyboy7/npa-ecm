"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * My Sent detail is the same correspondence resource as `/correspondence/[id]`.
 * Keep this route for bookmarks / register redirects; chrome lives on the shared detail page.
 */
export default function MySentDetailRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  useEffect(() => {
    if (id) {
      router.replace(`/correspondence/${id}`);
    }
  }, [id, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Redirecting" />
    </div>
  );
}
