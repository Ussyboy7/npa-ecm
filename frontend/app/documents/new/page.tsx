"use client";

import { useRouter } from 'next/navigation';
import { DocumentUploadDialog } from '@/components/dms/DocumentUploadDialog';
import { useCurrentUser } from '@/hooks/use-current-user';
import { appType } from '@/lib/app-type';
import type { DocumentRecord } from '@/lib/api/dms';

export default function CreateDocumentPage() {
  const router = useRouter();
  const { currentUser } = useCurrentUser();

  const handleComplete = (document: DocumentRecord) => {
    router.push(`/dms/${document.id}`);
  };

  const handleOpenChange = () => {
    // A direct visit (bookmark, refresh) has no history entry, and router.back()
    // would then do nothing at all — land on the documents list instead.
    if (window.history.length > 1) router.back();
    else router.push('/dms');
  };

  return (
    <>
      {!currentUser?.id ? (
        <div className="container mx-auto p-4 md:p-6">
          <p className={appType.meta}>Please log in to create documents</p>
        </div>
      ) : (
        <div className="container mx-auto max-w-5xl p-4 md:p-6 flex flex-col gap-4">
          <div>
            <h1 className={appType.pageTitleList}>Create Document</h1>
            <p className={appType.pageSubtitle}>
              Compose or upload a document with metadata, templates, and content.
            </p>
          </div>

          <DocumentUploadDialog
            open
            onOpenChange={handleOpenChange}
            mode="create"
            currentUser={currentUser}
            onComplete={handleComplete}
            asPage
          />
        </div>
      )}
    </>
  );
}
