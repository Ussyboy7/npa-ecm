"use client";

import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Upload, Search, Filter, Share2, Archive, Trash2, FileCheck, AlertCircle, Lightbulb, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function DMSHelpPage() {
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

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Document Management System (DMS) Help</h1>
            <p className="text-muted-foreground">
              Learn how to create, manage, and collaborate on documents in the ECM system.
            </p>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and how to perform them</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Documents
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Click "New Document" to upload files or compose documents. Supported formats: PDF, Word, Excel, PowerPoint, Images.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Search Documents
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Use the search bar (Cmd+K) to find documents by title, content, or reference number. Recent searches are saved.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filter Documents
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Use filters to narrow results by type, status, division, department, author, or date range.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    Share Documents
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Click "Share" on any document to grant access to users, divisions, or departments with specific permissions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="upload">
                  <AccordionTrigger>How do I upload a document?</AccordionTrigger>
                  <AccordionContent>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>Click the "New Document" button in the DMS page</li>
                      <li>Fill in the document metadata (title, type, status, etc.)</li>
                      <li>Either upload a file or compose a document using the rich text editor</li>
                      <li>Click "Create Document" to save</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="templates">
                  <AccordionTrigger>How do I use document templates?</AccordionTrigger>
                  <AccordionContent>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>Click "More" → "From Template" to see available templates</li>
                      <li>Select a template that matches your document type</li>
                      <li>Enter a document title and click "Create Document"</li>
                      <li>The document will be created with the template's default metadata and structure</li>
                      <li>You can manage templates by clicking "More" → "Manage Templates"</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="versions">
                  <AccordionTrigger>How do I manage document versions?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm mb-2">Document versions allow you to track changes over time:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Open a document and go to the "Versions" tab</li>
                      <li>Click "Upload New Version" to add a new version</li>
                      <li>Use "Replace Version" to update an existing version</li>
                      <li>Click "Compare" to see differences between versions</li>
                      <li>Use OCR processing to extract text from scanned documents</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="permissions">
                  <AccordionTrigger>How do document permissions work?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm mb-2">Document permissions control who can view, edit, or manage documents:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li><strong>View:</strong> Can read the document</li>
                      <li><strong>Edit:</strong> Can modify the document and upload versions</li>
                      <li><strong>Manage:</strong> Can change permissions and delete the document</li>
                      <li>Permissions can be granted to individual users, divisions, departments, or grade levels</li>
                      <li>Use the "Share" button to manage permissions</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="workspaces">
                  <AccordionTrigger>What are workspaces?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm mb-2">Workspaces are collaborative spaces for organizing related documents:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Create workspaces for projects, teams, or topics</li>
                      <li>Add members to collaborate on workspace documents</li>
                      <li>Assign documents to workspaces during upload or editing</li>
                      <li>Use "Manage Workspaces" to create and organize workspaces</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bulk">
                  <AccordionTrigger>How do I perform bulk operations?</AccordionTrigger>
                  <AccordionContent>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>Select documents using the checkboxes</li>
                      <li>Click the bulk actions dropdown (appears when documents are selected)</li>
                      <li>Choose an action: Share, Link to Case, Archive, or Delete</li>
                      <li>Confirm the operation</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="errors">
                  <AccordionTrigger>What should I do if I encounter an error?</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-semibold mb-1">Network Errors:</p>
                        <p>Check your internet connection and try again. If the problem persists, contact your system administrator.</p>
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Permission Errors:</p>
                        <p>You may not have permission to perform this action. Contact the document owner or your administrator.</p>
                      </div>
                      <div>
                        <p className="font-semibold mb-1">File Size Errors:</p>
                        <p>Files must be under 50MB. Try compressing the file or splitting it into smaller parts.</p>
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Other Errors:</p>
                        <p>Try refreshing the page. If the error persists, contact support with the error details.</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Keyboard Shortcuts */}
          <Card>
            <CardHeader>
              <CardTitle>Keyboard Shortcuts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Focus Search</span>
                    <Badge variant="outline">Cmd+K</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">New Document</span>
                    <Badge variant="outline">Cmd+N</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Close Modal</span>
                    <Badge variant="outline">Esc</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Tips & Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Organizing Documents</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Use tags to categorize documents for easy filtering</li>
                    <li>Create workspaces for related documents</li>
                    <li>Use collections to group documents by project or topic</li>
                    <li>Set appropriate sensitivity levels to control access</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Collaboration</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Share documents with team members for collaboration</li>
                    <li>Use comments to discuss document content</li>
                    <li>Track document access in the Access Logs tab</li>
                    <li>Use workspaces for team-based document management</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Version Control</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Upload new versions instead of creating duplicate documents</li>
                    <li>Add version notes to describe changes</li>
                    <li>Use version comparison to review changes</li>
                    <li>Process OCR on scanned documents for full-text search</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Search & Filtering</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Use specific keywords for better search results</li>
                    <li>Combine multiple filters to narrow results</li>
                    <li>Save filter presets for common searches</li>
                    <li>Recent searches are saved for quick access</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Need More Help?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                If you need additional assistance, please contact your system administrator or support team.
              </p>
              <Button variant="outline" asChild>
                <Link href="/help">Back to Help Center</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}


