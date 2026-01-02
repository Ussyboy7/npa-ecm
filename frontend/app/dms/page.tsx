"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function DocumentManagementPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to My Documents (personal workspace)
    router.replace('/documents');
  }, [router]);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Redirecting to My Documents...</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
