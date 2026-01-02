"use client";

import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function FileUploadHelpPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/help">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Help
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              File Upload Guide
            </CardTitle>
            <CardDescription>
              Learn about supported file formats, size limits, and upload best practices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Supported File Formats
              </h3>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge>PDF</Badge>
                <Badge>Word (.docx)</Badge>
                <Badge>Excel (.xlsx)</Badge>
                <Badge>PowerPoint (.pptx)</Badge>
                <Badge>Images (JPG, PNG, GIF)</Badge>
                <Badge>Text Files (.txt)</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Most common document formats are supported. For best results, use PDF or Word documents.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                File Size Limits
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Maximum file size:</strong> 50MB per file</li>
                <li><strong>Bulk upload:</strong> Multiple files can be uploaded at once</li>
                <li><strong>Large files:</strong> If your file exceeds the limit, try compressing it or splitting it into smaller parts</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Upload Tips
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Ensure your file is not corrupted before uploading</li>
                <li>Use descriptive file names to make documents easier to find</li>
                <li>Fill in document metadata (title, description, tags) for better organization</li>
                <li>For scanned documents, use OCR processing to enable full-text search</li>
                <li>Check your network connection before uploading large files</li>
              </ul>
            </div>

            <div className="pt-4 border-t">
              <Button variant="outline" asChild>
                <Link href="/help">Back to Help Center</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


