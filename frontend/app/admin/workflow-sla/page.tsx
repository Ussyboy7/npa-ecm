"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Zap } from "lucide-react";
import { HelpGuideCard } from "@/components/help/HelpGuideCard";
import { ContextualHelp } from "@/components/help/ContextualHelp";

// Import SLA Configuration
import { SLAConfigurationTab } from "@/components/admin/SLAConfigurationTab";
// Import Escalation Rules
import { EscalationRulesTab } from "@/components/admin/EscalationRulesTab";

function WorkflowSLAForm() {
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

  return (
    <ClientErrorBoundary>
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{headerConfig.title}</h1>
              <p className="text-muted-foreground mt-1 max-w-2xl">{headerConfig.description}</p>
            </div>
            <ContextualHelp
              title={headerConfig.title}
              description={headerConfig.description}
              steps={
                activeTab === "sla"
                  ? [
                      "Set default hours per priority; they apply unless an advanced rule overrides them.",
                      "Use advanced rules for specific correspondence types or divisions.",
                      "Review SLA performance in Analytics after changes roll out.",
                    ]
                  : [
                      "Define what triggers when thresholds are approached or breached.",
                      "Configure notifications and routing for escalations.",
                      "Chain rules for critical items when needed.",
                    ]
              }
            />
          </div>

          <HelpGuideCard
            title={activeTab === "sla" ? "SLA targets & overrides" : "Escalation automation"}
            description={
              activeTab === "sla"
                ? "Defaults apply org-wide; advanced rules refine targets for specific cases. You only need one place to edit the four priority baselines."
                : "Escalations run on top of SLA targets—keep rules focused and test notifications with a small group first."
            }
            links={[
              { label: "Analytics Dashboard", href: "/analytics" },
              { label: "Help & Guides", href: "/help" },
            ]}
          />

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid h-auto w-full max-w-md grid-cols-2 p-1">
              <TabsTrigger value="sla" className="flex items-center gap-2 py-2">
                <Target className="h-4 w-4 shrink-0" />
                SLA targets
              </TabsTrigger>
              <TabsTrigger value="escalation" className="flex items-center gap-2 py-2">
                <Zap className="h-4 w-4 shrink-0" />
                Escalations
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sla" className="mt-6 focus-visible:outline-none">
              <SLAConfigurationTab />
            </TabsContent>

            <TabsContent value="escalation" className="mt-6 focus-visible:outline-none">
              <EscalationRulesTab />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ClientErrorBoundary>
  );
}

export default function WorkflowSLAPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <WorkflowSLAForm />
    </Suspense>
  );
}


