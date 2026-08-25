"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListRowCard } from "@/components/shared/ListRowCard";
import { LoadingState } from "@/components/shared/LoadingState";
import {
  correspondenceQueueBadgeClass,
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueListStackClass,
  correspondenceQueueMetaItemClass,
  correspondenceQueueMetaRowClass,
  correspondenceQueueSubjectClass,
  registryQueueEmptyIconClass,
} from "@/components/shared/registry-queue-styles";
import { getCaseTemplates, createCaseFromTemplate, type CaseTemplate } from "@/lib/api/cases";
import { PRIORITY_OPTIONS } from "@/lib/constants";
import { logError } from "@/lib/client-logger";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { Briefcase, CheckCircle2, Loader2, Plus } from "lucide-react";

type CaseTemplatesPanelProps = {
  searchQuery: string;
  typeFilter: string;
};

/** Case templates list — matches Template Hub Documents/Forms Card + ListRowCard layout. */
export function CaseTemplatesPanel({ searchQuery, typeFilter }: CaseTemplatesPanelProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<CaseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<CaseTemplate | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [caseData, setCaseData] = useState({
    title: "",
    description: "",
    priority: "medium",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getCaseTemplates();
        if (!cancelled) {
          setTemplates(Array.isArray(data) ? data.filter((t) => t.is_active) : []);
        }
      } catch (err) {
        logError("Failed to load case templates", err);
        if (!cancelled) toast.error("Failed to load case templates");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return templates.filter((template) => {
      const matchesSearch =
        !q ||
        template.name.toLowerCase().includes(q) ||
        (template.description?.toLowerCase().includes(q) ?? false) ||
        template.case_type.toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || template.case_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [templates, searchQuery, typeFilter]);

  const openCreate = (template: CaseTemplate) => {
    setSelectedTemplate(template);
    setCaseData({
      title:
        ((template.structure?.default_fields as Record<string, unknown>)?.title as string) || "",
      description:
        ((template.structure?.default_fields as Record<string, unknown>)?.description as string) ||
        "",
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
        caseType: selectedTemplate.case_type as
          | "complaint"
          | "request"
          | "inquiry"
          | "project"
          | "legal"
          | "audit"
          | "general"
          | undefined,
      });
      toast.success("Case created successfully");
      router.push(`/cases/${newCase.id}`);
    } catch (err) {
      logError("Failed to create case", err);
      const apiMessage = (err as Record<string, unknown>).apiMessage as string;
      toast.error(
        apiMessage || "Failed to create case from template. The server encountered an error.",
      );
    } finally {
      setCreating(false);
      setShowCreateDialog(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="space-y-4 pt-6">
          {loading ? (
            <LoadingState message="Loading case templates…" />
          ) : filteredTemplates.length === 0 ? (
            <EmptyState
              icon={<Briefcase className={registryQueueEmptyIconClass} />}
              title={
                typeFilter !== "all"
                  ? `No ${typeFilter} case templates`
                  : searchQuery.trim()
                    ? "No case templates match your search"
                    : "No case templates yet"
              }
              message={
                typeFilter !== "all"
                  ? "Try another case type filter, or clear the filter to see all templates."
                  : searchQuery.trim()
                    ? "Try a different name or description keyword."
                    : "Case templates let you start a new case from a pre-configured type."
              }
            />
          ) : (
            <div className={correspondenceQueueListStackClass}>
              {filteredTemplates.map((template) => (
                <ListRowCard
                  key={template.id}
                  density="compact"
                  onRowClick={() => openCreate(template)}
                  leading={(
                    <div className={cn(correspondenceQueueLeadingBoxClass, "bg-primary/10")}>
                      <Briefcase className={cn(correspondenceQueueLeadingIconClass, "text-primary")} />
                    </div>
                  )}
                  actions={(
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openCreate(template);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                      Create
                    </Button>
                  )}
                >
                  <h4 className={correspondenceQueueSubjectClass}>{template.name}</h4>
                  {template.description ? (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {template.description}
                    </p>
                  ) : null}
                  <div className={correspondenceQueueMetaRowClass}>
                    <span className={correspondenceQueueMetaItemClass}>
                      <Badge variant="outline" className={cn(correspondenceQueueBadgeClass, "capitalize")}>
                        {template.case_type_display || template.case_type}
                      </Badge>
                    </span>
                    <span className={correspondenceQueueMetaItemClass}>
                      <Badge variant="secondary" className={correspondenceQueueBadgeClass}>
                        {template.default_priority}
                      </Badge>
                    </span>
                    <span className={correspondenceQueueMetaItemClass}>
                      {template.usage_count} use{template.usage_count === 1 ? "" : "s"}
                    </span>
                  </div>
                </ListRowCard>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Create Case from Template</DialogTitle>
            <DialogDescription>{selectedTemplate?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="case-template-title">Case Title *</Label>
              <Input
                id="case-template-title"
                value={caseData.title}
                onChange={(e) => setCaseData({ ...caseData, title: e.target.value })}
                placeholder="Enter case title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="case-template-description">Description</Label>
              <Textarea
                id="case-template-description"
                value={caseData.description}
                onChange={(e) => setCaseData({ ...caseData, description: e.target.value })}
                placeholder="Enter case description"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="case-template-priority">Priority</Label>
              <Select
                value={caseData.priority}
                onValueChange={(value) => setCaseData({ ...caseData, priority: value })}
              >
                <SelectTrigger id="case-template-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Create Case
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Case type filter options for Template Hub (same pattern as form categories). */
export const CASE_TEMPLATE_TYPE_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "complaint", label: "Complaint" },
  { value: "request", label: "Request" },
  { value: "inquiry", label: "Inquiry" },
  { value: "project", label: "Project" },
  { value: "legal", label: "Legal" },
  { value: "audit", label: "Audit" },
  { value: "general", label: "General" },
];
