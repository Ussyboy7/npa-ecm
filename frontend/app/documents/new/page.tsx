"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DocumentUploadDialog } from '@/components/dms/DocumentUploadDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FilePlus, Upload } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { DocumentRecord } from '@/lib/dms-storage';

export default function CreateDocumentPage() {
  const router = useRouter();
  const { currentUser, hydrated } = useCurrentUser();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createdDocument, setCreatedDocument] = useState<DocumentRecord | null>(null);

  useEffect(() => {
    // Auto-open dialog when page loads
    if (hydrated && currentUser) {
      setDialogOpen(true);
    }
  }, [hydrated, currentUser]);

  const handleComplete = (document: DocumentRecord) => {
    setCreatedDocument(document);
    setDialogOpen(false);
    // Redirect to document detail page
    router.push(`/dms/${document.id}`);
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

  if (!currentUser) {
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
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Create Document</h1>
          <p className="text-muted-foreground mt-1">
            Upload a file or create a new document from scratch
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>New Document</CardTitle>
            <CardDescription>
              Upload a file or compose a new document. You can add metadata, tags, and organize it in workspaces.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="rounded-full bg-primary/10 p-6">
                <FilePlus className="h-12 w-12 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Ready to create a document?</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Click the button below to open the document creation dialog. You can upload files, compose text documents, or use templates.
                </p>
              </div>
              <Button onClick={() => setDialogOpen(true)} size="lg" className="gap-2">
                <Upload className="h-4 w-4" />
                Create Document
              </Button>
            </div>
          </CardContent>
        </Card>

        <DocumentUploadDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode="create"
          currentUser={currentUser}
          onComplete={handleComplete}
        />
      </div>
    </DashboardLayout>
  );
}

