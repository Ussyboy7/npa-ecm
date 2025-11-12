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
  Shield,
  Search,
  Plus,
  Edit,
  Trash2,
  Users,
} from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { RoleFormModal } from "@/components/admin/RoleFormModal";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api-client";

type RoleInfo = {
  name: string;
  userCount: number;
  userIds: string[];
};

const RolesManagementPage = () => {
  const { users, refreshOrganizationData } = useOrganization();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Extract unique roles from users
  const roles = useMemo(() => {
    const roleMap = new Map<string, RoleInfo>();
    
    users.forEach((user) => {
      if (user.systemRole) {
        const roleName = user.systemRole;
        if (!roleMap.has(roleName)) {
          roleMap.set(roleName, {
            name: roleName,
            userCount: 0,
            userIds: [],
          });
        }
        const roleInfo = roleMap.get(roleName)!;
        roleInfo.userCount++;
        roleInfo.userIds.push(user.id);
      }
    });

    return Array.from(roleMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

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

  const handleEditRole = (roleName: string) => {
    setSelectedRole(roleName);
    setFormOpen(true);
  };

  const handleCloseModal = () => {
    setFormOpen(false);
    setSelectedRole(null);
  };

  const handleDeleteRole = async (roleName: string) => {
    const roleInfo = roles.find((r) => r.name === roleName);
    if (!roleInfo) return;

    if (roleInfo.userCount > 0) {
      const confirmed = window.confirm(
        `This role is assigned to ${roleInfo.userCount} user(s). ` +
        `Deleting it will remove the role from all these users. Continue?`
      );
      if (!confirmed) return;
    }

    setIsDeleting(roleName);
    try {
      // Update all users with this role to remove it
      const updatePromises = roleInfo.userIds.map((userId) =>
        apiFetch(`/accounts/users/${userId}/`, {
          method: "PATCH",
          body: JSON.stringify({ system_role: null }),
        })
      );

      await Promise.all(updatePromises);
      
      toast({
        title: "Role deleted",
        description: `Role "${roleName}" has been removed from all users.`,
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
          <Button onClick={handleCreateRole} className="bg-gradient-primary">
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
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredRoles.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? "No roles match your search." : "No roles found. Create your first role to get started."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles.map((role) => (
                    <TableRow key={role.name}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          <span className="font-medium">{role.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1">
                          <Users className="h-3 w-3" />
                          {role.userCount} {role.userCount === 1 ? "user" : "users"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRole(role.name)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRole(role.name)}
                            disabled={isDeleting === role.name}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
  );
};

export default RolesManagementPage;

