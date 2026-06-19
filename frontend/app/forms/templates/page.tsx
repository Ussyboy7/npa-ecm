"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileCheck, Loader2, Plus, Search, Eye } from "lucide-react";
import { getFormTemplates, type FormTemplate } from "@/lib/api/forms";
import { CreateFormDocumentDialog } from "@/components/dms/CreateFormDocumentDialog";
import { logError } from "@/lib/client-logger";
import { HelpGuideCard } from "@/components/help/HelpGuideCard";

const FormsTemplatesPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [previewTemplate, setPreviewTemplate] = useState<FormTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        const data = await getFormTemplates({ is_active: true });
        setTemplates(Array.isArray(data) ? data : []);
      } catch (error: unknown) {
        logError("Failed to load form templates", error);
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };
    void loadTemplates();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category).filter(Boolean));
    return Array.from(cats);
  }, [templates]);

  const visibleTemplates = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return templates.filter((template) => {
      if (categoryFilter !== "all" && template.category !== categoryFilter) return false;
      if (!search) return true;
      return (
        template.name.toLowerCase().includes(search) ||
        (template.description || "").toLowerCase().includes(search) ||
        template.category.toLowerCase().includes(search)
      );
    });
  }, [templates, searchQuery, categoryFilter]);

  const getTemplateMetrics = (template: FormTemplate) => {
    const fields = template.structure?.fields || [];
    const required = fields.filter((field) => Boolean(field.required)).length;
    return {
      total: fields.length,
      required,
      sections: template.structure?.sections?.length || 0,
    };
  };

  const getSectionFields = (template: FormTemplate, sectionFieldIds: string[]) => {
    const fields = template.structure?.fields || [];
    const byIdOrName = new Map(fields.map((field) => [field.id, field] as const));
    fields.forEach((field) => byIdOrName.set(field.name, field));
    return sectionFieldIds
      .map((fieldId) => byIdOrName.get(fieldId))
      .filter((field): field is NonNullable<typeof field> => Boolean(field));
  };

  const isGenericSectionTitle = (template: FormTemplate, title?: string) => {
    if (!title) return true;
    const normalized = title.trim().toLowerCase();
    const templateName = template.name.trim().toLowerCase();
    return normalized === "main" || normalized === templateName;
  };

  const getTemplateCategoryStyle = (category: string) => {
    switch (category) {
      case "audit":
        return {
          badge: "bg-amber-500/10 text-amber-700 border-amber-500/20",
          border: "border-l-amber-500",
        };
      case "finance":
        return {
          badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
          border: "border-l-emerald-500",
        };
      case "procurement":
        return {
          badge: "bg-blue-500/10 text-blue-700 border-blue-500/20",
          border: "border-l-blue-500",
        };
      default:
        return {
          badge: "bg-slate-500/10 text-slate-700 border-slate-500/20",
          border: "border-l-slate-500",
        };
    }
  };

  const handleStartFromTemplate = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setCreateDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Form Templates</h1>
            <p className="text-muted-foreground mt-1">Browse organization-wide templates and start a new form.</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/forms")}>
            Back to Forms
          </Button>
        </div>

        <HelpGuideCard
          title="Template Library"
          description="Templates are predesigned across the organization. Start a form to create your own editable form instance."
          links={[{ label: "Forms Library", href: "/forms" }, { label: "Help & Guides", href: "/help" }]}
        />

        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={categoryFilter === "all" ? "default" : "outline"} onClick={() => setCategoryFilter("all")}>
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              size="sm"
              variant={categoryFilter === category ? "default" : "outline"}
              onClick={() => setCategoryFilter(category)}
              className="capitalize"
            >
              {category}
            </Button>
          ))}
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading templates...
            </CardContent>
          </Card>
        ) : visibleTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">No templates match your filters.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {visibleTemplates.map((template) => (
              <Card
                key={template.id}
                className={`border-l-4 ${getTemplateCategoryStyle(template.category).border} hover:shadow-md transition-shadow cursor-pointer`}
                onClick={() => handleStartFromTemplate(template)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                      <FileCheck className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <p className="font-semibold text-foreground truncate">{template.name}</p>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 capitalize ${getTemplateCategoryStyle(template.category).badge}`}>
                            {template.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewTemplate(template);
                            }}
                            title="Preview template"
                          >
                            <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartFromTemplate(template);
                            }}
                            title="Start form"
                          >
                            <Plus className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </Button>
                        </div>
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 flex-wrap">
                        <span>{getTemplateMetrics(template).required} required</span>
                        <span>•</span>
                        <span>{getTemplateMetrics(template).total} fields</span>
                        <span>•</span>
                        <span>{getTemplateMetrics(template).sections} section{getTemplateMetrics(template).sections === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{previewTemplate?.name}</DialogTitle>
              <DialogDescription>{previewTemplate?.description || "No template description provided."}</DialogDescription>
            </DialogHeader>
            {previewTemplate && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="capitalize">{previewTemplate.category}</Badge>
                  <span className="text-muted-foreground">
                    {getTemplateMetrics(previewTemplate).required} required • {getTemplateMetrics(previewTemplate).total} fields
                    {getTemplateMetrics(previewTemplate).sections > 1 && (
                      <> • {getTemplateMetrics(previewTemplate).sections} sections</>
                    )}
                  </span>
                </div>
                {(previewTemplate.structure?.sections || []).length > 0 ? (
                  <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                    {previewTemplate.structure.sections?.map((section) => (
                      <div key={section.id} className="rounded-md border p-3 space-y-2">
                        {!isGenericSectionTitle(previewTemplate, section.title) && (
                          <p className="text-sm font-medium">{section.title}</p>
                        )}
                        <div className="space-y-1.5">
                          {getSectionFields(previewTemplate, section.fields)
                            .slice(0, 5)
                            .map((field) => (
                              <div key={field.id} className="rounded-sm border p-2 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm truncate">{field.label}</p>
                                  <p className="text-xs text-muted-foreground capitalize">{field.type}</p>
                                </div>
                                {field.required && <Badge variant="outline">Required</Badge>}
                              </div>
                            ))}
                          {getSectionFields(previewTemplate, section.fields).length > 5 && (
                            <p className="text-xs text-muted-foreground">
                              +{getSectionFields(previewTemplate, section.fields).length - 5} more field
                              {getSectionFields(previewTemplate, section.fields).length - 5 === 1 ? "" : "s"}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="max-h-[340px] overflow-y-auto pr-1 space-y-2">
                    {(previewTemplate.structure?.fields || []).map((field) => (
                      <div key={field.id} className="rounded-md border p-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm truncate">{field.label}</p>
                          <p className="text-xs text-muted-foreground capitalize">{field.type}</p>
                        </div>
                        {field.required && <Badge variant="outline">Required</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewTemplate(null)}>Close</Button>
              {previewTemplate && (
                <Button
                  onClick={() => {
                    const selected = previewTemplate;
                    setPreviewTemplate(null);
                    handleStartFromTemplate(selected);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Start Form
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <CreateFormDocumentDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onComplete={(documentId) => router.push(`/forms/${documentId}`)}
          initialTemplate={selectedTemplate}
        />
      </div>
    </DashboardLayout>
  );
};

export default FormsTemplatesPage;
