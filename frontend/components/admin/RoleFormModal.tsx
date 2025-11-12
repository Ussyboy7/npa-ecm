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
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api-client";

interface RoleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingRole: string | null;
  onSuccess: () => void;
}

export const RoleFormModal = ({
  open,
  onOpenChange,
  existingRole,
  onSuccess,
}: RoleFormModalProps) => {
  const { users, refreshOrganizationData } = useOrganization();
  const [roleName, setRoleName] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (existingRole) {
        setRoleName(existingRole);
        setNewRoleName(existingRole);
      } else {
        setRoleName("");
        setNewRoleName("");
      }
    } else {
      setRoleName("");
      setNewRoleName("");
    }
  }, [open, existingRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newRoleName.trim()) {
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
        // Rename role: update all users with the old role to have the new role
        const usersWithRole = users.filter((u) => u.systemRole === existingRole);
        
        if (usersWithRole.length === 0) {
          toast({
            title: "No users found",
            description: `No users have the role "${existingRole}" to update.`,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        const updatePromises = usersWithRole.map((user) =>
          apiFetch(`/accounts/users/${user.id}/`, {
            method: "PATCH",
            body: JSON.stringify({ system_role: newRoleName.trim() }),
          })
        );

        await Promise.all(updatePromises);

        toast({
          title: "Role updated",
          description: `Role "${existingRole}" has been renamed to "${newRoleName.trim()}" for ${usersWithRole.length} user(s).`,
        });
      } else {
        // Creating a new role - role is now available for assignment
        // The role will be created when assigned to a user
        toast({
          title: "Role created",
          description: `Role "${newRoleName.trim()}" is now available. Assign it to users in User Management.`,
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
    ? users.filter((u) => u.systemRole === existingRole)
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
              ? `Rename the role "${existingRole}". This will update all ${usersWithRole.length} user(s) assigned to this role.`
              : "Create a new system role. It will be available for assignment when creating or editing users."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roleName">
              {existingRole ? "New Role Name" : "Role Name"} *
            </Label>
            <Input
              id="roleName"
              name="roleName"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="e.g., Records Officer, Executive Assistant"
              required
              autoComplete="off"
            />
            {existingRole && (
              <p className="text-xs text-muted-foreground">
                Current name: <span className="font-medium">{existingRole}</span>
              </p>
            )}
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

