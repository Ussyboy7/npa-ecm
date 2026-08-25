"use client";

import { useState } from "react";
import { WebhookManager } from "@/components/integrations/WebhookManager";
import { EmailConnectorManager } from "@/components/integrations/EmailConnectorManager";
import { ERPConnectorManager } from "@/components/integrations/ERPConnectorManager";
import { HRMSConnectorManager } from "@/components/integrations/HRMSConnectorManager";
import { IntegrationLogsViewer } from "@/components/integrations/IntegrationLogsViewer";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { PlatformTabList } from "@/components/admin/PlatformTabList";
import { Button } from "@/components/ui/button";
import { Webhook, Mail, Database, Activity, Users } from "lucide-react";

type ConnectorView = "webhooks" | "email" | "erp" | "hrms" | "logs";

export default function IntegrationHubPage() {
  const [connectorView, setConnectorView] = useState<ConnectorView>("webhooks");

  return (
    <AdminPageShell
      title="Platform"
      subtitle="Configure webhooks, email, HRMS, ERP connectors, and view activity logs."
      icon={Webhook}
      tabs={<PlatformTabList />}
    >
      <PermissionGate
        permission="can_manage_integration"
        title="Integration Hub Access Required"
        loadingMessage="Loading integration hub…"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1 rounded-md border border-border/60 p-0.5 w-fit">
            <Button
              type="button"
              variant={connectorView === "webhooks" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setConnectorView("webhooks")}
            >
              <Webhook className="mr-1.5 h-3.5 w-3.5" />
              Webhooks
            </Button>
            <Button
              type="button"
              variant={connectorView === "email" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setConnectorView("email")}
            >
              <Mail className="mr-1.5 h-3.5 w-3.5" />
              Email
            </Button>
            <Button
              type="button"
              variant={connectorView === "erp" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setConnectorView("erp")}
            >
              <Database className="mr-1.5 h-3.5 w-3.5" />
              ERP
            </Button>
            <Button
              type="button"
              variant={connectorView === "hrms" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setConnectorView("hrms")}
            >
              <Users className="mr-1.5 h-3.5 w-3.5" />
              HRMS
            </Button>
            <Button
              type="button"
              variant={connectorView === "logs" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setConnectorView("logs")}
            >
              <Activity className="mr-1.5 h-3.5 w-3.5" />
              Logs
            </Button>
          </div>

          {connectorView === "webhooks" ? <WebhookManager /> : null}
          {connectorView === "email" ? <EmailConnectorManager /> : null}
          {connectorView === "erp" ? <ERPConnectorManager /> : null}
          {connectorView === "hrms" ? <HRMSConnectorManager /> : null}
          {connectorView === "logs" ? <IntegrationLogsViewer /> : null}
        </div>
      </PermissionGate>
    </AdminPageShell>
  );
}
