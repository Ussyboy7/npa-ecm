"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Zap, Loader2 } from "lucide-react";
import { HelpGuideCard } from "@/components/help/HelpGuideCard";
import { ContextualHelp } from "@/components/help/ContextualHelp";

// Import SLA Configuration
import { SLAConfigurationTab } from "@/components/admin/SLAConfigurationTab";
// Import Escalation Rules
import { EscalationRulesTab } from "@/components/admin/EscalationRulesTab";

export default function WorkflowSLAPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>("sla");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["sla", "escalation"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/admin/workflow-sla?tab=${value}`, { scroll: false });
  };

  // Dynamic header based on active tab
  const headerConfig = useMemo(() => {
    switch (activeTab) {
      case "sla":
        return {
          icon: Target,
          title: "SLA Configuration",
          description: "Configure Service Level Agreement targets and thresholds",
        };
      case "escalation":
        return {
          icon: Zap,
          title: "Escalation Rules",
          description: "Configure automatic escalations and notifications for SLA breaches",
        };
      default:
        return {
          icon: Target,
          title: "Workflow & SLA",
          description: "Configure SLA thresholds and escalation rules",
        };
    }
  }, [activeTab]);

  const HeaderIcon = headerConfig.icon;

  return (
    <ClientErrorBoundary>
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <HeaderIcon className="h-8 w-8 text-primary" />
              {headerConfig.title}
            </h1>
            <p className="text-muted-foreground mt-1">
              {headerConfig.description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ContextualHelp
              title={headerConfig.title}
              description={headerConfig.description}
              steps={
                activeTab === "sla"
                  ? [
                      "Configure SLA targets for different document types and priorities",
                      "Set warning and breach thresholds to track compliance",
                      "Monitor SLA performance in the Analytics dashboard",
                    ]
                  : [
                      "Define escalation rules that trigger when SLA thresholds are breached",
                      "Configure automatic notifications and routing for escalations",
                      "Set up escalation chains for critical items",
                    ]
              }
            />
          </div>

          <HelpGuideCard
            title={headerConfig.title}
            description={headerConfig.description}
            links={[
              { label: 'Analytics Dashboard', href: '/analytics' },
              { label: 'Help & Guides', href: '/help' },
            ]}
          />

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="sla" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                SLA Configuration
              </TabsTrigger>
              <TabsTrigger value="escalation" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Escalation Rules
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sla" className="mt-6">
              <SLAConfigurationTab />
            </TabsContent>

            <TabsContent value="escalation" className="mt-6">
              <EscalationRulesTab />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ClientErrorBoundary>
  );
}


