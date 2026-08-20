"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getCaseTemplates, createCaseFromTemplate, type CaseTemplate } from "@/lib/api/cases";
import { PRIORITY_OPTIONS } from "@/lib/constants";
import { logError } from "@/lib/client-logger";
import { toast } from "@/components/ui/sonner";
import {
  Plus,
  Loader2,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileSearch,
  HelpCircle,
  Briefcase,
  Scale,
  ClipboardCheck,
  FileText,
  ArrowRight,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListRowCard } from "@/components/shared/ListRowCard";
import {
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueListStackClass,
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from "@/components/shared/registry-queue-styles";
import { cn } from "@/lib/utils";

export default function CaseTemplatesPage() {
  const router = useRouter();
  const {currentUser, hydrated: _hydrated } = useCurrentUser();
  const [templates, setTemplates] = useState<CaseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState<CaseTemplate | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [caseData, setCaseData] = useState({
    title: "",
    description: "",
    priority: "medium",
  });

  useEffect(() => {
    if (!currentUser?.id) return;
    loadTemplates();
  }, [currentUser?.id]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getCaseTemplates();
      setTemplates(Array.isArray(data) ? data.filter((t) => t.is_active) : []);
    } catch (err) {
      logError("Failed to load templates", err);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromTemplate = (template: CaseTemplate) => {
    setSelectedTemplate(template);
    setCaseData({
      title: (template.structure?.default_fields as Record<string, unknown>)?.title as string || "",
      description: (template.structure?.default_fields as Record<string, unknown>)?.description as string || "",
      priority: template.default_priority || "medium",
    });
    setShowCreateDialog(true);
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) return;

    setCreating(true);
    try {
      const newCase = await createCaseFromTemplate(selectedTemplate.id, {
        title: caseData.title,
        description: caseData.description,
        priority: caseData.priority as "medium" | "low" | "high" | "urgent",
        caseType: selectedTemplate.case_type as "complaint" | "request" | "inquiry" | "project" | "legal" | "audit" | "general" | undefined,
      });
      toast.success("Case created successfully");
      router.push(`/cases/${newCase.id}`);
    } catch (err) {
      logError("Failed to create case", err);
      const apiMessage = (err as Record<string, unknown>).apiMessage as string;
      toast.error(apiMessage || "Failed to create case from template. The server encountered an error.");
    } finally {
      setCreating(false);
      setShowCreateDialog(false);
    }
  };

  const caseTypes = Array.from(new Set(templates.map((t) => t.case_type)));

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || template.case_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const caseTypeIcon = (type: string) => {
    switch (type) {
      case "complaint": return AlertTriangle;
      case "request": return FileSearch;
      case "inquiry": return HelpCircle;
      case "project": return Briefcase;
      case "legal": return Scale;
      case "audit": return ClipboardCheck;
      default: return FileText;
    }
  };

  const caseTypeColor = (type: string) => {
    switch (type) {
      case "complaint": return { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400" };
      case "request": return { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" };
      case "inquiry": return { bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400" };
      case "project": return { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400" };
      case "legal": return { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" };
      case "audit": return { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400" };
      default: return { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400" };
    }
  };

  const priorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800";
      case "high": return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800";
      case "medium": return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800";
      case "low": return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
      default: return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  if (!currentUser?.id) {
    return null;
  }

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Case Templates</h1>
            <p className="text-muted-foreground mt-1">
              Create cases from pre-configured templates
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Templates", value: templates.length, icon: FileText, bgClass: "bg-primary/10", iconClass: "text-primary" },
            { label: "Complaint", value: templates.filter((t) => t.case_type === "complaint").length, icon: AlertTriangle, bgClass: "bg-red-500/10", iconClass: "text-red-600 dark:text-red-400" },
            { label: "Request", value: templates.filter((t) => t.case_type === "request").length, icon: FileSearch, bgClass: "bg-blue-500/10", iconClass: "text-blue-600 dark:text-blue-400" },
            { label: "Project", value: templates.filter((t) => t.case_type === "project").length, icon: Briefcase, bgClass: "bg-violet-500/10", iconClass: "text-violet-600 dark:text-violet-400" },
          ].map(({ label, value, icon: Icon, bgClass, iconClass }) => (
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

        {/* Search + filter bar */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-2">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTypeFilter("all")}
                className={`h-8 rounded-md px-2.5 text-xs font-medium transition-colors ${
                  typeFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                All
              </button>
              {caseTypes.map((type) => {
                const colors = caseTypeColor(type);
                return (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`h-8 rounded-md px-2.5 text-xs font-medium capitalize transition-colors ${
                      typeFilter === type
                        ? `${colors.bg} ${colors.text}`
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Templates List */}
        {loading ? (
          <div className={correspondenceQueueListStackClass}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3 animate-pulse">
                    <div className="h-9 w-9 rounded-lg bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-2/5 rounded bg-muted" />
                      <div className="h-3 w-4/5 rounded bg-muted" />
                      <div className="h-3 w-1/3 rounded bg-muted" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card p-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              {searchQuery ? "No templates match your search" : "No templates available"}
            </p>
          </div>
        ) : (
          <div className={correspondenceQueueListStackClass}>
            {filteredTemplates.map((template) => {
              const Icon = caseTypeIcon(template.case_type);
              const colors = caseTypeColor(template.case_type);
              return (
                <ListRowCard
                  key={template.id}
                  density="compact"
                  leading={(
                    <div className={cn(correspondenceQueueLeadingBoxClass, colors.bg)}>
                      <Icon className={cn(correspondenceQueueLeadingIconClass, colors.text)} />
                    </div>
                  )}
                  actions={(
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCreateFromTemplate(template); }}
                    >
                      <Plus className="h-3 w-3" />
                      Create
                    </Button>
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-0.5">
                    <h3 className="text-sm font-semibold text-foreground truncate">{template.name}</h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn("h-5 rounded-md border px-1.5 py-0 text-[10px] font-semibold capitalize leading-none", colors.text)}
                      >
                        {template.case_type_display}
                      </Badge>
                      <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-none ${priorityColor(template.default_priority)}`}>
                        {template.default_priority}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {template.description}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span>{template.usage_count} use{template.usage_count === 1 ? "" : "s"}</span>
                  </div>
                </ListRowCard>
              );
            })}
          </div>
        )}

        {/* Create Case Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent size="lg">
            <DialogHeader>
              <DialogTitle>Create Case from Template</DialogTitle>
              <DialogDescription>
                {selectedTemplate?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Case Title *</Label>
                <Input
                  id="title"
                  value={caseData.title}
                  onChange={(e) => setCaseData({ ...caseData, title: e.target.value })}
                  placeholder="Enter case title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={caseData.description}
                  onChange={(e) => setCaseData({ ...caseData, description: e.target.value })}
                  placeholder="Enter case description"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={caseData.priority}
                  onValueChange={(value) => setCaseData({ ...caseData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!caseData.title.trim() || creating}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Create Case
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
