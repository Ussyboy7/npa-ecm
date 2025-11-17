import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Building2, Users, User as UserIcon, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { logError } from '@/lib/client-logger';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Correspondence, User } from '@/lib/npa-structure';

interface OfficeReassignModalProps {
  correspondence: Correspondence;
  isOpen: boolean;
  onClose: () => void;
}

export const OfficeReassignModal = ({ correspondence, isOpen, onClose }: OfficeReassignModalProps) => {
  const { syncFromApi, refreshData } = useCorrespondence();
  const { offices, officeMemberships, users } = useOrganization();

  const [owningOfficeId, setOwningOfficeId] = useState<string>(correspondence.owningOfficeId ?? '');
  const [currentOfficeId, setCurrentOfficeId] = useState<string>(
    correspondence.currentOfficeId ?? correspondence.owningOfficeId ?? '',
  );
  const [selectedUserId, setSelectedUserId] = useState<string>(correspondence.currentApproverId ?? '');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setOwningOfficeId(correspondence.owningOfficeId ?? '');
    setCurrentOfficeId(correspondence.currentOfficeId ?? correspondence.owningOfficeId ?? '');
    setSelectedUserId(correspondence.currentApproverId ?? '');
    setReason('');
    setUserSearch('');
  }, [
    isOpen,
    correspondence.id,
    correspondence.currentApproverId,
    correspondence.currentOfficeId,
    correspondence.owningOfficeId,
  ]);

  const sortedOffices = useMemo(
    () => offices.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [offices],
  );

  const activeUsers = useMemo(() => users.filter((user) => user.active !== false), [users]);

  const officeMemberUsers = useMemo(() => {
    if (!currentOfficeId) return [] as User[];
    const membershipUsers = officeMemberships
      .filter((membership) => membership.officeId === currentOfficeId && membership.isActive)
      .map((membership) => activeUsers.find((user) => user.id === membership.userId))
      .filter((value): value is User => Boolean(value));
    return membershipUsers;
  }, [officeMemberships, currentOfficeId, activeUsers]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.toLowerCase().trim();
    if (!query) return activeUsers;
    return activeUsers.filter((user) => {
      const divisionName = user.division ? user.division : '';
      const departmentName = user.department ? user.department : '';
      return (
        user.name.toLowerCase().includes(query) ||
        user.systemRole.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.gradeLevel.toLowerCase().includes(query) ||
        divisionName.toLowerCase().includes(query) ||
        departmentName.toLowerCase().includes(query)
      );
    });
  }, [activeUsers, userSearch]);

  const nonMemberUsers = useMemo(() => {
    const memberIds = new Set(officeMemberUsers.map((user) => user.id));
    return filteredUsers.filter((user) => !memberIds.has(user.id));
  }, [filteredUsers, officeMemberUsers]);

  const owningChanged = Boolean(owningOfficeId && owningOfficeId !== (correspondence.owningOfficeId ?? ''));
  const currentChanged = Boolean(currentOfficeId && currentOfficeId !== (correspondence.currentOfficeId ?? correspondence.owningOfficeId ?? ''));
  const approverChanged = Boolean(selectedUserId && selectedUserId !== (correspondence.currentApproverId ?? ''));
  const hasChanges = owningChanged || currentChanged || approverChanged;

  const selectedOffice = currentOfficeId
    ? sortedOffices.find((office) => office.id === currentOfficeId)
    : undefined;
  const selectedOwningOffice = owningOfficeId
    ? sortedOffices.find((office) => office.id === owningOfficeId)
    : undefined;
  const selectedUser = selectedUserId ? activeUsers.find((user) => user.id === selectedUserId) : undefined;

  const renderUserOption = (user: User) => (
    <SelectItem key={user.id} value={user.id}>
      <div className="flex flex-col py-1">
        <span className="font-medium">{user.name}</span>
        <span className="text-xs text-muted-foreground">
          {user.systemRole} • {user.gradeLevel}
        </span>
      </div>
    </SelectItem>
  );

  const validateForm = (): boolean => {
    setReasonError('');
    
    if (!hasChanges) {
      toast.error('Please adjust at least one field before saving.');
      return false;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setReasonError('Please provide a reason for this reassignment.');
      return false;
    }

    if (trimmedReason.length < 10) {
      setReasonError('Reason must be at least 10 characters long.');
      return false;
    }

    if (trimmedReason.length > 500) {
      setReasonError('Reason must be less than 500 characters.');
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await apiFetch(`/correspondence/items/${correspondence.id}/reassign/`, {
        method: 'POST',
        body: JSON.stringify({
          owning_office_id: owningChanged ? owningOfficeId : undefined,
          target_office_id: currentChanged ? currentOfficeId : undefined,
          target_user_id: approverChanged ? selectedUserId : undefined,
          reason: reason.trim(),
        }),
      });

      toast.success('Correspondence reassigned successfully.');
      await refreshData();
      await syncFromApi();
      setShowConfirmation(false);
      onClose();
    } catch (error: any) {
      logError('Failed to reassign correspondence', error);
      const errorMessage = error?.response?.data?.reason?.[0] || 
                          error?.response?.data?.detail || 
                          error?.message || 
                          'Unable to reassign correspondence. Please try again.';
      toast.error(errorMessage);
      setShowConfirmation(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Reassign Office / Approver
          </DialogTitle>
          <DialogDescription>
            Move this correspondence to another office or assign a different point of contact. All changes are logged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <Card className="bg-warning/10 border-warning/20">
            <CardContent className="p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold text-warning text-sm mb-1">Administrative action</p>
                <p>
                  Reassigning bypasses the normal workflow. Provide a reason so the audit and office teams understand the
                  context.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex flex-wrap gap-4">
                <div>
                  <p className="text-muted-foreground text-xs uppercase">Current Owning Office</p>
                  <p className="font-semibold">{correspondence.owningOfficeName ?? 'Not set'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase">Current Office Queue</p>
                  <p className="font-semibold">{correspondence.currentOfficeName ?? correspondence.owningOfficeName ?? 'Not set'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase">Current Approver</p>
                  <p className="font-semibold">{selectedUser?.name ?? correspondence.currentApproverName ?? 'Unassigned'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Owning Office</Label>
              <Select
                value={owningOfficeId || '__keep__'}
                onValueChange={(value) => setOwningOfficeId(value === '__keep__' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select owning office" />
                </SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  <SelectItem value="__keep__">
                    Keep current ({correspondence.owningOfficeName ?? 'Not set'})
                  </SelectItem>
                  <Separator className="my-1" />
                  {sortedOffices.map((office) => (
                    <SelectItem key={office.id} value={office.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{office.name}</span>
                        <span className="text-xs uppercase text-muted-foreground">{office.officeType}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Current Office Queue</Label>
              <Select
                value={currentOfficeId || '__keep_current__'}
                onValueChange={(value) =>
                  setCurrentOfficeId(value === '__keep_current__' ? '' : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target office" />
                </SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  <SelectItem value="__keep_current__">
                    Keep current ({correspondence.currentOfficeName ?? correspondence.owningOfficeName ?? 'Not set'})
                  </SelectItem>
                  <Separator className="my-1" />
                  {sortedOffices.map((office) => (
                    <SelectItem key={office.id} value={office.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{office.name}</span>
                        <span className="text-xs uppercase text-muted-foreground">{office.officeType}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedOffice && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {selectedOffice.name} • {selectedOffice.officeType.toUpperCase()}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason * <span className="text-muted-foreground text-xs font-normal">(10-500 characters)</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                if (reasonError) setReasonError('');
              }}
              placeholder="Explain why this correspondence needs to be reassigned…"
              className={`min-h-[120px] ${reasonError ? 'border-destructive' : ''}`}
              aria-label="Reason for reassignment"
              aria-required="true"
              aria-invalid={!!reasonError}
              aria-describedby={reasonError ? "reason-error" : "reason-help"}
            />
            <div className="flex justify-between items-center">
              <div>
                {reasonError && (
                  <p id="reason-error" className="text-xs text-destructive" role="alert">
                    {reasonError}
                  </p>
                )}
                <p id="reason-help" className="text-xs text-muted-foreground">
                  Provide a clear explanation for this administrative action
                </p>
              </div>
              <div className={`text-xs ${reason.length > 500 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {reason.length}/500 characters
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assign Point of Contact (optional)</Label>
            <Select
              value={selectedUserId || '__keep_user__'}
              onValueChange={(value) => setSelectedUserId(value === '__keep_user__' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a user (defaults to existing approver)" />
              </SelectTrigger>
              <SelectContent className="max-h-[320px] overflow-y-auto">
                <div className="sticky top-0 z-10 bg-popover p-2 border-b border-border">
                  <div className="relative">
                    <Users className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                      placeholder="Search name, role, division..."
                      className="pl-8 h-9"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    />
                  </div>
                </div>
                <SelectItem value="__keep_user__">
                  Keep current approver ({correspondence.currentApproverName ?? 'Unassigned'})
                </SelectItem>
                {officeMemberUsers.length > 0 && (
                  <>
                    <Separator className="my-1" />
                    <div className="px-2 py-1 text-xs font-semibold text-primary">
                      Members in {selectedOffice?.name ?? 'selected office'}
                    </div>
                    {officeMemberUsers.map(renderUserOption)}
                  </>
                )}
                <Separator className="my-1" />
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Other active users</div>
                {nonMemberUsers.length === 0 ? (
                  <SelectItem value="no-users" disabled>
                    No users found
                  </SelectItem>
                ) : (
                  nonMemberUsers.slice(0, 50).map(renderUserOption)
                )}
              </SelectContent>
            </Select>
            {selectedUser && (
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <UserIcon className="h-3.5 w-3.5" />
                {selectedUser.name} • {selectedUser.systemRole}
              </p>
            )}
          </div>

          <Card className="bg-accent/10 border-accent/20">
            <CardContent className="p-4 space-y-2 text-sm">
              <p className="font-semibold text-accent-foreground">Summary</p>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <div>
                  <p className="uppercase text-[10px]">Owning Office</p>
                  <Badge variant="outline" className="mt-1">
                    {selectedOwningOffice?.name ?? correspondence.owningOfficeName ?? 'Unchanged'}
                  </Badge>
                </div>
                <div>
                  <p className="uppercase text-[10px]">Current Office</p>
                  <Badge variant="outline" className="mt-1">
                    {selectedOffice?.name ?? correspondence.currentOfficeName ?? correspondence.owningOfficeName ?? 'Unchanged'}
                  </Badge>
                </div>
                <div>
                  <p className="uppercase text-[10px]">Point of Contact</p>
                  <Badge variant="outline" className="mt-1">
                    {selectedUser?.name ?? correspondence.currentApproverName ?? 'Unchanged'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} aria-label="Cancel reassignment">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChanges || isSubmitting}
            className="bg-gradient-primary hover:opacity-90 transition-opacity"
            aria-label="Confirm reassignment"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Reassignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reassign this correspondence? This is an administrative action that will:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                {owningChanged && (
                  <li>Change owning office to <strong>{selectedOwningOffice?.name ?? 'selected office'}</strong></li>
                )}
                {currentChanged && (
                  <li>Move to office queue: <strong>{selectedOffice?.name ?? 'selected office'}</strong></li>
                )}
                {approverChanged && (
                  <li>Assign point of contact: <strong>{selectedUser?.name ?? 'selected user'}</strong></li>
                )}
              </ul>
              This action will be logged in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="bg-gradient-primary hover:opacity-90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reassigning...
                </>
              ) : (
                'Confirm Reassignment'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

