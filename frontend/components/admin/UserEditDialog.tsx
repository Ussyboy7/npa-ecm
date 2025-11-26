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
  const { directorates, divisions, departments, users, updateUser, addUser, roles } = useOrganization();
  const [formData, setFormData] = useState<FormState & { username?: string; firstName?: string; lastName?: string; password?: string }>(defaultState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user && open) {
      // Find role ID from role name (user.systemRole is the name, but form needs ID)
      // Also handle case where user.systemRole might be a UUID (shouldn't happen, but be safe)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let roleId = "";
      if (user.systemRole && !uuidPattern.test(user.systemRole)) {
        // user.systemRole is a name, find the ID
        roleId = roles.find((r) => r.name === user.systemRole)?.id ?? "";
      } else if (user.systemRole && uuidPattern.test(user.systemRole)) {
        // user.systemRole is already a UUID (shouldn't happen, but handle it)
        roleId = user.systemRole;
      }
      setFormData({
        systemRole: roleId, // Store role ID for form submission
        gradeLevel: user.gradeLevel ?? "",
        directorateId: user.directorate ?? "",
        divisionId: user.division ?? "",
        departmentId: user.department ?? "",
        email: user.email ?? "",
        employeeId: user.employeeId ?? "",
        isActive: user.active ?? true,
      });
    } else if (!user && open) {
      // Creating new user - reset to defaults
      setFormData({
        ...defaultState,
        username: '',
        firstName: '',
        lastName: '',
        password: '',
      });
    } else if (!open) {
      setFormData(defaultState);
    }
  }, [user, open, roles]);

  const roleOptions = useMemo(() => {
    return roles.map((role) => ({
      value: role.id,
      label: role.name,
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [roles]);

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

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!user) {
      // New user validation
      if (!formData.username || formData.username.trim().length < 3) {
        errors.username = 'Username must be at least 3 characters';
      }
      if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Please enter a valid email address';
      }
      if (!formData.firstName || formData.firstName.trim().length < 2) {
        errors.firstName = 'First name must be at least 2 characters';
      }
      if (!formData.lastName || formData.lastName.trim().length < 2) {
        errors.lastName = 'Last name must be at least 2 characters';
      }
      if (!formData.password || formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      }
      if (!formData.systemRole) {
        errors.systemRole = 'System role is required';
      }
      if (!formData.employeeId || formData.employeeId.trim().length === 0) {
        errors.employeeId = 'Employee ID is required';
      }
    } else {
      // Update user validation
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Please enter a valid email address';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setValidationErrors({});
    try {
      if (user) {
        // Update existing user - check for duplicate email if changed
        if (formData.email && formData.email !== user.email) {
          const duplicateEmail = users.find(u => u.id !== user.id && u.email.toLowerCase() === formData.email.toLowerCase());
          if (duplicateEmail) {
            toast({
              title: "Duplicate email",
              description: `Email ${formData.email} is already in use by ${duplicateEmail.name}.`,
              variant: "destructive",
            });
            setIsSubmitting(false);
            return;
          }
        }
        
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
      } else {
        // Create new user - check for duplicates
        if (!formData.username || !formData.email || !formData.firstName || !formData.lastName || !formData.password) {
          toast({
            title: "Error",
            description: "Username, email, first name, last name, and password are required",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        
        // Check for duplicate email
        const duplicateEmail = users.find(u => u.email.toLowerCase() === formData.email.toLowerCase());
        if (duplicateEmail) {
          toast({
            title: "Duplicate email",
            description: `Email ${formData.email} is already in use by ${duplicateEmail.name}.`,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        
        // Check for duplicate username
        const duplicateUsername = users.find(u => u.username?.toLowerCase() === formData.username?.toLowerCase());
        if (duplicateUsername) {
          toast({
            title: "Duplicate username",
            description: `Username ${formData.username} is already in use.`,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        if (!formData.systemRole || !formData.employeeId) {
          toast({
            title: "Error",
            description: "System role and employee ID are required",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        await addUser({
          username: formData.username,
          email: formData.email,
          firstName: formData.firstName!,
          lastName: formData.lastName!,
          password: formData.password!,
          systemRole: formData.systemRole,
          gradeLevel: formData.gradeLevel || null,
          directorateId: formData.directorateId || null,
          divisionId: formData.divisionId || null,
          departmentId: formData.departmentId || null,
          employeeId: formData.employeeId,
          isActive: formData.isActive,
        });

        toast({
          title: "User created",
          description: `User ${formData.username} has been created successfully.`,
        });
      }
      onOpenChange(false);
    } catch (error) {
      const description = error instanceof Error ? error.message : (user ? "Unable to update user" : "Unable to create user");
      toast({ title: user ? "Update failed" : "Creation failed", description, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? 'Edit User Access' : 'Create New User'}</DialogTitle>
          <DialogDescription>
            {user
              ? `Update role, grade, and organizational placement for ${user.name}.`
              : "Create a new user account with role, grade, and organizational placement."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {user && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-1">
              <p className="text-sm font-semibold text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <Badge variant={user.active ? "default" : "secondary"} className="text-xs">
                {user.active ? "Active" : "Inactive"}
              </Badge>
            </div>
          )}

          {!user && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username || ''}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, username: event.target.value }))
                  }
                  placeholder="username"
                  required
                  aria-label="Username"
                  aria-required="true"
                  aria-invalid={!!validationErrors.username}
                  aria-describedby={validationErrors.username ? "username-error" : undefined}
                />
                {validationErrors.username && (
                  <p id="username-error" className="text-xs text-destructive" role="alert">
                    {validationErrors.username}
                  </p>
                )}
                {!validationErrors.username && formData.username && users.some(u => u.username?.toLowerCase() === formData.username?.toLowerCase()) && (
                  <p className="text-xs text-destructive" role="alert">
                    This username is already in use
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, email: event.target.value }))
                  }
                  placeholder="user@npa.gov.ng"
                  required
                  aria-label="User email address"
                  aria-required="true"
                  aria-invalid={!!validationErrors.email}
                  aria-describedby={validationErrors.email ? "email-error" : undefined}
                />
                {validationErrors.email && (
                  <p id="email-error" className="text-xs text-destructive" role="alert">
                    {validationErrors.email}
                  </p>
                )}
                {!validationErrors.email && formData.email && !user && users.some(u => u.email.toLowerCase() === formData.email.toLowerCase()) && (
                  <p className="text-xs text-destructive" role="alert">
                    This email is already in use
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName || ''}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, firstName: event.target.value }))
                  }
                  placeholder="First name"
                  required
                  aria-invalid={!!validationErrors.firstName}
                  aria-describedby={validationErrors.firstName ? "firstName-error" : undefined}
                />
                {validationErrors.firstName && (
                  <p id="firstName-error" className="text-xs text-destructive" role="alert">
                    {validationErrors.firstName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName || ''}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, lastName: event.target.value }))
                  }
                  placeholder="Last name"
                  required
                  aria-invalid={!!validationErrors.lastName}
                  aria-describedby={validationErrors.lastName ? "lastName-error" : undefined}
                />
                {validationErrors.lastName && (
                  <p id="lastName-error" className="text-xs text-destructive" role="alert">
                    {validationErrors.lastName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password || ''}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, password: event.target.value }))
                  }
                  placeholder="Set initial password"
                  required
                  aria-invalid={!!validationErrors.password}
                  aria-describedby={validationErrors.password ? "password-error" : undefined}
                />
                {validationErrors.password && (
                  <p id="password-error" className="text-xs text-destructive" role="alert">
                    {validationErrors.password}
                  </p>
                )}
                {!validationErrors.password && formData.password && (
                  <p className="text-xs text-muted-foreground">
                    Password strength: {formData.password.length >= 12 ? 'Strong' : formData.password.length >= 8 ? 'Medium' : 'Weak'}
                  </p>
                )}
              </div>
            </div>
          )}

            <div className="space-y-2">
              <Label htmlFor="systemRole">System Role {!user && '*'}</Label>
              <Select
                value={formData.systemRole || EMPTY_VALUE}
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, systemRole: value === EMPTY_VALUE ? '' : value }));
                }}
              >
                <SelectTrigger id="systemRole" name="systemRole">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_VALUE}>Not assigned</SelectItem>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.systemRole && (
                <p id="systemRole-error" className="text-xs text-destructive" role="alert">
                  {validationErrors.systemRole}
                </p>
              )}
              {!validationErrors.systemRole && formData.systemRole && formData.systemRole !== EMPTY_VALUE && (
                <p className="text-xs text-muted-foreground">
                  Selected: {roleOptions.find((r) => r.value === formData.systemRole)?.label || 'Unknown role'}
                </p>
              )}
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

            {user ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
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
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, employeeId: event.target.value }))
                    }
                    placeholder="e.g. NPA123"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID *</Label>
                <Input
                  id="employeeId"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, employeeId: event.target.value }))
                  }
                  placeholder="e.g. NPA123"
                  required
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (user ? "Saving…" : "Creating…") : (user ? "Save changes" : "Create user")}
              </Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
};
