"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { QuillEditor } from "@/components/dms/QuillEditor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HelpGuideCard } from "@/components/help/HelpGuideCard";
import { ContextualHelp } from "@/components/help/ContextualHelp";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListRowCard } from "@/components/shared/ListRowCard";
import {
  correspondenceQueueBadgeClass,
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueListStackClass,
  correspondenceQueueMetaIconClass,
  correspondenceQueueMetaItemClass,
  correspondenceQueueMetaRowClass,
  correspondenceQueueSubjectClass,
  registryQueueEmptyIconClass,
  registryQueueSearchInputWrapClass,
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from "@/components/shared/registry-queue-styles";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  loadTemplates,
  getTemplatesByScope,
  type DocumentTemplate,
  type TemplateScope,
  type TemplateType,
  saveTemplate,
  createTemplate,
  deleteTemplate,
} from "@/lib/template-storage";
import { getWorkflowTemplates, deleteWorkflowTemplate, updateWorkflowTemplate } from "@/lib/api/workflow";
import { getFormTemplates, deleteFormTemplate, cloneFormTemplate } from "@/lib/api/forms";
import type { WorkflowTemplate } from "@/lib/types/workflow";
import { logError } from "@/lib/client-logger";
import type { FormTemplate } from "@/lib/types/forms";
import {
  Plus,
  Trash2,
  GitBranch,
  FormInput,
  Search,
  MoreVertical,
  Edit,
  Copy,
  Power,
  PowerOff,
  FileEdit,
  MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useCurrentUser } from "@/hooks/use-current-user";

// Scope configuration
const scopeOptions: { value: TemplateScope; label: string }[] = [
  { value: "organization", label: "Organization-wide" },
  { value: "directorate", label: "Directorate" },
  { value: "division", label: "Division" },
  { value: "department", label: "Department" },
  { value: "user", label: "Personal" },
];

type HubTab = "documents" | "workflows" | "forms";

function TemplatesHubForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { directorates, divisions, departments, users: organizationUsers, isSyncing } = useOrganization();
  const { currentUser, hydrated: userHydrated } = useCurrentUser();

  // Main tab state (overridable via ?tab=documents|workflows|forms)
  const [activeTab, setActiveTab] = useState<HubTab>("documents");

  useEffect(() => {
    const raw = searchParams.get("tab");
    if (raw === "workflows" || raw === "forms" || raw === "documents") {
      setActiveTab(raw);
    }
  }, [searchParams]);

  // ============ DOCUMENT TEMPLATES STATE ============
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [activeScope, setActiveScope] = useState<TemplateScope>("organization");
  const [selectedScopeId, setSelectedScopeId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [activeTemplateType, setActiveTemplateType] = useState<TemplateType>("document");

  // ============ WORKFLOW TEMPLATES STATE ============
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([]);
  const [workflowLoading, setWorkflowLoading] = useState(true);
  const [workflowSearch, setWorkflowSearch] = useState("");

  // ============ FORM TEMPLATES STATE ============
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [formLoading, setFormLoading] = useState(true);
  const [formSearch, setFormSearch] = useState("");
  const [formCategoryFilter, setFormCategoryFilter] = useState<string>("all");
  const [deletingFormId, setDeletingFormId] = useState<string | null>(null);
  const [showFormDeleteConfirm, setShowFormDeleteConfirm] = useState(false);
  const [formToDelete, setFormToDelete] = useState<{ id: string; name: string } | null>(null);
  const [formDeleteConfirmText, setFormDeleteConfirmText] = useState("");
  const [showWorkflowDeleteConfirm, setShowWorkflowDeleteConfirm] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Personal template users
  const personalTemplateUsers = useMemo(
    () => organizationUsers.filter((user) => user.systemRole !== "Super Admin"),
    [organizationUsers]
  );

  // ============ DOCUMENT TEMPLATES LOGIC ============
  const [templatesLoading, setTemplatesLoading] = useState(false);
  
  const refreshTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const loaded = await loadTemplates();
      setTemplates([...loaded]);
    } catch (error: unknown) {
      logError('Failed to load templates:', error);
      toast({ title: "Error", description: "Failed to load templates. Please try again.", variant: "destructive" });
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    refreshTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadScopedTemplates = async () => {
      try {
        const scoped = await getTemplatesByScope(activeScope, selectedScopeId ?? undefined, activeTemplateType);
        if (scoped.length) {
          const template = scoped[0];
          setSelectedTemplateId(template.id);
          setTitle(template.title);
          setDescription(template.description ?? "");
          setContentHtml(template.contentHtml);
        } else {
          setSelectedTemplateId(null);
          setTitle("");
          setDescription("");
          setContentHtml("");
        }
      } catch (error: unknown) {
        logError('Failed to load scoped templates:', error);
      }
    };
    loadScopedTemplates();
  }, [activeScope, selectedScopeId, templates, activeTemplateType]);

  const scopedTemplates = useMemo(() => {
    // Filter from loaded templates synchronously for UI
    return templates.filter((template) => {
      if (template.scope !== activeScope) return false;
      if (template.templateType !== activeTemplateType) return false;
      if (activeScope === 'organization') return true;
      return template.scopeId === (selectedScopeId ?? null);
    });
  }, [templates, activeScope, selectedScopeId, activeTemplateType]);

  const scopeEntityOptions = useMemo(() => {
    switch (activeScope) {
      case "organization":
        return [];
      case "directorate":
        return directorates.map((dir) => ({ id: dir.id, name: dir.name }));
      case "division":
        return divisions.map((div) => ({ id: div.id, name: div.name }));
      case "department":
        return departments.map((dept) => ({ id: dept.id, name: dept.name }));
      case "user":
        return personalTemplateUsers.map((user) => ({ id: user.id, name: user.name }));
      default:
        return [];
    }
  }, [activeScope, departments, directorates, divisions, personalTemplateUsers]);

  useEffect(() => {
    if (activeScope === "organization") {
      setSelectedScopeId(null);
      return;
    }
    if (!selectedScopeId && scopeEntityOptions.length > 0) {
      setSelectedScopeId(scopeEntityOptions[0].id);
    }
  }, [activeScope, scopeEntityOptions, selectedScopeId]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((item) => item.id as string === templateId);
    if (!template) return;
    setActiveTemplateType(template.templateType);
    setSelectedTemplateId(template.id);
    setTitle(template.title);
    setDescription(template.description ?? "");
    setContentHtml(template.contentHtml);
  };

  const handleSaveDocTemplate = async () => {
    if (!currentUser) {
      toast({ title: "No current user found", description: "Unable to save template without admin context.", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Template title required", description: "Add a descriptive title for the template.", variant: "destructive" });
      return;
    }
    if (!contentHtml || contentHtml.trim().length === 0) {
      toast({ title: "Template body empty", description: "Provide rich text content for the template.", variant: "destructive" });
      return;
    }

    try {
      if (selectedTemplateId) {
        const existing = templates.find((template) => template.id === selectedTemplateId);
        if (!existing) return;
        const now = new Date().toISOString();
        const updated: DocumentTemplate = {
          ...existing,
          title: title.trim(),
          description: description.trim() || undefined,
          contentHtml,
          updatedAt: now,
          updatedBy: currentUser.id,
          templateType: existing.templateType,
        };
        await saveTemplate(updated);
        await refreshTemplates();
        toast({ title: "Template updated", description: `${updated.title} saved successfully.` });
      } else {
        const created = await createTemplate({
          scope: activeScope,
          scopeId: activeScope === "organization" ? null : selectedScopeId,
          title: title.trim(),
          description: description.trim() || undefined,
          contentHtml,
          createdBy: currentUser.id,
          updatedBy: currentUser.id,
          isDefault: true,
          templateType: activeTemplateType,
        });
        await refreshTemplates();
        setSelectedTemplateId(created.id);
        toast({ title: "Template created", description: `${created.title} is now available.` });
      }
    } catch (error: unknown) {
      logError('Failed to save template:', error);
      toast({ title: "Error", description: "Failed to save template. Please try again.", variant: "destructive" });
    }
  };

  const handleCreateNewDocTemplate = () => {
    setSelectedTemplateId(null);
    setTitle(`New ${activeTemplateType === "minute" ? "Minute" : "Document"} Template`);
    setDescription("");
    if (activeTemplateType === "minute") {
      setContentHtml("Please review and revert with your feedback at the earliest convenience.");
    } else {
      setContentHtml("");
    }
  };

  const handleDeleteDocTemplate = async () => {
    if (!selectedTemplateId) return;
    try {
      await deleteTemplate(selectedTemplateId);
      await refreshTemplates();
      toast({ title: "Template deleted", description: "Template removed successfully." });
    } catch (error: unknown) {
      logError('Failed to delete template:', error);
      toast({ title: "Error", description: "Failed to delete template. Please try again.", variant: "destructive" });
    }
  };

  // ============ WORKFLOW TEMPLATES LOGIC ============
  const loadWorkflowTemplates = async () => {
    try {
      setWorkflowLoading(true);
      const data = await getWorkflowTemplates();
      setWorkflowTemplates(data);
    } catch (error: unknown) {
      logError("Error loading workflow templates:", error);
      toast({ title: "Error", description: "Failed to load workflow templates", variant: "destructive" });
    } finally {
      setWorkflowLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "workflows") {
      loadWorkflowTemplates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const filteredWorkflowTemplates = useMemo(() => {
    return workflowTemplates.filter((template) => {
      const matchesSearch =
        !workflowSearch.trim() ||
        template.name.toLowerCase().includes(workflowSearch.toLowerCase()) ||
        template.slug.toLowerCase().includes(workflowSearch.toLowerCase()) ||
        template.description.toLowerCase().includes(workflowSearch.toLowerCase());
      return matchesSearch;
    });
  }, [workflowTemplates, workflowSearch]);

  const handleDeleteWorkflowClick = (id: string, name: string) => {
    setWorkflowToDelete({ id, name });
    setDeleteConfirmText("");
    setShowWorkflowDeleteConfirm(true);
  };

  const handleDeleteWorkflow = async () => {
    if (!workflowToDelete) return;
    if (deleteConfirmText !== "DELETE") {
      toast({ title: "Invalid confirmation", description: 'Please type "DELETE" to confirm', variant: "destructive" });
      return;
    }
    try {
      await deleteWorkflowTemplate(workflowToDelete.id);
      toast({ title: "Success", description: "Template deleted successfully" });
      loadWorkflowTemplates();
      setShowWorkflowDeleteConfirm(false);
      setWorkflowToDelete(null);
      setDeleteConfirmText("");
    } catch (error: unknown) {
      logError("Error deleting template:", error);
      toast({ title: "Error", description: "Failed to delete template", variant: "destructive" });
    }
  };

  const handleToggleWorkflowActive = async (template: WorkflowTemplate) => {
    try {
      await updateWorkflowTemplate(template.id, { is_active: !template.is_active });
      toast({ title: "Success", description: `Template ${!template.is_active ? "activated" : "deactivated"} successfully` });
      loadWorkflowTemplates();
    } catch (error: unknown) {
      logError("Error toggling template:", error);
      toast({ title: "Error", description: "Failed to update template", variant: "destructive" });
    }
  };

  const workflowStats = useMemo(
    () => ({
      total: workflowTemplates.length,
      active: workflowTemplates.filter((t) => t.is_active).length,
    }),
    [workflowTemplates]
  );

  // ============ FORM TEMPLATES LOGIC ============
  const loadFormTemplates = async () => {
    try {
      setFormLoading(true);
      const data = await getFormTemplates({ is_active: undefined, search: formSearch || undefined });
      setFormTemplates(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      logError("Error loading form templates:", error);
      sonnerToast.error("Failed to load form templates");
      setFormTemplates([]);
    } finally {
      setFormLoading(false);
    }
  };

  useEffect(() => {
    loadFormTemplates();
    // Load once on mount for accurate dashboard stats and whenever switching back to forms.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "forms") {
      const timeoutId = setTimeout(() => loadFormTemplates(), 300);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formSearch, activeTab]);

  const handleDeleteFormClick = (id: string, name: string) => {
    setFormToDelete({ id, name });
    setFormDeleteConfirmText("");
    setShowFormDeleteConfirm(true);
  };

  const handleDeleteForm = async () => {
    if (!formToDelete) return;
    if (formDeleteConfirmText !== "DELETE") {
      sonnerToast.error('Type "DELETE" to confirm');
      return;
    }

    try {
      await deleteFormTemplate(formToDelete.id);
      sonnerToast.success("Template deleted successfully");
      loadFormTemplates();
    } catch (error: unknown) {
      logError("Error deleting template:", error);
      sonnerToast.error("Failed to delete template");
    } finally {
      setShowFormDeleteConfirm(false);
      setFormToDelete(null);
      setFormDeleteConfirmText("");
      setDeletingFormId(null);
    }
  };

  const handleCloneForm = async (id: string) => {
    try {
      const cloned = await cloneFormTemplate(id);
      sonnerToast.success("Template cloned successfully");
      router.push(`/admin/form-templates/${cloned.id}`);
    } catch (error: unknown) {
      logError("Error cloning template:", error);
      sonnerToast.error("Failed to clone template");
    }
  };

  const filteredFormTemplates = Array.isArray(formTemplates)
    ? formCategoryFilter === "all"
      ? formTemplates
      : formTemplates.filter((t) => t.category === formCategoryFilter)
    : [];

  const formCategories = [
    { value: "all", label: "All" },
    { value: "procurement", label: "Procurement" },
    { value: "audit", label: "Audit" },
    { value: "finance", label: "Finance" },
    { value: "general", label: "General" },
  ];

  const getFormCategoryStyles = (category: string) => {
    switch (category) {
      case "audit":
        return {
          accent: "border-l-amber-500",
          badge: "bg-amber-500/10 text-amber-700 border-amber-500/20",
        };
      case "finance":
        return {
          accent: "border-l-emerald-500",
          badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
        };
      case "procurement":
        return {
          accent: "border-l-blue-500",
          badge: "bg-blue-500/10 text-blue-700 border-blue-500/20",
        };
      default:
        return {
          accent: "border-l-slate-500",
          badge: "bg-slate-500/10 text-slate-700 border-slate-500/20",
        };
    }
  };

  // ============ STATS ============
  const documentCount = templates.filter(t => t.templateType === "document").length;
  const minuteCount = templates.filter(t => t.templateType === "minute").length;

  // ============ LOADING STATE ============
  if (!userHydrated || isSyncing) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <LoadingState message="Loading templates hub…" />
        </div>
      </DashboardLayout>
    );
  }

  if (!currentUser) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <HelpGuideCard
            title="Select a persona"
            description="Use the Role Switcher to choose a user context before managing templates."
            links={[{ label: "Role Switcher", href: "/settings" }]}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ClientErrorBoundary>
      <DashboardLayout>
        <div className="container mx-auto space-y-6 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Templates Hub</h1>
              <p className="mt-1 max-w-2xl text-muted-foreground">
                Manage document templates, workflow templates, and form templates in one place
              </p>
            </div>
            <ContextualHelp
              title="How to manage templates"
              description="Use the overview cards below to switch areas. Documents and minutes share an editor with org scope; workflows and forms open dedicated builders."
              steps={[
                "Click a summary card to open Documents, Minutes, Workflows, or Forms.",
                "For documents/minutes, pick scope and template, then edit and save.",
                "For workflows and forms, use Create or a row action to open the full editor.",
              ]}
            />
          </div>

          <HelpGuideCard
            title="Three template families"
            description="Documents and minutes are rich-text (or plain minute text) per scope. Workflows define approval chains; forms define fields and categories."
            links={[
              { label: "Help & Guides", href: "/help" },
              { label: "Forms (user)", href: "/forms/templates" },
            ]}
          />

          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Choose a section
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveTab("documents");
                  setActiveTemplateType("document");
                }
              }}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                activeTab === "documents" && activeTemplateType === "document" ? "ring-2 ring-primary" : "",
              )}
              onClick={() => {
                setActiveTab("documents");
                setActiveTemplateType("document");
              }}
            >
              <CardContent className={registryQueueStatCardContentClass}>
                <div className="flex items-center gap-4">
                  <div className={cn(registryQueueStatIconBoxClass, "bg-primary/10")}>
                    <FileEdit className={cn(registryQueueStatIconClass, "text-primary")} />
                  </div>
                  <div>
                    <p className={registryQueueStatLabelClass}>Document templates</p>
                    <p className={registryQueueStatValueClass}>{documentCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveTab("documents");
                  setActiveTemplateType("minute");
                }
              }}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                activeTab === "documents" && activeTemplateType === "minute" ? "ring-2 ring-primary" : "",
              )}
              onClick={() => {
                setActiveTab("documents");
                setActiveTemplateType("minute");
              }}
            >
              <CardContent className={registryQueueStatCardContentClass}>
                <div className="flex items-center gap-4">
                  <div className={cn(registryQueueStatIconBoxClass, "bg-info/10")}>
                    <MessageSquare className={cn(registryQueueStatIconClass, "text-info")} />
                  </div>
                  <div>
                    <p className={registryQueueStatLabelClass}>Minute templates</p>
                    <p className={registryQueueStatValueClass}>{minuteCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveTab("workflows");
                }
              }}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                activeTab === "workflows" ? "ring-2 ring-primary" : "",
              )}
              onClick={() => setActiveTab("workflows")}
            >
              <CardContent className={registryQueueStatCardContentClass}>
                <div className="flex items-center gap-4">
                  <div className={cn(registryQueueStatIconBoxClass, "bg-success/10")}>
                    <GitBranch className={cn(registryQueueStatIconClass, "text-success")} />
                  </div>
                  <div>
                    <p className={registryQueueStatLabelClass}>Workflow templates</p>
                    <p className={registryQueueStatValueClass}>{workflowStats.total}</p>
                    <p className="text-xs text-muted-foreground">{workflowStats.active} active</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveTab("forms");
                }
              }}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                activeTab === "forms" ? "ring-2 ring-primary" : "",
              )}
              onClick={() => setActiveTab("forms")}
            >
              <CardContent className={registryQueueStatCardContentClass}>
                <div className="flex items-center gap-4">
                  <div className={cn(registryQueueStatIconBoxClass, "bg-warning/10")}>
                    <FormInput className={cn(registryQueueStatIconClass, "text-warning")} />
                  </div>
                  <div>
                    <p className={registryQueueStatLabelClass}>Form templates</p>
                    <p className={registryQueueStatValueClass}>{formTemplates.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {activeTab === "documents" ? (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">
                        {activeTemplateType === "document" ? "Document Templates" : "Minute Templates"}
                      </CardTitle>
                      <CardDescription>
                        {activeTemplateType === "document" 
                          ? "Manage correspondence and document layouts" 
                          : "Manage reusable minute instructions"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={activeTemplateType === "document" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveTemplateType("document")}
                      >
                        <FileEdit className="h-4 w-4 mr-1" />
                        Documents
                      </Button>
                      <Button
                        variant={activeTemplateType === "minute" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveTemplateType("minute")}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Minutes
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Scope & Template Selection - Single Row */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Scope Level</Label>
                      <Select value={activeScope} onValueChange={(v) => setActiveScope(v as TemplateScope)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {scopeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {activeScope !== "organization" && (
                      <div className="space-y-2">
                        <Label>Select {activeScope.charAt(0).toUpperCase() + activeScope.slice(1)}</Label>
                        <Select value={selectedScopeId ?? ""} onValueChange={(v) => setSelectedScopeId(v || null)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {scopeEntityOptions.map((opt) => (
                              <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Template</Label>
                      <Select value={selectedTemplateId ?? ""} onValueChange={handleTemplateSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select template..." />
                        </SelectTrigger>
                        <SelectContent>
                          {scopedTemplates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end gap-2">
                      <Button onClick={handleCreateNewDocTemplate} className="flex-1">
                        <Plus className="h-4 w-4 mr-1" />
                        New
                      </Button>
                      {selectedTemplateId && (
                        <Button variant="outline" size="icon" onClick={handleDeleteDocTemplate} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Template Editor */}
                  <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Template title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description (optional)</Label>
                        <Input
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Brief description"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Content</Label>
                      {activeTemplateType === "minute" ? (
                        <Textarea
                          value={contentHtml}
                          onChange={(e) => setContentHtml(e.target.value)}
                          rows={5}
                          placeholder="Enter minute template text..."
                          className="min-h-[120px]"
                        />
                      ) : (
                        <div className="border rounded-lg bg-background">
                          <QuillEditor value={contentHtml} onChange={(html) => setContentHtml(html)} showCharacterCount={false} />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={refreshTemplates}>Reset</Button>
                      <Button onClick={handleSaveDocTemplate}>
                        {selectedTemplateId ? "Update Template" : "Create Template"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : activeTab === "workflows" ? (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle className="text-lg">Workflow templates</CardTitle>
                      <CardDescription>
                        Approval chains for correspondence and documents. Open a row to edit steps.
                      </CardDescription>
                    </div>
                    <Button size="sm" onClick={() => router.push("/admin/workflow-templates/new")} className="shrink-0">
                      <Plus className="h-4 w-4 mr-2" />
                      Create workflow
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={registryQueueSearchInputWrapClass}>
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search workflows…"
                      value={workflowSearch}
                      onChange={(e) => setWorkflowSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {workflowLoading ? (
                    <LoadingState message="Loading workflow templates…" />
                  ) : filteredWorkflowTemplates.length === 0 ? (
                    <EmptyState
                      icon={<GitBranch className={registryQueueEmptyIconClass} />}
                      title={workflowSearch.trim() ? "No workflows match your search" : "No workflow templates yet"}
                      message={
                        workflowSearch.trim()
                          ? "Try a different name, slug, or description keyword."
                          : "Create a workflow to define approval steps for correspondence or documents."
                      }
                      actionLabel={workflowSearch.trim() ? undefined : "Create workflow"}
                      onAction={workflowSearch.trim() ? undefined : () => router.push("/admin/workflow-templates/new")}
                    />
                  ) : (
                    <div className={correspondenceQueueListStackClass}>
                      {filteredWorkflowTemplates.map((template) => (
                        <ListRowCard
                          key={template.id}
                          density="compact"
                          href={`/admin/workflow-templates/${template.id}`}
                          leading={(
                            <div className={cn(correspondenceQueueLeadingBoxClass, "bg-success/10")}>
                              <GitBranch className={cn(correspondenceQueueLeadingIconClass, "text-success")} />
                            </div>
                          )}
                          actions={(
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  aria-label="More actions"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/admin/workflow-templates/${template.id}`)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(`/admin/workflow-templates/${template.id}?clone=true`)
                                  }
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Clone
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleWorkflowActive(template)}>
                                  {template.is_active ? (
                                    <PowerOff className="mr-2 h-4 w-4" />
                                  ) : (
                                    <Power className="mr-2 h-4 w-4" />
                                  )}
                                  {template.is_active ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteWorkflowClick(template.id, template.name)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        >
                          <h4 className={correspondenceQueueSubjectClass}>{template.name}</h4>
                          {template.description ? (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{template.description}</p>
                          ) : null}
                          <div className={cn(correspondenceQueueMetaRowClass, "mt-1")}>
                            <span className={correspondenceQueueMetaItemClass}>
                              <Badge variant="outline" className={correspondenceQueueBadgeClass}>
                                {template.applies_to === "correspondence" ? "Correspondence" : "Document"}
                              </Badge>
                            </span>
                            <span className={correspondenceQueueMetaItemClass}>
                              <Badge variant="secondary" className={correspondenceQueueBadgeClass}>
                                {template.steps.length} steps
                              </Badge>
                            </span>
                            <span className={correspondenceQueueMetaItemClass}>
                              <Badge
                                variant={template.is_active ? "default" : "secondary"}
                                className={correspondenceQueueBadgeClass}
                              >
                                {template.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </span>
                          </div>
                        </ListRowCard>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle className="text-lg">Form templates</CardTitle>
                      <CardDescription>Structured data collection with fields and categories.</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => router.push("/admin/form-templates/new")} className="shrink-0">
                      <Plus className="h-4 w-4 mr-2" />
                      Create form
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className={cn(registryQueueSearchInputWrapClass, "sm:max-w-sm sm:flex-1")}>
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search forms…"
                        value={formSearch}
                        onChange={(e) => setFormSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {formCategories.map((cat) => (
                        <Button
                          key={cat.value}
                          variant={formCategoryFilter === cat.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFormCategoryFilter(cat.value)}
                        >
                          {cat.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {formLoading ? (
                    <LoadingState message="Loading form templates…" />
                  ) : filteredFormTemplates.length === 0 ? (
                    <EmptyState
                      icon={<FormInput className={registryQueueEmptyIconClass} />}
                      title="No form templates found"
                      message="Adjust search or category filters, or create a new form template."
                      actionLabel="Create form"
                      onAction={() => router.push("/admin/form-templates/new")}
                    />
                  ) : (
                    <div className={correspondenceQueueListStackClass}>
                      {filteredFormTemplates.map((template) => {
                        const styles = getFormCategoryStyles(template.category);
                        return (
                          <ListRowCard
                            key={template.id}
                            density="compact"
                            className={cn("border-l-4", styles.accent)}
                            href={`/admin/form-templates/${template.id}`}
                            leading={(
                              <div className={cn(correspondenceQueueLeadingBoxClass, "bg-muted")}>
                                <FormInput className={cn(correspondenceQueueLeadingIconClass, "text-muted-foreground")} />
                              </div>
                            )}
                            actions={(
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    aria-label="More actions"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/admin/form-templates/${template.id}`)}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCloneForm(template.id)}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Clone
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteFormClick(template.id, template.name)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          >
                            <h4 className={correspondenceQueueSubjectClass}>{template.name}</h4>
                            {template.description ? (
                              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{template.description}</p>
                            ) : null}
                            <div className={cn(correspondenceQueueMetaRowClass, "mt-1")}>
                              <span className={correspondenceQueueMetaItemClass}>
                                <Badge
                                  variant="outline"
                                  className={cn(correspondenceQueueBadgeClass, "capitalize", styles.badge)}
                                >
                                  {template.category_display || template.category}
                                </Badge>
                              </span>
                              <span className={correspondenceQueueMetaItemClass}>
                                <Badge
                                  variant={template.is_active ? "default" : "outline"}
                                  className={correspondenceQueueBadgeClass}
                                >
                                  {template.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </span>
                              <span className={correspondenceQueueMetaItemClass}>
                                {template.structure?.fields?.length || 0} fields
                              </span>
                            </div>
                          </ListRowCard>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Delete Form Confirmation */}
        <AlertDialog open={showFormDeleteConfirm} onOpenChange={setShowFormDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-3">
                  <p>
                    Are you sure you want to delete <strong>"{formToDelete?.name}"</strong>? This action cannot be undone.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="form-delete-confirm">Type "DELETE" to confirm:</Label>
                    <Input
                      id="form-delete-confirm"
                      value={formDeleteConfirmText}
                      onChange={(e) => setFormDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="font-mono"
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setShowFormDeleteConfirm(false);
                  setFormToDelete(null);
                  setFormDeleteConfirmText("");
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteForm}
                className="bg-destructive text-destructive-foreground"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Workflow Confirmation */}
        <AlertDialog open={showWorkflowDeleteConfirm} onOpenChange={setShowWorkflowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Workflow Template</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-3">
                  <p>
                    Are you sure you want to delete <strong>"{workflowToDelete?.name}"</strong>? This action cannot be undone.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="delete-confirm">Type "DELETE" to confirm:</Label>
                    <Input
                      id="delete-confirm"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="font-mono"
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setShowWorkflowDeleteConfirm(false);
                  setWorkflowToDelete(null);
                  setDeleteConfirmText("");
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteWorkflow}
                disabled={deleteConfirmText !== "DELETE"}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Template
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DashboardLayout>
    </ClientErrorBoundary>
  );
}

export default function TemplatesHubPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <TemplatesHubForm />
    </Suspense>
  );
}
