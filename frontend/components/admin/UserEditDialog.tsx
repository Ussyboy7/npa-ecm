"use client";
import { SYSTEM_ROLE_SUPER_ADMIN } from '@/lib/constants';

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
import { Separator } from "@/components/ui/separator";
import { useOrganization } from "@/contexts/OrganizationContext";
import { GRADE_LEVELS, type User } from "@/lib/npa-structure";
import { toast } from "@/components/ui/sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Plus, Trash2 } from "lucide-react";

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
  password?: string;
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
  password: "",
};

const EMPTY_VALUE = "__none";

const GRADE_LEVEL_OPTIONS = GRADE_LEVELS.map((grade) => ({ code: grade.code, label: grade.name }));

export const UserEditDialog = ({ open, onOpenChange, user }: UserEditDialogProps) => {
  const {
    directorates,
    divisions,
    departments,
    users,
    updateUser,
    addUser,
    roles,
    offices,
    officeMemberships,
    addOfficeMembership,
    updateOfficeMembership,
    deleteOfficeMembership,
  } = useOrganization();
  const { currentUser } = useCurrentUser();
  const [formData, setFormData] = useState<FormState & { username?: string; firstName?: string; lastName?: string }>(defaultState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isManagingOffices, setIsManagingOffices] = useState(false);
  const [newMembership, setNewMembership] = useState<{
    officeId: string;
    assignmentRole: string;
    isPrimary: boolean;
    isActive: boolean;
    canRegister: boolean;
    canRoute: boolean;
    canApprove: boolean;
  }>({
    officeId: "",
    assignmentRole: "principal",
    isPrimary: true,
    isActive: true,
    canRegister: true,
    canRoute: true,
    canApprove: true,
  });

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
      const nameParts = (user.name || "").trim().split(/\s+/);
      setFormData({
        username: user.username ?? "",
        firstName: nameParts[0] ?? "",
        lastName: nameParts.slice(1).join(" ") ?? "",
        systemRole: roleId, // Store role ID for form submission
        gradeLevel: user.gradeLevel ?? "",
        directorateId: user.directorate ?? "",
        divisionId: user.division ?? "",
        departmentId: user.department ?? "",
        email: user.email ?? "",
        employeeId: user.employeeId ?? "",
        isActive: user.active ?? true,
        password: "",
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

  const isSuperAdmin = Boolean(currentUser?.isSuperuser || currentUser?.systemRole === SYSTEM_ROLE_SUPER_ADMIN);

  const userMemberships = useMemo(() => {
    if (!user) return [];
    return officeMemberships.filter((m) => String(m.userId) === String(user.id));
  }, [officeMemberships, user]);

  const officeOptions = useMemo(() => {
    return offices
      .filter((o) => o.isActive)
      .map((o) => ({ value: o.id, label: `${o.name} (${o.code})` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [offices]);

  // Real-time duplicate checks — don't flag the user's own unchanged email
  const emailDuplicate = useMemo(() => {
    if (!formData.email || !user) return null;
    if (formData.email.toLowerCase() === (user.email || '').toLowerCase()) return null;
    const duplicate = users.find(u => u.id !== user.id && u.email.toLowerCase() === formData.email.toLowerCase());
    return duplicate;
  }, [formData.email, user, users]);

  const usernameDuplicate = useMemo(() => {
    if (!formData.username) return null;
    const currentUsername = user?.username?.toLowerCase() ?? "";
    if (user && formData.username.toLowerCase() === currentUsername) return null;
    const duplicate = users.find(u => u.id !== user?.id && u.username?.toLowerCase() === formData.username?.toLowerCase());
    return duplicate;
  }, [formData.username, user, users]);

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
      if (formData.username && formData.username.trim().length > 0 && formData.username.trim().length < 3) {
        errors.username = 'Username must be at least 3 characters';
      }
      if (formData.firstName && formData.firstName.trim().length > 0 && formData.firstName.trim().length < 2) {
        errors.firstName = 'First name must be at least 2 characters';
      }
      if (formData.lastName && formData.lastName.trim().length > 0 && formData.lastName.trim().length < 2) {
        errors.lastName = 'Last name must be at least 2 characters';
      }
      if (formData.password && formData.password.length > 0 && formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
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
        if (formData.email && formData.email.toLowerCase() !== (user.email || '').toLowerCase()) {
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
        if (formData.username && formData.username.toLowerCase() !== (user.username || '').toLowerCase()) {
          const duplicateUsername = users.find(u => u.id !== user.id && u.username?.toLowerCase() === formData.username?.toLowerCase());
          if (duplicateUsername) {
            toast({
              title: "Duplicate username",
              description: `Username ${formData.username} is already in use by ${duplicateUsername.name}.`,
              variant: "destructive",
            });
            setIsSubmitting(false);
            return;
          }
        }
        
        await updateUser(user.id, {
          username: formData.username?.trim() || undefined,
          firstName: formData.firstName?.trim() || undefined,
          lastName: formData.lastName?.trim() || undefined,
          systemRole: formData.systemRole || null,
          gradeLevel: formData.gradeLevel || null,
          directorateId: formData.directorateId || null,
          divisionId: formData.divisionId || null,
          departmentId: formData.departmentId || null,
          email: formData.email || user.email,
          employeeId: formData.employeeId || null,
          isActive: formData.isActive,
          password: formData.password && formData.password.length > 0 ? formData.password : undefined,
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
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      const body = err.body as Record<string, unknown> | undefined;
      let description = err instanceof Error ? err.message : (user ? "Unable to update user" : "Unable to create user");
      if (body && typeof body === 'object' && Object.keys(body).length > 0) {
        const fieldErrors = Object.entries(body).map(([k, v]) => `${k}: ${Array.isArray(v) ? (v as string[]).join(', ') : String(v)}`).join('; ');
        if (fieldErrors) description = fieldErrors;
      } else if (typeof err.apiMessage === 'string' && err.apiMessage) {
        description = err.apiMessage as string;
      }
      toast({ title: user ? "Update failed" : "Creation failed", description, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" height="fill">
        <DialogHeader className="shrink-0">
          <DialogTitle>{user ? 'Edit User Access' : 'Create New User'}</DialogTitle>
          <DialogDescription>
            {user
              ? `Update role, grade, and organizational placement for ${user.name}.`
              : "Create a new user account with role, grade, and organizational placement."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto space-y-6 pr-2 -mr-2">
          {/* User Info Display (Edit Mode) */}
          {user && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-1">
              <p className="text-sm font-semibold text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <Badge variant={user.active ? "default" : "secondary"} className="text-xs">
                {user.active ? "Active" : "Inactive"}
              </Badge>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-3">Basic Information</h3>
              <div className="space-y-4">
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
                        aria-invalid={!!validationErrors.username || !!usernameDuplicate}
                        aria-describedby={validationErrors.username ? "username-error" : usernameDuplicate ? "username-duplicate" : undefined}
                      />
                      {validationErrors.username && (
                        <p id="username-error" className="text-xs text-destructive" role="alert">
                          {validationErrors.username}
                        </p>
                      )}
                      {!validationErrors.username && usernameDuplicate && (
                        <p id="username-duplicate" className="text-xs text-destructive" role="alert">
                          This username is already in use
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

                {user && (
                  <div className="grid gap-4 md:grid-cols-3">
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
                        aria-invalid={!!validationErrors.username || !!usernameDuplicate}
                        aria-describedby={validationErrors.username ? "username-error" : usernameDuplicate ? "username-duplicate" : undefined}
                      />
                      {validationErrors.username && (
                        <p id="username-error" className="text-xs text-destructive" role="alert">
                          {validationErrors.username}
                        </p>
                      )}
                      {!validationErrors.username && usernameDuplicate && (
                        <p id="username-duplicate" className="text-xs text-destructive" role="alert">
                          This username is already in use
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
                  </div>
                )}

                {user && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Reset Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password || ''}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, password: event.target.value }))
                      }
                      placeholder="Leave blank to keep current password"
                      aria-invalid={!!validationErrors.password}
                      aria-describedby={validationErrors.password ? "password-error" : undefined}
                    />
                    {validationErrors.password && (
                      <p id="password-error" className="text-xs text-destructive" role="alert">
                        {validationErrors.password}
                      </p>
                    )}
                  </div>
                )}

                {/* Email - Always visible, unified placement */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email {!user && '*'}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, email: event.target.value }))
                    }
                    placeholder="user@npa.gov.ng"
                    required={!user}
                    aria-label="User email address"
                    aria-required={!user}
                    aria-invalid={!!validationErrors.email || !!emailDuplicate}
                    aria-describedby={validationErrors.email ? "email-error" : emailDuplicate ? "email-duplicate" : undefined}
                  />
                  {validationErrors.email && (
                    <p id="email-error" className="text-xs text-destructive" role="alert">
                      {validationErrors.email}
                    </p>
                  )}
                  {!validationErrors.email && emailDuplicate && (
                    <p id="email-duplicate" className="text-xs text-destructive" role="alert">
                      This email is already in use by {emailDuplicate.name}
                    </p>
                  )}
                </div>

                {/* Employee ID - Always visible, unified placement */}
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee ID {!user && '*'}</Label>
                  <Input
                    id="employeeId"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, employeeId: event.target.value }))
                    }
                    placeholder="e.g. NPA123"
                    required={!user}
                    aria-invalid={!!validationErrors.employeeId}
                    aria-describedby={validationErrors.employeeId ? "employeeId-error" : undefined}
                  />
                  {validationErrors.employeeId && (
                    <p id="employeeId-error" className="text-xs text-destructive" role="alert">
                      {validationErrors.employeeId}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 2: Role & Organization */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-3">Role & Organization</h3>
              <div className="space-y-4">
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
                </div>

                <div className="grid gap-4 md:grid-cols-2">
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
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 3: Status */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-3">Account Status</h3>
              <div className="space-y-2">
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
          </div>

          {/* Office Memberships (Edit Mode only) */}
          {user && (
            <>
              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Office Memberships</h3>
                    <p className="text-xs text-muted-foreground">
                      Office Inbox/Sent and Office Cases visibility depends on having an active office membership.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsManagingOffices((v) => !v)}
                    disabled={!isSuperAdmin}
                  >
                    {isManagingOffices ? "Done" : "Manage"}
                  </Button>
                </div>

                {!isSuperAdmin && (
                  <p className="text-xs text-muted-foreground">
                    Only Super Admin can edit office memberships.
                  </p>
                )}

                {userMemberships.length === 0 ? (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                    No office memberships assigned.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userMemberships.map((m) => (
                      <div key={m.id} className="rounded-md border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {m.officeName ?? offices.find((o) => o.id === m.officeId)?.name ?? "Office"}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {m.assignmentRole}
                              </Badge>
                              {m.isPrimary && (
                                <Badge variant="outline" className="text-xs">
                                  Primary
                                </Badge>
                              )}
                              {!m.isActive && (
                                <Badge variant="destructive" className="text-xs">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                          </div>

                          {isManagingOffices && isSuperAdmin && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await deleteOfficeMembership(m.id);
                                  toast({ title: "Office membership removed" });
                                } catch (error: unknown) {
                                  toast({
                                    title: "Remove failed",
                                    description: error instanceof Error ? error.message : "Unable to remove membership",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {isManagingOffices && isSuperAdmin && (
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Assignment Role</Label>
                              <Select
                                value={m.assignmentRole}
                                onValueChange={(value) =>
                                  void updateOfficeMembership(m.id, { assignmentRole: value }).catch((error: unknown) => {
                                    toast({
                                      title: "Update failed",
                                      description: error instanceof Error ? error.message : "Unable to update membership",
                                      variant: "destructive",
                                    });
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="principal">principal</SelectItem>
                                  <SelectItem value="acting">acting</SelectItem>
                                  <SelectItem value="staff">staff</SelectItem>
                                  <SelectItem value="secretariat">secretariat</SelectItem>
                                  <SelectItem value="registry">registry</SelectItem>
                                  <SelectItem value="support">support</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Primary</Label>
                                <Switch
                                  checked={m.isPrimary}
                                  onCheckedChange={(checked) =>
                                    void updateOfficeMembership(m.id, { isPrimary: checked }).catch((error: unknown) => {
                                      toast({
                                        title: "Update failed",
                                        description: error instanceof Error ? error.message : "Unable to update membership",
                                        variant: "destructive",
                                      });
                                    })
                                  }
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Active</Label>
                                <Switch
                                  checked={m.isActive}
                                  onCheckedChange={(checked) =>
                                    void updateOfficeMembership(m.id, { isActive: checked }).catch((error: unknown) => {
                                      toast({
                                        title: "Update failed",
                                        description: error instanceof Error ? error.message : "Unable to update membership",
                                        variant: "destructive",
                                      });
                                    })
                                  }
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Can Register</Label>
                                <Switch
                                  checked={m.canRegister}
                                  onCheckedChange={(checked) =>
                                    void updateOfficeMembership(m.id, { canRegister: checked }).catch((error: unknown) => {
                                      toast({
                                        title: "Update failed",
                                        description: error instanceof Error ? error.message : "Unable to update membership",
                                        variant: "destructive",
                                      });
                                    })
                                  }
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Can Route</Label>
                                <Switch
                                  checked={m.canRoute}
                                  onCheckedChange={(checked) =>
                                    void updateOfficeMembership(m.id, { canRoute: checked }).catch((error: unknown) => {
                                      toast({
                                        title: "Update failed",
                                        description: error instanceof Error ? error.message : "Unable to update membership",
                                        variant: "destructive",
                                      });
                                    })
                                  }
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Can Approve</Label>
                                <Switch
                                  checked={m.canApprove}
                                  onCheckedChange={(checked) =>
                                    void updateOfficeMembership(m.id, { canApprove: checked }).catch((error: unknown) => {
                                      toast({
                                        title: "Update failed",
                                        description: error instanceof Error ? error.message : "Unable to update membership",
                                        variant: "destructive",
                                      });
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isManagingOffices && isSuperAdmin && (
                  <div className="rounded-md border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">Add Office Membership</div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={async () => {
                          if (!newMembership.officeId) {
                            toast({ title: "Select an office first", variant: "destructive" });
                            return;
                          }
                          setIsSubmitting(true);
                          try {
                            await addOfficeMembership({
                              officeId: newMembership.officeId,
                              userId: user.id,
                              assignmentRole: newMembership.assignmentRole,
                              isPrimary: newMembership.isPrimary,
                              isActive: newMembership.isActive,
                              canRegister: newMembership.canRegister,
                              canRoute: newMembership.canRoute,
                              canApprove: newMembership.canApprove,
                            });
                            toast({ title: "Office membership added" });
                            setNewMembership((prev) => ({ ...prev, officeId: "" }));
                          } catch (error: unknown) {
                            toast({
                              title: "Add failed",
                              description: error instanceof Error ? error.message : "Unable to add membership",
                              variant: "destructive",
                            });
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        disabled={isSubmitting}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Office</Label>
                        <Select
                          value={newMembership.officeId}
                          onValueChange={(value) => setNewMembership((prev) => ({ ...prev, officeId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select office" />
                          </SelectTrigger>
                          <SelectContent>
                            {officeOptions.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Assignment Role</Label>
                        <Select
                          value={newMembership.assignmentRole}
                          onValueChange={(value) => setNewMembership((prev) => ({ ...prev, assignmentRole: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="principal">principal</SelectItem>
                            <SelectItem value="acting">acting</SelectItem>
                            <SelectItem value="staff">staff</SelectItem>
                            <SelectItem value="secretariat">secretariat</SelectItem>
                            <SelectItem value="registry">registry</SelectItem>
                            <SelectItem value="support">support</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                        <Label className="text-xs">Primary</Label>
                        <Switch
                          checked={newMembership.isPrimary}
                          onCheckedChange={(checked) => setNewMembership((prev) => ({ ...prev, isPrimary: checked }))}
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                        <Label className="text-xs">Active</Label>
                        <Switch
                          checked={newMembership.isActive}
                          onCheckedChange={(checked) => setNewMembership((prev) => ({ ...prev, isActive: checked }))}
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                        <Label className="text-xs">Can Register</Label>
                        <Switch
                          checked={newMembership.canRegister}
                          onCheckedChange={(checked) => setNewMembership((prev) => ({ ...prev, canRegister: checked }))}
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                        <Label className="text-xs">Can Route</Label>
                        <Switch
                          checked={newMembership.canRoute}
                          onCheckedChange={(checked) => setNewMembership((prev) => ({ ...prev, canRoute: checked }))}
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                        <Label className="text-xs">Can Approve</Label>
                        <Switch
                          checked={newMembership.canApprove}
                          onCheckedChange={(checked) => setNewMembership((prev) => ({ ...prev, canApprove: checked }))}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
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
