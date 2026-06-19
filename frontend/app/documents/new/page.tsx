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

  const _handleCancel = () => {
    router.back();
  };

  return (
    <DashboardLayout>
      {!hydrated ? (
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        </div>
      ) : !currentUser?.id ? (
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Please log in to create documents</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="container mx-auto max-w-5xl p-4 sm:p-6 flex flex-col gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Create Document</h1>
            <p className="text-sm text-muted-foreground">
              Compose or upload a document with metadata, templates, and content.
            </p>
          </div>

          <DocumentUploadDialog
            open
            onOpenChange={() => router.back()}
            mode="create"
            currentUser={currentUser}
            onComplete={handleComplete}
            asPage
          />
        </div>
      )}
    </DashboardLayout>
  );
}
