"use client";

import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scan, FileText, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { BatchUploadDialog } from '@/components/capture/BatchUploadDialog';
import { ScanDialog } from '@/components/capture/ScanDialog';

export default function ContentCapturePage() {
  const router = useRouter();
  const [batchUploadOpen, setBatchUploadOpen] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Content Capture</h1>
          <p className="text-muted-foreground mt-1">
            OCR processing, document scanning, and batch document processing
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5" />
                OCR Processing
              </CardTitle>
              <CardDescription>
                Extract text from scanned documents and images using Optical Character Recognition
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Process OCR on documents from the Document Management system. OCR results will be available for search and indexing.
              </p>
              <Button onClick={() => router.push('/dms')}>
                Go to Document Management
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Batch Upload & Processing
              </CardTitle>
              <CardDescription>
                Upload multiple documents and process them with OCR and metadata extraction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Upload multiple documents at once and automatically process them with OCR and intelligent metadata extraction.
              </p>
              <Button onClick={() => setBatchUploadOpen(true)} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Batch Upload
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5" />
                Document Scanning
              </CardTitle>
              <CardDescription>
                Scan physical documents directly into the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Connect to a scanner and digitize physical documents with automatic OCR processing.
              </p>
              <Button onClick={() => setScanDialogOpen(true)} variant="outline">
                <Scan className="h-4 w-4 mr-2" />
                Start Scanning
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              How to Use OCR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold">1. Navigate to Document Management</h4>
              <p className="text-sm text-muted-foreground">
                Go to Document Management to view all documents in the system.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">2. Select a Document</h4>
              <p className="text-sm text-muted-foreground">
                Open a document that contains scanned images or PDFs that need OCR processing.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">3. Process OCR</h4>
              <p className="text-sm text-muted-foreground">
                Use the OCR Processor component on the document detail page to extract text. The extracted text will be searchable and indexed.
              </p>
            </div>
            <div className="pt-4">
              <Button onClick={() => router.push('/dms')}>
                Go to Document Management
              </Button>
            </div>
          </CardContent>
        </Card>

        <BatchUploadDialog
          open={batchUploadOpen}
          onOpenChange={setBatchUploadOpen}
          onComplete={(documents) => {
            setBatchUploadOpen(false);
            if (documents.length > 0) {
              router.push('/dms');
            }
          }}
        />

        <ScanDialog
          open={scanDialogOpen}
          onOpenChange={setScanDialogOpen}
        />
      </div>
    </DashboardLayout>
  );
}

