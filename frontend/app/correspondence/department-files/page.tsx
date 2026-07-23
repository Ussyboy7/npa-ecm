"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function DepartmentFilesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to records page
    router.replace('/correspondence/records');
  }, [router]);

  return (
    <>
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Redirecting to Archives...</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
