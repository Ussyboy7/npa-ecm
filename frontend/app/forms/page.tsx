"use client";

import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileCheck, Plus, Search, Filter, Loader2, FileText, Clock, CheckCircle2, AlertCircle, Users, Send, FileDown } from 'lucide-react';
import { getFormDocuments, type FormDocument } from '@/lib/api/dms-forms';
import { getFormTemplates, type FormTemplate } from '@/lib/api/forms';
import { getSignatures } from '@/lib/api/forms';
import { CreateFormDocumentDialog } from '@/components/dms/CreateFormDocumentDialog';
import { ForwardFormDialog } from '@/components/forms/ForwardFormDialog';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import { formatDate, formatDateTime } from '@/lib/correspondence-helpers';
import { toast } from 'sonner';
import { logError } from '@/lib/client-logger';

type FormStatus = 'all' | 'draft' | 'in_progress' | 'awaiting_signatures' | 'completed';
type TabValue = 'my-forms' | 'templates' | 'pending';

const FormsPage = () => {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<TabValue>('my-forms');
  const [forms, setForms] = useState<FormDocument[]>([]);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FormStatus>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<FormDocument | null>(null);
  const [pendingSignatures, setPendingSignatures] = useState<Set<string>>(new Set());

  // Load forms
  useEffect(() => {
    if (activeTab === 'my-forms' || activeTab === 'pending') {
      loadForms();
    }
  }, [activeTab, statusFilter, templateFilter, searchQuery]);

  // Load pending signatures for current user
  useEffect(() => {
    if (currentUser && (activeTab === 'pending' || activeTab === 'my-forms')) {
      loadPendingSignatures();
    }
  }, [currentUser, activeTab]);

  // Load templates
  useEffect(() => {
    if (activeTab === 'templates') {
      loadTemplates();
    }
  }, [activeTab, categoryFilter, searchQuery]);

  const loadForms = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (templateFilter !== 'all') {
        params.template = templateFilter;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      const data = await getFormDocuments(params);
      setForms(data);
    } catch (error) {
      logError('Failed to load forms', error);
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const params: any = { is_active: true };
      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      const data = await getFormTemplates(params);
      setTemplates(data);
    } catch (error) {
      logError('Failed to load templates', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingSignatures = async () => {
    try {
      const signatures = await getSignatures({ status: 'pending' });
      // Create a set of workflow IDs that have pending signatures for this user
      // We'll match these against forms that have signature workflows
      const workflowIds = new Set<string>();
      signatures.forEach(sig => {
        if (sig.workflow) {
          workflowIds.add(sig.workflow);
        }
      });
      setPendingSignatures(workflowIds);
    } catch (error) {
      logError('Failed to load pending signatures', error);
      // Don't show error toast as this is a background operation
    }
  };

  // Filter forms for pending actions
  const pendingForms = useMemo(() => {
    if (activeTab !== 'pending') return [];
    return forms.filter(form => {
      // Show forms that are awaiting signatures and user has pending signature
      if (form.status === 'awaiting_signatures' && form.signature_workflow) {
        // Check if user has pending signature for this form's workflow
        const workflowId = typeof form.signature_workflow === 'string' 
          ? form.signature_workflow 
          : form.signature_workflow.id;
        if (workflowId && pendingSignatures.has(workflowId)) {
          return true;
        }
      }
      // Show in-progress forms that might need user action
      // (This could be enhanced to check actual assignments)
      if (form.status === 'in_progress') {
        return true;
      }
      return false;
    });
  }, [forms, activeTab, currentUser, pendingSignatures]);

  // Get unique templates and categories for filters
  const availableTemplates = useMemo(() => {
    const templateIds = new Set(forms.map(f => f.template?.id).filter(Boolean));
    return Array.from(templateIds);
  }, [forms]);

  const categories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category).filter(Boolean));
    return Array.from(cats);
  }, [templates]);

  const getStatusBadge = (status: FormDocument['status']) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">In Progress</Badge>;
      case 'awaiting_signatures':
        return <Badge variant="default" className="bg-amber-500">Awaiting Signatures</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCreateForm = (documentId: string) => {
    router.push(`/dms/${documentId}`);
  };

  const handleTemplateSelect = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setCreateDialogOpen(true);
  };

  return (
    <ClientErrorBoundary>
      <DashboardLayout>
        <div className="flex flex-col min-h-screen">
          {/* Header */}
          <div className="border-b border-border bg-background sticky top-0 z-10">
            <div className="container mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileCheck className="h-6 w-6 text-primary" />
                  <div>
                    <h1 className="text-2xl font-bold">Forms</h1>
                    <p className="text-sm text-muted-foreground">
                      Create, manage, and track form documents
                    </p>
                  </div>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Form
                </Button>
              </div>
            </div>
          </div>

          <div className="container mx-auto px-6 py-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="space-y-6">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="my-forms">My Forms</TabsTrigger>
                  <TabsTrigger value="templates">Templates</TabsTrigger>
                  <TabsTrigger value="pending" className="relative">
                    Pending Actions
                    {pendingForms.length > 0 && (
                      <Badge variant="destructive" className="ml-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                        {pendingForms.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Search and Filters */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                  {activeTab === 'my-forms' && (
                    <>
                      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FormStatus)}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="awaiting_signatures">Awaiting Signatures</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      {availableTemplates.length > 0 && (
                        <Select value={templateFilter} onValueChange={setTemplateFilter}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Template" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Templates</SelectItem>
                            {availableTemplates.map(templateId => {
                              const template = templates.find(t => t.id === templateId);
                              return template && templateId ? (
                                <SelectItem key={templateId} value={templateId}>
                                  {template.name}
                                </SelectItem>
                              ) : null;
                            })}
                          </SelectContent>
                        </Select>
                      )}
                    </>
                  )}
                  {activeTab === 'templates' && (
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* My Forms Tab */}
              <TabsContent value="my-forms" className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : forms.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FileCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">No forms found</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {searchQuery || statusFilter !== 'all' || templateFilter !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Get started by creating your first form'}
                      </p>
                      {!searchQuery && statusFilter === 'all' && templateFilter === 'all' && (
                        <Button onClick={() => setCreateDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Form
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {forms.map((form) => (
                      <Card
                        key={form.id}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => router.push(`/dms/${form.document.id}`)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base truncate">{form.document.title}</CardTitle>
                              <CardDescription className="mt-1">
                                {form.template?.name || 'No template'}
                              </CardDescription>
                            </div>
                            {getStatusBadge(form.status)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Updated {formatDate(form.updated_at)}</span>
                          </div>
                          {form.document.reference_number && (
                            <div className="text-xs text-muted-foreground">
                              Ref: {form.document.reference_number}
                            </div>
                          )}
                          {form.signature_workflow && (
                            <div className="flex items-center gap-2 text-xs">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Signature workflow active</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 pt-2 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dms/${form.document.id}`);
                              }}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Open
                            </Button>
                            {form.status !== 'completed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedForm(form);
                                  setForwardDialogOpen(true);
                                }}
                              >
                                <Send className="h-3 w-3" />
                              </Button>
                            )}
                            {form.status === 'completed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Handle PDF download
                                }}
                              >
                                <FileDown className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Templates Tab */}
              <TabsContent value="templates" className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : templates.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FileCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">No templates found</h3>
                      <p className="text-sm text-muted-foreground">
                        {searchQuery || categoryFilter !== 'all'
                          ? 'Try adjusting your filters'
                          : 'No form templates available'}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {templates.map((template) => (
                      <Card
                        key={template.id}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base">{template.name}</CardTitle>
                              <CardDescription className="mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {template.category}
                                </Badge>
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {template.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {template.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            <span>
                              {template.structure?.fields?.length || 0} fields
                            </span>
                          </div>
                          <Button
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTemplateSelect(template);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Form
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Pending Actions Tab */}
              <TabsContent value="pending" className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingForms.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">No pending actions</h3>
                      <p className="text-sm text-muted-foreground">
                        You're all caught up! No forms require your attention.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {pendingForms.map((form) => (
                      <Card
                        key={form.id}
                        className="hover:shadow-md transition-shadow cursor-pointer border-amber-200"
                        onClick={() => router.push(`/dms/${form.document.id}`)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base flex items-center gap-2">
                                {form.document.title}
                                <Badge variant="default" className="bg-amber-500">
                                  Action Required
                                </Badge>
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {form.template?.name || 'No template'}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <AlertCircle className="h-3 w-3 text-amber-500" />
                            <span>
                              {form.status === 'awaiting_signatures'
                                ? 'Awaiting your signature'
                                : 'Requires your input'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Updated {formatDateTime(form.updated_at)}</span>
                          </div>
                          <Button
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dms/${form.document.id}`);
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Review & Action
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Create Form Dialog */}
          <CreateFormDocumentDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onComplete={handleCreateForm}
            initialTemplate={selectedTemplate}
          />

          {/* Forward Form Dialog */}
          <ForwardFormDialog
            open={forwardDialogOpen}
            onOpenChange={setForwardDialogOpen}
            form={selectedForm}
            onForwarded={() => {
              loadForms();
              setSelectedForm(null);
            }}
          />
        </div>
      </DashboardLayout>
    </ClientErrorBoundary>
  );
};

export default FormsPage;

