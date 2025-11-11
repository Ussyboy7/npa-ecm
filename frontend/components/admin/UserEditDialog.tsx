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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/contexts/OrganizationContext";
import { GRADE_LEVELS, type User } from "@/lib/npa-structure";
import { toast } from "@/hooks/use-toast";

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

type FormState = {
  systemRole: string;
  gradeLevel: string;
  directorateId: string;
  divisionId: string;
  departmentId: string;
  email: string;
  employeeId: string;
  isActive: boolean;
};

const defaultState: FormState = {
  systemRole: "",
  gradeLevel: "",
  directorateId: "",
  divisionId: "",
  departmentId: "",
  email: "",
  employeeId: "",
  isActive: true,
};

const EMPTY_VALUE = "__none";

const GRADE_LEVEL_OPTIONS = GRADE_LEVELS.map((grade) => ({ code: grade.code, label: grade.name }));

export const UserEditDialog = ({ open, onOpenChange, user }: UserEditDialogProps) => {
  const { directorates, divisions, departments, users, updateUser } = useOrganization();
  const [formData, setFormData] = useState<FormState>(defaultState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && open) {
      setFormData({
        systemRole: user.systemRole ?? "",
        gradeLevel: user.gradeLevel ?? "",
        directorateId: user.directorate ?? "",
        divisionId: user.division ?? "",
        departmentId: user.department ?? "",
        email: user.email ?? "",
        employeeId: user.employeeId ?? "",
        isActive: user.active ?? true,
      });
    } else if (!open) {
      setFormData(defaultState);
    }
  }, [user, open]);

  const roleOptions = useMemo(() => {
    const uniqueRoles = new Set<string>();
    users.forEach((candidate) => {
      if (candidate.systemRole) {
        uniqueRoles.add(candidate.systemRole);
      }
    });
    return Array.from(uniqueRoles).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const availableDivisions = useMemo(
    () =>
      formData.directorateId
        ? divisions.filter((division) => division.directorateId === formData.directorateId)
        : [],
    [divisions, formData.directorateId]
  );

  const availableDepartments = useMemo(
    () =>
      formData.divisionId
        ? departments.filter((department) => department.divisionId === formData.divisionId)
        : [],
    [departments, formData.divisionId]
  );

  const selectedUserName = user?.name ?? "";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      await updateUser(user.id, {
        systemRole: formData.systemRole || null,
        gradeLevel: formData.gradeLevel || null,
        directorateId: formData.directorateId || null,
        divisionId: formData.divisionId || null,
        departmentId: formData.departmentId || null,
        email: formData.email || user.email,
        employeeId: formData.employeeId || null,
        isActive: formData.isActive,
      });

      toast({
        title: "User updated",
        description: `${selectedUserName || "The user"} has been updated successfully.`,
      });
      onOpenChange(false);
    } catch (error) {
      const description = error instanceof Error ? error.message : "Unable to update user";
      toast({ title: "Update failed", description, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User Access</DialogTitle>
          <DialogDescription>
            {user
              ? `Update role, grade, and organizational placement for ${user.name}.`
              : "Select a user to begin editing."}
          </DialogDescription>
        </DialogHeader>

        {user && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-md border bg-muted/30 p-3 space-y-1">
              <p className="text-sm font-semibold text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <Badge variant={user.active ? "default" : "secondary"} className="text-xs">
                {user.active ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="systemRole">System Role</Label>
              <Select
                value={formData.systemRole || "__custom"}
                onValueChange={(value) => {
                  if (value === "__custom") {
                    setFormData((prev) => ({ ...prev, systemRole: prev.systemRole }));
                  } else {
                    setFormData((prev) => ({ ...prev, systemRole: value }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom">Custom (enter below)</SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="customRole"
                placeholder="Enter custom role"
                value={formData.systemRole}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, systemRole: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gradeLevel">Grade Level</Label>
                <Select
                  value={formData.gradeLevel || ""}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, gradeLevel: value }))}
                >
                  <SelectTrigger id="gradeLevel">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_LEVEL_OPTIONS.map((grade) => (
                      <SelectItem key={grade.code} value={grade.code}>
                        {grade.code} – {grade.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="active">Status</Label>
                <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
                  <Switch
                    id="active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.isActive ? "User can sign in" : "User is disabled"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="directorate">Directorate</Label>
                <Select
                  value={formData.directorateId || EMPTY_VALUE}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      directorateId: value === EMPTY_VALUE ? "" : value,
                      divisionId: "",
                      departmentId: "",
                    }))
                  }
                >
                  <SelectTrigger id="directorate">
                    <SelectValue placeholder="Select directorate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_VALUE}>Unassigned</SelectItem>
                    {directorates
                      .filter((dir) => dir.isActive)
                      .map((dir) => (
                        <SelectItem key={dir.id} value={dir.id}>
                          {dir.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="division">Division</Label>
                <Select
                  value={formData.divisionId || EMPTY_VALUE}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      divisionId: value === EMPTY_VALUE ? "" : value,
                      departmentId: "",
                    }))
                  }
                  disabled={!formData.directorateId}
                >
                  <SelectTrigger id="division">
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_VALUE}>Unassigned</SelectItem>
                    {availableDivisions.map((division) => (
                      <SelectItem key={division.id} value={division.id}>
                        {division.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.departmentId || EMPTY_VALUE}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, departmentId: value === EMPTY_VALUE ? "" : value }))
                }
                disabled={!formData.divisionId}
              >
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_VALUE}>Unassigned</SelectItem>
                  {availableDepartments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, email: event.target.value }))
                  }
                  placeholder="user@npa.gov.ng"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  value={formData.employeeId}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, employeeId: event.target.value }))
                  }
                  placeholder="e.g. NPA123"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
