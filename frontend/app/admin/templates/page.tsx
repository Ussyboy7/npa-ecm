"use client";

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/dms/RichTextEditor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import {
  initializeTemplates,
  loadTemplates,
  getTemplatesByScope,
  type DocumentTemplate,
  type TemplateScope,
  type TemplateType,
  saveTemplate,
  createTemplate,
  deleteTemplate,
} from '@/lib/template-storage';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCurrentUser } from '@/hooks/use-current-user';

const scopeOrder: TemplateScope[] = ['organization', 'directorate', 'division', 'department', 'user'];

const scopeLabel: Record<TemplateScope, string> = {
  organization: 'Organization',
  directorate: 'Directorates',
  division: 'Divisions',
  department: 'Departments',
  user: 'Personal',
};

const scopeLabelSingular: Record<TemplateScope, string> = {
  organization: 'Organization',
  directorate: 'Directorate',
  division: 'Division',
  department: 'Department',
  user: 'User',
};

const templateCategoryOrder: TemplateType[] = ['document', 'minute'];

const templateTypeLabel: Record<TemplateType, string> = {
  document: 'Document Templates',
  minute: 'Minute Templates',
};

const TemplatesAdminPage = () => {
  const { directorates, divisions, departments, users: organizationUsers, isSyncing } = useOrganization();
  const { currentUser, hydrated: userHydrated } = useCurrentUser();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [activeScope, setActiveScope] = useState<TemplateScope>('organization');
  const [selectedScopeId, setSelectedScopeId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [activeTemplateType, setActiveTemplateType] = useState<TemplateType>('document');
  const { toast } = useToast();

  const personalTemplateUsers = useMemo(
    () => organizationUsers.filter((user) => user.systemRole !== 'Super Admin'),
    [organizationUsers],
  );

  const refreshTemplates = () => {
    const loaded = loadTemplates();
    setTemplates([...loaded]);
  };

useEffect(() => {
    initializeTemplates();
    refreshTemplates();
  }, []);

useEffect(() => {
  const scoped = getTemplatesByScope(activeScope, selectedScopeId ?? undefined, activeTemplateType);
    if (scoped.length) {
      const template = scoped[0];
      setSelectedTemplateId(template.id);
      setTitle(template.title);
      setDescription(template.description ?? '');
      setContentHtml(template.contentHtml);
    } else {
      setSelectedTemplateId(null);
      setTitle('');
      setDescription('');
      setContentHtml('');
    }
}, [activeScope, selectedScopeId, templates, activeTemplateType]);

const scopedTemplates = useMemo(() => {
  return getTemplatesByScope(activeScope, selectedScopeId ?? undefined, activeTemplateType);
}, [templates, activeScope, selectedScopeId, activeTemplateType]);

  const scopeOptions = useMemo(() => {
    switch (activeScope) {
      case 'organization':
        return [{ id: 'org', name: 'All Directorates', shortName: 'NPA' }];
      case 'directorate':
        return directorates.map((dir) => ({
          id: dir.id,
          name: dir.name,
          shortName: dir.code ?? dir.name,
        }));
      case 'division':
        return divisions.map((div) => ({
          id: div.id,
          name: div.name,
          shortName: div.code ?? div.name,
        }));
      case 'department':
        return departments.map((dept) => ({
          id: dept.id,
          name: dept.name,
          shortName: dept.code ?? dept.name,
        }));
      case 'user':
        return personalTemplateUsers.map((user) => ({
          id: user.id,
          name: user.name,
          shortName: user.systemRole || user.gradeLevel,
        }));
      default:
        return [];
    }
  }, [activeScope, departments, directorates, divisions, personalTemplateUsers]);

  if (!userHydrated || isSyncing) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <Card className="shadow-soft">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Loading templates…
            </CardContent>
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
            links={[{ label: 'Role Switcher', href: '/settings' }]}
          />
        </div>
      </DashboardLayout>
    );
  }

  useEffect(() => {
    if (activeScope === 'organization') {
      setSelectedScopeId(null);
      return;
    }
    if (!selectedScopeId && scopeOptions.length > 0) {
      setSelectedScopeId(scopeOptions[0].id);
    }
  }, [activeScope, scopeOptions, selectedScopeId]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setActiveTemplateType(template.templateType);
    setSelectedTemplateId(template.id);
    setTitle(template.title);
    setDescription(template.description ?? '');
    setContentHtml(template.contentHtml);
  };

  const handleSave = () => {
    if (!currentUser) {
      toast({ title: 'No current user found', description: 'Unable to save template without admin context.', variant: 'destructive' });
      return;
    }

    if (!title.trim()) {
      toast({ title: 'Template title required', description: 'Add a descriptive title for the template.', variant: 'destructive' });
      return;
    }

    if (!contentHtml || contentHtml.trim().length === 0) {
      toast({ title: 'Template body empty', description: 'Provide rich text content for the template.', variant: 'destructive' });
      return;
    }

    const now = new Date().toISOString();

    if (selectedTemplateId) {
      const existing = templates.find((template) => template.id === selectedTemplateId);
      if (!existing) return;

      const updated: DocumentTemplate = {
        ...existing,
        title: title.trim(),
        description: description.trim() || undefined,
        contentHtml,
        updatedAt: now,
        updatedBy: currentUser.id,
        templateType: existing.templateType,
      };

      saveTemplate(updated);
      refreshTemplates();
      toast({ title: 'Template updated', description: `${updated.title} saved successfully.` });
    } else {
      const created = createTemplate({
        scope: activeScope,
        scopeId: activeScope === 'organization' ? null : selectedScopeId,
        title: title.trim(),
        description: description.trim() || undefined,
        contentHtml,
        createdBy: currentUser.id,
        updatedBy: currentUser.id,
        isDefault: true,
        templateType: activeTemplateType,
      });
      refreshTemplates();
      setSelectedTemplateId(created.id);
      toast({ title: 'Template created', description: `${created.title} is now available.` });
    }
  };

  const handleCreateNew = () => {
    setSelectedTemplateId(null);
    setTitle(`${scopeLabel[activeScope]} Template`);
    setDescription('');
    if (activeTemplateType === 'minute') {
      setContentHtml('Please review and revert with your feedback at the earliest convenience.');
    } else {
      setContentHtml('');
    }
  };

  const handleDelete = () => {
    if (!selectedTemplateId) return;
    deleteTemplate(selectedTemplateId);
    refreshTemplates();
    toast({ title: 'Template deleted', description: 'Template removed successfully.' });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Template Manager</h1>
            <p className="text-muted-foreground">
              Manage default document templates for directorates, divisions, departments, and personal use.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreateNew} className="gap-2">
              <Plus className="h-4 w-4" />
              New Template
            </Button>
            {selectedTemplateId && (
              <Button variant="outline" onClick={handleDelete} className="text-destructive gap-2">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>

        <HelpGuideCard
          title="Design Templates with Confidence"
          description="Switch between document and minute categories, pick the correct scope, and edit rich text content. Use the reset option to restore organisation defaults or create personal overrides."
          links={[
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        <Tabs
          value={activeTemplateType}
          onValueChange={(value) => setActiveTemplateType(value as TemplateType)}
          className="space-y-6"
        >
          <TabsList>
            {templateCategoryOrder.map((type) => (
              <TabsTrigger key={type} value={type} className="capitalize">
                {templateTypeLabel[type]}
              </TabsTrigger>
            ))}
          </TabsList>

          {templateCategoryOrder.map((type) => (
            <TabsContent key={type} value={type} className="space-y-6">
              <Tabs value={activeScope} onValueChange={(value) => setActiveScope(value as TemplateScope)} className="space-y-6">
                <TabsList>
                  {scopeOrder.map((scope) => (
                    <TabsTrigger key={scope} value={scope} className="capitalize">
                      {scopeLabel[scope]}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value={activeScope} className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Scope Selection</CardTitle>
                      <CardDescription>
                        Choose the {scopeLabel[activeScope].toLowerCase()} to view and manage {templateTypeLabel[type].toLowerCase()}.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      {activeScope !== 'organization' && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">
                            {scopeLabelSingular[activeScope]}
                          </label>
                          <Select value={selectedScopeId ?? ''} onValueChange={(value) => setSelectedScopeId(value || null)}>
                            <SelectTrigger>
                              <SelectValue placeholder={`Select ${scopeLabelSingular[activeScope].toLowerCase()}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {scopeOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Templates</label>
                        <Select value={selectedTemplateId ?? ''} onValueChange={handleTemplateSelect}>
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${templateTypeLabel[type].toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {scopedTemplates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Template Editor</CardTitle>
                      <CardDescription>
                        {type === 'minute'
                          ? 'Create reusable instructions for minutes, such as follow-up or clarification requests.'
                          : 'Update the document layout that users see when composing new correspondence.'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Title</label>
                          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Template title" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Description</label>
                          <Textarea
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            rows={3}
                            placeholder="Optional description to help users understand when to use this template"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Content</label>
                        {type === 'minute' ? (
                          <Textarea
                            value={contentHtml}
                            onChange={(event) => setContentHtml(event.target.value)}
                            rows={6}
                            className="min-h-[160px]"
                            placeholder="e.g. Kindly review the attached memo and revert with your comments before close of business."
                          />
                        ) : (
                          <ScrollArea className="max-h-[60vh] border border-border rounded-lg">
                            <div className="p-4">
                              <RichTextEditor value={contentHtml} onChange={(html) => setContentHtml(html)} />
                            </div>
                          </ScrollArea>
                        )}
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={refreshTemplates}>
                          Reset
                        </Button>
                        <Button onClick={handleSave}>Save Template</Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default TemplatesAdminPage;
