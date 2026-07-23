"use client";
import { SYSTEM_ROLE_SUPER_ADMIN } from '@/lib/constants';

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/dms/RichTextEditor";
import { ContextualHelp } from "@/components/help/ContextualHelp";
import { LoadingState } from "@/components/shared/LoadingState";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListRowCard } from "@/components/shared/ListRowCard";
import { StatStrip } from "@/components/shared/StatStrip";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  loadTemplates,
  type DocumentTemplate,
  type TemplateScope,
  type TemplateType,
  saveTemplate,
  createTemplate,
  deleteTemplate,
} from "@/lib/template-storage";
import { getWorkflowTemplates, deleteWorkflowTemplate, updateWorkflowTemplate } from "@/lib/api/workflow";
import { getFormTemplates, deleteFormTemplate, cloneFormTemplate, createFormTemplate } from "@/lib/api/forms";
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
  LayoutTemplate,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useUserPermissions } from "@/hooks/use-user-permissions";

// Scope configuration
const scopeOptions: { value: TemplateScope; label: string }[] = [
  { value: "organization", label: "Organization-wide" },
  { value: "directorate", label: "Directorate" },
  { value: "division", label: "Division" },
  { value: "department", label: "Department" },
  { value: "user", label: "Personal" },
];

type HubTab = "documents" | "minutes" | "workflows" | "forms";

function TemplatesHubForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { directorates, divisions, departments, users: organizationUsers, isSyncing } = useOrganization();
  const { currentUser, hydrated: userHydrated } = useCurrentUser();
  const permissions = useUserPermissions(currentUser ?? undefined);
  const canAccessAdvancedTemplates = useMemo(() => {
    if (!currentUser) return false;
    return (
      currentUser.isSuperuser ||
      permissions.canAccessAdministration ||
      permissions.canManageOrgStructure
    );
  }, [currentUser, permissions.canAccessAdministration, permissions.canManageOrgStructure]);
  const allowedTabs = useMemo<HubTab[]>(
    () => (canAccessAdvancedTemplates
      ? ["documents", "minutes", "workflows", "forms"]
      : ["documents", "minutes"]),
    [canAccessAdvancedTemplates],
  );

  // Main tab state (overridable via ?tab=documents|workflows|forms)
  const [activeTab, setActiveTab] = useState<HubTab>("documents");

  useEffect(() => {
    const raw = searchParams.get("tab");
    if (raw === "documents" || raw === "minutes" || raw === "workflows" || raw === "forms") {
      if (allowedTabs.includes(raw)) {
        setActiveTab(raw);
      } else {
        setActiveTab("documents");
      }
      return;
    }
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab("documents");
    }
  }, [searchParams, allowedTabs, activeTab]);

  useEffect(() => {
    if (activeTab === "documents") setActiveTemplateType("document");
    if (activeTab === "minutes") setActiveTemplateType("minute");
  }, [activeTab]);

  const handleHubTabChange = (value: string) => {
    const tab = value as HubTab;
    if (!allowedTabs.includes(tab)) return;
    setActiveTab(tab);
    router.push(`/admin/templates-hub?tab=${tab}`, { scroll: false });
  };

  // ============ DOCUMENT TEMPLATES STATE ============
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [activeScope, setActiveScope] = useState<TemplateScope>("organization");
  const [selectedScopeId, setSelectedScopeId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [activeTemplateType, setActiveTemplateType] = useState<TemplateType>("document");
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [templateListSearch, setTemplateListSearch] = useState("");

  // ============ WORKFLOW TEMPLATES STATE ============
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([]);
  const [workflowLoading, setWorkflowLoading] = useState(true);
  const [workflowSearch, setWorkflowSearch] = useState("");
  const [workflowPreviewId, setWorkflowPreviewId] = useState<string | null>(null);

  // ============ FORM TEMPLATES STATE ============
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [formLoading, setFormLoading] = useState(true);
  const [formSearch, setFormSearch] = useState("");
  const [formCategoryFilter, setFormCategoryFilter] = useState<string>("all");
  const [formPreviewId, setFormPreviewId] = useState<string | null>(null);
  const [_deletingFormId, setDeletingFormId] = useState<string | null>(null);
  const [showFormDeleteConfirm, setShowFormDeleteConfirm] = useState(false);
  const [formToDelete, setFormToDelete] = useState<{ id: string; name: string } | null>(null);
  const [formDeleteConfirmText, setFormDeleteConfirmText] = useState("");
  const [showWorkflowDeleteConfirm, setShowWorkflowDeleteConfirm] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Form creation dialog
  const [showFormCreate, setShowFormCreate] = useState(false);
  const [newFormName, setNewFormName] = useState("");
  const [newFormCategory, setNewFormCategory] = useState<string>("general");
  const [newFormDesc, setNewFormDesc] = useState("");
  const [creatingForm, setCreatingForm] = useState(false);

  // Personal template users
  const personalTemplateUsers = useMemo(
    () => organizationUsers.filter((user) => user.systemRole !== SYSTEM_ROLE_SUPER_ADMIN),
    [organizationUsers]
  );

  // ============ DOCUMENT TEMPLATES LOGIC ============
  const [_templatesLoading, setTemplatesLoading] = useState(false);
  
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
    setSelectedTemplateId(null);
    setTitle("");
    setDescription("");
    setContentHtml("");
    setTemplateEditorOpen(false);
    setTemplateListSearch("");
    setWorkflowPreviewId(null);
    setFormPreviewId(null);
  }, [activeScope, selectedScopeId, activeTemplateType, activeTab]);

  const scopedTemplates = useMemo(() => {
    return templates.filter((template) => {
      if (template.scope !== activeScope) return false;
      if (template.templateType !== activeTemplateType) return false;
      if (activeScope === 'organization') return true;
      return template.scopeId === (selectedScopeId ?? null);
    });
  }, [templates, activeScope, selectedScopeId, activeTemplateType]);

  const filteredScopedTemplates = useMemo(() => {
    const query = templateListSearch.trim().toLowerCase();
    if (!query) return scopedTemplates;
    return scopedTemplates.filter(
      (template) =>
        template.title.toLowerCase().includes(query) ||
        (template.description?.toLowerCase().includes(query) ?? false),
    );
  }, [scopedTemplates, templateListSearch]);

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
    setTemplateEditorOpen(true);
  };

  const handleCreateNewDocTemplate = useCallback(() => {
    setSelectedTemplateId(null);
    setTitle(`New ${activeTemplateType === "minute" ? "Minute" : "Document"} Template`);
    setDescription("");
    if (activeTemplateType === "minute") {
      setContentHtml("Please review and revert with your feedback at the earliest convenience.");
    } else {
      setContentHtml("");
    }
    setTemplateEditorOpen(true);
  }, [activeTemplateType]);

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

  const handleDeleteDocTemplate = async () => {
    if (!selectedTemplateId) return;
    try {
      await deleteTemplate(selectedTemplateId);
      await refreshTemplates();
      setTemplateEditorOpen(false);
      setSelectedTemplateId(null);
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
    if (canAccessAdvancedTemplates && activeTab === "workflows") {
      loadWorkflowTemplates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, canAccessAdvancedTemplates]);

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
    if (!canAccessAdvancedTemplates) return;
    loadFormTemplates();
    // Load once on mount for accurate dashboard stats and whenever switching back to forms.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, canAccessAdvancedTemplates]);

  useEffect(() => {
    if (canAccessAdvancedTemplates && activeTab === "forms") {
      const timeoutId = setTimeout(() => loadFormTemplates(), 300);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formSearch, activeTab, canAccessAdvancedTemplates]);

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

  const handleCreateForm = async () => {
    if (!newFormName.trim()) {
      sonnerToast.error("Form name is required");
      return;
    }
    setCreatingForm(true);
    try {
      const created = await createFormTemplate({
        name: newFormName.trim(),
        category: newFormCategory as FormTemplate["category"],
        description: newFormDesc.trim(),
        is_active: true,
        structure: { fields: [] },
      });
      sonnerToast.success("Form template created");
      setShowFormCreate(false);
      setNewFormName("");
      setNewFormCategory("general");
      setNewFormDesc("");
      await loadFormTemplates();
      router.push(`/admin/form-templates/${created.id}`);
    } catch {
      sonnerToast.error("Failed to create form template");
    } finally {
      setCreatingForm(false);
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

  const workflowPreview = useMemo(
    () => workflowTemplates.find((template) => template.id === workflowPreviewId) ?? null,
    [workflowTemplates, workflowPreviewId],
  );

  const formPreview = useMemo(
    () => formTemplates.find((template) => template.id === formPreviewId) ?? null,
    [formTemplates, formPreviewId],
  );

  const tabSubtitle = useMemo(() => {
    if (activeTab === "workflows") {
      return "Preview approval chains here, then open the full editor to change steps.";
    }
    if (activeTab === "forms") {
      return "Preview form templates here, then open the builder to edit fields.";
    }
    if (activeTab === "minutes") {
      return "Choose scope, pick a minute template from the list, or create a new one.";
    }
    if (!canAccessAdvancedTemplates) {
      return "Manage document and minute templates for your scope. Workflow and form templates are managed by executives.";
    }
    return "Choose scope, pick a template from the list, or create a new document template.";
  }, [activeTab, canAccessAdvancedTemplates]);

  const headerActions = useMemo(() => {
    if (activeTab === "workflows") {
      return (
        <>
          <Button size="sm" className="bg-gradient-primary" onClick={() => router.push("/admin/workflow-templates/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Create workflow
          </Button>
          <ContextualHelp
            title="Workflow templates"
            description="Approval chains for correspondence and documents."
            steps={[
              "Create a workflow or open an existing row to edit steps.",
              "Use row actions to clone, activate, or delete.",
              "Search by name, slug, or description above the tabs.",
            ]}
          />
        </>
      );
    }
    if (activeTab === "forms") {
      return (
        <>
          <Button size="sm" className="bg-gradient-primary" onClick={() => setShowFormCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create form
          </Button>
          <ContextualHelp
            title="Form templates"
            description="Structured data collection with fields and categories."
            steps={[
              "Create a form or open a row to edit fields.",
              "Filter by category in the search bar.",
              "Use row actions to clone or delete templates.",
            ]}
          />
        </>
      );
    }
    return (
      <>
        <Button size="sm" className="bg-gradient-primary" onClick={handleCreateNewDocTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          New template
        </Button>
        <ContextualHelp
          title="How to manage templates"
          description="Use tabs to switch between document, minute, workflow, and form templates."
          steps={[
            "Pick scope, then select a template from the list to edit.",
            "Use New template to create one for the current scope.",
            "Search by title or description in the bar above the tabs.",
          ]}
        />
      </>
    );
  }, [activeTab, router, handleCreateNewDocTemplate]);

  const renderWorkflowPreviewPanel = () => {
    if (!workflowPreview) return null;
    const sortedSteps = [...workflowPreview.steps].sort((a, b) => a.order - b.order);
    return (
      <Dialog open={workflowPreviewId !== null} onOpenChange={(open) => { if (!open) setWorkflowPreviewId(null); }}>
        <DialogContent size="md" height="scroll">
          <DialogHeader>
            <DialogTitle>{workflowPreview.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {workflowPreview.description ? (
              <p className="text-sm text-muted-foreground">{workflowPreview.description}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={correspondenceQueueBadgeClass}>
                {workflowPreview.applies_to === "correspondence" ? "Correspondence" : "Document"}
              </Badge>
              <Badge variant="secondary" className={correspondenceQueueBadgeClass}>
                {sortedSteps.length} steps
              </Badge>
              <Badge variant={workflowPreview.is_active ? "default" : "secondary"} className={correspondenceQueueBadgeClass}>
                {workflowPreview.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            {sortedSteps.length > 0 ? (
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                {sortedSteps.map((step) => (
                  <li key={step.id}>{step.title}</li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No steps configured yet.</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              size="sm"
              className="bg-gradient-primary"
              onClick={() => {
                const id = workflowPreview.id;
                setWorkflowPreviewId(null);
                router.push(`/admin/workflow-templates/${id}`);
              }}
            >
              Open full editor
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const renderFormPreviewPanel = () => {
    if (!formPreview) return null;
    const styles = getFormCategoryStyles(formPreview.category);
    const fieldCount = formPreview.structure?.fields?.length || 0;
    return (
      <Dialog open={formPreviewId !== null} onOpenChange={(open) => { if (!open) setFormPreviewId(null); }}>
        <DialogContent size="md" height="scroll">
          <DialogHeader>
            <DialogTitle>{formPreview.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formPreview.description ? (
              <p className="text-sm text-muted-foreground">{formPreview.description}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={cn(correspondenceQueueBadgeClass, "capitalize", styles.badge)}>
                {formPreview.category_display || formPreview.category}
              </Badge>
              <Badge variant={formPreview.is_active ? "default" : "outline"} className={correspondenceQueueBadgeClass}>
                {formPreview.is_active ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="secondary" className={correspondenceQueueBadgeClass}>
                {fieldCount} fields
              </Badge>
            </div>
            {fieldCount > 0 ? (
              <ul className="space-y-1 text-sm">
                {formPreview.structure?.fields?.slice(0, 8).map((field) => (
                  <li key={field.id} className="text-muted-foreground">
                    {field.label || field.name}
                    <span className="ml-2 text-xs uppercase">{field.type}</span>
                  </li>
                ))}
                {fieldCount > 8 ? (
                  <li className="text-xs text-muted-foreground">+ {fieldCount - 8} more fields</li>
                ) : null}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No fields configured yet.</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              size="sm"
              className="bg-gradient-primary"
              onClick={() => {
                const id = formPreview.id;
                setFormPreviewId(null);
                router.push(`/admin/form-templates/${id}`);
              }}
            >
              Open full editor
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const renderDocumentMinutePanel = (panelType: "document" | "minute") => {
    const isMinute = panelType === "minute";
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-4">
            <CardDescription>
              {isMinute ? "Choose scope, then pick a template from the list below." : "Choose scope, then pick a template from the list below."}
            </CardDescription>
            <div className="grid gap-4 md:grid-cols-3 pt-2">
              <div className="space-y-2">
                <Label>Scope Level</Label>
                <Select value={activeScope} onValueChange={(v) => setActiveScope(v as TemplateScope)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scopeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {activeScope !== "organization" ? (
                <div className="space-y-2">
                  <Label>Select {activeScope.charAt(0).toUpperCase() + activeScope.slice(1)}</Label>
                  <Select value={selectedScopeId ?? ""} onValueChange={(v) => setSelectedScopeId(v || null)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {scopeEntityOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredScopedTemplates.length === 0 ? (
              <EmptyState
                icon={isMinute ? <MessageSquare className={registryQueueEmptyIconClass} /> : <FileEdit className={registryQueueEmptyIconClass} />}
                title={templateListSearch.trim() ? "No templates match your search" : `No ${isMinute ? "minute" : "document"} templates yet`}
                message={
                  templateListSearch.trim()
                    ? "Try a different title or description keyword."
                    : `Create a template for this scope, or switch scope to find existing templates.`
                }
                actionLabel={templateListSearch.trim() ? undefined : "New template"}
                onAction={templateListSearch.trim() ? undefined : handleCreateNewDocTemplate}
              />
            ) : (
              <div className={correspondenceQueueListStackClass}>
                {filteredScopedTemplates.map((template) => (
                  <ListRowCard
                    key={template.id}
                    density="compact"
                    className={cn(selectedTemplateId === template.id && templateEditorOpen ? "ring-2 ring-primary" : "")}
                    onRowClick={() => handleTemplateSelect(template.id)}
                    leading={(
                      <div className={cn(correspondenceQueueLeadingBoxClass, isMinute ? "bg-info/10" : "bg-primary/10")}>
                        {isMinute ? (
                          <MessageSquare className={cn(correspondenceQueueLeadingIconClass, "text-info")} />
                        ) : (
                          <FileEdit className={cn(correspondenceQueueLeadingIconClass, "text-primary")} />
                        )}
                      </div>
                    )}
                  >
                    <h4 className={correspondenceQueueSubjectClass}>{template.title}</h4>
                    {template.description ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{template.description}</p>
                    ) : null}
                  </ListRowCard>
                ))}
              </div>
            )}

            <Dialog open={templateEditorOpen} onOpenChange={(open) => { if (!open) { setTemplateEditorOpen(false); setSelectedTemplateId(null); } }}>
              <DialogContent size="lg" height="scroll">
                <DialogHeader>
                  <DialogTitle>
                    {selectedTemplateId ? "Edit template" : "New template"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Template title" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description (optional)</Label>
                      <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    {isMinute ? (
                      <Textarea
                        value={contentHtml}
                        onChange={(e) => setContentHtml(e.target.value)}
                        rows={5}
                        placeholder="Enter minute template text..."
                        className="min-h-[120px]"
                      />
                    ) : (
                      <div className="border rounded-lg bg-background">
                        <RichTextEditor value={contentHtml} onChange={(html) => setContentHtml(html)} showCharacterCount={false} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between pt-2">
                  <div>
                    {selectedTemplateId ? (
                      <Button variant="outline" size="sm" onClick={handleDeleteDocTemplate} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { refreshTemplates(); setTemplateEditorOpen(false); }}>
                      Reset
                    </Button>
                    <Button onClick={handleSaveDocTemplate}>
                      {selectedTemplateId ? "Update Template" : "Create Template"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ============ LOADING STATE ============
  return (
    <>
      {!userHydrated || isSyncing ? (
        <div className="container mx-auto p-6">
          <LoadingState message="Loading templates hub…" />
        </div>
      ) : !currentUser ? (
        <div className="container mx-auto p-6 space-y-6">
        </div>
      ) : (
        <ClientErrorBoundary>
          <AdminPageShell
            title="Templates"
            subtitle={tabSubtitle}
            icon={LayoutTemplate}
            actions={headerActions}
          >
          <StatStrip
            items={[
              { key: "documents", label: "Document templates", value: documentCount },
              { key: "minutes", label: "Minute templates", value: minuteCount },
              ...(canAccessAdvancedTemplates
                ? [
                    { key: "workflows", label: "Workflow templates", value: workflowStats.total },
                    { key: "forms", label: "Form templates", value: formTemplates.length },
                  ]
                : []),
            ]}
          />

          {(activeTab === "workflows" || activeTab === "forms" || activeTab === "documents" || activeTab === "minutes") ? (
            <Card>
              <CardContent className="flex flex-wrap items-center gap-2 p-2">
                <div className="relative min-w-[200px] flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={
                      activeTab === "workflows"
                        ? "Search workflows…"
                        : activeTab === "forms"
                          ? "Search form templates…"
                          : "Search templates by title or description…"
                    }
                    value={
                      activeTab === "workflows"
                        ? workflowSearch
                        : activeTab === "forms"
                          ? formSearch
                          : templateListSearch
                    }
                    onChange={(e) => {
                      if (activeTab === "workflows") setWorkflowSearch(e.target.value);
                      else if (activeTab === "forms") setFormSearch(e.target.value);
                      else setTemplateListSearch(e.target.value);
                    }}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                {activeTab === "forms" ? (
                  <Select value={formCategoryFilter} onValueChange={setFormCategoryFilter}>
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {formCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Tabs value={activeTab} onValueChange={handleHubTabChange}>
            <TabsList>
              <TabsTrigger value="documents" className="text-xs px-2.5 py-1">Documents</TabsTrigger>
              <TabsTrigger value="minutes" className="text-xs px-2.5 py-1">Minutes</TabsTrigger>
              {canAccessAdvancedTemplates ? (
                <>
                  <TabsTrigger value="workflows" className="text-xs px-2.5 py-1">Workflows</TabsTrigger>
                  <TabsTrigger value="forms" className="text-xs px-2.5 py-1">Forms</TabsTrigger>
                </>
              ) : null}
            </TabsList>

            <TabsContent value="documents" className="mt-6 focus-visible:outline-none">
              {renderDocumentMinutePanel("document")}
            </TabsContent>

            <TabsContent value="minutes" className="mt-6 focus-visible:outline-none">
              {renderDocumentMinutePanel("minute")}
            </TabsContent>

                        <TabsContent value="workflows" className="mt-6 focus-visible:outline-none">
            <Card>
                <CardContent className="space-y-4 pt-6">
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
                          className={cn(workflowPreviewId === template.id ? "ring-2 ring-primary" : "")}
                          onRowClick={() => setWorkflowPreviewId(template.id)}
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
                                  onClick={(e) => e.stopPropagation()}
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
            </TabsContent>

            <TabsContent value="forms" className="mt-6 focus-visible:outline-none">
              <Card>
                <CardContent className="space-y-4 pt-6">
                  {formLoading ? (
                    <LoadingState message="Loading form templates…" />
                  ) : filteredFormTemplates.length === 0 ? (
                    <EmptyState
                      icon={<FormInput className={registryQueueEmptyIconClass} />}
                      title="No form templates found"
                      message="Adjust search or category filters, or create a new form template."
                      actionLabel="Create form"
                      onAction={() => setShowFormCreate(true)}
                    />
                  ) : (
                    <div className={correspondenceQueueListStackClass}>
                      {filteredFormTemplates.map((template) => {
                        const styles = getFormCategoryStyles(template.category);
                        return (
                          <ListRowCard
                            key={template.id}
                            density="compact"
                            className={cn(
                              "border-l-4",
                              styles.accent,
                              formPreviewId === template.id ? "ring-2 ring-primary" : "",
                            )}
                            onRowClick={() => setFormPreviewId(template.id)}
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
                                    onClick={(e) => e.stopPropagation()}
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
            </TabsContent>
          </Tabs>
          </AdminPageShell>

        {renderWorkflowPreviewPanel()}
        {renderFormPreviewPanel()}

        {/* Create Form Dialog */}
        <Dialog open={showFormCreate} onOpenChange={setShowFormCreate}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Create Form Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="form-name">Name</Label>
                <Input id="form-name" value={newFormName} onChange={(e) => setNewFormName(e.target.value)} placeholder="e.g. Leave Request Form" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-category">Category</Label>
                <Select value={newFormCategory} onValueChange={setNewFormCategory}>
                  <SelectTrigger id="form-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="procurement">Procurement</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-desc">Description (optional)</Label>
                <Textarea id="form-desc" value={newFormDesc} onChange={(e) => setNewFormDesc(e.target.value)} rows={2} placeholder="Brief description of this form..." />
              </div>
              <Button className="w-full" onClick={() => void handleCreateForm()} disabled={creatingForm}>
                {creatingForm ? "Creating..." : "Create & Open Builder"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
        </ClientErrorBoundary>
      )}
    </>
  );
}

export default function TemplatesHubPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <TemplatesHubForm />
    </Suspense>
  );
}
