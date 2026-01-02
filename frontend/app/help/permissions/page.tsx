"use client";

import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, ShieldAlert, UserCheck, Users } from 'lucide-react';

export default function PermissionsHelpPage() {
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
              <Shield className="h-5 w-5" />
              Understanding Document Permissions
            </CardTitle>
            <CardDescription>
              Learn how document permissions work and how to request access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Permission Levels
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>View:</strong> You can read the document but cannot make changes.
                </div>
                <div>
                  <strong>Edit:</strong> You can modify the document, upload new versions, and add comments.
                </div>
                <div>
                  <strong>Manage:</strong> You can change permissions, delete the document, and perform administrative actions.
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Requesting Access
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Contact the document owner directly to request access</li>
                <li>If you don't know the owner, contact your system administrator</li>
                <li>Provide details about why you need access to the document</li>
                <li>The owner or administrator can grant you the appropriate permissions</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Sharing Documents
              </h3>
              <p className="text-sm mb-2">To share a document with others:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Open the document you want to share</li>
                <li>Click the "Share" button</li>
                <li>Select users, divisions, or departments</li>
                <li>Choose the permission level (View, Edit, or Manage)</li>
                <li>Click "Share" to apply permissions</li>
              </ol>
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


