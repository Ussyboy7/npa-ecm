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
import { useOrganization, Role } from "@/contexts/OrganizationContext";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api-client";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (existingRole) {
        setRoleName(existingRole.name);
        setDescription(existingRole.description || "");
      } else {
        setRoleName("");
        setDescription("");
      }
    } else {
      setRoleName("");
      setDescription("");
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

