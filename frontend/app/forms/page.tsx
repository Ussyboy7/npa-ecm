"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileCheck, Plus, Search, FileText, Clock, CheckCircle2, Users, Send, FileDown, Filter, Inbox, MoreHorizontal } from 'lucide-react';
import { getFormDocuments, type FormDocument } from '@/lib/api/dms-forms';
import { getFormTemplates, type FormTemplate } from '@/lib/api/forms';
import { getSignatures } from '@/lib/api/forms';
import { apiFetch } from '@/lib/api-client';
import { CreateFormDocumentDialog } from '@/components/dms/CreateFormDocumentDialog';
import { ForwardFormDialog } from '@/components/forms/ForwardFormDialog';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import { formatDate, formatDateTime } from '@/lib/correspondence-helpers';
import { toast } from 'sonner';
import { logError } from '@/lib/client-logger';
import { exportToCSV } from '@/lib/admin-export';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  registryQueueSearchStatsShellContentClass,
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
  registryQueueSearchInputWrapClass,
  correspondenceQueueBadgeClass,
  correspondenceQueueDateClass,
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueListStackClass,
  correspondenceQueueMetaIconClass,
  correspondenceQueueMetaItemClass,
  correspondenceQueueMetaRowClass,
  correspondenceQueueSubjectClass,
} from '@/components/shared/registry-queue-styles';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type FormStatus = 'all' | 'draft' | 'in_progress' | 'awaiting_signatures' | 'completed';
type TabValue = 'my-forms' | 'pending';
type SortField = 'updated_at' | 'created_at' | 'title' | 'status';
type SortOrder = 'asc' | 'desc';

const DEFAULT_PAGE_SIZE = 25;

const FormsPage = () => {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('my-forms');
  const [forms, setForms] = useState<FormDocument[]>([]);
  const [allForms, setAllForms] = useState<FormDocument[]>([]); // Store all forms for client-side pagination
  const [allTemplates, setAllTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FormStatus>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [executiveFilter, setExecutiveFilter] = useState<string>('all');
  const [executives, setExecutives] = useState<Array<{id: string; name: string; email?: string}>>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Pagination
  const pagination = usePagination({
    initialPage: 1,
    initialPageSize: DEFAULT_PAGE_SIZE,
    totalCount: allForms.length,
  });
  
  // Reset to first page when filters change
  useEffect(() => {
    if (pagination.page > 1) {
      pagination.setPage(1);
    }
  }, [statusFilter, templateFilter, executiveFilter, debouncedSearch]);
  
  // Check if user is secretary
  const isSecretary = useMemo(() => {
    if (!currentUser?.systemRole) return false;
    const role = typeof currentUser.systemRole === 'string'
      ? currentUser.systemRole
      : (currentUser.systemRole as Record<string, unknown>).name as string;
    return role?.toLowerCase() === 'secretary';
  }, [currentUser?.systemRole]);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<FormDocument | null>(null);
  const [pendingSignatures, setPendingSignatures] = useState<Set<string>>(new Set());

  // Fetch executives for secretaries
  useEffect(() => {
    if (!currentUser || !isSecretary) return;
    
    const fetchExecutives = async () => {
      try {
        const response = await apiFetch<Array<{id: string; name: string; email?: string}>>('/correspondence/cases/secretary-executives/');
        setExecutives(response);
      } catch (error: unknown) {
        logError('Failed to load executives', error);
      }
    };
    
    void fetchExecutives();
  }, [currentUser, isSecretary]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load all templates for filter dropdown (separate from templates tab)
  useEffect(() => {
    const loadAllTemplates = async () => {
      try {
        const data = await getFormTemplates({ is_active: true });
        setAllTemplates(data);
      } catch (error: unknown) {
        logError('Failed to load templates for filter', error);
      }
    };
    void loadAllTemplates();
  }, []);

  // Load forms
  useEffect(() => {
    loadForms();
  }, [activeTab, statusFilter, templateFilter, executiveFilter, debouncedSearch, currentUser?.id]);

  // Load pending signatures for current user
  useEffect(() => {
    if (currentUser && (activeTab === 'pending' || activeTab === 'my-forms')) {
      loadPendingSignatures();
    }
  }, [currentUser, activeTab]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const loadForms = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (templateFilter !== 'all') {
        params.template = templateFilter;
      }
      if (isSecretary && executiveFilter !== 'all') {
        params.executive = executiveFilter;
      }
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      const data = await getFormDocuments({ ...params, signal: controller.signal });
      
      if (controller.signal.aborted) {
        return;
      }
      setAllForms(data);
      
      // Apply sorting
      const sorted = [...data].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortField) {
          case 'title':
            aValue = a.document.title.toLowerCase();
            bValue = b.document.title.toLowerCase();
            break;
          case 'status':
            aValue = a.status as string;
            bValue = b.status as string;
            break;
          case 'created_at':
            aValue = new Date(a.created_at).getTime();
            bValue = new Date(b.created_at).getTime();
            break;
          case 'updated_at':
          default:
            aValue = new Date(a.updated_at).getTime();
            bValue = new Date(b.updated_at).getTime();
            break;
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
      
      // Apply pagination
      const startIndex = (pagination.page - 1) * pagination.pageSize;
      const endIndex = startIndex + pagination.pageSize;
      setForms(sorted.slice(startIndex, endIndex));
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      logError('Failed to load forms', error);
      toast.error('Failed to load forms');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [statusFilter, templateFilter, executiveFilter, debouncedSearch, isSecretary, sortField, sortOrder, pagination.page, pagination.pageSize]);
  
  // Reload when pagination changes
  useEffect(() => {
    if (allForms.length > 0) {
      const sorted = [...allForms].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortField) {
          case 'title':
            aValue = a.document.title.toLowerCase();
            bValue = b.document.title.toLowerCase();
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          case 'created_at':
            aValue = new Date(a.created_at).getTime();
            bValue = new Date(b.created_at).getTime();
            break;
          case 'updated_at':
          default:
            aValue = new Date(a.updated_at).getTime();
            bValue = new Date(b.updated_at).getTime();
            break;
        }
        
        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
      
      const startIndex = (pagination.page - 1) * pagination.pageSize;
      const endIndex = startIndex + pagination.pageSize;
      setForms(sorted.slice(startIndex, endIndex));
    }
  }, [pagination.page, pagination.pageSize, sortField, sortOrder, allForms]);


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
    } catch (error: unknown) {
      logError('Failed to load pending signatures', error);
      // Don't show error toast as this is a background operation
    }
  };

  // Filter forms for pending actions - only show forms where user has pending signature
  const pendingForms = useMemo(() => {
    return allForms.filter(form => {
      // Only show forms that are awaiting signatures AND user has pending signature
      if (form.status === 'awaiting_signatures' && form.signature_workflow) {
        const workflowId = typeof form.signature_workflow === 'string' 
          ? form.signature_workflow 
          : form.signature_workflow.id;
        if (workflowId && pendingSignatures.has(workflowId)) {
          return true;
        }
      }
      return false;
    });
  }, [allForms, pendingSignatures]);

  // Get unique templates from all forms for filter dropdown
  const availableTemplates = useMemo(() => {
    const templateIds = new Set(allForms.map(f => f.template?.id).filter(Boolean));
    return Array.from(templateIds).map(id => {
      const template = allTemplates.find(t => t.id === id);
      return { id, name: template?.name || id };
    });
  }, [allForms, allTemplates]);

  
  // Calculate statistics
  const statistics = useMemo(() => {
    return {
      total: allForms.length,
      draft: allForms.filter(f => f.status === 'draft').length,
      inProgress: allForms.filter(f => f.status === 'in_progress').length,
      awaitingSignatures: allForms.filter(f => f.status === 'awaiting_signatures').length,
      completed: allForms.filter(f => f.status === 'completed').length,
    };
  }, [allForms]);
  
  const handleClearAllFilters = () => {
    setStatusFilter('all');
    setTemplateFilter('all');
    setExecutiveFilter('all');
    setSearchQuery('');
  };
  
  const handleDownloadPdf = async (form: FormDocument) => {
    try {
      // Find generated PDF version
      const pdfVersion = form.document?.versions?.find(v => 
        v.file_type === 'application/pdf' && 
        (v.notes?.toLowerCase().includes('generated') || 
         v.notes?.toLowerCase().includes('auto-generated') ||
         v.notes?.toLowerCase().includes('generated pdf'))
      );
      
      if (pdfVersion?.file_url) {
        // Download the PDF
        const response = await fetch(pdfVersion.file_url, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Failed to download PDF');
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = pdfVersion.file_name || `${form.document.title.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success('PDF downloaded successfully');
      } else {
        toast.error('No PDF available for this form. Please generate it first.');
      }
    } catch (error: unknown) {
      logError('Failed to download PDF', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleCreateForm = (documentId: string) => {
    router.push(`/forms/${documentId}`);
  };

  const handleTemplateSelect = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setCreateDialogOpen(true);
  };

  const handleExport = async () => {
    if (allForms.length === 0) return;
    try {
      setExporting(true);
      const exportData = allForms.map((form) => ({
        title: form.document.title,
        template: form.template?.name || 'No template',
        status: form.status,
        reference: form.document.reference_number || '',
        signature_workflow: form.signature_workflow ? 'Yes' : 'No',
        updated_at: formatDateTime(form.updated_at),
        created_at: formatDateTime(form.created_at),
      }));

      exportToCSV(exportData, [
        { key: 'title', label: 'Title' },
        { key: 'template', label: 'Template' },
        { key: 'status', label: 'Status' },
        { key: 'reference', label: 'Reference Number' },
        { key: 'signature_workflow', label: 'Signature Workflow' },
        { key: 'updated_at', label: 'Updated At' },
        { key: 'created_at', label: 'Created At' },
      ], {
        filename: `forms-export-${new Date().toISOString().split('T')[0]}.csv`,
      });

      toast.success(`Exported ${exportData.length} forms successfully`);
    } catch (error: unknown) {
      logError('Failed to export forms', error);
      toast.error('Failed to export forms');
    } finally {
      setExporting(false);
    }
  };

  const activeFilterCount = useMemo(() => {
    if (activeTab !== 'my-forms') return 0;
    let count = 0;
    if (debouncedSearch) count++;
    if (statusFilter !== 'all') count++;
    if (templateFilter !== 'all') count++;
    if (executiveFilter !== 'all') count++;
    return count;
  }, [activeTab, debouncedSearch, statusFilter, templateFilter, executiveFilter]);

  const hasListFilters =
    debouncedSearch ||
    statusFilter !== 'all' ||
    templateFilter !== 'all' ||
    executiveFilter !== 'all';

  return (
    <ErrorBoundary>
      <ClientErrorBoundary>
        <DashboardLayout>
          <div className="container mx-auto p-6 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Forms Library</h1>
                <p className="mt-1 max-w-2xl text-muted-foreground">
                  Create, manage, and track form documents
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <ContextualHelp
                  title="Using the forms library"
                  description="Start a form from a template, track drafts and signatures, then export when complete. Use filters to narrow by status or template."
                  steps={[
                    'Click Start Form or pick a template from the Template Library.',
                    'Use search and filters to find specific forms in My Forms.',
                    'Pending Actions lists forms that need your signature.',
                  ]}
                />
                <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Start Form
                </Button>
                {activeTab === 'my-forms' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters((prev) => !prev)}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-xs font-medium">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="mr-2 h-4 w-4" />
                      More
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push('/forms/templates')}>
                      Browse Templates
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExport} disabled={exporting || allForms.length === 0}>
                      {exporting ? 'Exporting…' : 'Export CSV'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <HelpGuideCard
              title="Workspace guide"
              description="Work queue for in-progress forms and pending signature actions. Templates live in the Template Library."
              links={[
                { label: 'Template Library', href: '/forms/templates' },
                { label: 'Help & Guides', href: '/help' },
              ]}
            />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="my-forms">My Forms</TabsTrigger>
                <TabsTrigger value="pending" className="relative">
                  Pending Actions
                  {pendingForms.length > 0 && (
                    <Badge variant="destructive" className="ml-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                      {pendingForms.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Filters Panel - Only for My Forms */}
              {activeTab === 'my-forms' && showFilters && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg">Form filters</CardTitle>
                      {activeFilterCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={handleClearAllFilters}>
                          Clear all
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Status</Label>
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FormStatus)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="awaiting_signatures">Awaiting Signatures</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {availableTemplates.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Template</Label>
                          <Select value={templateFilter} onValueChange={setTemplateFilter}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Templates</SelectItem>
                              {availableTemplates.map(({ id, name }) => (
                                <SelectItem key={id as string} value={id as string}>{name || 'Unnamed Template'}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {isSecretary && executives.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Executive</Label>
                          <Select value={executiveFilter} onValueChange={setExecutiveFilter}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Executives</SelectItem>
                              {executives.map((exec) => (
                                <SelectItem key={exec.id} value={exec.id}>{exec.name || 'Unknown Executive'}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Sort By</Label>
                        <Select value={`${sortField}_${sortOrder}`} onValueChange={(v) => {
                          const [field, order] = v.split('_') as [SortField, SortOrder];
                          setSortField(field);
                          setSortOrder(order);
                        }}>
                          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="updated_at_desc">Recently Updated</SelectItem>
                            <SelectItem value="updated_at_asc">Oldest Updated</SelectItem>
                            <SelectItem value="created_at_desc">Recently Created</SelectItem>
                            <SelectItem value="created_at_asc">Oldest Created</SelectItem>
                            <SelectItem value="title_asc">Title (A-Z)</SelectItem>
                            <SelectItem value="title_desc">Title (Z-A)</SelectItem>
                            <SelectItem value="status_asc">Status (A-Z)</SelectItem>
                            <SelectItem value="status_desc">Status (Z-A)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Search + Stats */}
              <Card>
                <CardContent className={registryQueueSearchStatsShellContentClass}>
                  <div className={registryQueueSearchInputWrapClass}>
                    <Search
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      placeholder="Search by title, reference…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      aria-label="Search forms"
                      type="search"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        label: 'Total in queue',
                        value: statistics.total,
                        icon: Inbox,
                        bgClass: 'bg-primary/10',
                        iconClass: 'text-primary',
                      },
                      {
                        label: 'Draft',
                        value: statistics.draft,
                        icon: FileText,
                        bgClass: 'bg-blue-500/10',
                        iconClass: 'text-blue-600 dark:text-blue-400',
                      },
                      {
                        label: 'Awaiting signatures',
                        value: statistics.awaitingSignatures,
                        icon: Users,
                        bgClass: 'bg-amber-500/10',
                        iconClass: 'text-amber-600 dark:text-amber-400',
                      },
                      {
                        label: 'Completed',
                        value: statistics.completed,
                        icon: CheckCircle2,
                        bgClass: 'bg-green-500/10',
                        iconClass: 'text-green-600 dark:text-green-400',
                      },
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
                </CardContent>
              </Card>

              {/* My Forms Tab */}
              <TabsContent value="my-forms" className="space-y-4">
                {loading ? (
                  <LoadingState message="Loading forms…" />
                ) : forms.length === 0 ? (
                  <EmptyState
                    icon={hasListFilters ? 'search' : 'file'}
                    title={hasListFilters ? 'No matching forms' : 'No forms yet'}
                    message={
                      hasListFilters
                        ? 'Try adjusting your filters or search query.'
                        : 'Get started by creating your first form from a template.'
                    }
                    actionLabel={!hasListFilters ? 'Start form' : undefined}
                    onAction={!hasListFilters ? () => setCreateDialogOpen(true) : undefined}
                    variant="dashed"
                  />
                ) : (
                  <>
                    <div className={correspondenceQueueListStackClass}>
                      {forms.map((form) => (
                        <FormListRow
                          key={form.id}
                          form={form}
                          mode="normal"
                          onOpen={() => router.push(`/forms/${form.document.id}`)}
                          onForward={() => {
                            setSelectedForm(form);
                            setForwardDialogOpen(true);
                          }}
                          onDownloadPdf={() => handleDownloadPdf(form)}
                        />
                      ))}
                    </div>
                    {allForms.length > pagination.pageSize && (
                      <div className="mt-6">
                        <PaginationControls
                          pagination={pagination}
                          pageSizeOptions={[10, 25, 50, 100]}
                        />
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Pending Actions Tab */}
              <TabsContent value="pending" className="space-y-4">
                {loading ? (
                  <LoadingState message="Loading pending actions…" />
                ) : pendingForms.length === 0 ? (
                  <EmptyState
                    icon="file"
                    title="All caught up"
                    message="No forms require your signature or attention."
                    actionLabel="View all forms"
                    onAction={() => setActiveTab('my-forms')}
                    variant="dashed"
                  />
                ) : (
                  <div className={correspondenceQueueListStackClass}>
                    {pendingForms.map((form) => (
                      <FormListRow
                        key={form.id}
                        form={form}
                        mode="pending"
                        onOpen={() => router.push(`/forms/${form.document.id}`)}
                      />
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

      </DashboardLayout>
      </ClientErrorBoundary>
    </ErrorBoundary>
  );
};

export default FormsPage;

function FormListRow({
  form,
  mode,
  onOpen,
  onForward,
  onDownloadPdf,
}: {
  form: FormDocument;
  mode: 'normal' | 'pending';
  onOpen: () => void;
  onForward?: () => void;
  onDownloadPdf?: () => void;
}) {
  const leadingBg =
    form.status === 'completed'
      ? 'bg-green-500/10'
      : form.status === 'awaiting_signatures'
        ? 'bg-amber-500/10'
        : form.status === 'in_progress'
          ? 'bg-blue-500/10'
          : 'bg-cyan-500/10';
  const leadingIcon =
    form.status === 'completed'
      ? 'text-green-600 dark:text-green-400'
      : form.status === 'awaiting_signatures'
        ? 'text-amber-600 dark:text-amber-400'
        : form.status === 'in_progress'
          ? 'text-blue-600 dark:text-blue-400'
          : 'text-cyan-600 dark:text-cyan-400';

  const actions = (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpen();
        }}
        title={mode === 'pending' ? 'Review & action' : 'Continue form'}
        aria-label={mode === 'pending' ? 'Review and take action' : 'Continue form'}
      >
        <FileText className="h-3.5 w-3.5" />
      </Button>
      {mode === 'normal' && form.status !== 'completed' && onForward && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onForward();
          }}
          title="Forward form"
          aria-label="Forward form"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      )}
      {mode === 'normal' && form.status === 'completed' && onDownloadPdf && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDownloadPdf();
          }}
          title="Download PDF"
          aria-label="Download PDF"
        >
          <FileDown className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );

  return (
    <ListRowCard
      density="compact"
      href={`/forms/${form.document.id}`}
      leading={
        <div className={cn(correspondenceQueueLeadingBoxClass, leadingBg)}>
          <FileCheck className={cn(correspondenceQueueLeadingIconClass, leadingIcon)} />
        </div>
      }
      actions={actions}
    >
      <h4 className={correspondenceQueueSubjectClass}>{form.document.title}</h4>
      <p className="text-xs text-muted-foreground truncate mt-0.5">
        {form.template?.name || 'No template'}
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex flex-wrap items-center gap-1">
          {mode === 'pending' && (
            <Badge variant="default" className={cn(correspondenceQueueBadgeClass, 'bg-amber-500')}>
              Action required
            </Badge>
          )}
          <FormStatusBadge status={form.status} />
        </div>
        <span className={correspondenceQueueDateClass}>
          Updated {formatDateTime(form.updated_at)}
        </span>
      </div>
      <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
        <span className={correspondenceQueueMetaItemClass}>
          <FileText className={correspondenceQueueMetaIconClass} />
          <span className="truncate">
            {form.document.reference_number
              ? `Ref: ${form.document.reference_number}`
              : `Form ID: ${form.id.slice(0, 8).toUpperCase()}`}
          </span>
        </span>
        <span className={correspondenceQueueMetaItemClass}>
          <Clock className={correspondenceQueueMetaIconClass} />
          <span>Created {formatDate(form.created_at)}</span>
        </span>
        {form.signature_workflow && (
          <span className={correspondenceQueueMetaItemClass}>
            <Users className={correspondenceQueueMetaIconClass} />
            <span>Signature workflow active</span>
          </span>
        )}
      </div>
    </ListRowCard>
  );
}

function FormStatusBadge({ status }: { status: FormDocument['status'] }) {
  if (status === 'draft')
    return <Badge variant="outline" className={correspondenceQueueBadgeClass}>Draft</Badge>;
  if (status === 'in_progress')
    return <Badge variant="secondary" className={correspondenceQueueBadgeClass}>In progress</Badge>;
  if (status === 'awaiting_signatures')
    return (
      <Badge variant="default" className={cn(correspondenceQueueBadgeClass, 'bg-amber-500')}>
        Awaiting signatures
      </Badge>
    );
  if (status === 'completed')
    return (
      <Badge variant="default" className={cn(correspondenceQueueBadgeClass, 'bg-green-500')}>
        Completed
      </Badge>
    );
  return <Badge variant="outline" className={correspondenceQueueBadgeClass}>{status}</Badge>;
}
