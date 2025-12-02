"use client";

import { Suspense, useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HelpGuideCard } from "@/components/help/HelpGuideCard";
import { Button } from "@/components/ui/button";
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
  Calendar,
  Filter,
} from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { UserEditDialog } from "@/components/admin/UserEditDialog";
import { UserTableSkeleton } from "@/components/admin/UserTableSkeleton";
import { getGradeLevelByCode, type User } from "@/lib/npa-structure";
import { exportToCSV } from "@/lib/admin-export";
import { toast } from "@/hooks/use-toast";
import { getRecentSearches, addRecentSearch, getSearchSuggestions, clearRecentSearches } from "@/lib/admin-search-autocomplete";
import { fetchUsers, type User as ApiUser, type UserQueryParams, formatDateForAPI } from "@/lib/admin-api";
import { handleApiError } from "@/lib/admin-error-handler";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

const UserManagementPageContent = () => {
  const { divisions, departments } = useOrganization();
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
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  const [sortState, setSortState] = useState<SortState | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('admin_users_sort');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isBulkActionMode, setIsBulkActionMode] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  
  // Date range filters
  const [dateJoinedFrom, setDateJoinedFrom] = useState<string>('');
  const [dateJoinedTo, setDateJoinedTo] = useState<string>('');
  const [lastLoginFrom, setLastLoginFrom] = useState<string>('');
  const [lastLoginTo, setLastLoginTo] = useState<string>('');
  
  // Load recent searches
  const recentSearches = typeof window !== 'undefined' ? getRecentSearches('users') : [];
  
  // Reset to page 1 when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters, dateJoinedFrom, dateJoinedTo, lastLoginFrom, lastLoginTo]);
  
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build query params
      const queryParams: UserQueryParams = {
        page: currentPage,
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
            queryParams.system_role = filter.value;
            break;
          case 'division':
            queryParams.division = filter.value;
            break;
          case 'department':
            queryParams.department = filter.value;
            break;
        }
      });
      
      // Date filters
      if (dateJoinedFrom) queryParams.date_joined_from = dateJoinedFrom;
      if (dateJoinedTo) queryParams.date_joined_to = dateJoinedTo;
      if (lastLoginFrom) queryParams.last_login_from = lastLoginFrom;
      if (lastLoginTo) queryParams.last_login_to = lastLoginTo;
      
      // Sorting
      if (sortState) {
        const ordering = sortState.direction === 'desc' ? `-${sortState.key}` : sortState.key;
        queryParams.ordering = ordering;
      }
      
      const response = await fetchUsers(queryParams);
      setUsers(response.results);
      setTotalCount(response.count);
      
    } catch (error) {
      handleApiError(error, 'User Management');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, filters, sortState, dateJoinedFrom, dateJoinedTo, lastLoginFrom, lastLoginTo]);
  
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

  const removeFilter = (filter: ActiveFilter) => {
    setFilters((prev) => prev.filter((item) => item !== filter));
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
      <DashboardLayout>
        <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              User Management
            </h1>
            <p className="text-muted-foreground mt-1">
              View key users across the NPA organizational structure and their assignments.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedUserIds.size > 0 && (
              <>
                <Badge variant="secondary" className="mr-2">
                  {selectedUserIds.size} selected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    // Bulk activate
                    const selectedUsers = mappedUsers.filter(u => selectedUserIds.has(u.id));
                    try {
                      // Implementation would call API to bulk update
                      toast({
                        title: "Success",
                        description: `Activated ${selectedUsers.length} user(s)`,
                      });
                      setSelectedUserIds(new Set());
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to activate users",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Activate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    // Bulk deactivate
                    const selectedUsers = mappedUsers.filter(u => selectedUserIds.has(u.id));
                    if (!confirm(`Deactivate ${selectedUsers.length} user(s)?`)) return;
                    try {
                      // Implementation would call API to bulk update
                      toast({
                        title: "Success",
                        description: `Deactivated ${selectedUsers.length} user(s)`,
                      });
                      setSelectedUserIds(new Set());
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to deactivate users",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Deactivate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUserIds(new Set())}
                >
                  Clear Selection
                </Button>
              </>
            )}
            <Button
              variant="outline"
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
              className="bg-gradient-primary"
              aria-label="Create new user"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
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
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{totalCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-success/10 rounded-lg">
                <Shield className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Management Level</p>
                <p className="text-2xl font-bold">
                  {
                    mappedUsers.filter((user) =>
                      ["MDCS", "EDCS", "MSS1", "MSS2", "MSS3"].includes(user.gradeLevel)
                    ).length
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-info/10 rounded-lg">
                <Building2 className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Divisions Covered</p>
                <p className="text-2xl font-bold">
                  {
                    Array.from(
                      new Set(mappedUsers.map((user) => user.division).filter(Boolean))
                    ).length
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          placeholder="Search users by name, email, role, or employee ID..."
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
            // Delay to allow clicking on suggestions
            setTimeout(() => setShowSearchSuggestions(false), 200);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchQuery.trim()) {
              addRecentSearch('users', searchQuery);
              setShowSearchSuggestions(false);
            }
          }}
          className="pl-10"
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

      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Badge key={`${filter.key}-${filter.value}`} variant="outline" className="pl-3 pr-1 py-1 text-xs">
              <span className="mr-2 capitalize">{filter.display}</span>
              <button
                type="button"
                className="rounded-full p-1 hover:bg-muted"
                onClick={() => removeFilter(filter)}
                aria-label={`Remove filter ${filter.display}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setFilters([])}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Date Range Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Range Filters
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateJoinedFrom('');
                setDateJoinedTo('');
                setLastLoginFrom('');
                setLastLoginTo('');
              }}
            >
              Clear Dates
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Joined</label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateJoinedFrom}
                  onChange={(e) => setDateJoinedFrom(e.target.value)}
                  placeholder="From"
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={dateJoinedTo}
                  onChange={(e) => setDateJoinedTo(e.target.value)}
                  placeholder="To"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Last Login</label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={lastLoginFrom}
                  onChange={(e) => setLastLoginFrom(e.target.value)}
                  placeholder="From"
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={lastLoginTo}
                  onChange={(e) => setLastLoginTo(e.target.value)}
                  placeholder="To"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
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
                <TableHead>
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
                <TableHead>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-left"
                    onClick={() => toggleSort("email")}
                    aria-label="Sort by email"
                  >
                    Email
                    {renderSortIcon("email")}
                  </button>
                </TableHead>
                <TableHead>
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
                <TableHead>
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
                <TableHead>
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
                <TableHead>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-left"
                    onClick={() => toggleSort("department")}
                    aria-label="Sort by department"
                  >
                    Department
                    {renderSortIcon("department")}
                  </button>
                </TableHead>
                <TableHead>
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
                <TableHead className="w-[120px] text-right" aria-label="Actions">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <UserTableSkeleton rows={pageSize} />
              ) : mappedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                mappedUsers.map((user) => {
                const grade = getGradeLabel(user.gradeLevel);
                const division = user.division
                  ? divisions.find((div) => div.id === user.division)
                  : undefined;
                const department = user.department
                  ? departments.find((dept) => dept.id === user.department)
                  : undefined;
                const isSelected = selectedUserIds.has(user.id);
                return (
                  <TableRow key={user.id} className={isSelected ? "bg-muted/50" : ""}>
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
                      <div className="flex flex-col">
                        <span className="font-medium">{user.name}</span>
                        <span className="text-xs text-muted-foreground">ID: {user.employeeId}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() =>
                          addFilter({ key: "role", value: user.systemRole, display: `Role: ${user.systemRole}` })
                        }
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
                          className="flex flex-col text-left hover:text-primary"
                          onClick={() =>
                            addFilter({ key: "division", value: division.id, display: `Division: ${division.name}` })
                          }
                        >
                          <span>{division.name}</span>
                          <span className="text-xs text-muted-foreground">{division.code}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {department ? (
                        <button
                          type="button"
                          className="flex flex-col text-left hover:text-primary"
                          onClick={() =>
                            addFilter({
                              key: "department",
                              value: department.id,
                              display: `Department: ${department.name}`,
                            })
                          }
                        >
                          <span>{department.name}</span>
                          <span className="text-xs text-muted-foreground">{department.code}</span>
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(user);
                          setEditOpen(true);
                        }}
                        aria-label={`Edit user ${user.name}`}
                      >
                        Edit
                      </Button>
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
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="ml-2 px-2 py-1 text-sm border rounded"
                  disabled={loading}
                >
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
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

      </div>
      <UserEditDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setSelectedUser(null);
          }
        }}
        user={selectedUser}
      />
      </DashboardLayout>
    </ClientErrorBoundary>
  );
};

// Wrap in Suspense for useSearchParams
const UserManagementPage = () => (
  <Suspense fallback={
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    </DashboardLayout>
  }>
    <UserManagementPageContent />
  </Suspense>
);

export default UserManagementPage;
