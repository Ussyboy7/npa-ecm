"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/dms/RichTextEditor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HelpGuideCard } from "@/components/help/HelpGuideCard";
import { ContextualHelp } from "@/components/help/ContextualHelp";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  FileText,
  GitBranch,
  FormInput,
  Search,
  MoreVertical,
  Edit,
  Copy,
  Power,
  PowerOff,
  LayoutTemplate,
  FileEdit,
  MessageSquare,
  ChevronRight,
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

export default function TemplatesHubPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { directorates, divisions, departments, users: organizationUsers, isSyncing } = useOrganization();
  const { currentUser, hydrated: userHydrated } = useCurrentUser();

  // Main tab state
  const [activeTab, setActiveTab] = useState<HubTab>("documents");

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
    if (activeTab === "forms") {
      loadFormTemplates();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "forms" && formSearch !== "") {
      const timeoutId = setTimeout(() => loadFormTemplates(), 300);
      return () => clearTimeout(timeoutId);
    }
  }, [formSearch, activeTab]);

  const handleDeleteForm = async (id: string) => {
    try {
      await deleteFormTemplate(id);
      sonnerToast.success("Template deleted successfully");
      loadFormTemplates();
    } catch (error: unknown) {
      logError("Error deleting template:", error);
      sonnerToast.error("Failed to delete template");
    } finally {
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

  // ============ STATS ============
  const documentCount = templates.filter(t => t.templateType === "document").length;
  const minuteCount = templates.filter(t => t.templateType === "minute").length;

  // ============ LOADING STATE ============
  if (!userHydrated || isSyncing) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <Card className="shadow-soft">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">Loading templates…</CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentUser) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
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
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <LayoutTemplate className="h-8 w-8 text-primary" />
                Templates Hub
              </h1>
              <p className="text-muted-foreground">
                Manage document templates, workflow templates, and form templates in one place
              </p>
            </div>
            <ContextualHelp
              title="How to manage templates"
              description="Create and manage templates for documents, minutes, workflows, and forms. Templates can be scoped to organization, directorate, division, department, or personal use."
              steps={[
                'Select a template type (Documents, Minutes, Workflows, or Forms).',
                'Choose the scope level (organization-wide, directorate, division, etc.).',
                'Create or edit templates using the editor.',
                'For workflows and forms, use the dedicated creation pages for advanced configuration.',
              ]}
            />
          </div>

          {/* Overview Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${activeTab === "documents" && activeTemplateType === "document" ? "ring-2 ring-primary" : ""}`}
              onClick={() => { setActiveTab("documents"); setActiveTemplateType("document"); }}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <FileEdit className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Document Templates</p>
                    <p className="text-2xl font-bold">{documentCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${activeTab === "documents" && activeTemplateType === "minute" ? "ring-2 ring-primary" : ""}`}
              onClick={() => { setActiveTab("documents"); setActiveTemplateType("minute"); }}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-info/10">
                    <MessageSquare className="h-6 w-6 text-info" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Minute Templates</p>
                    <p className="text-2xl font-bold">{minuteCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${activeTab === "workflows" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setActiveTab("workflows")}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-success/10">
                    <GitBranch className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Workflow Templates</p>
                    <p className="text-2xl font-bold">{workflowStats.total}</p>
                    <p className="text-xs text-muted-foreground">{workflowStats.active} active</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${activeTab === "forms" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setActiveTab("forms")}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-warning/10">
                    <FormInput className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Form Templates</p>
                    <p className="text-2xl font-bold">{formTemplates.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as HubTab)} className="space-y-4">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documents & Minutes
                </TabsTrigger>
                <TabsTrigger value="workflows" className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Workflows
                </TabsTrigger>
                <TabsTrigger value="forms" className="flex items-center gap-2">
                  <FormInput className="h-4 w-4" />
                  Forms
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ============ DOCUMENT TEMPLATES TAB ============ */}
            <TabsContent value="documents" className="space-y-4">
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
                          <RichTextEditor value={contentHtml} onChange={(html) => setContentHtml(html)} />
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
            </TabsContent>

            {/* ============ WORKFLOW TEMPLATES TAB ============ */}
            <TabsContent value="workflows" className="space-y-4">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">Workflow Templates</CardTitle>
                      <CardDescription>Define approval processes for documents and correspondence</CardDescription>
                    </div>
                    <Button onClick={() => router.push("/admin/workflow-templates/new")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Workflow
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="relative max-w-sm">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search workflows..."
                        value={workflowSearch}
                        onChange={(e) => setWorkflowSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {workflowLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : filteredWorkflowTemplates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {workflowSearch ? "No workflows match your search" : "No workflow templates yet."}
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Steps</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredWorkflowTemplates.map((template) => (
                            <TableRow key={template.id} className="hover:bg-muted/50">
                              <TableCell>
                                <div className="font-medium">{template.name}</div>
                                {template.description && (
                                  <div className="text-xs text-muted-foreground line-clamp-1">{template.description}</div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {template.applies_to === "correspondence" ? "Correspondence" : "Document"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">{template.steps.length} steps</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={template.is_active ? "default" : "secondary"} className="text-xs">
                                  {template.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => router.push(`/admin/workflow-templates/${template.id}`)}>
                                      <Edit className="h-4 w-4 mr-2" />Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => router.push(`/admin/workflow-templates/${template.id}?clone=true`)}>
                                      <Copy className="h-4 w-4 mr-2" />Clone
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleToggleWorkflowActive(template)}>
                                      {template.is_active ? <PowerOff className="h-4 w-4 mr-2" /> : <Power className="h-4 w-4 mr-2" />}
                                      {template.is_active ? "Deactivate" : "Activate"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteWorkflowClick(template.id, template.name)} className="text-destructive">
                                      <Trash2 className="h-4 w-4 mr-2" />Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============ FORM TEMPLATES TAB ============ */}
            <TabsContent value="forms" className="space-y-4">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">Form Templates</CardTitle>
                      <CardDescription>Create structured forms for data collection</CardDescription>
                    </div>
                    <Button onClick={() => router.push("/admin/form-templates/new")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Form
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search forms..."
                        value={formSearch}
                        onChange={(e) => setFormSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex gap-1 flex-wrap">
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
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : filteredFormTemplates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No form templates found.
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filteredFormTemplates.map((template) => (
                        <Card key={template.id} className="hover:shadow-md transition-shadow group">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-base line-clamp-1">{template.name}</CardTitle>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/admin/form-templates/${template.id}`)}>
                                    <Edit className="h-4 w-4 mr-2" />Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCloneForm(template.id)}>
                                    <Copy className="h-4 w-4 mr-2" />Clone
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setDeletingFormId(template.id)} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                          </CardHeader>
                          <CardContent className="pt-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">{template.category_display || template.category}</Badge>
                                <Badge variant={template.is_active ? "default" : "outline"} className="text-xs">
                                  {template.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">{template.structure?.fields?.length || 0} fields</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full mt-3 justify-between"
                              onClick={() => router.push(`/admin/form-templates/${template.id}`)}
                            >
                              Edit Template
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Delete Form Confirmation */}
        <AlertDialog open={deletingFormId !== null} onOpenChange={(open) => !open && setDeletingFormId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this template? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingFormId && handleDeleteForm(deletingFormId)}
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
