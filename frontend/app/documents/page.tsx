"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function DocumentsLegacyRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dms");
  }, [router]);

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Redirecting to Document Management…</p>
        </CardContent>
      </Card>
    </div>
  );
}
