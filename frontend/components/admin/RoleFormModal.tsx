"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganization, Role } from "@/contexts/OrganizationContext";
import { toast } from "@/hooks/use-toast";
import { AVAILABLE_ROLE_PERMISSIONS, PERMISSION_PRESETS, getPermissionsByCategory } from "@/lib/role-permissions";
import { CheckCircle2, XCircle, Users } from "lucide-react";

interface RoleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingRole: Role | null;
  onSuccess: () => void;
}

export const RoleFormModal = ({
  open,
  onOpenChange,
  existingRole,
  onSuccess,
}: RoleFormModalProps) => {
  const { users, roles, refreshOrganizationData, addRole, updateRole } = useOrganization();
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"permissions" | "sidebar">("permissions");

  useEffect(() => {
    if (open) {
      if (existingRole) {
        setRoleName(existingRole.name);
        setDescription(existingRole.description || "");
        setPermissions(existingRole.permissions || {});
      } else {
        setRoleName("");
        setDescription("");
        setPermissions({});
      }
      setActiveTab("permissions");
      setValidationErrors({});
    } else {
      setRoleName("");
      setDescription("");
      setPermissions({});
      setValidationErrors({});
    }
  }, [open, existingRole]);

  // Memoize users with role
  const usersWithRole = useMemo(() => {
    return existingRole
      ? users.filter((u) => u.systemRole === existingRole.id)
      : [];
  }, [existingRole, users]);

  // Check for duplicate role name
  const duplicateRoleName = useMemo(() => {
    if (!roleName.trim() || !open) return null;
    const duplicate = roles.find(
      (r) => r.id !== existingRole?.id && r.name.toLowerCase() === roleName.trim().toLowerCase()
    );
    return duplicate;
  }, [roleName, existingRole, roles, open]);

  // Get permissions by category
  const permissionsByCategory = useMemo(() => {
    return getPermissionsByCategory(AVAILABLE_ROLE_PERMISSIONS.filter(p => p.category !== 'sidebar'));
  }, []);

  const sidebarPermissions = useMemo(() => {
    return getPermissionsByCategory(AVAILABLE_ROLE_PERMISSIONS.filter(p => p.category === 'sidebar'));
  }, []);

  // Count selected permissions
  const selectedPermissionsCount = useMemo(() => {
    return Object.entries(permissions).filter(([id, enabled]) => {
      const perm = AVAILABLE_ROLE_PERMISSIONS.find(p => p.id === id);
      return enabled && perm?.category !== 'sidebar';
    }).length;
  }, [permissions]);

  const selectedSidebarCount = useMemo(() => {
    return Object.entries(permissions).filter(([id, enabled]) => {
      const perm = AVAILABLE_ROLE_PERMISSIONS.find(p => p.id === id);
      return enabled && perm?.category === 'sidebar';
    }).length;
  }, [permissions]);

  const totalPermissionsCount = AVAILABLE_ROLE_PERMISSIONS.filter(p => p.category !== 'sidebar').length;
  const totalSidebarCount = AVAILABLE_ROLE_PERMISSIONS.filter(p => p.category === 'sidebar').length;

  // Select/Deselect all for a category
  const handleCategoryToggle = (category: string, selectAll: boolean) => {
    const categoryPerms = AVAILABLE_ROLE_PERMISSIONS.filter(p => p.category === category);

    setPermissions(prev => {
      const newPerms = { ...prev };
      categoryPerms.forEach(perm => {
        newPerms[perm.id] = selectAll;
      });
      return newPerms;
    });
  };

  // Select/Deselect all permissions
  const handleSelectAll = (selectAll: boolean, isSidebar: boolean = false) => {
    const permsToToggle = isSidebar
      ? AVAILABLE_ROLE_PERMISSIONS.filter(p => p.category === 'sidebar')
      : AVAILABLE_ROLE_PERMISSIONS.filter(p => p.category !== 'sidebar');

    setPermissions(prev => {
      const newPerms = { ...prev };
      permsToToggle.forEach(perm => {
        newPerms[perm.id] = selectAll;
      });
      return newPerms;
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!roleName.trim()) {
      errors.roleName = "Role name is required";
    } else if (roleName.trim().length < 2) {
      errors.roleName = "Role name must be at least 2 characters";
    } else if (roleName.trim().length > 50) {
      errors.roleName = "Role name must be less than 50 characters";
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(roleName.trim())) {
      errors.roleName = "Role name can only contain letters, numbers, spaces, hyphens, and underscores";
    }

    if (duplicateRoleName) {
      errors.roleName = `Role name "${roleName.trim()}" already exists`;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Scroll to top to show validation errors
      const form = e.currentTarget;
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (existingRole) {
        // Update existing role
        await updateRole(existingRole.id, {
          name: roleName.trim(),
          description: description.trim() || undefined,
          permissions: permissions,
        });
        toast({
          title: "Role updated",
          description: `Role "${roleName.trim()}" has been updated successfully.`,
        });
      } else {
        // Create new role
        await addRole({
          name: roleName.trim(),
          description: description.trim() || undefined,
          isActive: true,
          permissions: permissions,
        });
        toast({
          title: "Role created",
          description: `Role "${roleName.trim()}" is now available. Assign it to users in User Management.`,
        });
      }

      await refreshOrganizationData();
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      const description = error instanceof Error ? error.message : "Unable to save role";
      toast({
        title: existingRole ? "Update failed" : "Creation failed",
        description,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingRole ? "Edit Role" : "Create New Role"}
          </DialogTitle>
          <DialogDescription>
            {existingRole
              ? `Edit the role "${existingRole.name}". This role is assigned to ${usersWithRole.length} user(s).`
              : "Create a new system role. It will be available for assignment when creating or editing users."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Role Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">Role Name *</Label>
              <Input
                id="roleName"
                name="roleName"
                value={roleName}
                onChange={(e) => {
                  setRoleName(e.target.value);
                  // Clear validation error when user types
                  if (validationErrors.roleName) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.roleName;
                      return newErrors;
                    });
                  }
                }}
                placeholder="e.g., Records Officer, Executive Assistant"
                required
                autoComplete="off"
                aria-invalid={!!validationErrors.roleName || !!duplicateRoleName}
                aria-describedby={validationErrors.roleName ? "roleName-error" : duplicateRoleName ? "roleName-duplicate" : undefined}
                className={validationErrors.roleName || duplicateRoleName ? "border-destructive" : ""}
              />
              {validationErrors.roleName && (
                <p id="roleName-error" className="text-xs text-destructive" role="alert">
                  {validationErrors.roleName}
                </p>
              )}
              {!validationErrors.roleName && duplicateRoleName && (
                <p id="roleName-duplicate" className="text-xs text-destructive" role="alert">
                  Role name "{roleName.trim()}" already exists
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the role's responsibilities"
                autoComplete="off"
              />
            </div>
          </div>

          <Separator />

          {/* Permission Presets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Permission Presets</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Quickly apply common permission sets
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {PERMISSION_PRESETS.map((preset) => (
                <Button
                  key={preset.name}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => {
                    setPermissions(preset.permissions);
                  }}
                  title={preset.description}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Permissions Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "permissions" | "sidebar")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="permissions" className="flex items-center gap-2">
                Permissions
                <Badge variant="secondary" className="text-xs">
                  {selectedPermissionsCount}/{totalPermissionsCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="sidebar" className="flex items-center gap-2">
                Sidebar Visibility
                <Badge variant="secondary" className="text-xs">
                  {selectedSidebarCount}/{totalSidebarCount}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Permissions Tab */}
            <TabsContent value="permissions" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAll(true, false)}
                    className="h-8 text-xs"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAll(false, false)}
                    className="h-8 text-xs"
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Deselect All
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedPermissionsCount} of {totalPermissionsCount} permissions selected
                </div>
              </div>

              <ScrollArea className="h-[400px] border rounded-md p-4">
                <div className="space-y-6">
                  {Object.entries(permissionsByCategory).map(([category, perms]) => (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold capitalize">{category}</h4>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCategoryToggle(category, true)}
                            className="h-6 text-xs px-2"
                          >
                            All
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCategoryToggle(category, false)}
                            className="h-6 text-xs px-2"
                          >
                            None
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2 pl-2">
                        {perms.map((perm) => {
                          const isChecked = permissions[perm.id] || false;
                          return (
                            <div key={perm.id} className="flex items-start space-x-2">
                              <Checkbox
                                id={perm.id}
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  setPermissions(prev => ({
                                    ...prev,
                                    [perm.id]: checked === true,
                                  }));
                                }}
                                aria-label={`Toggle ${perm.label} permission`}
                              />
                              <div className="flex-1">
                                <label
                                  htmlFor={perm.id}
                                  className="text-sm font-medium cursor-pointer flex items-center gap-2"
                                >
                                  {perm.label}
                                  {isChecked && (
                                    <Badge variant="outline" className="text-xs h-4 px-1">
                                      Active
                                    </Badge>
                                  )}
                                </label>
                                <p className="text-xs text-muted-foreground">{perm.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Sidebar Visibility Tab */}
            <TabsContent value="sidebar" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Sidebar Visibility</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Control which sidebar sections users with this role can see. Leave unchecked to use default visibility rules.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAll(true, true)}
                    className="h-8 text-xs"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAll(false, true)}
                    className="h-8 text-xs"
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Deselect All
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[400px] border rounded-md p-4">
                <div className="space-y-4">
                  {Object.entries(sidebarPermissions).map(([category, perms]) => (
                    <div key={category} className="space-y-3">
                      {perms.map((perm) => {
                        const isChecked = permissions[perm.id] || false;
                        return (
                          <div key={perm.id} className="flex items-start space-x-2">
                            <Checkbox
                              id={perm.id}
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                setPermissions(prev => ({
                                  ...prev,
                                  [perm.id]: checked === true,
                                }));
                              }}
                              aria-label={`Toggle ${perm.label}`}
                            />
                            <div className="flex-1">
                              <label
                                htmlFor={perm.id}
                                className="text-sm font-medium cursor-pointer flex items-center gap-2"
                              >
                                {perm.label}
                                {isChecked && (
                                  <Badge variant="outline" className="text-xs h-4 px-1">
                                    Active
                                  </Badge>
                                )}
                              </label>
                              <p className="text-xs text-muted-foreground">{perm.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="text-xs text-muted-foreground">
                {selectedSidebarCount} of {totalSidebarCount} sidebar sections enabled
              </div>
            </TabsContent>
          </Tabs>

          {/* Users with Role (Edit Mode) */}
          {existingRole && usersWithRole.length > 0 && (
            <>
              <Separator />
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">
                    This role is assigned to {usersWithRole.length} user(s):
                  </p>
                </div>
                <ScrollArea className="max-h-32">
                  <div className="space-y-1">
                    {usersWithRole.map((user) => (
                      <p key={user.id} className="text-xs text-muted-foreground">
                        • {user.name} ({user.email})
                      </p>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? existingRole
                  ? "Updating…"
                  : "Creating…"
                : existingRole
                ? "Update Role"
                : "Create Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
