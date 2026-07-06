"use client";

import { WebhookManager } from '@/components/integrations/WebhookManager';
import { EmailConnectorManager } from '@/components/integrations/EmailConnectorManager';
import { ERPConnectorManager } from '@/components/integrations/ERPConnectorManager';
import { HRMSConnectorManager } from '@/components/integrations/HRMSConnectorManager';
import { IntegrationLogsViewer } from '@/components/integrations/IntegrationLogsViewer';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Webhook, Mail, Database, Activity, Users } from 'lucide-react';

export default function IntegrationHubPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PermissionGate
        permission="can_manage_integration"
        title="Integration Hub Access Required"
        loadingMessage="Loading integration hub…"
      >
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Integration Hub</h1>
            <p className="text-muted-foreground mt-1">
              Configure webhooks, email, HRMS, ERP connectors, and view activity logs
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
              <TabsTrigger value="hrms">
                <Users className="h-4 w-4 mr-2" />
                HRMS
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
              <EmailConnectorManager />
            </TabsContent>

            <TabsContent value="erp" className="space-y-4">
              <ERPConnectorManager />
            </TabsContent>

            <TabsContent value="hrms" className="space-y-4">
              <HRMSConnectorManager />
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <IntegrationLogsViewer />
            </TabsContent>
          </Tabs>
        </div>
      </PermissionGate>
    </div>
  );
}
