"use client";
import { ERROR_UNKNOWN } from '@/lib/constants';

import { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HelpGuideCard } from "@/components/help/HelpGuideCard";
import { cn } from "@/lib/utils";
import {
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from "@/components/shared/registry-queue-styles";
import { ContextualHelp } from "@/components/help/ContextualHelp";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users,
  Search,
  Building2,
  Shield,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  Download,
  Loader2,
  Pencil,
} from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { UserEditDialog } from "@/components/admin/UserEditDialog";
import { UserTableSkeleton, UserTableSkeletonRows } from "@/components/admin/UserTableSkeleton";
import { getGradeLevelByCode, type User } from "@/lib/npa-structure";
import { exportToCSV } from "@/lib/admin-export";
import { toast } from "@/hooks/use-toast";
import { getRecentSearches, addRecentSearch, getSearchSuggestions, clearRecentSearches } from "@/lib/admin-search-autocomplete";
import { 
  fetchUsers, 
  type User as ApiUser, 
  type UserQueryParams,
  bulkActivateUsers,
  bulkDeactivateUsers,
  bulkArchiveUsers,
  bulkDeleteUsers,
  bulkAssignRole,
} from "@/lib/admin-api";
import { handleApiError } from "@/lib/admin-error-handler";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

type FilterCategory = "role" | "grade" | "directorate" | "division" | "department" | "status";

type ActiveFilter = {
  key: FilterCategory;
  value: string;
  display: string;
};

type SortKey = "name" | "email" | "role" | "grade" | "division" | "department" | "status";

type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};

const getGradeLabel = (code: string | undefined) => getGradeLevelByCode(code)?.name;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_ACTIVE_FILTER: ActiveFilter = { key: 'status', value: 'active', display: 'Status: Active' };

const parseStoredFilters = (raw: string | null): ActiveFilter[] => {
  if (!raw) return [DEFAULT_ACTIVE_FILTER];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [DEFAULT_ACTIVE_FILTER];
    const normalized = parsed
      .filter((item): item is ActiveFilter => typeof item === 'object' && item !== null)
      .map((item) => ({
        key: String(item.key) as FilterCategory,
        value: String(item.value ?? ''),
        display: String(item.display ?? ''),
      }))
      .filter((item) => item.key && item.display);
    return normalized.length > 0 ? normalized : [DEFAULT_ACTIVE_FILTER];
  } catch {
    return [DEFAULT_ACTIVE_FILTER];
  }
};

const parseStoredSort = (raw: string | null): SortState | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SortState;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.key || !parsed.direction) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const UsersManagementTab = () => {
  const { divisions, departments, roles } = useOrganization();
  const searchParams = useSearchParams();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Load from URL params or localStorage
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlQuery = searchParams.get('search');
      const stored = localStorage.getItem('admin_users_search');
      return urlQuery || stored || '';
    }
    return '';
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [filters, setFilters] = useState<ActiveFilter[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('admin_users_filters');
      return parseStoredFilters(stored);
    }
    return [DEFAULT_ACTIVE_FILTER];
  });
  const [sortState, setSortState] = useState<SortState | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('admin_users_sort');
      return parseStoredSort(stored);
    }
    return null;
  });
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [_isBulkActionMode, setIsBulkActionMode] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [_mounted, setMounted] = useState(false);
  const [showBulkDeactivateConfirm, setShowBulkDeactivateConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkArchiveConfirm, setShowBulkArchiveConfirm] = useState(false);
  const [showBulkRoleAssign, setShowBulkRoleAssign] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const roleIdByName = useMemo(() => {
    const map = new Map<string, string>();
    roles.forEach((role) => {
      map.set(role.name.trim().toLowerCase(), role.id);
    });
    return map;
  }, [roles]);
  const resolveRoleId = useCallback((roleValue: string) => {
    const value = roleValue.trim();
    if (!value) return null;
    if (UUID_REGEX.test(value)) return value;
    return roleIdByName.get(value.toLowerCase()) || null;
  }, [roleIdByName]);
  
  // Ensure client-side only rendering for localStorage-dependent UI
  useEffect(() => {
    setMounted(true);
  }, []);

  // Normalize legacy role filters (name-based) to UUID-based filters expected by backend.
  useEffect(() => {
    if (roles.length === 0) return;
    setFilters((prev) => {
      let changed = false;
      const normalized = prev.flatMap((filter) => {
        if (filter.key !== 'role') return [filter];
        const roleId = resolveRoleId(filter.value);
        if (!roleId) {
          changed = true;
          return [];
        }
        const roleName = roles.find((role) => role.id === roleId)?.name || filter.display.replace(/^Role:\s*/i, '') || 'Role';
        const nextFilter: ActiveFilter = {
          ...filter,
          value: roleId,
          display: `Role: ${roleName}`,
        };
        if (nextFilter.value !== filter.value || nextFilter.display !== filter.display) {
          changed = true;
        }
        return [nextFilter];
      });
      return changed ? normalized : prev;
    });
  }, [roles, resolveRoleId]);
  
  // Load recent searches
  const recentSearches = typeof window !== 'undefined' ? getRecentSearches('users') : [];
  
  // Reset to page 1 when filters/search change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filters]);
  
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Ensure page is valid (DRF requires page >= 1)
      const validPage = Math.max(1, currentPage);
      if (validPage !== currentPage) {
        setCurrentPage(validPage);
        return; // Will retry with valid page on next render
      }
      
      // Don't make API call if page is invalid
      if (currentPage < 1) {
        setCurrentPage(1);
        return;
      }
      
      // Build query params
      const queryParams: UserQueryParams = {
        page: validPage,
        page_size: pageSize,
      };
      
      if (searchQuery.trim()) {
        queryParams.search = searchQuery.trim();
      }
      
      // Apply filters
      filters.forEach(filter => {
        switch (filter.key) {
          case 'status':
            queryParams.is_active = filter.value === 'active';
            break;
          case 'role':
            {
              const roleId = resolveRoleId(filter.value);
              if (roleId) {
                queryParams.system_role = roleId;
              }
            }
            break;
          case 'division':
            queryParams.division = filter.value;
            break;
          case 'department':
            queryParams.department = filter.value;
            break;
        }
      });
      
      // Sorting
      if (sortState) {
        const ordering = sortState.direction === 'desc' ? `-${sortState.key}` : sortState.key;
        queryParams.ordering = ordering;
      }
      
      const response = await fetchUsers(queryParams);
      setUsers(response.results);
      setTotalCount(response.count as number);
      
      // If current page exceeds total pages after filtering, reset to last valid page
      const totalPages = Math.ceil(response.count as number / pageSize);
      if (totalPages > 0 && validPage > totalPages) {
        setCurrentPage(totalPages);
      }
      
    } catch (error: unknown) {
      // Handle "Invalid page" error specifically
      if ((error instanceof Error && (error instanceof Error ? error.message : ERROR_UNKNOWN)?.includes('Invalid page')) || (typeof error === 'object' && error && 'detail' in error && error.detail === 'Invalid page.')) {
        // Reset to page 1 if page is invalid
        if (currentPage !== 1) {
          setCurrentPage(1);
          return; // Will retry with page 1
        }
      }
      handleApiError(error, 'User Management');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, filters, sortState, resolveRoleId]);
  
  // Map API users to local User type (must be before useEffects that use it)
  const mappedUsers = useMemo(() => {
    return users.map((apiUser): User => ({
      id: apiUser.id,
      name: `${apiUser.first_name} ${apiUser.last_name}`.trim() || apiUser.username,
      email: apiUser.email,
      employeeId: apiUser.employee_id || '',
      gradeLevel: apiUser.grade_level || '',
      directorate: apiUser.directorate || undefined,
      division: apiUser.division || undefined,
      department: apiUser.department || undefined,
      systemRole: apiUser.system_role_name || apiUser.system_role || '',
      active: apiUser.is_active,
      username: apiUser.username,
      isSuperuser: apiUser.is_superuser,
    }));
  }, [users]);
  
  // Load users with pagination
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);
  
  // Generate search suggestions (using loaded users)
  useEffect(() => {
    if (searchQuery.trim().length > 1 && mappedUsers.length > 0) {
      const suggestions = getSearchSuggestions(searchQuery, mappedUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        systemRole: u.systemRole,
        employeeId: u.employeeId,
      })), 5);
      setSearchSuggestions(suggestions);
      setShowSearchSuggestions(suggestions.length > 0);
    } else {
      setShowSearchSuggestions(false);
      setSearchSuggestions([]);
    }
  }, [searchQuery, mappedUsers]);
  
  // Persist to localStorage and URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_users_search', searchQuery);
      localStorage.setItem('admin_users_filters', JSON.stringify(filters));
      if (sortState) {
        localStorage.setItem('admin_users_sort', JSON.stringify(sortState));
      }
    }
  }, [searchQuery, filters, sortState]);

  const addFilter = (filter: ActiveFilter) => {
    setFilters((prev) => {
      const exists = prev.some((item) => item.key === filter.key && item.value === filter.value);
      if (exists) return prev;
      return [...prev, filter];
    });
  };

  const getFilterValue = useCallback((key: FilterCategory) => {
    return filters.find((filter) => filter.key === key)?.value || "all";
  }, [filters]);

  const setFilterValue = useCallback((key: FilterCategory, value: string, display: string) => {
    setFilters((prev) => {
      const withoutKey = prev.filter((item) => item.key !== key);
      if (value === "all") {
        return withoutKey;
      }
      return [...withoutKey, { key, value, display }];
    });
  }, []);
  const clearAllFilters = useCallback(() => setFilters([]), []);

  // Bulk operation handlers
  const handleBulkActivate = async () => {
    if (selectedUserIds.size === 0) {
      toast({
        title: "No users selected",
        description: "Please select at least one user",
        variant: "destructive",
      });
      return;
    }

    setIsBulkProcessing(true);
    try {
      const result = await bulkActivateUsers(Array.from(selectedUserIds));
      toast({
        title: "Success",
        description: result.message || `Activated ${result.activated_count || selectedUserIds.size} user(s)`,
      });
      setSelectedUserIds(new Set());
      setIsBulkActionMode(false);
      await loadUsers();
    } catch (error: unknown) {
      handleApiError(error, 'Bulk Activate');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedUserIds.size === 0) {
      toast({
        title: "No users selected",
        description: "Please select at least one user",
        variant: "destructive",
      });
      return;
    }
    setShowBulkDeactivateConfirm(true);
  };

  const confirmBulkDeactivate = async () => {
    setIsBulkProcessing(true);
    try {
      const result = await bulkDeactivateUsers(Array.from(selectedUserIds));
      toast({
        title: "Success",
        description: result.message || `Deactivated ${result.deactivated_count || selectedUserIds.size} user(s)`,
      });
      setSelectedUserIds(new Set());
      setIsBulkActionMode(false);
      setShowBulkDeactivateConfirm(false);
      await loadUsers();
    } catch (error: unknown) {
      handleApiError(error, 'Bulk Deactivate');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkArchive = () => {
    if (selectedUserIds.size === 0) {
      toast({
        title: "No users selected",
        description: "Please select at least one user",
        variant: "destructive",
      });
      return;
    }
    setShowBulkArchiveConfirm(true);
  };

  const confirmBulkArchive = async () => {
    setIsBulkProcessing(true);
    try {
      const result = await bulkArchiveUsers(Array.from(selectedUserIds));
      toast({
        title: "Success",
        description: result.message || `Archived ${result.archived_count || selectedUserIds.size} user(s)`,
      });
      setSelectedUserIds(new Set());
      setIsBulkActionMode(false);
      setShowBulkArchiveConfirm(false);
      await loadUsers();
    } catch (error: unknown) {
      handleApiError(error, 'Bulk Archive');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedUserIds.size === 0) {
      toast({
        title: "No users selected",
        description: "Please select at least one user",
        variant: "destructive",
      });
      return;
    }
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    setIsBulkProcessing(true);
    try {
      const result = await bulkDeleteUsers(Array.from(selectedUserIds));
      toast({
        title: "Success",
        description: result.message || `Deleted ${result.deleted_count || selectedUserIds.size} user(s)`,
      });
      setSelectedUserIds(new Set());
      setIsBulkActionMode(false);
      setShowBulkDeleteConfirm(false);
      await loadUsers();
    } catch (error: unknown) {
      handleApiError(error, 'Bulk Delete');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkAssignRole = async (roleId: string) => {
    if (selectedUserIds.size === 0) {
      toast({
        title: "No users selected",
        description: "Please select at least one user",
        variant: "destructive",
      });
      return;
    }

    setIsBulkProcessing(true);
    try {
      const result = await bulkAssignRole(roleId, Array.from(selectedUserIds));
      toast({
        title: "Success",
        description: result.message || `Assigned role to ${result.assigned_count || selectedUserIds.size} user(s)`,
      });
      setSelectedUserIds(new Set());
      setIsBulkActionMode(false);
      setShowBulkRoleAssign(false);
      await loadUsers();
    } catch (error: unknown) {
      handleApiError(error, 'Bulk Role Assignment');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Filtering is now done on the backend, but we keep this for reference
  // The filters are applied in the loadUsers function via queryParams

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const toggleSort = (key: SortKey) => {
    setSortState((prev) => {
      let newState: SortState | null;
      if (!prev || prev.key !== key) {
        newState = { key, direction: "asc" };
      } else if (prev.direction === "asc") {
        newState = { key, direction: "desc" };
      } else {
        newState = null;
      }
      
      if (typeof window !== 'undefined') {
        if (newState) {
          localStorage.setItem('admin_users_sort', JSON.stringify(newState));
        } else {
          localStorage.removeItem('admin_users_sort');
        }
      }
      
      // Reset to page 1 when sorting changes
      setCurrentPage(1);
      
      return newState;
    });
  };

  const renderSortIcon = (key: SortKey) => {
    if (!sortState || sortState.key !== key) return <ArrowUpDown className="h-3.5 w-3.5" />;
    if (sortState.direction === "asc") return <ArrowUp className="h-3.5 w-3.5" />;
    return <ArrowDown className="h-3.5 w-3.5" />;
  };

  return (
    <ClientErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          {selectedUserIds.size > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {selectedUserIds.size} selected
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkActivate}
                disabled={isBulkProcessing}
              >
                {isBulkProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Activate"
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDeactivate}
                disabled={isBulkProcessing}
              >
                Deactivate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkArchive}
                disabled={isBulkProcessing}
              >
                Archive
              </Button>
              {roles.length > 0 && (
                <Select
                  value={showBulkRoleAssign ? "assign" : ""}
                  onValueChange={(value) => {
                    if (value && value !== "assign") {
                      handleBulkAssignRole(value);
                    } else {
                      setShowBulkRoleAssign(true);
                    }
                  }}
                >
                  <SelectTrigger className="w-40 h-9">
                    <SelectValue placeholder="Assign Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isBulkProcessing}
              >
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedUserIds(new Set());
                  setIsBulkActionMode(false);
                }}
                disabled={isBulkProcessing}
              >
                Clear
              </Button>
            </div>
          )}
          <div className="flex gap-2">

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const columns = [
                  { key: 'name' as keyof User, label: 'Name' },
                  { key: 'email' as keyof User, label: 'Email' },
                  { key: 'systemRole' as keyof User, label: 'Role' },
                  { key: 'gradeLevel' as keyof User, label: 'Grade' },
                  { key: 'division' as keyof User, label: 'Division' },
                  { key: 'department' as keyof User, label: 'Department' },
                  { key: 'active' as keyof User, label: 'Status' },
                ];
                exportToCSV(mappedUsers, columns, { filename: `users-export-${new Date().toISOString().split('T')[0]}.csv` });
              }}
              aria-label="Export users to CSV"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button 
              onClick={() => {
                setSelectedUser(null);
                setEditOpen(true);
              }} 
              size="sm"
              className="bg-gradient-primary"
              aria-label="Create new user"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
            <ContextualHelp
              title="How to manage users"
              description="Search, filter, and manage users across the organization. Assign roles, grade levels, and organizational hierarchy to control access and permissions."
              steps={[
                'Search by name, email, role, or employee ID to find users quickly.',
                'Use filters to narrow down by role, grade, division, or status.',
                'Click badges to quickly filter by that value.',
                'Select multiple users for bulk actions like activate/deactivate.',
                'Edit individual users to update their assignments and permissions.',
              ]}
            />
          </div>
        </div>

        <HelpGuideCard
          title="Keep the Directory Accurate"
          description="Search by name, email, role, or employee ID to locate personnel. Review grade levels, divisions, and departments before adjusting assignments or permissions."
          links={[
            { label: "Divisions", href: "/admin/divisions" },
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Total Users', value: totalCount, icon: Users, bgClass: 'bg-primary/10', iconClass: 'text-primary' },
            { label: 'Management Level', icon: Shield, bgClass: 'bg-emerald-500/10', iconClass: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Divisions Covered', icon: Building2, bgClass: 'bg-blue-500/10', iconClass: 'text-blue-600 dark:text-blue-400' },
          ].map(({ label, value, icon: Icon, bgClass, iconClass }) => (
            <Card key={label}>
              <CardContent className={registryQueueStatCardContentClass}>
                <div className="flex items-center gap-4">
                  <div className={cn(registryQueueStatIconBoxClass, bgClass)}>
                    <Icon className={cn(registryQueueStatIconClass, iconClass)} />
                  </div>
                  <div>
                    <p className={registryQueueStatLabelClass}>{label}</p>
                    <p className={registryQueueStatValueClass}>
                      {value ?? (
                        label === 'Management Level'
                          ? mappedUsers.filter((user) => ["MDCS", "EDCS", "MSS1", "MSS2", "MSS3"].includes(user.gradeLevel)).length
                          : Array.from(new Set(mappedUsers.map((user) => user.division).filter(Boolean))).length
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-2">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('admin_users_search', event.target.value);
                }
              }}
              onFocus={() => {
                if (searchQuery.trim().length > 1 || recentSearches.length > 0) {
                  setShowSearchSuggestions(true);
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowSearchSuggestions(false), 200);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  addRecentSearch('users', searchQuery);
                  setShowSearchSuggestions(false);
                }
              }}
              className="h-8 pl-8 text-xs"
              aria-label="Search users"
              aria-autocomplete="list"
              aria-expanded={showSearchSuggestions}
            />
            {showSearchSuggestions && (searchSuggestions.length > 0 || recentSearches.length > 0) && (
              <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                {searchSuggestions.length > 0 && (
                  <div className="p-2">
                    <p className="text-xs text-muted-foreground px-2 py-1">Suggestions</p>
                    {searchSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="w-full text-left px-2 py-1.5 hover:bg-muted rounded text-sm"
                        onClick={() => {
                          setSearchQuery(suggestion);
                          addRecentSearch('users', suggestion);
                          setShowSearchSuggestions(false);
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
                {recentSearches.length > 0 && searchQuery.trim().length === 0 && (
                  <div className="p-2 border-t">
                    <div className="flex items-center justify-between px-2 py-1">
                      <p className="text-xs text-muted-foreground">Recent searches</p>
                      <button
                        type="button"
                        onClick={() => {
                          clearRecentSearches('users');
                          setShowSearchSuggestions(false);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </button>
                    </div>
                    {recentSearches.map((search, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="w-full text-left px-2 py-1.5 hover:bg-muted rounded text-sm flex items-center gap-2"
                        onClick={() => {
                          setSearchQuery(search);
                          setShowSearchSuggestions(false);
                        }}
                      >
                        <Search className="h-3 w-3 text-muted-foreground" />
                        {search}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Select
            value={getFilterValue("role")}
            onValueChange={(value) => {
              if (value === "all") {
                setFilterValue("role", "all", "");
                return;
              }
              const role = roles.find((item) => item.id === value);
              if (!role) return;
              setFilterValue("role", role.id, `Role: ${role.name}`);
            }}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={getFilterValue("division")}
            onValueChange={(value) => {
              if (value === "all") {
                setFilterValue("division", "all", "");
                return;
              }
              const division = divisions.find((item) => item.id === value);
              if (!division) return;
              setFilterValue("division", division.id, `Division: ${division.name}`);
            }}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
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

          <Select
            value={getFilterValue("department")}
            onValueChange={(value) => {
              if (value === "all") {
                setFilterValue("department", "all", "");
                return;
              }
              const department = departments.find((item) => item.id === value);
              if (!department) return;
              setFilterValue("department", department.id, `Department: ${department.name}`);
            }}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
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

          <Select
            value={getFilterValue("status")}
            onValueChange={(value) => {
              if (value === "all") {
                setFilterValue("status", "all", "");
                return;
              }
              setFilterValue("status", value, `Status: ${value === "active" ? "Active" : "Inactive"}`);
            }}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {filters.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-8 text-xs">
              Clear
            </Button>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && mappedUsers.length === 0 ? (
            <UserTableSkeleton rows={pageSize} />
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.size === mappedUsers.length && mappedUsers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUserIds(new Set(mappedUsers.map(u => u.id)));
                      } else {
                        setSelectedUserIds(new Set());
                      }
                    }}
                    aria-label="Select all users"
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </TableHead>
                <TableHead className="w-[200px]">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-left"
                    onClick={() => toggleSort("name")}
                    aria-label="Sort by name"
                  >
                    Name
                    {renderSortIcon("name")}
                  </button>
                </TableHead>
                <TableHead className="w-[120px]">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-left"
                    onClick={() => toggleSort("role")}
                    aria-label="Sort by role"
                  >
                    Role
                    {renderSortIcon("role")}
                  </button>
                </TableHead>
                <TableHead className="w-[100px]">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-left"
                    onClick={() => toggleSort("grade")}
                    aria-label="Sort by grade"
                  >
                    Grade
                    {renderSortIcon("grade")}
                  </button>
                </TableHead>
                <TableHead className="w-[150px]">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-left"
                    onClick={() => toggleSort("division")}
                    aria-label="Sort by division"
                  >
                    Division
                    {renderSortIcon("division")}
                  </button>
                </TableHead>
                <TableHead className="w-[100px]">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-left"
                    onClick={() => toggleSort("status")}
                    aria-label="Sort by status"
                  >
                    Status
                    {renderSortIcon("status")}
                  </button>
                </TableHead>
                <TableHead className="w-[80px] text-right" aria-label="Actions">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <UserTableSkeletonRows rows={pageSize} />
              ) : mappedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                mappedUsers.map((user) => {
                const grade = getGradeLabel(user.gradeLevel);
                const division = user.division
                  ? divisions.find((div) => div.id === user.division)
                  : undefined;
                const _department = user.department
                  ? departments.find((dept) => dept.id === user.department)
                  : undefined;
                const isSelected = selectedUserIds.has(user.id);
                return (
                  <TableRow key={user.id} className={`${isSelected ? "bg-muted/50" : ""} hover:bg-muted/50`}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const newSelection = new Set(selectedUserIds);
                          if (e.target.checked) {
                            newSelection.add(user.id);
                          } else {
                            newSelection.delete(user.id);
                          }
                          setSelectedUserIds(newSelection);
                        }}
                        aria-label={`Select ${user.name}`}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm truncate">{user.name}</span>
                        {user.employeeId && (
                          <span className="text-xs text-muted-foreground truncate">ID: {user.employeeId}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => {
                          const roleId = resolveRoleId(user.systemRole);
                          if (!roleId) return;
                          addFilter({ key: "role", value: roleId, display: `Role: ${user.systemRole}` });
                        }}
                      >
                        {user.systemRole || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() =>
                          addFilter({ key: "grade", value: user.gradeLevel, display: `Grade: ${user.gradeLevel}` })
                        }
                      >
                        {user.gradeLevel}
                        {grade ? ` • ${grade}` : ""}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {division ? (
                        <button
                          type="button"
                          className="flex flex-col text-left hover:text-primary min-w-0 w-full"
                          onClick={() =>
                            addFilter({ key: "division", value: division.id, display: `Division: ${division.name}` })
                          }
                        >
                          <span className="text-sm break-words">{division.name}</span>
                          {division.code && (
                            <span className="text-xs text-muted-foreground break-words">{division.code}</span>
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.active ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() =>
                          addFilter({
                            key: "status",
                            value: user.active ? "active" : "inactive",
                            display: `Status: ${user.active ? "Active" : "Inactive"}`,
                          })
                        }
                      >
                        {user.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedUser(user);
                            setEditOpen(true);
                          }}
                          aria-label={`Edit user ${user.name}`}
                          title="Edit User"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }))}
            </TableBody>
          </Table>
          )}
          
          {/* Pagination Controls */}
          {totalCount > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {startItem} to {endItem} of {totalCount} users
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={loading}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(1);
                  }}
                  disabled={loading}
                >
                  <SelectTrigger className="ml-2 w-[130px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {mappedUsers.length === 0 && !loading && (
            <div className="p-16 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-muted/50">
                  <Users className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">No users found</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {searchQuery || filters.length > 0
                      ? 'Try adjusting your search or filters to find what you\'re looking for. You can also clear filters to see all users.'
                      : 'Get started by creating your first user. Users can be assigned roles, grade levels, and organizational hierarchy.'}
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <Button
                    onClick={() => {
                      setSelectedUser(null);
                      setEditOpen(true);
                    }}
                    aria-label="Create new user"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create User
                  </Button>
                  {(searchQuery || filters.length > 0) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('');
                        setFilters([]);
                      }}
                      aria-label="Clear all filters"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <UserEditDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setSelectedUser(null);
            loadUsers();
          }
        }}
        user={selectedUser}
      />

      <AlertDialog open={showBulkDeactivateConfirm} onOpenChange={setShowBulkDeactivateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Users</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {selectedUserIds.size} selected user(s)?
              <br />
              <br />
              Deactivated users will not be able to log in until they are reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDeactivate}
              disabled={isBulkProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Deactivate"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Delete Users</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {selectedUserIds.size} selected user(s)?
              <br />
              <br />
              <strong className="text-destructive">This action cannot be undone.</strong>
              <br />
              <br />
              All data associated with these users will be permanently removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              disabled={isBulkProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Archive Confirmation */}
      <AlertDialog open={showBulkArchiveConfirm} onOpenChange={setShowBulkArchiveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Users</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive {selectedUserIds.size} selected user(s)?
              <br />
              <br />
              Archived users will be deactivated and marked as archived. They can be reactivated later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkArchive}
              disabled={isBulkProcessing}
            >
              {isBulkProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Archiving...
                </>
              ) : (
                "Archive"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </ClientErrorBoundary>
  );
};
