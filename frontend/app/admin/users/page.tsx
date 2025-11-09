"use client";

import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HelpGuideCard } from "@/components/help/HelpGuideCard";
import {
  Users,
  Search,
  Building2,
  Shield,
} from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { getDivisionById, getDepartmentById, getGradeLevelByCode } from "@/lib/npa-structure";

const UserManagementPage = () => {
  const { users } = useOrganization();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    return users.filter((user) =>
      [user.name, user.email, user.systemRole, user.employeeId]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [users, searchQuery]);

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

      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const grade = getGradeLevelByCode(user.gradeLevel);
                const division = user.division ? getDivisionById(user.division) : undefined;
                const department = user.department ? getDepartmentById(user.department) : undefined;
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
                      <Badge variant="secondary">{user.systemRole}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {user.gradeLevel}
                        {grade ? ` • ${grade.name}` : ""}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {division ? (
                        <div className="flex flex-col">
                          <span>{division.name}</span>
                          <span className="text-xs text-muted-foreground">{division.code}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {department ? (
                        <div className="flex flex-col">
                          <span>{department.name}</span>
                          <span className="text-xs text-muted-foreground">{department.code}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? "success" : "secondary"}>
                        {user.active ? "Active" : "Inactive"}
                      </Badge>
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
    </DashboardLayout>
  );
};

export default UserManagementPage;
