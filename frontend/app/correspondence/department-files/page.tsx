"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DepartmentFilesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/correspondence/records');
  }, [router]);

  return (
    <div className="container mx-auto p-6">
      <div className="rounded-xl border border-border/60 py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Redirecting to Archives...</p>
      </div>
    </div>
  );
}
