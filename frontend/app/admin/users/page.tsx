"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
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
} from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { UserEditDialog } from "@/components/admin/UserEditDialog";
import { UserTableSkeleton } from "@/components/admin/UserTableSkeleton";
import { getGradeLevelByCode, type User } from "@/lib/npa-structure";
import { exportToCSV } from "@/lib/admin-export";
import { toast } from "@/hooks/use-toast";
import { getRecentSearches, addRecentSearch, getSearchSuggestions, clearRecentSearches } from "@/lib/admin-search-autocomplete";

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
  const { users, divisions, departments } = useOrganization();
  const searchParams = useSearchParams();
  
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
  
  // Load recent searches
  const recentSearches = typeof window !== 'undefined' ? getRecentSearches('users') : [];
  
  // Generate search suggestions
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const suggestions = getSearchSuggestions(searchQuery, users, 5);
      setSearchSuggestions(suggestions);
      setShowSearchSuggestions(suggestions.length > 0);
    } else {
      setShowSearchSuggestions(false);
      setSearchSuggestions([]);
    }
  }, [searchQuery, users]);
  
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

  const filterPredicate = (user: User) => {
    if (filters.length === 0) return true;
    return filters.every((filter) => {
      switch (filter.key) {
        case "role":
          return user.systemRole === filter.value;
        case "grade":
          return user.gradeLevel === filter.value;
        case "directorate":
          return user.directorate === filter.value;
        case "division":
          return user.division === filter.value;
        case "department":
          return user.department === filter.value;
        case "status":
          return filter.value === (user.active ? "active" : "inactive");
        default:
          return true;
      }
    });
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return users.filter(filterPredicate);
    }
    return users
      .filter(filterPredicate)
      .filter((user) =>
      [user.name, user.email, user.systemRole, user.employeeId]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [users, searchQuery, filters]);

  const sortedUsers = useMemo(() => {
    if (!sortState) return filteredUsers;

    const accessor = (user: User): string => {
      switch (sortState.key) {
        case "name":
          return user.name ?? "";
        case "email":
          return user.email ?? "";
        case "role":
          return user.systemRole ?? "";
        case "grade":
          return user.gradeLevel ?? "";
        case "division":
          return user.division ?? "";
        case "department":
          return user.department ?? "";
        case "status":
          return user.active ? "active" : "inactive";
        default:
          return "";
      }
    };

    const collator = new Intl.Collator(undefined, { sensitivity: "base" });
    const sorted = [...filteredUsers].sort((a, b) => collator.compare(accessor(a), accessor(b)));
    if (sortState.direction === "desc") {
      sorted.reverse();
    }
    return sorted;
  }, [filteredUsers, sortState]);

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
                    const selectedUsers = sortedUsers.filter(u => selectedUserIds.has(u.id));
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
                    const selectedUsers = sortedUsers.filter(u => selectedUserIds.has(u.id));
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
                exportToCSV(sortedUsers, columns, { filename: `users-export-${new Date().toISOString().split('T')[0]}.csv` });
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
                <p className="text-2xl font-bold">{users.length}</p>
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
                    users.filter((user) =>
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
                      new Set(users.map((user) => user.division).filter(Boolean))
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

      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <UserTableSkeleton rows={5} />
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.size === sortedUsers.length && sortedUsers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUserIds(new Set(sortedUsers.map(u => u.id)));
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
              {sortedUsers.map((user) => {
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
              })}
            </TableBody>
          </Table>
          )}
          
          {sortedUsers.length === 0 && users.length > 0 && (
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
