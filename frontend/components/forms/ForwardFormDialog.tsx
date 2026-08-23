"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, User, Building2, Briefcase, Search, X } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrgUsers } from "@/hooks/use-org-users";
import { toast } from '@/components/ui/sonner';
import { logError } from '@/lib/client-logger';
import { getApiErrorMessage } from '@/lib/api-error';
import { forwardFormDocument } from '@/lib/api/dms-forms';
import type { FormDocument } from '@/lib/api/dms-forms';
import type { User as OrgUser } from '@/lib/npa-structure';
import { isSeedLikeUser } from '@/lib/organization-data';

interface ForwardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: FormDocument | null;
  onForwarded?: () => void;
}

const isSeedOrDebugUser = (user: OrgUser): boolean => {
  const email = (user.email || '').toLowerCase();
  const name = (user.name || '').trim().toLowerCase();
  if (!name || !email) return true;
  return isSeedLikeUser(user);
};

export function ForwardFormDialog({
  open,
  onOpenChange,
  form,
  onForwarded,
}: ForwardFormDialogProps) {
  const { divisions, departments } = useOrganization();
  const { users } = useOrgUsers();
  const [forwarding, setForwarding] = useState(false);
  const [targetType, setTargetType] = useState<'user' | 'division' | 'department'>('user');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [message, setMessage] = useState('');
  const [actionType, setActionType] = useState<'review' | 'input' | 'signature'>('review');
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    if (!open) {
      setSelectedUsers([]);
      setSelectedDivision('');
      setSelectedDepartment('');
      setMessage('');
      setTargetType('user');
      setActionType('review');
      setUserSearch('');
    }
  }, [open]);

  const availableUsers = useMemo(
    () =>
      users
        .filter((u) => u.active !== false && !isSeedOrDebugUser(u))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [users],
  );

  const availableDivisions = useMemo(
    () => divisions.filter((d) => d.isActive !== false).sort((a, b) => a.name.localeCompare(b.name)),
    [divisions],
  );

  const availableDepartments = useMemo(
    () =>
      departments
        .filter((d) => d.isActive !== false)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [departments],
  );

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return availableUsers;
    return availableUsers.filter((user) =>
      [user.name, user.email, user.systemRole, user.username]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q)),
    );
  }, [availableUsers, userSearch]);

  const divisionRecipientCount = useMemo(() => {
    if (!selectedDivision) return 0;
    return availableUsers.filter((u) => u.division === selectedDivision).length;
  }, [availableUsers, selectedDivision]);

  const departmentRecipientCount = useMemo(() => {
    if (!selectedDepartment) return 0;
    return availableUsers.filter((u) => u.department === selectedDepartment).length;
  }, [availableUsers, selectedDepartment]);

  const pendingRecipientCount = useMemo(() => {
    if (targetType === 'user') return selectedUsers.length;
    if (targetType === 'division') return divisionRecipientCount;
    return departmentRecipientCount;
  }, [targetType, selectedUsers.length, divisionRecipientCount, departmentRecipientCount]);

  const toggleUser = (userId: string, checked: boolean) => {
    setSelectedUsers((prev) =>
      checked ? (prev.includes(userId) ? prev : [...prev, userId]) : prev.filter((id) => id !== userId),
    );
  };

  const handleForward = async () => {
    if (!form) return;

    if (targetType === 'user' && selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }
    if (targetType === 'division' && !selectedDivision) {
      toast.error('Please select a division');
      return;
    }
    if (targetType === 'department' && !selectedDepartment) {
      toast.error('Please select a department');
      return;
    }

    if (targetType !== 'user' && pendingRecipientCount === 0) {
      toast.error('No active users found for that selection');
      return;
    }

    if (
      targetType !== 'user' &&
      pendingRecipientCount > 0 &&
      !window.confirm(
        `This will notify ${pendingRecipientCount} user${pendingRecipientCount === 1 ? '' : 's'}. Continue?`,
      )
    ) {
      return;
    }

    try {
      setForwarding(true);

      const result = await forwardFormDocument(form.id, {
        target_type: targetType,
        action_type: actionType,
        message: message.trim() || undefined,
        user_ids: targetType === 'user' ? selectedUsers : undefined,
        division_id: targetType === 'division' ? selectedDivision : undefined,
        department_id: targetType === 'department' ? selectedDepartment : undefined,
      });

      toast.success(
        `Form forwarded to ${result.recipient_count} recipient${result.recipient_count === 1 ? '' : 's'}`,
      );
      onForwarded?.();
      onOpenChange(false);
    } catch (error: unknown) {
      logError('Failed to forward form', error);
      toast.error(getApiErrorMessage(error, 'Failed to forward form'));
    } finally {
      setForwarding(false);
    }
  };

  const actionLabel =
    actionType === 'review' ? 'review' : actionType === 'input' ? 'input' : 'signature';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" height="fill" density="flush">
        <DialogHeader className="shrink-0 border-b px-4 pb-3 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle className="flex items-center gap-2 pr-8">
            <Send className="h-5 w-5 text-primary" />
            Forward Form
          </DialogTitle>
          <DialogDescription>
            Forward this form to users for {actionLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="space-y-5">
            {form && (
              <div className="rounded-lg bg-muted p-3">
                <div className="text-sm font-medium">{form.document.title}</div>
                {form.template && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Template: {form.template.name}
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Action Type</Label>
                <Select
                  value={actionType}
                  onValueChange={(v) => setActionType(v as 'review' | 'input' | 'signature')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="input">Input/Edit</SelectItem>
                    <SelectItem value="signature">Signature (creates pending sign task)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Forward To</Label>
                <Select
                  value={targetType}
                  onValueChange={(v) => setTargetType(v as 'user' | 'division' | 'department')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Specific Users</SelectItem>
                    <SelectItem value="division">Division</SelectItem>
                    <SelectItem value="department">Department</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {targetType === 'user' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Select Users</Label>
                  <span className="text-xs text-muted-foreground">
                    {selectedUsers.length} selected · {filteredUsers.length} shown
                  </span>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name, email, or role…"
                    className="pl-8"
                    autoComplete="off"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto rounded-md border p-2">
                  {filteredUsers.length === 0 ? (
                    <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                      No users match your search.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {filteredUsers.map((user) => {
                        const checked = selectedUsers.includes(user.id);
                        return (
                          <div
                            key={user.id}
                            className="flex items-center space-x-2 rounded-md px-2 py-1.5 hover:bg-muted/60"
                          >
                            <Checkbox
                              id={`user-${user.id}`}
                              checked={checked}
                              onCheckedChange={(value) => toggleUser(user.id, value === true)}
                            />
                            <Label
                              htmlFor={`user-${user.id}`}
                              className="flex flex-1 cursor-pointer items-center gap-2 text-sm font-normal"
                            >
                              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate">{user.name}</span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {user.email}
                                  {user.systemRole ? ` · ${user.systemRole}` : ''}
                                </span>
                              </span>
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedUsers.map((userId) => {
                      const user = availableUsers.find((u) => u.id === userId);
                      if (!user) return null;
                      return (
                        <Badge key={userId} variant="secondary" className="gap-1 pr-1 text-xs">
                          {user.name}
                          <button
                            type="button"
                            className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                            onClick={() => toggleUser(userId, false)}
                            aria-label={`Remove ${user.name}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {targetType === 'division' && (
              <div className="space-y-2">
                <Label>Select Division</Label>
                <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a division" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDivisions.map((division) => (
                      <SelectItem key={division.id} value={division.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{division.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDivision && (
                  <p className="text-sm text-muted-foreground">
                    {divisionRecipientCount} active user
                    {divisionRecipientCount === 1 ? '' : 's'} will be notified.
                  </p>
                )}
              </div>
            )}

            {targetType === 'department' && (
              <div className="space-y-2">
                <Label>Select Department</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDepartments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <span>{department.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDepartment && (
                  <p className="text-sm text-muted-foreground">
                    {departmentRecipientCount} active user
                    {departmentRecipientCount === 1 ? '' : 's'} will be notified.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Message (Optional)</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a note about why you're forwarding this form..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-4 py-3 sm:px-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={forwarding}>
            Cancel
          </Button>
          <Button onClick={handleForward} disabled={forwarding || pendingRecipientCount === 0}>
            {forwarding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Forwarding...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Forward
                {pendingRecipientCount > 0 ? ` (${pendingRecipientCount})` : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
