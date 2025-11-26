"use client";

import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HelpGuideCard } from "@/components/help/HelpGuideCard";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Search,
  Plus,
  Edit,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useOrganization, Role } from "@/contexts/OrganizationContext";
import { RoleFormModal } from "@/components/admin/RoleFormModal";
import { RoleTableSkeleton } from "@/components/admin/RoleTableSkeleton";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api-client";

const RolesManagementPage = () => {
  const { roles, users, refreshOrganizationData, deleteRole } = useOrganization();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) {
      return roles;
    }
    const query = searchQuery.toLowerCase();
    return roles.filter((role) => role.name.toLowerCase().includes(query));
  }, [roles, searchQuery]);

  const handleCreateRole = () => {
    setSelectedRole(null);
    setFormOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setFormOpen(true);
  };

  const handleCloseModal = () => {
    setFormOpen(false);
    setSelectedRole(null);
  };

  const handleDeleteRole = async (role: Role) => {
    // Use user_count from API (role.userCount)
    const userCount = role.userCount ?? 0;

    if (userCount > 0) {
      const confirmed = window.confirm(
        `⚠️ Warning: This role is assigned to ${userCount} user(s).\n\n` +
        `Deleting "${role.name}" will:\n` +
        `• Remove the role from all ${userCount} user(s)\n` +
        `• These users will lose all permissions associated with this role\n` +
        `• This action cannot be undone\n\n` +
        `Are you sure you want to continue?`
      );
      if (!confirmed) return;
    } else {
      const confirmed = window.confirm(
        `Are you sure you want to delete the role "${role.name}"?\n\n` +
        `This action cannot be undone.`
      );
      if (!confirmed) return;
    }

    setIsDeleting(role.id);
    try {
      // Find users with this role by matching role name
      const usersWithRole = users.filter((u) => u.systemRole === role.name);
      if (usersWithRole.length > 0) {
        const updatePromises = usersWithRole.map((user) =>
          apiFetch(`/accounts/users/${user.id}/`, {
            method: "PATCH",
            body: JSON.stringify({ system_role: null }),
          })
        );
        await Promise.all(updatePromises);
      }

      // Then delete the role
      await deleteRole(role.id);
      
      toast({
        title: "Role deleted",
        description: `Role "${role.name}" has been removed from all users and deleted.`,
      });

      await refreshOrganizationData();
    } catch (error) {
      const description = error instanceof Error ? error.message : "Unable to delete role";
      toast({
        title: "Delete failed",
        description,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <ClientErrorBoundary>
      <DashboardLayout>
        <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              Roles Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage system roles and their assignments across the organization.
            </p>
          </div>
          <Button 
            onClick={handleCreateRole} 
            className="bg-gradient-primary"
            aria-label="Create new role"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </div>

        <HelpGuideCard
          title="Managing System Roles"
          description="Roles define user permissions and access levels. Create roles to standardize access across your organization. Once created, assign roles to users in User Management. You can rename or delete existing roles here."
          links={[
            { label: "User Management", href: "/admin/users" },
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>System Roles</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                  aria-label="Search roles"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {roles.length === 0 ? (
              <RoleTableSkeleton rows={5} />
            ) : filteredRoles.length === 0 ? (
              <div className="text-center py-16">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-muted/50">
                    <Shield className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">No roles found</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {searchQuery
                        ? 'Try adjusting your search to find what you\'re looking for. You can also clear the search to see all roles.'
                        : 'Get started by creating your first role. Roles define user permissions and access levels across the organization.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <Button
                      onClick={handleCreateRole}
                      aria-label="Create new role"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Role
                    </Button>
                    {searchQuery && (
                      <Button
                        variant="outline"
                        onClick={() => setSearchQuery('')}
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear Search
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles.map((role) => {
                    // Use user_count from API, which is stored as role.userCount
                    const userCount = role.userCount ?? 0;
                    return (
                      <TableRow key={role.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            <span className="font-medium">{role.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {role.description || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {role.permissions && Object.keys(role.permissions).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {Object.values(role.permissions).filter(Boolean).length} permissions
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">0 permissions</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1">
                            <Users className="h-3 w-3" />
                            {userCount} {userCount === 1 ? "user" : "users"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRole(role)}
                              className="h-8 w-8 p-0"
                              aria-label={`Edit role ${role.name}`}
                            >
                              <Edit className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRole(role)}
                              disabled={isDeleting === role.id}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              aria-label={`Delete role ${role.name}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <RoleFormModal
          open={formOpen}
          onOpenChange={handleCloseModal}
          existingRole={selectedRole}
          onSuccess={async () => {
            await refreshOrganizationData();
            handleCloseModal();
          }}
        />
      </div>
      </DashboardLayout>
    </ClientErrorBoundary>
  );
};

export default RolesManagementPage;

