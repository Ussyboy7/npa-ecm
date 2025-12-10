"use client";

import { DashboardLayout } from '@/components/DashboardLayout';
import { RetentionPolicyManager } from '@/components/records/RetentionPolicyManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileClock, Shield, Archive, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function RecordsManagementPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Records Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage retention policies, legal holds, and disposition workflows for compliance
          </p>
        </div>

        <Tabs defaultValue="policies" className="space-y-4">
          <TabsList>
            <TabsTrigger value="policies">
              <FileClock className="h-4 w-4 mr-2" />
              Retention Policies
            </TabsTrigger>
            <TabsTrigger value="legal-holds">
              <Shield className="h-4 w-4 mr-2" />
              Legal Holds
            </TabsTrigger>
            <TabsTrigger value="dispositions">
              <Archive className="h-4 w-4 mr-2" />
              Dispositions
            </TabsTrigger>
            <TabsTrigger value="schedules">
              <Calendar className="h-4 w-4 mr-2" />
              Retention Schedules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="policies" className="space-y-4">
            <RetentionPolicyManager />
          </TabsContent>

          <TabsContent value="legal-holds" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Legal Holds</CardTitle>
                <CardDescription>
                  Manage legal holds to prevent document deletion or archival during legal proceedings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Legal Hold management interface coming soon. Use the API to manage legal holds programmatically.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dispositions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dispositions</CardTitle>
                <CardDescription>
                  View and manage disposition workflows for records that have reached their retention end date
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Disposition management interface coming soon. Dispositions are automatically created when retention periods end.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedules" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Retention Schedules</CardTitle>
                <CardDescription>
                  View retention schedules for all records in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Retention schedule viewer coming soon. Schedules are automatically calculated when retention policies are applied.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

