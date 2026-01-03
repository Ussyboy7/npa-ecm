"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileCheck, Plus, Search, Loader2, FileText, Clock, CheckCircle2, AlertCircle, Users, Send, FileDown, ArrowUpDown, BarChart3, FolderTree, Filter, Download, Inbox } from 'lucide-react';
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
import { usePagination } from '@/hooks/use-pagination';
import { FilterPanel, FilterBadgeGroup, type FilterBadge } from '@/components/shared/FilterPanel';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { Label } from '@/components/ui/label';

type FormStatus = 'all' | 'draft' | 'in_progress' | 'awaiting_signatures' | 'completed';
type TabValue = 'my-forms' | 'templates' | 'pending';
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
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [allTemplates, setAllTemplates] = useState<FormTemplate[]>([]); // Store all templates for filter dropdown
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FormStatus>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
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
    if (activeTab === 'my-forms' || activeTab === 'pending') {
      loadForms();
    }
  }, [activeTab, statusFilter, templateFilter, executiveFilter, debouncedSearch]);

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

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const params: { category?: string; is_active?: boolean; search?: string } = { is_active: true };
      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      const data = await getFormTemplates(params);
      setTemplates(data);
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      logError('Failed to load pending signatures', error);
      // Don't show error toast as this is a background operation
    }
  };

  // Filter forms for pending actions - only show forms where user has pending signature
  const pendingForms = useMemo(() => {
    if (activeTab !== 'pending') return [];
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
  }, [allForms, activeTab, pendingSignatures]);

  // Get unique templates from all forms for filter dropdown
  const availableTemplates = useMemo(() => {
    const templateIds = new Set(allForms.map(f => f.template?.id).filter(Boolean));
    return Array.from(templateIds).map(id => {
      const template = allTemplates.find(t => t.id === id);
      return { id, name: template?.name || id };
    });
  }, [allForms, allTemplates]);

  const categories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category).filter(Boolean));
    return Array.from(cats);
  }, [templates]);
  
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
  
  // Calculate active filters
  const activeFilters: FilterBadge[] = useMemo(() => {
    const filters: FilterBadge[] = [];
    
    if (statusFilter !== 'all') {
      filters.push({
        key: 'status',
        label: `Status: ${statusFilter.replace('_', ' ')}`,
        value: statusFilter,
        onClick: () => setStatusFilter('all'),
      });
    }
    
    if (templateFilter !== 'all') {
      const template = allTemplates.find(t => t.id === templateFilter);
      filters.push({
        key: 'template',
        label: `Template: ${template?.name || templateFilter}`,
        value: templateFilter,
        onClick: () => setTemplateFilter('all'),
      });
    }
    
    if (isSecretary && executiveFilter !== 'all') {
      const executive = executives.find(e => e.id === executiveFilter);
      filters.push({
        key: 'executive',
        label: `Executive: ${executive?.name || executiveFilter}`,
        value: executiveFilter,
        onClick: () => setExecutiveFilter('all'),
      });
    }
    
    if (debouncedSearch.trim()) {
      filters.push({
        key: 'search',
        label: `Search: "${debouncedSearch}"`,
        value: debouncedSearch,
        onClick: () => setSearchQuery(''),
      });
    }
    
    return filters;
  }, [statusFilter, templateFilter, executiveFilter, debouncedSearch, allTemplates, executives, isSecretary]);
  
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

  const handleExport = async () => {
    // TODO: Implement export functionality
    setExporting(true);
    setTimeout(() => setExporting(false), 1000);
  };

  const activeFilterCount = useMemo(() => {
    if (activeTab !== 'my-forms') return 0;
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (templateFilter !== 'all') count++;
    if (executiveFilter !== 'all') count++;
    return count;
  }, [activeTab, statusFilter, templateFilter, executiveFilter]);

  return (
    <ErrorBoundary>
      <ClientErrorBoundary>
        <DashboardLayout>
          <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold">Forms Library</h1>
                <p className="text-muted-foreground mt-1">Create, manage, and track form documents</p>
              </div>
              <div className="flex gap-2">
                {activeTab === 'my-forms' && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowFilters(!showFilters)}
                      aria-label={`${showFilters ? 'Hide' : 'Show'} filters`}
                      aria-expanded={showFilters}
                    >
                      <Filter className="h-4 w-4 mr-2" /> Filters
                      {activeFilterCount > 0 && <Badge variant="secondary" className="ml-2" aria-label={`${activeFilterCount} active filters`}>{activeFilterCount}</Badge>}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleExport}
                      disabled={exporting || forms.length === 0}
                      aria-label="Export to CSV"
                    >
                      {exporting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" /> Export
                        </>
                      )}
                    </Button>
                  </>
                )}
                <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Form
                </Button>
                <ContextualHelp
                  title="How to manage forms"
                  description="Create and manage form documents. Use filters to find specific forms, track signature workflows, and download completed forms."
                  steps={[
                    'Create a form from a template to start filling out required information.',
                    'Route forms for signatures to initiate approval workflows.',
                    'Track pending actions in the Pending Actions tab.',
                    'Download completed forms as PDFs for records.',
                  ]}
                />
              </div>
            </div>

            <HelpGuideCard
              title="Forms Library"
              description="Manage form documents across different categories. Create new forms, view templates, and track forms that need your attention."
              links={[{ label: 'My Inbox', href: '/inbox' }, { label: 'Help & Guides', href: '/help' }]}
            />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="space-y-6">
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

              {/* Filters Panel - Only for My Forms */}
              {activeTab === 'my-forms' && showFilters && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Form Filters</CardTitle>
                      {activeFilterCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={handleClearAllFilters}>Clear All</Button>
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
                                <SelectItem key={id} value={id}>{name || 'Unnamed Template'}</SelectItem>
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

              {/* Search */}
              <div className="relative max-w-xl">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input 
                  placeholder={activeTab === 'templates' ? "Search templates..." : "Search by title, reference..."} 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="pl-10"
                  aria-label="Search forms"
                  type="search"
                />
              </div>

              {/* Summary Cards - Only for My Forms */}
              {activeTab === 'my-forms' && (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: 'Total in Queue', value: statistics.total, icon: Inbox, bgClass: 'bg-primary/10', iconClass: 'text-primary' },
                    { label: 'Draft', value: statistics.draft, icon: FileText, bgClass: 'bg-blue-500/10', iconClass: 'text-blue-600 dark:text-blue-400' },
                    { label: 'Awaiting Signatures', value: statistics.awaitingSignatures, icon: Users, bgClass: 'bg-amber-500/10', iconClass: 'text-amber-600 dark:text-amber-400' },
                    { label: 'Completed', value: statistics.completed, icon: CheckCircle2, bgClass: 'bg-green-500/10', iconClass: 'text-green-600 dark:text-green-400' },
                  ].map(({ label, value, icon: Icon, bgClass, iconClass }) => (
                    <Card key={label}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg ${bgClass}`}><Icon className={`h-6 w-6 ${iconClass}`} /></div>
                          <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold">{value}</p></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

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
                        {debouncedSearch || statusFilter !== 'all' || templateFilter !== 'all' || executiveFilter !== 'all'
                          ? 'Try adjusting your filters or search query'
                          : 'Get started by creating your first form from a template'}
                      </p>
                      {!debouncedSearch && statusFilter === 'all' && templateFilter === 'all' && executiveFilter === 'all' && (
                        <Button onClick={() => setCreateDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Form
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <>
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
                          {/* TODO: Add case links support for forms if needed */}
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
                                  handleDownloadPdf(form);
                                }}
                                title="Download PDF"
                              >
                                <FileDown className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  {/* Pagination */}
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

              {/* Templates Tab */}
              <TabsContent value="templates" className="space-y-4">
                {loading ? (
                  <Card><CardContent className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading templates…</CardContent></Card>
                ) : templates.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FileCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground mb-2">{debouncedSearch || categoryFilter !== 'all' ? 'No templates match your filters' : 'No form templates are currently available. Contact your administrator to add templates.'}</p>
                      {(debouncedSearch || categoryFilter !== 'all') && <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }} className="mt-4">Clear Filters</Button>}
                      {!debouncedSearch && categoryFilter === 'all' && (
                        <Button variant="outline" size="sm" onClick={() => router.push('/settings/templates')} className="mt-4">
                          Manage Templates
                        </Button>
                      )}
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
                              <div className="flex items-center gap-2 mb-1">
                                <CardTitle className="text-base">{template.name}</CardTitle>
                                <Badge variant="outline" className="text-xs">
                                  {template.category}
                                </Badge>
                              </div>
                              {template.description && (
                                <CardDescription className="mt-1 line-clamp-2">
                                  {template.description}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
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
                  <Card><CardContent className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading pending actions…</CardContent></Card>
                ) : pendingForms.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                      <p className="text-sm text-muted-foreground mb-2">You're all caught up! No forms require your signature or attention at this time.</p>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('my-forms')} className="mt-4">
                        View All Forms
                      </Button>
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
      </DashboardLayout>
      </ClientErrorBoundary>
    </ErrorBoundary>
  );
};

export default FormsPage;

