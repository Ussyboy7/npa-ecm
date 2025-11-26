"use client";

import { logError } from '@/lib/client-logger';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  queryDocuments,
  type DocumentRecord,
  type DocumentType,
  type DocumentStatus,
  fetchWorkspaces,
  getCachedWorkspaces,
  type DocumentWorkspace,
} from '@/lib/dms-storage';
import {
  FileText,
  Search,
  Layers,
  Filter,
  Calendar,
  Hash,
  User as UserIcon,
  BarChart2,
  FilePlus,
  Loader2,
  Mail,
  FileCheck,
  FileSpreadsheet,
  ScrollText,
  FileQuestion,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Archive,
  Trash2,
  Share2,
  Download,
  CheckSquare,
  Square,
  PenTool,
  Clock,
  CheckCircle2,
  X,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/correspondence-helpers';
import { DocumentUploadDialog } from '@/components/dms/DocumentUploadDialog';
import { CreateFormDocumentDialog } from '@/components/dms/CreateFormDocumentDialog';
import { ShareDocumentDialog } from '@/components/dms/ShareDocumentDialog';
import { DocumentQuickPreviewModal } from '@/components/dms/DocumentQuickPreviewModal';
import { WorkspaceManagementDialog } from '@/components/dms/WorkspaceManagementDialog';
import { DocumentCardSkeleton } from '@/components/dms/DocumentCardSkeleton';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { getFormTemplates, getSignatures } from '@/lib/api/forms';
import type { FormTemplate, FormSignature } from '@/lib/types/forms';

const DOCUMENT_TYPES: DocumentType[] = ['letter', 'memo', 'circular', 'policy', 'report', 'form', 'other'];
const STATUS_OPTIONS: DocumentStatus[] = ['draft', 'published', 'archived'];

const typeLabel = (type: DocumentType) => {
  switch (type) {
    case 'letter':
      return 'Letter';
    case 'memo':
      return 'Memo';
    case 'circular':
      return 'Circular';
    case 'policy':
      return 'Policy';
    case 'report':
      return 'Report';
    case 'form':
      return 'Form';
    default:
      return 'Other';
  }
};

const statusVariant = (status: DocumentStatus): 'outline' | 'default' | 'secondary' => {
  switch (status) {
    case 'draft':
      return 'outline';
    case 'published':
      return 'default';
    case 'archived':
      return 'secondary';
    default:
      return 'outline';
  }
};

const sensitivityLabel = (value: DocumentRecord['sensitivity']) => {
  switch (value) {
    case 'public':
      return 'Public';
    case 'internal':
      return 'Internal';
    case 'confidential':
      return 'Confidential';
    case 'restricted':
      return 'Restricted';
    default:
      return value;
  }
};

const sensitivityBadgeVariant = (value: DocumentRecord['sensitivity']) => {
  switch (value) {
    case 'public':
      return 'secondary';
    case 'internal':
      return 'outline';
    case 'confidential':
      return 'default';
    case 'restricted':
      return 'destructive';
    default:
      return 'outline';
  }
};

const formStatusLabel = (status?: string) => {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'in_progress':
      return 'In Progress';
    case 'awaiting_signatures':
      return 'Awaiting Signatures';
    case 'completed':
      return 'Completed';
    default:
      return status || 'Unknown';
  }
};

const formStatusVariant = (status?: string): 'outline' | 'default' | 'secondary' | 'destructive' => {
  switch (status) {
    case 'draft':
      return 'outline';
    case 'in_progress':
      return 'default';
    case 'awaiting_signatures':
      return 'secondary';
    case 'completed':
      return 'default';
    default:
      return 'outline';
  }
};

// Document type icons
const getDocumentTypeIcon = (type: DocumentType) => {
  switch (type) {
    case 'letter':
      return Mail;
    case 'memo':
      return FileText;
    case 'circular':
      return ScrollText;
    case 'policy':
      return FileCheck;
    case 'report':
      return FileSpreadsheet;
    default:
      return FileQuestion;
  }
};

// Sort options
type SortField = 'updated_at' | 'created_at' | 'title' | 'author' | 'status' | 'type';
type SortDirection = 'asc' | 'desc';

interface SortOption {
  field: SortField;
  direction: SortDirection;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { field: 'updated_at', direction: 'desc', label: 'Recently Updated' },
  { field: 'updated_at', direction: 'asc', label: 'Oldest Updated' },
  { field: 'created_at', direction: 'desc', label: 'Recently Created' },
  { field: 'created_at', direction: 'asc', label: 'Oldest Created' },
  { field: 'title', direction: 'asc', label: 'Title (A-Z)' },
  { field: 'title', direction: 'desc', label: 'Title (Z-A)' },
];

const DocumentManagementPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useCurrentUser();
  const { users: organizationUsers, divisions, departments } = useOrganization();
  
  // Initialize filters from URL params or localStorage
  const getInitialFilter = (key: string, defaultValue: string): string => {
    if (typeof window === 'undefined') return defaultValue;
    const urlParam = searchParams.get(key);
    if (urlParam) return urlParam;
    const saved = localStorage.getItem(`dms_filter_${key}`);
    return saved || defaultValue;
  };

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(() => {
    const urlPage = searchParams.get('page');
    return urlPage ? parseInt(urlPage, 10) : 1;
  });
  const pageSize = 25;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(() => getInitialFilter('search', ''));
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>(() => getInitialFilter('type', 'all') as DocumentType | 'all');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>(() => getInitialFilter('status', 'all') as DocumentStatus | 'all');
  const [formStatusFilter, setFormStatusFilter] = useState<'all' | 'draft' | 'in_progress' | 'awaiting_signatures' | 'completed'>(() => {
    const saved = getInitialFilter('formStatus', 'all');
    return saved as 'all' | 'draft' | 'in_progress' | 'awaiting_signatures' | 'completed';
  });
  const [divisionFilter, setDivisionFilter] = useState<string>(() => getInitialFilter('division', 'all'));
  const [departmentFilter, setDepartmentFilter] = useState<string>(() => getInitialFilter('department', 'all'));
  const [authorFilter, setAuthorFilter] = useState<string>(() => getInitialFilter('author', 'all'));
  const [dateRangeFilter, setDateRangeFilter] = useState<{ start?: string; end?: string }>(() => {
    const start = getInitialFilter('dateStart', '');
    const end = getInitialFilter('dateEnd', '');
    return { start: start || undefined, end: end || undefined };
  });
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createFormDialogOpen, setCreateFormDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<DocumentRecord | null>(null);
  const [workspaces, setWorkspaces] = useState<DocumentWorkspace[]>(() => getCachedWorkspaces());
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [sortOption, setSortOption] = useState<SortOption>(SORT_OPTIONS[0]);
  const [customPageSize, setCustomPageSize] = useState(pageSize);
  const [goToPageInput, setGoToPageInput] = useState('');
  const [previewDocument, setPreviewDocument] = useState<DocumentRecord | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [workspaceManageOpen, setWorkspaceManageOpen] = useState(false);
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [formTemplatesLoading, setFormTemplatesLoading] = useState(false);
  const [formTemplatesOpen, setFormTemplatesOpen] = useState(false);
  const [selectedTemplateForForm, setSelectedTemplateForForm] = useState<FormTemplate | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dms_recent_searches');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [pendingSignaturesByWorkflow, setPendingSignaturesByWorkflow] = useState<Map<string, number>>(new Map());
  const totalPages = Math.max(1, Math.ceil(totalCount / customPageSize));
  const loadDocuments = useCallback(async () => {
    console.log('[DMS] Loading documents...', { page, customPageSize, searchQuery, statusFilter, typeFilter });
    setLoading(true);
    setError(null);
    try {
      const ordering = sortOption.direction === 'desc' ? `-${sortOption.field}` : sortOption.field;
      console.log('[DMS] Calling queryDocuments with:', { page, customPageSize, ordering });
      const response = await queryDocuments({
        page,
        pageSize: customPageSize,
        search: searchQuery.trim() || undefined,
        status: statusFilter,
        documentType: typeFilter,
        divisionId: divisionFilter,
        departmentId: departmentFilter,
        ordering,
      });
      console.log('[DMS] Received response:', { count: response.count, resultsCount: response.results.length });
      setDocuments(response.results);
      setTotalCount(response.count);
    } catch (err) {
      console.error('[DMS] Error loading documents:', err);
      logError('Failed to load DMS documents', err);
      setDocuments([]);
      setTotalCount(0);
      const errorMessage = err instanceof Error ? err.message : 'Unable to load documents right now.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      console.log('[DMS] Finished loading documents');
      setLoading(false);
    }
  }, [page, customPageSize, searchQuery, statusFilter, typeFilter, formStatusFilter, divisionFilter, departmentFilter, sortOption.field, sortOption.direction]);

  const effectiveUser = useMemo(() => {
    if (currentUser) return currentUser;
    return organizationUsers.find((user) => user.active) ?? null;
  }, [currentUser, organizationUsers]);

  const workspaceLookup = useMemo(() => {
    const map = new Map<string, DocumentWorkspace>();
    workspaces.forEach((workspace) => map.set(workspace.id, workspace));
    return map;
  }, [workspaces]);

  // Filter documents by form status, author, and date range
  const filteredDocuments = useMemo(() => {
    let filtered = documents;
    
    // Form status filter
    if (typeFilter === 'form' && formStatusFilter !== 'all') {
      filtered = filtered.filter((doc) => {
        if (doc.documentType !== 'form') return false;
        return doc.form_document?.status === formStatusFilter;
      });
    }
    
    // Author filter (client-side since backend doesn't support it yet)
    if (authorFilter !== 'all') {
      filtered = filtered.filter((doc) => doc.authorId === authorFilter);
    }
    
    // Date range filter (client-side)
    if (dateRangeFilter.start || dateRangeFilter.end) {
      filtered = filtered.filter((doc) => {
        const docDate = new Date(doc.createdAt);
        if (dateRangeFilter.start) {
          const startDate = new Date(dateRangeFilter.start);
          if (docDate < startDate) return false;
        }
        if (dateRangeFilter.end) {
          const endDate = new Date(dateRangeFilter.end);
          endDate.setHours(23, 59, 59, 999); // Include entire end date
          if (docDate > endDate) return false;
        }
        return true;
      });
    }
    
    return filtered;
  }, [documents, typeFilter, formStatusFilter, authorFilter, dateRangeFilter]);

  useEffect(() => {
    let ignore = false;
    const loadWorkspaces = async () => {
      try {
        const spaces = await fetchWorkspaces();
        if (!ignore) {
          setWorkspaces(spaces);
        }
      } catch (error) {
        logError('Failed to load workspaces', error);
      }
    };
    void loadWorkspaces();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (formTemplatesOpen && formTemplates.length === 0 && !formTemplatesLoading) {
      setFormTemplatesLoading(true);
      getFormTemplates({ is_active: true })
        .then((templates) => {
          setFormTemplates(templates);
        })
        .catch((error) => {
          console.error('Failed to load form templates:', error);
          toast.error('Failed to load form templates');
        })
        .finally(() => {
          setFormTemplatesLoading(false);
        });
    }
  }, [formTemplatesOpen, formTemplates.length, formTemplatesLoading]);

  // Persist filters to URL and localStorage
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (formStatusFilter !== 'all') params.set('formStatus', formStatusFilter);
    if (divisionFilter !== 'all') params.set('division', divisionFilter);
    if (departmentFilter !== 'all') params.set('department', departmentFilter);
    if (authorFilter !== 'all') params.set('author', authorFilter);
    if (dateRangeFilter.start) params.set('dateStart', dateRangeFilter.start);
    if (dateRangeFilter.end) params.set('dateEnd', dateRangeFilter.end);
    if (page > 1) params.set('page', String(page));
    
    // Update URL without navigation
    const newUrl = params.toString() ? `/dms?${params.toString()}` : '/dms';
    router.replace(newUrl, { scroll: false });
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('dms_filter_search', searchQuery);
      localStorage.setItem('dms_filter_type', typeFilter);
      localStorage.setItem('dms_filter_status', statusFilter);
      localStorage.setItem('dms_filter_formStatus', formStatusFilter);
      localStorage.setItem('dms_filter_division', divisionFilter);
      localStorage.setItem('dms_filter_department', departmentFilter);
      localStorage.setItem('dms_filter_author', authorFilter);
      if (dateRangeFilter.start) localStorage.setItem('dms_filter_dateStart', dateRangeFilter.start);
      if (dateRangeFilter.end) localStorage.setItem('dms_filter_dateEnd', dateRangeFilter.end);
    }
  }, [searchQuery, typeFilter, statusFilter, formStatusFilter, divisionFilter, departmentFilter, authorFilter, dateRangeFilter, page, router]);

  useEffect(() => {
    setPage(1);
    setSelectedDocuments(new Set());
  }, [searchQuery, statusFilter, typeFilter, divisionFilter, departmentFilter, authorFilter, dateRangeFilter, sortOption]);

  // Load pending signatures for current user
  useEffect(() => {
    if (!currentUser) return;

    const loadPendingSignatures = async () => {
      try {
        const pendingSigs = await getSignatures({ status: 'pending' });
        // Create a map of workflow ID -> count of pending signatures for this user
        const workflowCounts = new Map<string, number>();
        pendingSigs.forEach((sig: FormSignature) => {
          if (sig.workflow) {
            const current = workflowCounts.get(sig.workflow) || 0;
            workflowCounts.set(sig.workflow, current + 1);
          }
        });
        setPendingSignaturesByWorkflow(workflowCounts);
      } catch (error) {
        console.error('Failed to load pending signatures:', error);
        // Don't show error toast as this is a background operation
      }
    };

    void loadPendingSignatures();
  }, [currentUser, documents]); // Reload when documents change to catch new workflows

  // Save recent searches
  useEffect(() => {
    if (searchQuery.trim() && !recentSearches.includes(searchQuery.trim())) {
      const updated = [searchQuery.trim(), ...recentSearches.slice(0, 4)]; // Keep last 5
      setRecentSearches(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('dms_recent_searches', JSON.stringify(updated));
      }
    }
  }, [searchQuery]);

  const handleSearchSelect = (query: string) => {
    setSearchQuery(query);
    setSearchOpen(false);
  };

  const handlePreviewDocument = (document: DocumentRecord) => {
    setPreviewDocument(document);
    setPreviewOpen(true);
  };

  // Load sort preference from localStorage
  useEffect(() => {
    const savedSort = localStorage.getItem('dms_sort_preference');
    if (savedSort) {
      try {
        const parsed = JSON.parse(savedSort) as SortOption;
        const found = SORT_OPTIONS.find(opt => opt.field === parsed.field && opt.direction === parsed.direction);
        if (found) setSortOption(found);
      } catch (e) {
        // Ignore invalid saved preference
      }
    }
  }, []);

  // Save sort preference to localStorage
  useEffect(() => {
    localStorage.setItem('dms_sort_preference', JSON.stringify(sortOption));
  }, [sortOption]);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const loadWithTimeout = async () => {
      timeoutId = setTimeout(() => {
        if (mounted) {
          console.warn('[DMS] Document loading timeout after 30 seconds');
          setError('Request is taking longer than expected. Please check your connection.');
          setLoading(false);
        }
      }, 30000); // 30 second timeout

      try {
        await loadDocuments();
      } finally {
        if (mounted && timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    void loadWithTimeout();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [loadDocuments]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[aria-label="Search documents"]') as HTMLInputElement;
        searchInput?.focus();
      }
      // Ctrl/Cmd + N: New document
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        if (effectiveUser) {
          setUploadDialogOpen(true);
        }
      }
      // Escape: Close modals
      if (e.key === 'Escape') {
        if (uploadDialogOpen) setUploadDialogOpen(false);
        if (createFormDialogOpen) setCreateFormDialogOpen(false);
        if (shareDialogOpen) setShareDialogOpen(false);
        if (previewOpen) setPreviewOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [effectiveUser, uploadDialogOpen, createFormDialogOpen, shareDialogOpen, previewOpen]);

  const divisionLookup = useMemo(() => new Map(divisions.map((division) => [division.id, division.name])), [divisions]);
  const departmentLookup = useMemo(() => new Map(departments.map((department) => [department.id, department.name])), [departments]);
  const userLookup = useMemo(() => new Map(organizationUsers.map((user) => [user.id, user])), [organizationUsers]);
  const pageStats = useMemo(
    () => ({
      draft: documents.filter((doc) => doc.status === 'draft').length,
      published: documents.filter((doc) => doc.status === 'published').length,
      archived: documents.filter((doc) => doc.status === 'archived').length,
    }),
    [documents],
  );

  // Bulk operations handlers
  const handleSelectAll = () => {
    if (selectedDocuments.size === documents.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(documents.map(doc => doc.id)));
    }
  };

  const handleSelectDocument = (documentId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
    } else {
      newSelected.add(documentId);
    }
    setSelectedDocuments(newSelected);
  };

  const handleBulkArchive = async () => {
    // TODO: Implement bulk archive API call
    toast.info(`Archiving ${selectedDocuments.size} document(s)...`);
    setSelectedDocuments(new Set());
  };

  const handleBulkDelete = async () => {
    // TODO: Implement bulk delete API call
    toast.info(`Deleting ${selectedDocuments.size} document(s)...`);
    setSelectedDocuments(new Set());
  };

  const handleBulkShare = () => {
    // TODO: Implement bulk share
    toast.info(`Sharing ${selectedDocuments.size} document(s)...`);
  };

  const handleGoToPage = () => {
    const pageNum = parseInt(goToPageInput, 10);
    if (pageNum >= 1 && pageNum <= totalPages) {
      setPage(pageNum);
      setGoToPageInput('');
    }
  };

  const renderDocumentList = (list: DocumentRecord[]) => {
    const allSelected = list.length > 0 && selectedDocuments.size === list.length;
    const someSelected = selectedDocuments.size > 0 && selectedDocuments.size < list.length;
    
    return (
      <div className="space-y-3">
        {/* Bulk selection header */}
        {selectedDocuments.size > 0 && (
          <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">
                {selectedDocuments.size} document{selectedDocuments.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDocuments(new Set())}
                aria-label="Clear selection"
              >
                Clear
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" aria-label="Bulk actions">
                    <MoreHorizontal className="h-4 w-4 mr-2" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleBulkShare} aria-label="Share selected documents">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBulkArchive} aria-label="Archive selected documents">
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleBulkDelete} 
                    className="text-destructive"
                    aria-label="Delete selected documents"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
        
        {list.map((document) => {
          const latestVersion = document.versions[0];
          const author = userLookup.get(document.authorId);
          const isSelected = selectedDocuments.has(document.id);
          const DocumentTypeIcon = getDocumentTypeIcon(document.documentType);
          
          return (
            <div
              key={document.id}
              className={`p-4 border border-border rounded-lg hover:bg-muted/50 hover:shadow-soft transition-all ${
                isSelected ? 'bg-primary/5 border-primary' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleSelectDocument(document.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select ${document.title}`}
                  />
                </div>
                <div
                  onClick={() => router.push(`/dms/${document.id}`)}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <DocumentTypeIcon className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <h3 className="font-semibold text-foreground truncate">{document.title}</h3>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {typeLabel(document.documentType)}
                            </Badge>
                            <Badge variant={statusVariant(document.status)} className="capitalize">
                              {document.status}
                            </Badge>
                            {/* Form-specific status badge */}
                            {document.documentType === 'form' && document.form_document?.status && (
                              <Badge variant={formStatusVariant(document.form_document.status)} className="capitalize">
                                {formStatusLabel(document.form_document.status)}
                              </Badge>
                            )}
                            {/* Pending signatures badge for forms */}
                            {document.documentType === 'form' && 
                             document.form_document?.signature_workflow?.id && 
                             pendingSignaturesByWorkflow.has(document.form_document.signature_workflow.id) && (
                              <Badge 
                                variant="destructive" 
                                className="gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/dms/${document.id}`);
                                }}
                              >
                                <PenTool className="h-3 w-3" />
                                {pendingSignaturesByWorkflow.get(document.form_document.signature_workflow.id)} pending signature{pendingSignaturesByWorkflow.get(document.form_document.signature_workflow.id) !== 1 ? 's' : ''}
                              </Badge>
                            )}
                            <Badge variant={sensitivityBadgeVariant(document.sensitivity)} className="capitalize">
                              {sensitivityLabel(document.sensitivity)}
                            </Badge>
                            {document.tags?.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            Updated {formatDate(document.updatedAt)}
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(event) => {
                                event.stopPropagation();
                                handlePreviewDocument(document);
                              }}
                              aria-label={`Preview ${document.title}`}
                              title="Quick preview"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                setShareTarget(document);
                                setShareDialogOpen(true);
                              }}
                              aria-label={`Share ${document.title}`}
                            >
                              Share
                            </Button>
                          </div>
                        </div>
                      </div>

                      {document.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{document.description}</p>
                      )}
                      {!document.description && document.versions[0]?.contentText && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {document.versions[0].contentText}
                        </p>
                      )}

                      {document.workspaceIds?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {document.workspaceIds.map((workspaceId) => {
                            const workspace = workspaceLookup.get(workspaceId);
                            if (!workspace) return null;
                            // Calculate text color based on background luminance for WCAG AA contrast
                            const getContrastColor = (bgColor: string): string => {
                              const hex = bgColor.replace('#', '');
                              if (hex.length !== 6) return '#000000'; // Fallback to black for better contrast
                              const r = parseInt(hex.substr(0, 2), 16);
                              const g = parseInt(hex.substr(2, 2), 16);
                              const b = parseInt(hex.substr(4, 2), 16);
                              // Calculate relative luminance using WCAG formula
                              const normalize = (val: number) => {
                                val = val / 255;
                                return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
                              };
                              const luminance = 0.2126 * normalize(r) + 0.7152 * normalize(g) + 0.0722 * normalize(b);
                              // Use dark text on light backgrounds (luminance > 0.5), light text on dark backgrounds
                              // Ensure minimum contrast ratio of 4.5:1 for WCAG AA
                              return luminance > 0.5 ? '#000000' : '#ffffff';
                            };
                            return (
                              <Badge
                                key={workspaceId}
                                className="text-[10px] font-medium"
                                style={{ backgroundColor: workspace.color, color: getContrastColor(workspace.color) }}
                              >
                                {workspace.name}
                              </Badge>
                            );
                          })}
                        </div>
                      ) : null}

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Hash className="h-3 w-3" />
                          <span>{document.referenceNumber ?? 'No reference'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Layers className="h-3 w-3" />
                          <span>{document.divisionId ? divisionLookup.get(document.divisionId) ?? 'Unknown division' : 'Unassigned'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Filter className="h-3 w-3" />
                          <span>
                            {document.departmentId
                              ? departmentLookup.get(document.departmentId) ?? 'Unknown department'
                              : 'Unassigned'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-3 w-3" />
                          <span>{author ? author.name : 'Unknown author'}</span>
                        </div>
                      </div>

                      {latestVersion && (
                        <div className="text-xs text-muted-foreground">
                          Latest version {latestVersion.versionNumber} · Uploaded {formatDateTime(latestVersion.uploadedAt)}
                        </div>
                      )}

                      {/* Form-specific metadata */}
                      {document.documentType === 'form' && document.form_document && (
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border/50">
                          {document.form_document.template && (
                            <div className="flex items-center gap-2">
                              <FileCheck className="h-3 w-3" />
                              <span className="font-medium">{document.form_document.template.name}</span>
                            </div>
                          )}
                          {document.form_document.signature_workflow && (
                            <div className="flex items-center gap-2">
                              <PenTool className="h-3 w-3" />
                              <span>
                                {document.form_document.signature_workflow.completed_signatures ?? 0}/
                                {document.form_document.signature_workflow.total_signatures ?? 0} signatures
                              </span>
                            </div>
                          )}
                          {document.form_document.signature_workflow?.id && 
                           pendingSignaturesByWorkflow.has(document.form_document.signature_workflow.id) && (
                            <div className="flex items-center gap-1 text-xs text-destructive font-medium">
                              <PenTool className="h-3 w-3" />
                              {pendingSignaturesByWorkflow.get(document.form_document.signature_workflow.id)} pending
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <ClientErrorBoundary>
      <DashboardLayout>
        <div className="p-6 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              Document Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Central workspace for all ECM documents, templates, and collaboration.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ContextualHelp
              title="Navigating the DMS"
              description="Search across workspaces, filter by status, document type, division, department, and sensitivity. Open a record to review version history and link it to correspondence."
              steps={[
                'Filter by status, type, or workspace to find the right file.',
                'Create or upload from the actions panel to add new content.',
                'Open a document to edit, comment, compare versions, and manage permissions.'
              ]}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setWorkspaceManageOpen(true)}
              aria-label="Manage workspaces"
            >
              <Layers className="h-4 w-4" />
              Workspaces
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                className="gap-1"
                onClick={() => setUploadDialogOpen(true)}
                disabled={!effectiveUser}
                aria-label="Create new document"
              >
                <FilePlus className="h-4 w-4" />
                New Document
              </Button>
              <div className="flex items-center gap-1">
                <Popover open={formTemplatesOpen} onOpenChange={setFormTemplatesOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-1 bg-gradient-primary"
                      disabled={!effectiveUser}
                      aria-label="Create new form from template"
                    >
                      <FileCheck className="h-4 w-4" />
                      New Form
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Search templates..." />
                      <CommandList>
                        <CommandEmpty>
                          {formTemplatesLoading ? 'Loading templates...' : 'No templates found'}
                        </CommandEmpty>
                        <CommandGroup heading="Quick Create">
                          <CommandItem
                            onSelect={() => {
                              setSelectedTemplateForForm(null);
                              setFormTemplatesOpen(false);
                              setCreateFormDialogOpen(true);
                            }}
                            className="cursor-pointer"
                          >
                            <FileCheck className="h-4 w-4 mr-2" />
                            Create from any template
                          </CommandItem>
                        </CommandGroup>
                        {formTemplates.length > 0 && (
                          <CommandGroup heading="Popular Templates">
                            {formTemplates.slice(0, 8).map((template) => (
                              <CommandItem
                                key={template.id}
                                onSelect={() => {
                                  setSelectedTemplateForForm(template);
                                  setFormTemplatesOpen(false);
                                  setCreateFormDialogOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <FileCheck className="h-4 w-4 mr-2" />
                                <div className="flex flex-col">
                                  <span className="font-medium">{template.name}</span>
                                  {template.description && (
                                    <span className="text-xs text-muted-foreground line-clamp-1">
                                      {template.description}
                                    </span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        <HelpGuideCard
          title="Central Document Workspace"
          description="Search across workspaces, filter by status, document type, division, department, and sensitivity. Open a record to review version history and link it to correspondence."
          links={[
            { label: "My Documents", href: "/documents" },
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        <div className="grid gap-4 md:grid-cols-6">
          <div className="md:col-span-2 relative">
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    placeholder="Search by title, reference, tags, content..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearchOpen(e.target.value.length > 0);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    className="pl-10"
                    aria-label="Search documents"
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search documents..." 
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    {recentSearches.length > 0 && (
                      <CommandGroup heading="Recent Searches">
                        {recentSearches.map((search, idx) => (
                          <CommandItem
                            key={idx}
                            onSelect={() => handleSearchSelect(search)}
                            className="cursor-pointer"
                          >
                            <Search className="h-4 w-4 mr-2" />
                            {search}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                    {documents.length > 0 && searchQuery.trim() && (
                      <CommandGroup heading="Quick Results">
                        {documents.slice(0, 5).map((doc) => (
                          <CommandItem
                            key={doc.id}
                            onSelect={() => {
                              handleSearchSelect(doc.title);
                              setSearchOpen(false);
                            }}
                            className="cursor-pointer"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            {doc.title}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <Select 
            value={`${sortOption.field}_${sortOption.direction}`} 
            onValueChange={(value) => {
              const [field, direction] = value.split('_') as [SortField, SortDirection];
              const found = SORT_OPTIONS.find(opt => opt.field === field && opt.direction === direction);
              if (found) setSortOption(found);
            }}
          >
            <SelectTrigger aria-label="Sort documents">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={`${option.field}_${option.direction}`} value={`${option.field}_${option.direction}`}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as DocumentType | 'all')}>
            <SelectTrigger>
              <SelectValue placeholder="Document type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {DOCUMENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {typeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as DocumentStatus | 'all')}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status} className="capitalize">
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {typeFilter === 'form' && (
            <Select value={formStatusFilter} onValueChange={(value) => setFormStatusFilter(value as typeof formStatusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Form Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Form Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="awaiting_signatures">Awaiting Signatures</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select value={divisionFilter} onValueChange={setDivisionFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Division" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              {divisions.map((division) => (
                <SelectItem key={division.id} value={division.id}>
                  {division.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Advanced Filters Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Author Filter */}
          <Select value={authorFilter} onValueChange={setAuthorFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Author" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Authors</SelectItem>
              {Array.from(new Set(documents.map(d => d.authorId)))
                .map(authorId => {
                  const author = organizationUsers.find(u => u.id === authorId);
                  return author ? { id: authorId, name: author.name } : null;
                })
                .filter(Boolean)
                .map((author) => (
                  <SelectItem key={author!.id} value={author!.id}>
                    {author!.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          
          {/* Date Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" aria-label="Date range filter">
                <Calendar className="h-4 w-4" />
                Date Range
                {(dateRangeFilter.start || dateRangeFilter.end) && (
                  <Badge variant="secondary" className="ml-1">
                    {(dateRangeFilter.start && dateRangeFilter.end) ? '2' : '1'}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="dateStart">From Date</Label>
                  <Input
                    id="dateStart"
                    type="date"
                    value={dateRangeFilter.start || ''}
                    onChange={(e) => setDateRangeFilter(prev => ({ ...prev, start: e.target.value }))}
                    aria-label="Filter by start date"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="dateEnd">To Date</Label>
                  <Input
                    id="dateEnd"
                    type="date"
                    value={dateRangeFilter.end || ''}
                    onChange={(e) => setDateRangeFilter(prev => ({ ...prev, end: e.target.value }))}
                    aria-label="Filter by end date"
                    className="mt-1"
                  />
                </div>
                {(dateRangeFilter.start || dateRangeFilter.end) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRangeFilter({})}
                    className="w-full"
                    aria-label="Clear date filter"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Date Filter
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {error && (
          <Card>
            <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <DocumentCardSkeleton key={i} />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-muted/50">
                  <FileText className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">No documents found</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {searchQuery || typeFilter !== 'all' || statusFilter !== 'all' || divisionFilter !== 'all' || departmentFilter !== 'all' || authorFilter !== 'all' || dateRangeFilter.start || dateRangeFilter.end
                      ? 'Try adjusting your search or filters to find what you\'re looking for. You can also clear filters to see all documents.'
                      : 'Get started by creating your first document. You can upload files, create forms, or compose documents using the rich text editor.'}
                  </p>
                </div>
                {effectiveUser && (
                  <div className="flex items-center gap-3 mt-4">
                    <Button
                      onClick={() => setUploadDialogOpen(true)}
                      aria-label="Create new document"
                    >
                      <FilePlus className="h-4 w-4 mr-2" />
                      Create Document
                    </Button>
                    {(searchQuery || typeFilter !== 'all' || statusFilter !== 'all' || divisionFilter !== 'all' || departmentFilter !== 'all' || authorFilter !== 'all' || dateRangeFilter.start || dateRangeFilter.end) && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchQuery('');
                          setTypeFilter('all');
                          setStatusFilter('all');
                          setDivisionFilter('all');
                          setDepartmentFilter('all');
                          setAuthorFilter('all');
                          setDateRangeFilter({});
                        }}
                        aria-label="Clear all filters"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear Filters
                      </Button>
                    )}
                  </div>
                )}
                {!effectiveUser && (
                  <p className="text-xs text-muted-foreground mt-4">
                    Please log in to create and manage documents.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          renderDocumentList(filteredDocuments)
        )}

        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Showing{' '}
              {totalCount === 0
                ? 0
                : `${(page - 1) * customPageSize + 1}-${Math.min(totalCount, (page - 1) * customPageSize + documents.length)}`}{' '}
              of {totalCount} documents
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="page-size" className="text-sm text-muted-foreground">
                Per page:
              </label>
              <Select value={String(customPageSize)} onValueChange={(value) => {
                setCustomPageSize(Number(value));
                setPage(1);
              }}>
                <SelectTrigger id="page-size" className="w-20 h-8" aria-label="Items per page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1 || loading}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            {/* Page number buttons */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                
                if (pageNum > totalPages) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setPage(pageNum)}
                    disabled={loading}
                    aria-label={`Go to page ${pageNum}`}
                    aria-current={page === pageNum ? 'page' : undefined}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            {/* Go to page input */}
            {totalPages > 5 && (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={goToPageInput}
                  onChange={(e) => setGoToPageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleGoToPage();
                    }
                  }}
                  placeholder="Page"
                  className="w-16 h-8 text-xs"
                  aria-label="Go to page number"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={handleGoToPage}
                  disabled={loading}
                  aria-label="Go to page"
                >
                  Go
                </Button>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
              aria-label="Next page"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart2 className="h-4 w-4 text-primary" />
              Quick Stats
            </CardTitle>
            <CardDescription>Snapshot of your accessible documents.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground">Published</p>
              <p className="text-2xl font-bold text-primary">{pageStats.published}</p>
            </div>
            <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
              <p className="text-xs text-muted-foreground">Drafts</p>
              <p className="text-2xl font-bold text-warning">{pageStats.draft}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20">
              <p className="text-xs text-muted-foreground">Archived</p>
              <p className="text-2xl font-bold text-secondary">{pageStats.archived}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {effectiveUser && (
        <>
          <CreateFormDocumentDialog
            open={createFormDialogOpen}
            onOpenChange={(open) => {
              setCreateFormDialogOpen(open);
              if (!open) {
                setSelectedTemplateForForm(null);
              }
            }}
            onComplete={(documentId) => {
              router.push(`/dms/${documentId}`);
              void loadDocuments();
              setSelectedTemplateForForm(null);
            }}
            initialTemplate={selectedTemplateForForm}
          />
          <DocumentUploadDialog
            open={uploadDialogOpen}
            onOpenChange={setUploadDialogOpen}
            mode="create"
            currentUser={effectiveUser}
            onComplete={() => {
              void loadDocuments();
            }}
          />
        </>
      )}
      <ShareDocumentDialog
        open={shareDialogOpen}
        onOpenChange={(open) => {
          setShareDialogOpen(open);
          if (!open) setShareTarget(null);
        }}
        document={shareTarget}
        currentUserId={currentUser?.id}
        onShared={() => {
          void loadDocuments();
        }}
      />
      <DocumentQuickPreviewModal
        document={previewDocument}
        isOpen={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewDocument(null);
        }}
      />
      <WorkspaceManagementDialog
        open={workspaceManageOpen}
        onOpenChange={setWorkspaceManageOpen}
        workspaces={workspaces}
        onWorkspaceChange={async () => {
          try {
            const spaces = await fetchWorkspaces();
            setWorkspaces(spaces);
            void loadDocuments();
          } catch (error) {
            logError('Failed to reload workspaces', error);
          }
        }}
      />
      </DashboardLayout>
    </ClientErrorBoundary>
  );
};

export default DocumentManagementPage;