"use client";
import { SYSTEM_ROLE_SUPER_ADMIN } from '@/lib/constants';

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  correspondenceQueueMetaItemClass,
  correspondenceQueueMetaRowClass,
  correspondenceQueueSubjectClass,
  registryQueueEmptyIconClass,
} from "@/components/shared/registry-queue-styles";
import { cn } from "@/lib/utils";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  loadTemplates,
  type DocumentTemplate,
  type TemplateScope,
  type TemplateType,
  saveTemplate,
  createTemplate,
  deleteTemplate,
} from "@/lib/api/document-templates";
import { getWorkflowTemplates, deleteWorkflowTemplate, updateWorkflowTemplate } from "@/lib/api/workflow";
import { getFormTemplates, deleteFormTemplate, cloneFormTemplate, createFormTemplate } from "@/lib/api/forms";
import type { WorkflowStep, WorkflowTemplate } from "@/lib/types/workflow";
import { logError } from "@/lib/client-logger";
import type { FormTemplate } from "@/lib/types/forms";
import {
  Plus,
  Trash2,
  GitBranch,
  FormInput,
  Search,
  Edit,
  Copy,
  Power,
  PowerOff,
  FileEdit,
  MessageSquare,
  LayoutTemplate,
  X,
} from "lucide-react";
import { toast as sonnerToast } from "@/components/ui/sonner";
import { useOrganizationCatalogs } from "@/hooks/use-organization-catalogs";
import { useOrgUsers } from "@/hooks/use-org-users";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { CaseTemplatesPanel, CASE_TEMPLATE_TYPE_FILTERS } from "@/components/cases/CaseTemplatesPanel";
import { ReferencePanel } from "@/components/templates/ReferencePanel";
import { REFERENCE_SCHEME_ACTION_SLOT_ID } from "@/components/templates/ReferenceSchemesPanel";
import { TemplateHubRowActions } from "@/components/templates/TemplateHubRowActions";
import { getCaseTemplates } from "@/lib/api/cases";
import { listReferenceSchemes } from "@/lib/api/reference-schemes";

// Scope configuration
const scopeOptions: { value: TemplateScope; label: string }[] = [
  { value: "organization", label: "Organization-wide" },
  { value: "directorate", label: "Directorate" },
  { value: "division", label: "Division" },
  { value: "department", label: "Department" },
  { value: "user", label: "Personal" },
];

type HubTab = "documents" | "minutes" | "workflows" | "forms" | "cases" | "references";

const HUB_TAB_TRIGGER_CLASS =
  "rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-muted data-[state=active]:shadow-none";

const FORM_CATEGORY_FILTERS = [
  { value: "all", label: "All" },
  { value: "procurement", label: "Procurement" },
  { value: "audit", label: "Audit" },
  { value: "finance", label: "Finance" },
  { value: "general", label: "General" },
];

type WorkflowGroupKey = "upward" | "downward" | "special";

const WORKFLOW_GROUP_ORDER: WorkflowGroupKey[] = ["upward", "downward", "special"];

const WORKFLOW_GROUP_LABELS: Record<WorkflowGroupKey, string> = {
  upward: "Upward approval",
  downward: "Downward assignment",
  special: "Special",
};

function workflowGroupKey(template: WorkflowTemplate): WorkflowGroupKey {
  const slug = template.slug.toLowerCase();
  if (slug.includes("assignment") || slug.includes("downward")) return "downward";
  if (slug.includes("urgent") || slug.includes("information") || slug.includes("parallel") || slug.includes("fyi")) {
    return "special";
  }
  return "upward";
}

function workflowStepChain(steps: WorkflowStep[]): string {
  return [...steps]
    .sort((a, b) => a.order - b.order)
    .map((step) => {
      const role = step.required_role?.trim();
      if (role) {
        const short = role
          .replace("Assistant General Manager", "AGM")
          .replace("General Manager", "GM")
          .replace("Executive Director", "ED")
          .replace("Managing Director", "MD");
        return short;
      }
      return step.title;
    })
    .filter(Boolean)
    .join(" → ");
}

function TemplatesHubForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");
  const urlQuery = searchParams.get("q") ?? "";
  const { directorates, divisions, departments } = useOrganizationCatalogs('directorates', 'divisions', 'departments');
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
      ? ["documents", "minutes", "cases", "workflows", "forms", "references"]
      : ["documents", "minutes", "cases"]),
    [canAccessAdvancedTemplates],
  );

  // Main tab state (overridable via ?tab=documents|minutes|cases|workflows|forms)
  const [activeTab, setActiveTab] = useState<HubTab>("documents");

  useEffect(() => {
    const raw = searchParams.get("tab");
    if (
      raw === "documents" ||
      raw === "minutes" ||
      raw === "cases" ||
      raw === "workflows" ||
      raw === "forms" ||
      raw === "references"
    ) {
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
  const [activeScope, setActiveScope] = useState<TemplateScope>(() => {
    const requested = searchParams.get("scope");
    return scopeOptions.some((option) => option.value === requested)
      ? (requested as TemplateScope)
      : "organization";
  });
  const { users: organizationUsers } = useOrgUsers({ enabled: activeScope === "user" });
  const [selectedScopeId, setSelectedScopeId] = useState<string | null>(
    searchParams.get("scope_id"),
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [activeTemplateType, setActiveTemplateType] = useState<TemplateType>("document");
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [documentSearch, setDocumentSearch] = useState(
    urlTab === "documents" || !urlTab ? urlQuery : "",
  );
  const [minuteSearch, setMinuteSearch] = useState(urlTab === "minutes" ? urlQuery : "");
  const [editorSnapshot, setEditorSnapshot] = useState<{
    title: string;
    description: string;
    contentHtml: string;
  } | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // ============ WORKFLOW TEMPLATES STATE ============
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([]);
  const [workflowLoading, setWorkflowLoading] = useState(true);
  const [workflowSearch, setWorkflowSearch] = useState(urlTab === "workflows" ? urlQuery : "");
  const [workflowPreviewId, setWorkflowPreviewId] = useState<string | null>(null);

  // ============ FORM TEMPLATES STATE ============
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [formLoading, setFormLoading] = useState(true);
  const [formSearch, setFormSearch] = useState(urlTab === "forms" ? urlQuery : "");
  const [formCategoryFilter, setFormCategoryFilter] = useState<string>(() => {
    const requested = searchParams.get("category");
    return requested && FORM_CATEGORY_FILTERS.some((option) => option.value === requested)
      ? requested
      : "all";
  });
  const [formPreviewId, setFormPreviewId] = useState<string | null>(null);
  const [_deletingFormId, setDeletingFormId] = useState<string | null>(null);
  const [showFormDeleteConfirm, setShowFormDeleteConfirm] = useState(false);
  const [formToDelete, setFormToDelete] = useState<{ id: string; name: string } | null>(null);
  const [formDeleteConfirmText, setFormDeleteConfirmText] = useState("");
  const [showWorkflowDeleteConfirm, setShowWorkflowDeleteConfirm] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // ============ CASE TEMPLATES STATE ============
  const [caseSearch, setCaseSearch] = useState(urlTab === "cases" ? urlQuery : "");
  const [caseTypeFilter, setCaseTypeFilter] = useState(() => {
    const requested = searchParams.get("case_type");
    return requested && CASE_TEMPLATE_TYPE_FILTERS.some((option) => option.value === requested)
      ? requested
      : "all";
  });
  const [caseTemplateCount, setCaseTemplateCount] = useState(0);
  const [caseLoading, setCaseLoading] = useState(true);
  const [referenceStats, setReferenceStats] = useState<{
    total: number;
    active: number;
    classifications: number;
  } | null>(null);

  useEffect(() => {
    if (!canAccessAdvancedTemplates) return;
    let cancelled = false;
    listReferenceSchemes({ pageSize: 1 })
      .then((data) => {
        if (cancelled) return;
        setReferenceStats((current) => ({
          total: data.count,
          active: current?.active ?? 0,
          classifications: current?.classifications ?? 0,
        }));
      })
      .catch((error) => {
        if (!cancelled) logError("Failed to load reference scheme count", error);
      });
    return () => {
      cancelled = true;
    };
  }, [canAccessAdvancedTemplates]);

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
  const [templatesLoading, setTemplatesLoading] = useState(true);
  
  const refreshTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const loaded = await loadTemplates();
      setTemplates([...loaded]);
    } catch (error: unknown) {
      logError('Failed to load templates:', error);
      sonnerToast.error("Could not load templates", { description: "Please try again." });
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    refreshTemplates();
  }, []);

  useEffect(() => {
    setSelectedTemplateId(null);
    setTitle("");
    setDescription("");
    setContentHtml("");
    setTemplateEditorOpen(false);
    setEditorSnapshot(null);
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

  const templateSearch = activeTab === "minutes" ? minuteSearch : documentSearch;

  const filteredScopedTemplates = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();
    if (!query) return scopedTemplates;
    return scopedTemplates.filter(
      (template) =>
        template.title.toLowerCase().includes(query) ||
        (template.description?.toLowerCase().includes(query) ?? false),
    );
  }, [scopedTemplates, templateSearch]);

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
    if (scopeEntityOptions.length === 0) return;
    if (!selectedScopeId || !scopeEntityOptions.some((option) => option.id === selectedScopeId)) {
      setSelectedScopeId(scopeEntityOptions[0].id);
    }
  }, [activeScope, scopeEntityOptions, selectedScopeId]);

  const isEditorDirty =
    templateEditorOpen &&
    editorSnapshot !== null &&
    (title !== editorSnapshot.title ||
      description !== editorSnapshot.description ||
      contentHtml !== editorSnapshot.contentHtml);

  const closeTemplateEditor = () => {
    setTemplateEditorOpen(false);
    setSelectedTemplateId(null);
    setEditorSnapshot(null);
  };

  const requestCloseTemplateEditor = () => {
    if (isEditorDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    closeTemplateEditor();
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((item) => item.id as string === templateId);
    if (!template) return;
    setActiveTemplateType(template.templateType);
    setSelectedTemplateId(template.id);
    setTitle(template.title);
    setDescription(template.description ?? "");
    setContentHtml(template.contentHtml);
    setEditorSnapshot({
      title: template.title,
      description: template.description ?? "",
      contentHtml: template.contentHtml,
    });
    setTemplateEditorOpen(true);
  };

  const handleCreateNewDocTemplate = useCallback(() => {
    const defaultTitle = `New ${activeTemplateType === "minute" ? "Minute" : "Document"} Template`;
    const defaultContent =
      activeTemplateType === "minute"
        ? "Please review and revert with your feedback at the earliest convenience."
        : "";
    setSelectedTemplateId(null);
    setTitle(defaultTitle);
    setDescription("");
    setContentHtml(defaultContent);
    setEditorSnapshot({ title: defaultTitle, description: "", contentHtml: defaultContent });
    setTemplateEditorOpen(true);
  }, [activeTemplateType]);

  const handleSaveDocTemplate = async () => {
    if (!currentUser) {
      sonnerToast.error("No current user found", { description: "Unable to save template without admin context." });
      return;
    }
    if (!title.trim()) {
      sonnerToast.error("Template title required", { description: "Add a descriptive title for the template." });
      return;
    }
    if (!contentHtml || contentHtml.trim().length === 0) {
      sonnerToast.error("Template body empty", { description: "Provide rich text content for the template." });
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
        setEditorSnapshot({ title: title.trim(), description: description.trim(), contentHtml });
        sonnerToast.success("Template updated", { description: `${updated.title} saved successfully.` });
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
        setEditorSnapshot({ title: title.trim(), description: description.trim(), contentHtml });
        sonnerToast.success("Template created", { description: `${created.title} is now available.` });
      }
    } catch (error: unknown) {
      logError('Failed to save template:', error);
      sonnerToast.error("Could not save template", { description: "Please try again." });
    }
  };

  const handleDeleteDocTemplate = async () => {
    if (!selectedTemplateId) return;
    try {
      await deleteTemplate(selectedTemplateId);
      await refreshTemplates();
      closeTemplateEditor();
      sonnerToast.success("Template deleted", { description: "Template removed successfully." });
    } catch (error: unknown) {
      logError('Failed to delete template:', error);
      sonnerToast.error("Could not delete template", { description: "Please try again." });
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getCaseTemplates();
        if (!cancelled) {
          setCaseTemplateCount(Array.isArray(data) ? data.filter((t) => t.is_active).length : 0);
        }
      } catch {
        if (!cancelled) setCaseTemplateCount(0);
      } finally {
        if (!cancelled) setCaseLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ============ WORKFLOW TEMPLATES LOGIC ============
  const loadWorkflowTemplates = async () => {
    try {
      setWorkflowLoading(true);
      const data = await getWorkflowTemplates();
      setWorkflowTemplates(data);
    } catch (error: unknown) {
      logError("Error loading workflow templates:", error);
      sonnerToast.error("Could not load workflow templates");
    } finally {
      setWorkflowLoading(false);
    }
  };

  useEffect(() => {
    // Load once so the summary strip reports the real count before the tab is opened.
    if (canAccessAdvancedTemplates) {
      loadWorkflowTemplates();
    }
  }, [canAccessAdvancedTemplates]);

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

  const groupedWorkflowTemplates = useMemo(() => {
    const groups: Record<WorkflowGroupKey, WorkflowTemplate[]> = {
      upward: [],
      downward: [],
      special: [],
    };
    for (const template of filteredWorkflowTemplates) {
      groups[workflowGroupKey(template)].push(template);
    }
    for (const key of WORKFLOW_GROUP_ORDER) {
      groups[key].sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups;
  }, [filteredWorkflowTemplates]);

  const handleDeleteWorkflowClick = (id: string, name: string) => {
    setWorkflowToDelete({ id, name });
    setDeleteConfirmText("");
    setShowWorkflowDeleteConfirm(true);
  };

  const handleDeleteWorkflow = async () => {
    if (!workflowToDelete) return;
    if (deleteConfirmText !== "DELETE") {
      sonnerToast.error("Invalid confirmation", { description: 'Please type "DELETE" to confirm' });
      return;
    }
    try {
      await deleteWorkflowTemplate(workflowToDelete.id);
      sonnerToast.success("Template deleted");
      loadWorkflowTemplates();
      setShowWorkflowDeleteConfirm(false);
      setWorkflowToDelete(null);
      setDeleteConfirmText("");
    } catch (error: unknown) {
      logError("Error deleting template:", error);
      sonnerToast.error("Could not delete template");
    }
  };

  const handleToggleWorkflowActive = async (template: WorkflowTemplate) => {
    try {
      await updateWorkflowTemplate(template.id, { is_active: !template.is_active });
      sonnerToast.success(`Template ${!template.is_active ? "activated" : "deactivated"}`);
      loadWorkflowTemplates();
    } catch (error: unknown) {
      logError("Error toggling template:", error);
      sonnerToast.error("Could not update template");
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
      const data = await getFormTemplates({ is_active: undefined });
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
    // One load feeds both the summary count and the client-side search.
    if (!canAccessAdvancedTemplates) return;
    loadFormTemplates();
  }, [canAccessAdvancedTemplates]);

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
    ? formTemplates.filter((template) => {
        if (formCategoryFilter !== "all" && template.category !== formCategoryFilter) return false;
        const query = formSearch.trim().toLowerCase();
        if (!query) return true;
        return (
          template.name.toLowerCase().includes(query) ||
          (template.description?.toLowerCase().includes(query) ?? false) ||
          template.category.toLowerCase().includes(query)
        );
      })
    : [];

  const getFormCategoryStyles = (category: string) => {
    switch (category) {
      case "audit":
        return {
          accent: "border-l-amber-500",
          badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
        };
      case "finance":
        return {
          accent: "border-l-emerald-500",
          badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
        };
      case "procurement":
        return {
          accent: "border-l-blue-500",
          badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
        };
      default:
        return {
          accent: "border-l-slate-500",
          badge: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
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
      return "Grouped approval chains — preview steps and roles, then open the editor to change them.";
    }
    if (activeTab === "forms") {
      return "Preview sections and sign-off chains, then open the builder to edit fields.";
    }
    if (activeTab === "minutes") {
      return "Pick a scope, then select or create a minute template.";
    }
    if (activeTab === "references") {
      return "Configure how each directorate, division and department issues classified reference numbers, then audit the sequence.";
    }
    if (activeTab === "cases") {
      return "Start a case from a pre-configured template. Case templates themselves are maintained by administrators.";
    }
    if (!canAccessAdvancedTemplates) {
      return "Manage document, minute, and case templates for your scope. Workflow and form templates are managed by executives.";
    }
    return "Pick a scope, then select or create a document template.";
  }, [activeTab, canAccessAdvancedTemplates]);

  const docMinuteCtaLabel = activeTab === "minutes" ? "New minute template" : "New document template";

  const scopeEntityLabel = activeScope === "user" ? "person" : activeScope;
  const scopeDisplayName =
    activeScope === "organization"
      ? "Organization-wide"
      : scopeEntityOptions.find((option) => option.id === selectedScopeId)?.name ?? `this ${activeScope}`;

  const searchValue =
    activeTab === "workflows"
      ? workflowSearch
      : activeTab === "forms"
        ? formSearch
        : activeTab === "cases"
          ? caseSearch
          : templateSearch;
  const searchPlaceholder =
    activeTab === "workflows"
      ? "Search workflows…"
      : activeTab === "forms"
        ? "Search form templates…"
        : activeTab === "cases"
          ? "Search case templates…"
          : "Search templates by title or description…";
  const handleSearchChange = (value: string) => {
    if (activeTab === "workflows") setWorkflowSearch(value);
    else if (activeTab === "forms") setFormSearch(value);
    else if (activeTab === "cases") setCaseSearch(value);
    else if (activeTab === "minutes") setMinuteSearch(value);
    else setDocumentSearch(value);
  };
  const clearSearch = () => handleSearchChange("");

  // Keep the URL canonical so a refresh (or a shared link) restores this exact view.
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    if (activeScope !== "organization") {
      params.set("scope", activeScope);
      if (selectedScopeId) params.set("scope_id", selectedScopeId);
    }
    const query = activeTab === "references" ? "" : searchValue.trim();
    if (query) params.set("q", query);
    if (activeTab === "forms" && formCategoryFilter !== "all") {
      params.set("category", formCategoryFilter);
    }
    if (activeTab === "cases" && caseTypeFilter !== "all") {
      params.set("case_type", caseTypeFilter);
    }

    const target = `/admin/templates-hub?${params.toString()}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === target) return;

    const handle = window.setTimeout(() => {
      router.replace(target, { scroll: false });
    }, 200);
    return () => window.clearTimeout(handle);
  }, [
    activeTab,
    activeScope,
    selectedScopeId,
    searchValue,
    formCategoryFilter,
    caseTypeFilter,
    router,
  ]);

  const headerActions = useMemo(() => {
    if (activeTab === "references") {
      return (
        <>
          <div id={REFERENCE_SCHEME_ACTION_SLOT_ID} />
          <ContextualHelp
            title="Reference numbers"
            description="Each unit issues numbers like HQ/GM/ICT/AD/001."
            steps={[
              "Pick a unit, then set its location, authority and unit code.",
              "Classifications (AD, OP, CON…) each keep their own counter.",
              "Set the next serial to align with the unit's existing register.",
              "Open Issued numbers to audit every number against its correspondence.",
            ]}
          />
        </>
      );
    }
    if (activeTab === "workflows") {
      return (
        <>
          <Button size="compact" onClick={() => router.push("/admin/workflow-templates/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Create workflow
          </Button>
          <ContextualHelp
            title="Workflow templates"
            description="Approval chains for correspondence and documents."
            steps={[
              "Create a workflow or open an existing row to edit steps.",
              "Use row actions to clone, activate, or delete.",
              "Search by name, slug, or description below the tabs.",
            ]}
          />
        </>
      );
    }
    if (activeTab === "forms") {
      return (
        <>
          <Button size="compact" onClick={() => setShowFormCreate(true)}>
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
    if (activeTab === "cases") {
      return (
        <ContextualHelp
          title="Case templates"
          description="Pre-configured case types you can start from in one step."
          steps={[
            "Filter by case type or search by name.",
            "Click Create on a template to open a new case.",
            "Case templates are maintained by administrators, not created here.",
          ]}
        />
      );
    }
    return (
      <>
        <Button size="compact" onClick={handleCreateNewDocTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          {docMinuteCtaLabel}
        </Button>
        <ContextualHelp
          title={activeTab === "minutes" ? "Minute templates" : "Document templates"}
          description="Templates are stored per scope (organization, directorate, division, department, or personal)."
          steps={[
            "Set scope level, then pick a template from the list to edit.",
            `Use ${docMinuteCtaLabel} to create one for the current scope.`,
            "Search by title or description in the bar below the tabs.",
          ]}
        />
      </>
    );
  }, [activeTab, router, handleCreateNewDocTemplate, docMinuteCtaLabel]);

  const renderWorkflowPreviewPanel = () => {
    if (!workflowPreview) return null;
    const sortedSteps = [...workflowPreview.steps].sort((a, b) => a.order - b.order);
    const chain = workflowStepChain(sortedSteps);
    return (
      <Dialog open={workflowPreviewId !== null} onOpenChange={(open) => { if (!open) setWorkflowPreviewId(null); }}>
        <DialogContent size="md" height="scroll">
          <DialogHeader>
            <DialogTitle>{workflowPreview.name}</DialogTitle>
            <DialogDescription>Preview the steps of this workflow template.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {workflowPreview.description ? (
              <p className="text-sm text-muted-foreground">{workflowPreview.description}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={correspondenceQueueBadgeClass}>
                {WORKFLOW_GROUP_LABELS[workflowGroupKey(workflowPreview)]}
              </Badge>
              <Badge variant="outline" className={correspondenceQueueBadgeClass}>
                {workflowPreview.applies_to === "correspondence" ? "Correspondence" : "Document"}
              </Badge>
              <Badge variant="secondary" className={correspondenceQueueBadgeClass}>
                {sortedSteps.length} steps
              </Badge>
              {!workflowPreview.is_active ? (
                <Badge variant="secondary" className={correspondenceQueueBadgeClass}>
                  Inactive
                </Badge>
              ) : null}
            </div>
            {chain ? (
              <p className="text-sm font-medium text-foreground">{chain}</p>
            ) : null}
            {sortedSteps.length > 0 ? (
              <ol className="list-decimal space-y-2 pl-5 text-sm">
                {sortedSteps.map((step) => (
                  <li key={step.id}>
                    <span className="font-medium text-foreground">{step.title}</span>
                    {(step.required_role || step.required_grade_level) ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {[step.required_role, step.required_grade_level].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No steps configured yet.</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              size="compact"
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
    const fields = formPreview.structure?.fields ?? [];
    const sections = formPreview.structure?.sections ?? [];
    const signatureRoles = formPreview.structure?.signatures?.roles ?? [];
    const fieldCount = fields.length;
    const fieldById = new Map(fields.map((field) => [field.id, field]));
    const fieldByName = new Map(fields.map((field) => [field.name, field]));
    const resolveField = (key: string) => fieldById.get(key) ?? fieldByName.get(key);

    return (
      <Dialog open={formPreviewId !== null} onOpenChange={(open) => { if (!open) setFormPreviewId(null); }}>
        <DialogContent size="md" height="scroll">
          <DialogHeader>
            <DialogTitle>{formPreview.name}</DialogTitle>
            <DialogDescription>Preview the fields of this form template.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {formPreview.description ? (
              <p className="text-sm text-muted-foreground">{formPreview.description}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={cn(correspondenceQueueBadgeClass, "capitalize", styles.badge)}>
                {formPreview.category_display || formPreview.category}
              </Badge>
              <Badge variant="secondary" className={correspondenceQueueBadgeClass}>
                {fieldCount} fields
              </Badge>
              {sections.length > 0 ? (
                <Badge variant="secondary" className={correspondenceQueueBadgeClass}>
                  {sections.length} sections
                </Badge>
              ) : null}
              {signatureRoles.length > 0 ? (
                <Badge variant="secondary" className={correspondenceQueueBadgeClass}>
                  {signatureRoles.length} sign-offs
                </Badge>
              ) : null}
              {!formPreview.is_active ? (
                <Badge variant="outline" className={correspondenceQueueBadgeClass}>
                  Inactive
                </Badge>
              ) : null}
            </div>

            {sections.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sections</p>
                {sections.map((section) => {
                  const sectionFields = section.fields
                    .map((key) => resolveField(key))
                    .filter((field): field is NonNullable<typeof field> => Boolean(field));
                  return (
                    <div key={section.id} className="rounded-md border border-border/60 px-3 py-2">
                      <p className="text-sm font-medium text-foreground">{section.title}</p>
                      {sectionFields.length > 0 ? (
                        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                          {sectionFields.slice(0, 6).map((field) => (
                            <li key={field.id}>
                              {field.label || field.name}
                              <span className="ml-1.5 uppercase opacity-70">{field.type}</span>
                            </li>
                          ))}
                          {sectionFields.length > 6 ? (
                            <li>+ {sectionFields.length - 6} more</li>
                          ) : null}
                        </ul>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">No fields in this section.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : fieldCount > 0 ? (
              <ul className="space-y-1 text-sm">
                {fields.slice(0, 8).map((field) => (
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

            {signatureRoles.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sign-off chain</p>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground">
                  {signatureRoles.map((role) => (
                    <li key={role.key}>{role.label}</li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              size="compact"
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
    const createLabel = isMinute ? "New minute template" : "New document template";
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border/60 p-4 space-y-4">
          <div className="space-y-4">
            {filteredScopedTemplates.length === 0 ? (
              <EmptyState
                icon={isMinute ? <MessageSquare className={registryQueueEmptyIconClass} /> : <FileEdit className={registryQueueEmptyIconClass} />}
                title={templateSearch.trim() ? "No templates match your search" : `No ${isMinute ? "minute" : "document"} templates yet`}
                message={
                  templateSearch.trim()
                    ? "Try a different title or description keyword."
                    : `Create a template for this scope, or switch scope to find existing templates.`
                }
                actionLabel={templateSearch.trim() ? undefined : createLabel}
                onAction={templateSearch.trim() ? undefined : handleCreateNewDocTemplate}
              />
            ) : (
              <div className="space-y-1.5">
                {filteredScopedTemplates.map((template) => (
                  <ListRowCard
                    key={template.id}
                    density="dense"
                    selected={selectedTemplateId === template.id && templateEditorOpen}
                    className={cn(selectedTemplateId === template.id && templateEditorOpen ? "ring-2 ring-primary" : "")}
                    onRowClick={() => handleTemplateSelect(template.id)}
                    leading={(
                      <div className={cn(correspondenceQueueLeadingBoxClass, "p-1.5", "bg-primary/10")}>
                        {isMinute ? (
                          <MessageSquare className={cn(correspondenceQueueLeadingIconClass, "text-primary")} />
                        ) : (
                          <FileEdit className={cn(correspondenceQueueLeadingIconClass, "text-primary")} />
                        )}
                      </div>
                    )}
                    actions={
                      <TemplateHubRowActions
                        actions={[
                          {
                            label: "Edit template",
                            icon: <Edit className="h-4 w-4" />,
                            onSelect: () => handleTemplateSelect(template.id),
                          },
                        ]}
                      />
                    }
                  >
                    <h4 className={correspondenceQueueSubjectClass}>{template.title}</h4>
                    {template.description ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{template.description}</p>
                    ) : null}
                  </ListRowCard>
                ))}
              </div>
            )}

            <Dialog open={templateEditorOpen} onOpenChange={(open) => { if (!open) requestCloseTemplateEditor(); }}>
              <DialogContent size="full" height="screen">
                <DialogHeader className="shrink-0">
                  <DialogTitle>
                    {selectedTemplateId
                      ? `Edit ${isMinute ? "minute" : "document"} template`
                      : createLabel}
                  </DialogTitle>
                </DialogHeader>
                  <DialogDescription>Enter the template details and content.</DialogDescription>
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-4 pr-1">
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
                    <RichTextEditor
                      value={contentHtml}
                      onChange={(html) => setContentHtml(html)}
                      showCharacterCount={false}
                      showHeader={false}
                      compactToolbar
                      placeholder={
                        isMinute
                          ? "Enter minute template text..."
                          : "Start typing the template content..."
                      }
                      className="min-h-[70vh]"
                    />
                  </div>
                </div>
                <div className="flex justify-between shrink-0 border-t border-border/60 pt-4 mt-2">
                  <div>
                    {selectedTemplateId ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
                            <AlertDialogDescription>
                              “{title || "This template"}” will be permanently removed. Existing documents created from it are not affected. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteDocTemplate}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete template
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={requestCloseTemplateEditor}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveDocTemplate} disabled={!isEditorDirty && Boolean(selectedTemplateId)}>
                      {selectedTemplateId ? "Update Template" : "Create Template"}
                    </Button>
                  </div>
                </div>

                <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Your edits to this template have not been saved.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep editing</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          setShowDiscardConfirm(false);
                          closeTemplateEditor();
                        }}
                      >
                        Discard
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    );
  };

  // ============ LOADING STATE ============
  return (
    <>
      {!userHydrated || !currentUser ? null : (
        <ClientErrorBoundary>
          <Tabs value={activeTab} onValueChange={handleHubTabChange}>
          <AdminPageShell
            title="Template Hub"
            subtitle={tabSubtitle}
            icon={LayoutTemplate}
            actions={headerActions}
            stats={
              <StatStrip
                items={[
                  { key: "documents", label: "Documents", hint: "All scopes", value: templatesLoading ? "—" : documentCount },
                  { key: "minutes", label: "Minutes", hint: "All scopes", value: templatesLoading ? "—" : minuteCount },
                  { key: "cases", label: "Cases", value: caseLoading ? "—" : caseTemplateCount },
                  ...(canAccessAdvancedTemplates
                    ? [
                        { key: "workflows", label: "Workflows", value: workflowLoading ? "—" : workflowStats.total },
                        { key: "forms", label: "Forms", value: formLoading ? "—" : formTemplates.length },
                        {
                          key: "references",
                          label: "References",
                          hint: "Reference schemes",
                          value: referenceStats ? referenceStats.total : "—",
                        },
                      ]
                    : []),
                ]}
              />
            }
            tabs={
              <TabsList className="h-auto w-fit flex-wrap justify-start gap-1 rounded-xl border border-border/60 bg-card/60 p-1">
                <TabsTrigger value="documents" className={HUB_TAB_TRIGGER_CLASS}>Documents</TabsTrigger>
                <TabsTrigger value="minutes" className={HUB_TAB_TRIGGER_CLASS}>Minutes</TabsTrigger>
                <TabsTrigger value="cases" className={HUB_TAB_TRIGGER_CLASS}>Cases</TabsTrigger>
                {canAccessAdvancedTemplates ? (
                  <>
                    <TabsTrigger value="workflows" className={HUB_TAB_TRIGGER_CLASS}>Workflows</TabsTrigger>
                    <TabsTrigger value="forms" className={HUB_TAB_TRIGGER_CLASS}>Forms</TabsTrigger>
                    <TabsTrigger value="references" className={HUB_TAB_TRIGGER_CLASS}>References</TabsTrigger>
                  </>
                ) : null}
              </TabsList>
            }
          >
          {activeTab !== "references" ? (
          <div className="rounded-xl bg-muted/30 p-2">
            <div className="flex flex-wrap items-center gap-2">
              {activeTab === "documents" || activeTab === "minutes" ? (
                <>
                  <Select value={activeScope} onValueChange={(v) => setActiveScope(v as TemplateScope)}>
                    <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Scope level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scopeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activeScope !== "organization" ? (
                    <Select value={selectedScopeId ?? ""} onValueChange={(v) => setSelectedScopeId(v || null)}>
                      <SelectTrigger className="h-8 w-[170px] text-xs" aria-label={`Select ${scopeEntityLabel}`}>
                        <SelectValue placeholder={`Select ${scopeEntityLabel}…`} />
                      </SelectTrigger>
                      <SelectContent>
                        {scopeEntityOptions.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                </>
              ) : null}
              <div className="relative min-w-[200px] max-w-sm flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder.replace("…", "")}
                  value={searchValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="h-8 pl-8 pr-8 text-xs"
                />
                {searchValue ? (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={clearSearch}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              {activeTab === "forms" ? (
                <Select value={formCategoryFilter} onValueChange={setFormCategoryFilter}>
                  <SelectTrigger className="h-8 w-[140px] text-xs" aria-label="Form category">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORM_CATEGORY_FILTERS.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              {activeTab === "cases" ? (
                <Select value={caseTypeFilter} onValueChange={setCaseTypeFilter}>
                  <SelectTrigger className="h-8 w-[140px] text-xs" aria-label="Case type">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CASE_TEMPLATE_TYPE_FILTERS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              {activeTab === "documents" || activeTab === "minutes" ? (
                <span className="text-xs text-muted-foreground">
                  {filteredScopedTemplates.length} {filteredScopedTemplates.length === 1 ? "template" : "templates"} in {scopeDisplayName}
                </span>
              ) : null}
            </div>
          </div>
          ) : null}

            <TabsContent value="documents" className="mt-2 focus-visible:outline-none">
              {renderDocumentMinutePanel("document")}
            </TabsContent>

            <TabsContent value="minutes" className="mt-2 focus-visible:outline-none">
              {renderDocumentMinutePanel("minute")}
            </TabsContent>

            <TabsContent value="cases" className="mt-2 focus-visible:outline-none">
              <CaseTemplatesPanel searchQuery={caseSearch} typeFilter={caseTypeFilter} />
            </TabsContent>

            <TabsContent value="references" className="mt-2 focus-visible:outline-none">
              <div className="rounded-xl border border-border/60 p-4">
                <ReferencePanel onStatsChange={setReferenceStats} />
              </div>
            </TabsContent>

                        <TabsContent value="workflows" className="mt-2 focus-visible:outline-none">
            <div className="rounded-xl border border-border/60 p-4 space-y-4">
                  {workflowLoading ? (
                    <LoadingState message="Loading workflow templates…" />
                  ) : filteredWorkflowTemplates.length === 0 ? (
                    <EmptyState
                      icon={<GitBranch className={registryQueueEmptyIconClass} />}
                      title={workflowSearch.trim() ? "No workflows match your search" : "No workflow templates yet"}
                      message={
                        workflowSearch.trim()
                          ? "Try a different name, slug, or description keyword."
                          : "Workflow templates define multi-step approval chains for correspondence and documents. Create one to get started — you can clone and edit it later."
                      }
                      actionLabel={workflowSearch.trim() ? undefined : "Create workflow"}
                      onAction={workflowSearch.trim() ? undefined : () => router.push("/admin/workflow-templates/new")}
                    />
                  ) : (
                    <div className="space-y-6">
                      {WORKFLOW_GROUP_ORDER.map((groupKey) => {
                        const groupTemplates = groupedWorkflowTemplates[groupKey];
                        if (groupTemplates.length === 0) return null;
                        return (
                          <div key={groupKey} className="space-y-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {WORKFLOW_GROUP_LABELS[groupKey]}
                            </h3>
                            <div className="space-y-1.5">
                              {groupTemplates.map((template) => {
                                const chain = workflowStepChain(template.steps);
                                return (
                                  <ListRowCard
                                    key={template.id}
                                    density="dense"
                                    className={cn(workflowPreviewId === template.id ? "ring-2 ring-primary" : "")}
                                    onRowClick={() => setWorkflowPreviewId(template.id)}
                                    leading={(
                                      <div className={cn(correspondenceQueueLeadingBoxClass, "p-1.5", "bg-primary/10")}>
                                        <GitBranch className={cn(correspondenceQueueLeadingIconClass, "text-primary")} />
                                      </div>
                                    )}
                                    actions={
                                      <TemplateHubRowActions
                                        actions={[
                                          {
                                            label: "Edit",
                                            icon: <Edit className="h-4 w-4" />,
                                            onSelect: () =>
                                              router.push(`/admin/workflow-templates/${template.id}`),
                                          },
                                          {
                                            label: "Clone",
                                            icon: <Copy className="h-4 w-4" />,
                                            onSelect: () =>
                                              router.push(
                                                `/admin/workflow-templates/${template.id}?clone=true`
                                              ),
                                          },
                                          {
                                            label: template.is_active ? "Deactivate" : "Activate",
                                            icon: template.is_active ? (
                                              <PowerOff className="h-4 w-4" />
                                            ) : (
                                              <Power className="h-4 w-4" />
                                            ),
                                            onSelect: () => handleToggleWorkflowActive(template),
                                          },
                                          {
                                            label: "Delete",
                                            icon: <Trash2 className="h-4 w-4" />,
                                            destructive: true,
                                            onSelect: () =>
                                              handleDeleteWorkflowClick(template.id, template.name),
                                          },
                                        ]}
                                      />
                                    }
                                  >
                                    <h4 className={correspondenceQueueSubjectClass}>{template.name}</h4>
                                    {(chain || template.description) ? (
                                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                        {chain || template.description}
                                      </p>
                                    ) : null}
                                    <div className={cn(correspondenceQueueMetaRowClass, "pt-1")}>
                                      <span className={correspondenceQueueMetaItemClass}>
                                        <Badge variant="secondary" className={correspondenceQueueBadgeClass}>
                                          {template.steps.length} steps
                                        </Badge>
                                      </span>
                                      <span className={correspondenceQueueMetaItemClass}>
                                        <Badge variant="outline" className={correspondenceQueueBadgeClass}>
                                          {template.applies_to === "correspondence" ? "Correspondence" : "Document"}
                                        </Badge>
                                      </span>
                                      {!template.is_active ? (
                                        <span className={correspondenceQueueMetaItemClass}>
                                          <Badge variant="secondary" className={correspondenceQueueBadgeClass}>
                                            Inactive
                                          </Badge>
                                        </span>
                                      ) : null}
                                    </div>
                                  </ListRowCard>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
            </div>
            </TabsContent>

            <TabsContent value="forms" className="mt-6 focus-visible:outline-none">
              <div className="rounded-xl border border-border/60 p-4 space-y-4">
                  {formLoading ? (
                    <LoadingState message="Loading form templates…" />
                  ) : filteredFormTemplates.length === 0 ? (
                    <EmptyState
                      icon={<FormInput className={registryQueueEmptyIconClass} />}
                      title={
                        formCategoryFilter !== "all"
                          ? `No ${formCategoryFilter} form templates`
                          : formSearch.trim()
                            ? "No form templates match your search"
                            : "No form templates found"
                      }
                      message={
                        formCategoryFilter !== "all"
                          ? "Only Audit forms are seeded today. Switch the category filter to All or Audit, or create a new template."
                          : formSearch.trim()
                            ? "Try a different name or clear the search."
                            : "Create a form template to collect structured data with fields and sign-off roles."
                      }
                      actionLabel="Create form"
                      onAction={() => setShowFormCreate(true)}
                    />
                  ) : (
                    <div className="space-y-1.5">
                      {filteredFormTemplates.map((template) => {
                        const styles = getFormCategoryStyles(template.category);
                        return (
                          <ListRowCard
                            key={template.id}
                            density="dense"
                            className={cn(
                              formPreviewId === template.id ? "ring-2 ring-primary" : "",
                            )}
                            onRowClick={() => setFormPreviewId(template.id)}
                            leading={(
                              <div className={cn(correspondenceQueueLeadingBoxClass, "p-1.5", "bg-primary/10")}>
                                <FormInput className={cn(correspondenceQueueLeadingIconClass, "text-primary")} />
                              </div>
                            )}
                            actions={
                              <TemplateHubRowActions
                                actions={[
                                  {
                                    label: "Edit",
                                    icon: <Edit className="h-4 w-4" />,
                                    onSelect: () =>
                                      router.push(`/admin/form-templates/${template.id}`),
                                  },
                                  {
                                    label: "Clone",
                                    icon: <Copy className="h-4 w-4" />,
                                    onSelect: () => handleCloneForm(template.id),
                                  },
                                  {
                                    label: "Delete",
                                    icon: <Trash2 className="h-4 w-4" />,
                                    destructive: true,
                                    onSelect: () => handleDeleteFormClick(template.id, template.name),
                                  },
                                ]}
                              />
                            }
                          >
                            <h4 className={correspondenceQueueSubjectClass}>{template.name}</h4>
                            {template.description ? (
                              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                {template.description}
                              </p>
                            ) : null}
                            <div className={cn(correspondenceQueueMetaRowClass, "pt-1")}>
                              <span className={correspondenceQueueMetaItemClass}>
                                <Badge
                                  variant="outline"
                                  className={cn(correspondenceQueueBadgeClass, "capitalize", styles.badge)}
                                >
                                  {template.category_display || template.category}
                                </Badge>
                              </span>
                              <span className={correspondenceQueueMetaItemClass}>
                                <Badge variant="secondary" className={correspondenceQueueBadgeClass}>
                                  {template.structure?.fields?.length || 0} fields
                                </Badge>
                              </span>
                              {!template.is_active ? (
                                <span className={correspondenceQueueMetaItemClass}>
                                  <Badge variant="outline" className={correspondenceQueueBadgeClass}>
                                    Inactive
                                  </Badge>
                                </span>
                              ) : null}
                            </div>
                          </ListRowCard>
                        );
                      })}
                    </div>
                  )}
              </div>
            </TabsContent>
          </AdminPageShell>
          </Tabs>

        {renderWorkflowPreviewPanel()}
        {renderFormPreviewPanel()}

        {/* Create Form Dialog */}
        <Dialog open={showFormCreate} onOpenChange={setShowFormCreate}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Create Form Template</DialogTitle>
              <DialogDescription>Enter a name for the new form template.</DialogDescription>
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
    <Suspense fallback={null}>
      <TemplatesHubForm />
    </Suspense>
  );
}
