"use client";

import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
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
} from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { UserEditDialog } from "@/components/admin/UserEditDialog";
import { getGradeLevelByCode, type User } from "@/lib/npa-structure";

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

const UserManagementPage = () => {
  const { users, divisions, departments } = useOrganization();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [filters, setFilters] = useState<ActiveFilter[]>([]);
  const [sortState, setSortState] = useState<SortState | null>(null);

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
      if (!prev || prev.key !== key) {
        return { key, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { key, direction: "desc" };
      }
      return null;
    });
  };

  const renderSortIcon = (key: SortKey) => {
    if (!sortState || sortState.key !== key) return <ArrowUpDown className="h-3.5 w-3.5" />;
    if (sortState.direction === "asc") return <ArrowUp className="h-3.5 w-3.5" />;
    return <ArrowDown className="h-3.5 w-3.5" />;
  };

  return (
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
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users by name, email, role, or employee ID..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="pl-10"
        />
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-left"
                    onClick={() => toggleSort("name")}
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
                  >
                    Status
                    {renderSortIcon("status")}
                  </button>
                </TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
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
                return (
                  <TableRow key={user.id}>
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
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No users found for the provided search query.
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
  );
};

export default UserManagementPage;
