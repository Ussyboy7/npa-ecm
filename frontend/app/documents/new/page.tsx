"use client";

import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DocumentUploadDialog } from '@/components/dms/DocumentUploadDialog';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { DocumentRecord } from '@/lib/dms-storage';

export default function CreateDocumentPage() {
  const router = useRouter();
  const { currentUser, hydrated } = useCurrentUser();

  const handleComplete = (document: DocumentRecord) => {
    router.push(`/dms/${document.id}`);
  };

  const handleCancel = () => {
    router.back();
  };

  if (!hydrated) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentUser?.id) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Please log in to create documents</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-7xl p-4 sm:p-6 flex flex-col min-h-0 flex-1 gap-4">
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Create Document</h1>
              <p className="text-sm text-muted-foreground">
                Compose or upload your document using the Quill editor.
              </p>
            </div>
            <span className="inline-flex rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm font-medium">
              Quill
            </span>
          </div>
        </section>

        <div className="min-h-0 flex-1">
          <DocumentUploadDialog
            mode="create"
            currentUser={currentUser}
            onComplete={handleComplete}
            onCancel={handleCancel}
            asPage
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
