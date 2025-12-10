"use client";

import { Suspense, useRef, startTransition } from 'react';
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
  queryDocumentsExtended,
  getDocumentStats,
  type DocumentRecord,
  type DocumentType,
  type DocumentStatus,
  fetchWorkspaces,
  getCachedWorkspaces,
  type DocumentWorkspace,
  bulkArchiveDocuments,
  bulkDeleteDocuments,
  type ExtendedDocumentQueryParams,
  type DocumentStats,
} from '@/lib/dms-storage';
import {
  FileText,
  Search,
  Layers,
  Filter,
  Calendar,
  Hash,
  User as UserIcon,
  Building2,
  BarChart2,
  FilePlus,
  Upload,
  Sparkles,
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
import { BulkUploadDialog } from '@/components/dms/BulkUploadDialog';
import { SmartCreationWizard } from '@/components/dms/SmartCreationWizard';
import { CreateFormDocumentDialog } from '@/components/dms/CreateFormDocumentDialog';
import { ShareDocumentDialog } from '@/components/dms/ShareDocumentDialog';
import { DocumentQuickPreviewModal } from '@/components/dms/DocumentQuickPreviewModal';
import { WorkspaceManagementDialog } from '@/components/dms/WorkspaceManagementDialog';
import { DocumentCardSkeleton } from '@/components/dms/DocumentCardSkeleton';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePagination } from '@/hooks/use-pagination';
import { useTableSort } from '@/hooks/use-table-sort';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { EmptyState } from '@/components/shared/EmptyState';
import { FilterPanel, FilterBadgeGroup } from '@/components/shared/FilterPanel';
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

// Convert to format expected by useTableSort
const SORT_OPTIONS_FOR_HOOK = SORT_OPTIONS.map(opt => ({
  value: opt.field,
  label: opt.label,
}));

const DocumentManagementPageContent = () => {
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use pagination hook
  const pagination = usePagination({
    initialPage: (() => {
      const urlPage = searchParams.get('page');
      return urlPage ? parseInt(urlPage, 10) : 1;
    })(),
    initialPageSize: 25,
    totalCount,
  });
  
  // Use table sort hook
  const tableSort = useTableSort<SortField>({
    initialSort: { field: 'updated_at', direction: 'desc' },
    sortOptions: SORT_OPTIONS_FOR_HOOK,
  });
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
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
  const [smartWizardOpen, setSmartWizardOpen] = useState(false);
  const [createFormDialogOpen, setCreateFormDialogOpen] = useState(false);
  const [shouldReloadDocuments, setShouldReloadDocuments] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [actionsDropdownOpen, setActionsDropdownOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<DocumentRecord | null>(null);
  const [workspaces, setWorkspaces] = useState<DocumentWorkspace[]>(() => getCachedWorkspaces());
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [previewDocument, setPreviewDocument] = useState<DocumentRecord | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [workspaceManageOpen, setWorkspaceManageOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
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
  const [totalStats, setTotalStats] = useState<DocumentStats | null>(null);
  
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ordering = tableSort.sort.direction === 'desc' ? `-${tableSort.sort.field}` : tableSort.sort.field;
      
      // Build extended query params including author and date filters
      const queryParams: ExtendedDocumentQueryParams = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: searchQuery.trim() || undefined,
        status: statusFilter,
        documentType: typeFilter,
        divisionId: divisionFilter,
        departmentId: departmentFilter,
        ordering,
        // New extended filters - now handled by backend
        authorId: authorFilter !== 'all' ? authorFilter : undefined,
        dateFrom: dateRangeFilter.start || undefined,
        dateTo: dateRangeFilter.end || undefined,
      };
      
      const response = await queryDocumentsExtended(queryParams);
      setDocuments(response.results);
      setTotalCount(response.count);
    } catch (err) {
      logError('Failed to load DMS documents', err);
      setDocuments([]);
      setTotalCount(0);
      const errorMessage = err instanceof Error ? err.message : 'Unable to load documents right now.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, searchQuery, statusFilter, typeFilter, divisionFilter, departmentFilter, authorFilter, dateRangeFilter, tableSort.sort.field, tableSort.sort.direction]);

  const effectiveUser = useMemo(() => {
    if (currentUser) return currentUser;
    return organizationUsers.find((user) => user.active) ?? null;
  }, [currentUser, organizationUsers]);

  const workspaceLookup = useMemo(() => {
    const map = new Map<string, DocumentWorkspace>();
    workspaces.forEach((workspace) => map.set(workspace.id, workspace));
    return map;
  }, [workspaces]);

  // Filter documents by form status only (author and date range now handled by backend)
  const filteredDocuments = useMemo(() => {
    let filtered = documents;
    
    // Form status filter (client-side for now - specific to form documents)
    if (typeFilter === 'form' && formStatusFilter !== 'all') {
      filtered = filtered.filter((doc) => {
        if (doc.documentType !== 'form') return false;
        return doc.form_document?.status === formStatusFilter;
      });
    }
    
    // Note: Author and date range filters are now handled by the backend API
    // via queryDocumentsExtended() in loadDocuments()
    
    return filtered;
  }, [documents, typeFilter, formStatusFilter]);

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
          logError('Failed to load form templates', error);
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
    if (pagination.page > 1) params.set('page', String(pagination.page));
    
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
  }, [searchQuery, typeFilter, statusFilter, formStatusFilter, divisionFilter, departmentFilter, authorFilter, dateRangeFilter, pagination.page, router]);

  useEffect(() => {
    pagination.goToFirstPage();
    setSelectedDocuments(new Set());
  }, [searchQuery, statusFilter, typeFilter, divisionFilter, departmentFilter, authorFilter, dateRangeFilter, tableSort.sort]);

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
        logError('Failed to load pending signatures', error);
        // Don't show error toast as this is a background operation
      }
    };

    void loadPendingSignatures();
  }, [currentUser, documents]); // Reload when documents change to catch new workflows

  // Reload documents after dialogs close (debounced to avoid conflicts)
  useEffect(() => {
    if (!shouldReloadDocuments) return;
    
    const timer = setTimeout(() => {
      // Use startTransition to mark this as a non-urgent update
      startTransition(() => {
        void loadDocuments();
        setShouldReloadDocuments(false);
      });
    }, 200); // Wait for dialog close animation to complete
    
    return () => clearTimeout(timer);
  }, [shouldReloadDocuments, loadDocuments]);

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

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };

    if (searchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchOpen]);

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
        const parsed = JSON.parse(savedSort) as { field: SortField; direction: SortDirection };
        tableSort.setSort(parsed.field, parsed.direction);
      } catch (e) {
        // Ignore invalid saved preference
      }
    }
  }, []);

  // Save sort preference to localStorage
  useEffect(() => {
    localStorage.setItem('dms_sort_preference', JSON.stringify(tableSort.sort));
  }, [tableSort.sort]);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const loadWithTimeout = async () => {
      timeoutId = setTimeout(() => {
        if (mounted) {
          logError('Document loading timeout after 30 seconds', new Error('Timeout'));
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
  
  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (formStatusFilter !== 'all') count++;
    if (divisionFilter !== 'all') count++;
    if (departmentFilter !== 'all') count++;
    if (authorFilter !== 'all') count++;
    if (dateRangeFilter.start || dateRangeFilter.end) count++;
    return count;
  }, [typeFilter, statusFilter, formStatusFilter, divisionFilter, departmentFilter, authorFilter, dateRangeFilter]);
  
  // Toggle functions for filters
  const toggleType = (type: DocumentType | 'all') => {
    setTypeFilter(type === typeFilter ? 'all' : type);
  };
  
  const toggleStatus = (status: DocumentStatus | 'all') => {
    setStatusFilter(status === statusFilter ? 'all' : status);
  };
  
  const toggleFormStatus = (status: typeof formStatusFilter) => {
    setFormStatusFilter(status === formStatusFilter ? 'all' : status);
  };
  
  const clearAllFilters = () => {
    setTypeFilter('all');
    setStatusFilter('all');
    setFormStatusFilter('all');
    setDivisionFilter('all');
    setDepartmentFilter('all');
    setAuthorFilter('all');
    setDateRangeFilter({});
    setSearchQuery('');
  };
  
  // Load total stats on mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await getDocumentStats();
        setTotalStats(stats);
      } catch (error) {
        logError('Failed to load document stats', error);
      }
    };
    void loadStats();
  }, []);

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
    if (selectedDocuments.size === 0) return;
    
    try {
      const documentIds = Array.from(selectedDocuments);
      toast.info(`Archiving ${documentIds.length} document(s)...`);
      
      const result = await bulkArchiveDocuments(documentIds);
      
      toast.success(result.message);
      if (result.skipped_count > 0) {
        toast.warning(`${result.skipped_count} document(s) could not be archived (permission denied)`);
      }
      
      setSelectedDocuments(new Set());
      void loadDocuments(); // Refresh the list
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to archive documents';
      toast.error(message);
      logError('Bulk archive failed', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocuments.size === 0) return;
    
    try {
      const documentIds = Array.from(selectedDocuments);
      toast.info(`Deleting ${documentIds.length} document(s)...`);
      
      const result = await bulkDeleteDocuments(documentIds);
      
      toast.success(result.message);
      if (result.skipped_count > 0) {
        toast.warning(`${result.skipped_count} document(s) could not be deleted (permission denied)`);
      }
      
      setSelectedDocuments(new Set());
      void loadDocuments(); // Refresh the list
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete documents';
      toast.error(message);
      logError('Bulk delete failed', error);
    }
  };

  const handleBulkShare = () => {
    // For bulk share, we could open a dialog to share multiple documents
    // For now, show a message suggesting to share individually
    toast.info(`To share multiple documents, please share them individually for better control.`);
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

        {/* Select All checkbox - only show when there are documents */}
        {list.length > 0 && (
          <div className="flex items-center gap-2 p-2 border-b border-border/50">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedDocuments(new Set(list.map(doc => doc.id)));
                } else {
                  setSelectedDocuments(new Set());
                }
              }}
              aria-label={allSelected ? 'Deselect all documents' : 'Select all documents'}
            />
            <Label 
              className="text-sm font-medium cursor-pointer"
              onClick={() => {
                if (allSelected) {
                  setSelectedDocuments(new Set());
                } else {
                  setSelectedDocuments(new Set(list.map(doc => doc.id)));
                }
              }}
            >
              {allSelected ? 'Deselect All' : 'Select All'} ({list.length})
            </Label>
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
                          <Building2 className="h-3 w-3" />
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
        <div className="container mx-auto p-6 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  Document Management
                </h1>
                <p className="text-muted-foreground mt-1">
                  Central workspace for all ECM documents, templates, and collaboration.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
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
              </div>
            </div>

            {/* Quick Stats - Compact Horizontal Layout */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BarChart2 className="h-4 w-4" />
                    <span>
                      {totalStats ? `Total: ${totalStats.total} documents` : 'Document statistics'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="text-sm font-medium text-primary">
                        {totalStats ? totalStats.published : pageStats.published}
                      </span>
                      <span className="text-xs text-muted-foreground">Published</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-warning" />
                      <span className="text-sm font-medium text-warning">
                        {totalStats ? totalStats.draft : pageStats.draft}
                      </span>
                      <span className="text-xs text-muted-foreground">Drafts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-secondary" />
                      <span className="text-sm font-medium text-secondary">
                        {totalStats ? totalStats.archived : pageStats.archived}
                      </span>
                      <span className="text-xs text-muted-foreground">Archived</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Search, Filters, and Actions Bar */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex-1 relative min-w-[200px]" ref={searchContainerRef}>
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" aria-hidden="true" />
                  <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearchOpen(recentSearches.length > 0 || e.target.value.trim().length > 0);
                    }}
                    onFocus={() => {
                      if (recentSearches.length > 0 || searchQuery.trim().length > 0) {
                        setSearchOpen(true);
                      }
                    }}
                    className="pl-10"
                    aria-label="Search documents"
                  />
                  {searchOpen && (recentSearches.length > 0 || (searchQuery.trim().length > 0 && documents.length > 0)) && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-[300px] overflow-auto">
                      <Command>
                        <CommandList>
                          <CommandEmpty>No results found.</CommandEmpty>
                          {recentSearches.length > 0 && !searchQuery.trim() && (
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
                    </div>
                  )}
                </div>
                <Select 
                  value={`${tableSort.sort.field}_${tableSort.sort.direction}`} 
                  onValueChange={(value) => {
                    const [field, direction] = value.split('_') as [SortField, SortDirection];
                    tableSort.setSort(field, direction);
                  }}
                >
                  <SelectTrigger aria-label="Sort documents" className="w-[180px]">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  aria-label="Toggle filters"
                >
                  <Filter className="h-4 w-4 mr-2" /> 
                  Filters
                  {activeFilterCount > 0 && <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>}
                </Button>
                {effectiveUser && (
                  <>
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
                    <DropdownMenu open={actionsDropdownOpen} onOpenChange={setActionsDropdownOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          disabled={!effectiveUser}
                          aria-label="More creation options"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            setActionsDropdownOpen(false);
                            requestAnimationFrame(() => {
                              setBulkUploadDialogOpen(true);
                            });
                          }}
                          disabled={!effectiveUser}
                          aria-label="Bulk upload documents"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Bulk Upload
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            setActionsDropdownOpen(false);
                            requestAnimationFrame(() => {
                              setSmartWizardOpen(true);
                            });
                          }}
                          disabled={!effectiveUser}
                          aria-label="Smart creation wizard"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Smart Create
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            setActionsDropdownOpen(false);
                            requestAnimationFrame(() => {
                              setCreateFormDialogOpen(true);
                              setSelectedTemplateForForm(null);
                            });
                          }}
                          disabled={!effectiveUser}
                          aria-label="Create new form from template"
                        >
                          <FileCheck className="h-4 w-4 mr-2" />
                          New Form
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            </div>
          </div>

        {/* Form Templates Popover - opens when New Form is clicked from dropdown */}
        <Popover open={formTemplatesOpen} onOpenChange={setFormTemplatesOpen}>
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

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Document Filters</CardTitle>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>Clear All</Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Document Type */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Document Type</Label>
                  <div className="flex flex-wrap gap-1">
                    {DOCUMENT_TYPES.map((type) => (
                      <Badge
                        key={type}
                        variant={typeFilter === type ? 'default' : 'outline'}
                        className="cursor-pointer capitalize text-xs"
                        onClick={() => toggleType(type)}
                      >
                        {typeLabel(type)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Status</Label>
                  <div className="flex flex-wrap gap-1">
                    {STATUS_OPTIONS.map((status) => (
                      <Badge
                        key={status}
                        variant={statusFilter === status ? 'default' : 'outline'}
                        className="cursor-pointer capitalize text-xs"
                        onClick={() => toggleStatus(status)}
                      >
                        {status}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Form Status (only show when type is form) */}
                {typeFilter === 'form' && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Form Status</Label>
                    <div className="flex flex-wrap gap-1">
                      {(['draft', 'in_progress', 'awaiting_signatures', 'completed'] as const).map((status) => (
                        <Badge
                          key={status}
                          variant={formStatusFilter === status ? 'default' : 'outline'}
                          className="cursor-pointer capitalize text-xs"
                          onClick={() => toggleFormStatus(status)}
                        >
                          {formStatusLabel(status)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Division and Department */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Division</Label>
                    <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Divisions" />
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
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Department</Label>
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Departments" />
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
                </div>

                {/* Author and Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Author</Label>
                    <Select value={authorFilter} onValueChange={setAuthorFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Authors" />
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
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Date Range</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start gap-2" aria-label="Date range filter">
                          <Calendar className="h-4 w-4" />
                          {dateRangeFilter.start || dateRangeFilter.end ? (
                            <span className="text-xs">
                              {dateRangeFilter.start && dateRangeFilter.end 
                                ? `${new Date(dateRangeFilter.start).toLocaleDateString()} - ${new Date(dateRangeFilter.end).toLocaleDateString()}`
                                : dateRangeFilter.start 
                                ? `From ${new Date(dateRangeFilter.start).toLocaleDateString()}`
                                : dateRangeFilter.end
                                ? `Until ${new Date(dateRangeFilter.end).toLocaleDateString()}`
                                : 'Select date range'
                              }
                            </span>
                          ) : (
                            <span>Select date range</span>
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
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
          <EmptyState
            icon={FileText}
            title="No documents found"
            description={
              searchQuery || typeFilter !== 'all' || statusFilter !== 'all' || divisionFilter !== 'all' || departmentFilter !== 'all' || authorFilter !== 'all' || dateRangeFilter.start || dateRangeFilter.end
                ? 'Try adjusting your search or filters to find what you\'re looking for. You can also clear filters to see all documents.'
                : 'Get started by creating your first document. You can upload files, create forms, or compose documents using the rich text editor.'
            }
            action={
              effectiveUser
                ? {
                    label: 'Create Document',
                    onClick: () => setUploadDialogOpen(true),
                  }
                : undefined
            }
          >
            {(searchQuery || typeFilter !== 'all' || statusFilter !== 'all' || divisionFilter !== 'all' || departmentFilter !== 'all' || authorFilter !== 'all' || dateRangeFilter.start || dateRangeFilter.end) && effectiveUser && (
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
            {!effectiveUser && (
              <p className="text-xs text-muted-foreground mt-4">
                Please log in to create and manage documents.
              </p>
            )}
          </EmptyState>
        ) : (
          renderDocumentList(filteredDocuments)
        )}

        {totalCount > 0 && (
          <PaginationControls
            pagination={pagination}
            showPageSizeSelector={true}
            showGoToPage={true}
            className="border-t border-border/60 pt-4"
          />
        )}
      </div>

      {effectiveUser && (
        <>
          <CreateFormDocumentDialog
            open={createFormDialogOpen}
            onOpenChange={(open) => {
              setCreateFormDialogOpen(open);
              if (!open) {
                // Use setTimeout to avoid blocking
                setTimeout(() => {
                  setSelectedTemplateForForm(null);
                }, 0);
              }
            }}
            onComplete={(documentId) => {
              // Navigate immediately, don't reload here
              router.push(`/dms/${documentId}`);
              setSelectedTemplateForForm(null);
            }}
            initialTemplate={selectedTemplateForForm}
          />
          <DocumentUploadDialog
            open={uploadDialogOpen}
            onOpenChange={(open) => {
              startTransition(() => {
                setUploadDialogOpen(open);
                if (!open) {
                  setShouldReloadDocuments(true);
                }
              });
            }}
            mode="create"
            currentUser={effectiveUser}
            onComplete={() => {
              // Reload handled by shouldReloadDocuments flag
            }}
          />
          <BulkUploadDialog
            open={bulkUploadDialogOpen}
            onOpenChange={(open) => {
              setBulkUploadDialogOpen(open);
              if (!open) {
                // Use setTimeout to avoid blocking
                setTimeout(() => {
                  setShouldReloadDocuments(true);
                }, 0);
              }
            }}
            currentUser={effectiveUser}
            onComplete={(documents) => {
              // Toast messages are handled in the component
            }}
            defaultWorkspaceIds={[]}
          />
          <SmartCreationWizard
            open={smartWizardOpen}
            onOpenChange={(open) => {
              setSmartWizardOpen(open);
              if (!open) {
                // Use setTimeout to avoid blocking
                setTimeout(() => {
                  setShouldReloadDocuments(true);
                }, 0);
              }
            }}
            currentUser={effectiveUser}
            onComplete={(documents, collectionId) => {
              // Toast messages are handled in the component
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

// Wrap in Suspense for useSearchParams
const DocumentManagementPage = () => (
  <Suspense fallback={
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    </DashboardLayout>
  }>
    <DocumentManagementPageContent />
  </Suspense>
);

export default DocumentManagementPage;