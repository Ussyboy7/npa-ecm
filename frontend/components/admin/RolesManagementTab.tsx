"use client";

import { useMemo, useState, forwardRef, useImperativeHandle } from "react";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContextualHelp } from "@/components/help/ContextualHelp";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Users,
  X,
  Loader2,
} from "lucide-react";
import { useOrganization, Role } from "@/contexts/OrganizationContext";
import { useOrgUsers } from "@/hooks/use-org-users";
import { RoleFormModal } from "@/components/admin/RoleFormModal";
import { RoleTableSkeleton } from "@/components/admin/RoleTableSkeleton";
import { toast } from "@/components/ui/sonner";
import { apiFetch } from "@/lib/api-client";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type RolesManagementTabHandle = {
  openCreateRole: () => void;
};

export const RolesManagementTab = forwardRef<
  RolesManagementTabHandle,
  {
    searchQuery?: string;
    onSearchQueryChange?: (value: string) => void;
    hideInlineSearch?: boolean;
    hideHeaderActions?: boolean;
    hideCardHeader?: boolean;
  }
>(function RolesManagementTab(
  {
    searchQuery: controlledSearchQuery,
    onSearchQueryChange,
    hideInlineSearch = false,
    hideHeaderActions = false,
    hideCardHeader = false,
  },
  ref,
) {
  const { roles, refreshOrganizationData, deleteRole } = useOrganization();
  const { users } = useOrgUsers();
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const searchQuery = controlledSearchQuery ?? internalSearchQuery;
  const setSearchQuery = (value: string) => {
    onSearchQueryChange?.(value);
    if (controlledSearchQuery === undefined) {
      setInternalSearchQuery(value);
    }
  };
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

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

  useImperativeHandle(ref, () => ({
    openCreateRole: handleCreateRole,
  }), []);

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setFormOpen(true);
  };

  const handleCloseModal = () => {
    setFormOpen(false);
    setSelectedRole(null);
  };

  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;

    const role = roleToDelete;
    setIsDeleting(role.id);
    setShowDeleteConfirm(false);
    
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
    } catch (error: unknown) {
      const description = error instanceof Error ? error.message : "Unable to delete role";
      toast({
        title: "Delete failed",
        description,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
      setRoleToDelete(null);
    }
  };

  return (
    <ClientErrorBoundary>
      <div className="space-y-6">
        {!hideHeaderActions ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              onClick={handleCreateRole}
              size="compact"
              aria-label="Create new role"
            >
              <Plus className="h-4 w-4" />
              Create Role
            </Button>
            <ContextualHelp
              title="How to manage roles"
              description="Define reusable permission sets for groups of users."
              steps={[
                'Create a role with a clear name and purpose.',
                'Select permissions that match the role scope.',
                'Assign roles to users from User Management.',
              ]}
            />
        </div>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-border/60">
            {roles.length === 0 ? (
              <div className="p-4"><RoleTableSkeleton rows={5} /></div>
            ) : filteredRoles.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="flex flex-col items-center gap-3">
                  <Shield className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                  <div className="space-y-1">
                    <h3 className="text-base font-medium">No roles found</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {searchQuery
                        ? 'Try adjusting your search, or clear it to see all roles.'
                        : 'Create a role to define permissions for groups of users.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="compact" onClick={handleCreateRole} aria-label="Create new role">
                      <Plus className="h-4 w-4" />
                      Create Role
                    </Button>
                    {searchQuery ? (
                      <Button variant="outline" size="compact" onClick={() => setSearchQuery('')} aria-label="Clear search">
                        <X className="h-4 w-4" />
                        Clear
                      </Button>
                    ) : null}
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
                    const userCount = role.userCount ?? 0;
                    return (
                      <TableRow key={role.id} className="hover:bg-muted/50">
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex flex-wrap gap-1">
                                  <Badge variant="secondary" className="text-xs cursor-help">
                                    {Object.values(role.permissions).filter(Boolean).length} permissions
                                  </Badge>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-semibold text-xs">Permissions:</p>
                                  <ul className="text-xs space-y-0.5">
                                    {Object.entries(role.permissions)
                                      .filter(([, enabled]) => enabled)
                                      .map(([perm]) => (
                                        <li key={perm}>• {perm.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</li>
                                      ))}
                                  </ul>
                                </div>
                              </TooltipContent>
                            </Tooltip>
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
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleEditRole(role)}
                              aria-label={`Edit role ${role.name}`}
                            >
                              <Edit className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(role);
                              }}
                              disabled={isDeleting === role.id}
                              className="text-destructive hover:text-destructive"
                              aria-label={`Delete role ${role.name}`}
                            >
                              {isDeleting === role.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              ) : (
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
        </div>

        <RoleFormModal
          open={formOpen}
          onOpenChange={handleCloseModal}
          existingRole={selectedRole}
          onSuccess={async () => {
            await refreshOrganizationData();
            handleCloseModal();
          }}
        />

        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {roleToDelete && (roleToDelete.userCount ?? 0) > 0
                  ? "Warning: Role is assigned to users"
                  : "Delete Role"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {roleToDelete && (roleToDelete.userCount ?? 0) > 0 ? (
                  <div className="space-y-2">
                    <p>
                      This role is assigned to <strong>{roleToDelete.userCount}</strong> user(s).
                    </p>
                    <p>Deleting <strong>"{roleToDelete.name}"</strong> will:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Remove the role from all {roleToDelete.userCount} user(s)</li>
                      <li>These users will lose all permissions associated with this role</li>
                      <li>This action cannot be undone</li>
                    </ul>
                    <p className="pt-2">Are you sure you want to continue?</p>
                  </div>
                ) : (
                  <>
                    Are you sure you want to delete the role <strong>"{roleToDelete?.name}"</strong>?
                    <br />
                    <br />
                    This action cannot be undone.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Role
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ClientErrorBoundary>
  );
});

