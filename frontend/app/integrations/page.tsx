"use client";

import { DashboardLayout } from '@/components/DashboardLayout';
import { WebhookManager } from '@/components/integrations/WebhookManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Webhook, Mail, Database, Activity } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function IntegrationHubPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Integration Hub</h1>
          <p className="text-muted-foreground mt-1">
            Configure webhooks, email connectors, and ERP integrations
          </p>
        </div>

        <Tabs defaultValue="webhooks" className="space-y-4">
          <TabsList>
            <TabsTrigger value="webhooks">
              <Webhook className="h-4 w-4 mr-2" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-2" />
              Email Connectors
            </TabsTrigger>
            <TabsTrigger value="erp">
              <Database className="h-4 w-4 mr-2" />
              ERP Connectors
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Activity className="h-4 w-4 mr-2" />
              Integration Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="webhooks" className="space-y-4">
            <WebhookManager />
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Connectors</CardTitle>
                <CardDescription>
                  Configure SMTP/IMAP connectors for sending and receiving emails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Email connector management interface coming soon. Use the API to manage email connectors programmatically.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="erp" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ERP Connectors</CardTitle>
                <CardDescription>
                  Configure ERP system connectors (Oracle, SAP, Custom APIs) for document synchronization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  ERP connector management interface coming soon. Use the API to manage ERP connectors programmatically.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Integration Logs</CardTitle>
                <CardDescription>
                  View logs for all integration activities (webhooks, email, ERP)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Integration logs viewer coming soon. Logs are automatically created for all integration activities.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

