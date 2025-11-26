"use client";

import { useEffect, useState } from "react";
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
import { useOrganization, Role } from "@/contexts/OrganizationContext";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api-client";
import { AVAILABLE_ROLE_PERMISSIONS, PERMISSION_PRESETS, getPermissionsByCategory } from "@/lib/role-permissions";

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
  const { users, refreshOrganizationData, addRole, updateRole } = useOrganization();
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    } else {
      setRoleName("");
      setDescription("");
      setPermissions({});
    }
  }, [open, existingRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roleName.trim()) {
      toast({
        title: "Error",
        description: "Role name is required",
        variant: "destructive",
      });
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
      onSuccess();
    } catch (error) {
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

  const usersWithRole = existingRole
    ? users.filter((u) => u.systemRole === existingRole.id)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roleName">Role Name *</Label>
            <Input
              id="roleName"
              name="roleName"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="e.g., Records Officer, Executive Assistant"
              required
              autoComplete="off"
            />
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Permissions</Label>
              <div className="flex gap-1 flex-wrap">
                {PERMISSION_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
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
            <ScrollArea className="h-[400px] border rounded-md p-4">
              <div className="space-y-6">
                {Object.entries(getPermissionsByCategory(AVAILABLE_ROLE_PERMISSIONS)).map(([category, perms]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-sm font-semibold capitalize">{category}</h4>
                    <div className="space-y-2 pl-2">
                      {perms.map((perm) => (
                        <div key={perm.id} className="flex items-start space-x-2">
                          <Checkbox
                            id={perm.id}
                            checked={permissions[perm.id] || false}
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
                              className="text-sm font-medium cursor-pointer"
                            >
                              {perm.label}
                            </label>
                            <p className="text-xs text-muted-foreground">{perm.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="text-xs text-muted-foreground">
              {Object.values(permissions).filter(Boolean).length} of {AVAILABLE_ROLE_PERMISSIONS.length} permissions selected
            </div>
          </div>

          {existingRole && usersWithRole.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-sm font-semibold mb-2">
                This role is assigned to {usersWithRole.length} user(s):
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {usersWithRole.slice(0, 5).map((user) => (
                  <p key={user.id} className="text-xs text-muted-foreground">
                    • {user.name} ({user.email})
                  </p>
                ))}
                {usersWithRole.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    ... and {usersWithRole.length - 5} more
                  </p>
                )}
              </div>
            </div>
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

