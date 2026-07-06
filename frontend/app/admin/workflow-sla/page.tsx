"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Target,
  Search,
  Plus,
  Clock,
  Settings,
  AlertTriangle,
  Bell,
  CheckCircle,
  Power,
} from "lucide-react";
import { ContextualHelp } from "@/components/help/ContextualHelp";
import {
  SLAConfigurationTab,
  type SLAConfigurationTabHandle,
} from "@/components/admin/SLAConfigurationTab";
import {
  EscalationRulesTab,
  type EscalationRulesTabHandle,
} from "@/components/admin/EscalationRulesTab";
import { cn } from "@/lib/utils";
import {
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from "@/components/shared/registry-queue-styles";
import {
  fetchEscalationRules,
  fetchEscalationSummary,
  fetchSLAConfigurations,
  fetchSLATargets,
  type EscalationSummary,
  type SLATargets,
} from "@/lib/sla-client";
import { logError } from "@/lib/client-logger";

function WorkflowSLAForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>("sla");
  const [searchQuery, setSearchQuery] = useState("");
  const [slaTargets, setSlaTargets] = useState<SLATargets | null>(null);
  const [slaRuleCount, setSlaRuleCount] = useState(0);
  const [slaActiveRuleCount, setSlaActiveRuleCount] = useState(0);
  const [escalationSummary, setEscalationSummary] = useState<EscalationSummary | null>(null);
  const [escalationRuleCount, setEscalationRuleCount] = useState(0);

  const slaRef = useRef<SLAConfigurationTabHandle>(null);
  const escalationRef = useRef<EscalationRulesTabHandle>(null);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["sla", "escalation"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const loadPageStats = useCallback(async () => {
    try {
      if (activeTab === "sla") {
        const [configs, targets] = await Promise.all([
          fetchSLAConfigurations(),
          fetchSLATargets(),
        ]);
        setSlaRuleCount(configs.length);
        setSlaActiveRuleCount(configs.filter((c) => c.isActive).length);
        setSlaTargets(targets);
      } else {
        const [summary, rules] = await Promise.all([
          fetchEscalationSummary(),
          fetchEscalationRules(),
        ]);
        setEscalationSummary(summary);
        setEscalationRuleCount(rules.length);
      }
    } catch (error: unknown) {
      logError("Failed to load workflow & SLA stats:", error);
    }
  }, [activeTab]);

  useEffect(() => {
    void loadPageStats();
  }, [loadPageStats]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchQuery("");
    router.push(`/admin/workflow-sla?tab=${value}`, { scroll: false });
  };

  const subtitle =
    activeTab === "escalation"
      ? "Configure automatic escalations and notifications for SLA breaches."
      : "Configure Service Level Agreement targets and thresholds.";

  const statCards = useMemo(() => {
    if (activeTab === "escalation") {
      return [
        {
          label: "Escalation rules",
          value: escalationRuleCount,
          icon: Settings,
          bgClass: "bg-primary/10",
          iconClass: "text-primary",
        },
        {
          label: "Pending escalations",
          value: escalationSummary?.pending ?? 0,
          icon: AlertTriangle,
          bgClass: "bg-warning/10",
          iconClass: "text-warning",
        },
        {
          label: "Triggered this week",
          value: escalationSummary?.triggeredThisWeek ?? 0,
          icon: Bell,
          bgClass: "bg-info/10",
          iconClass: "text-info",
        },
        {
          label: "Resolved today",
          value: escalationSummary?.resolvedToday ?? 0,
          icon: CheckCircle,
          bgClass: "bg-success/10",
          iconClass: "text-success",
        },
      ];
    }
    return [
      {
        label: "Advanced rules",
        value: slaRuleCount,
        icon: Settings,
        bgClass: "bg-primary/10",
        iconClass: "text-primary",
      },
      {
        label: "Active rules",
        value: slaActiveRuleCount,
        icon: Power,
        bgClass: "bg-success/10",
        iconClass: "text-success",
      },
      {
        label: "Urgent target",
        value: slaTargets ? `${slaTargets.urgent}h` : "—",
        icon: AlertTriangle,
        bgClass: "bg-destructive/10",
        iconClass: "text-destructive",
      },
      {
        label: "Low priority target",
        value: slaTargets ? `${slaTargets.low}h` : "—",
        icon: Clock,
        bgClass: "bg-blue-500/10",
        iconClass: "text-blue-600 dark:text-blue-400",
      },
    ];
  }, [activeTab, slaRuleCount, slaActiveRuleCount, slaTargets, escalationRuleCount, escalationSummary]);

  const headerActions = (
    <>
      <Button
        size="sm"
        className="bg-gradient-primary"
        onClick={() => {
          if (activeTab === "sla") slaRef.current?.openAddRule();
          else escalationRef.current?.openAddRule();
        }}
      >
        <Plus className="h-4 w-4 mr-2" />
        {activeTab === "sla" ? "Add SLA rule" : "Add escalation rule"}
      </Button>
      <ContextualHelp
        title="Workflow & SLA"
        description={subtitle}
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
    </>
  );

  return (
    <ClientErrorBoundary>
      <AdminPageShell
        title="Workflow & SLA"
        subtitle={subtitle}
        icon={Target}
        actions={headerActions}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map(({ label, value, icon: Icon, bgClass, iconClass }) => (
            <Card key={label}>
              <CardContent className={registryQueueStatCardContentClass}>
                <div className="flex items-center gap-4">
                  <div className={cn(registryQueueStatIconBoxClass, bgClass)}>
                    <Icon className={cn(registryQueueStatIconClass, iconClass)} />
                  </div>
                  <div>
                    <p className={registryQueueStatLabelClass}>{label}</p>
                    <p className={registryQueueStatValueClass}>{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-2">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={
                  activeTab === "sla"
                    ? "Search SLA rules by name, type, or priority…"
                    : "Search escalation rules by name or description…"
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="sla" className="text-xs px-2.5 py-1">SLA targets</TabsTrigger>
            <TabsTrigger value="escalation" className="text-xs px-2.5 py-1">Escalations</TabsTrigger>
          </TabsList>

          <TabsContent value="sla" className="mt-6 focus-visible:outline-none">
            <SLAConfigurationTab
              ref={slaRef}
              searchQuery={searchQuery}
              hideAddRuleButton
              onDataChange={loadPageStats}
            />
          </TabsContent>

          <TabsContent value="escalation" className="mt-6 focus-visible:outline-none">
            <EscalationRulesTab
              ref={escalationRef}
              searchQuery={searchQuery}
              hideActivityOverview
              hideAddRuleButton
              onDataChange={loadPageStats}
            />
          </TabsContent>
        </Tabs>
      </AdminPageShell>
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
