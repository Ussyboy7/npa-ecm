import { logError } from '@/lib/client-logger';
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { ConfirmationDialog } from './ConfirmationDialog';
import { generateId, getNextStepNumber } from '@/lib/correspondence-helpers';
import { apiFetch } from '@/lib/api-client';
import { Loader2 } from 'lucide-react';
import type { Minute, Correspondence } from '@/lib/npa-structure';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Send,
  User as UserIcon,
  Building2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  getUserById,
  getDivisionById,
  getDepartmentById,
  GRADE_LEVELS,
} from '@/lib/npa-structure';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { UserSelector } from '@/components/shared/UserSelector';
import { MODAL_CONSTANTS } from '@/lib/modal-constants';
import { ModalErrorHandler } from '@/lib/modal-errors';
import { getSuggestedApprovers, filterUsersBySearch } from '@/lib/routing-utils';

interface ManualRouteModalProps {
  correspondence: Correspondence;
  isOpen: boolean;
  onClose: () => void;
}

export const ManualRouteModal = ({ correspondence, isOpen, onClose }: ManualRouteModalProps) => {
  const { addMinute, updateCorrespondence, getMinutesByCorrespondenceId, syncFromApi } = useCorrespondence();
  const { users, officeMemberships, offices } = useOrganization();
  const { currentUser, hydrated } = useCurrentUser();

  const activeUsers = useMemo(() => users.filter((user) => user.active), [users]);
  const actingUser = useMemo(() => currentUser ?? activeUsers[0] ?? null, [currentUser, activeUsers]);

  const [routingNotes, setRoutingNotes] = useState('');
  const [routingNotesError, setRoutingNotesError] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedUserError, setSelectedUserError] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [characterCount, setCharacterCount] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const divisionOptions = useMemo(() => {
    const ids = new Set(activeUsers.map((user) => user.division).filter(Boolean));
    return Array.from(ids)
      .map((divisionId) => (divisionId ? getDivisionById(divisionId) : null))
      .filter((division): division is NonNullable<ReturnType<typeof getDivisionById>> => Boolean(division));
  }, [activeUsers]);

  const availableUsers = useMemo(() => {
    // Get all users who have already acted on this correspondence (to prevent routing back to them)
    // Exclude recalled minutes - users who only received recalled minutes can receive again
    const existingMinutes = getMinutesByCorrespondenceId(correspondence.id);
    const usersWhoAlreadyActed = new Set(
      existingMinutes
        .filter(minute => !minute.isRecalled) // Exclude recalled minutes
        .map(minute => minute.userId)
        .filter(Boolean)
    );
    
    // Also exclude the current approver if they've already acted (and their minute wasn't recalled)
    if (correspondence.currentApproverId) {
      const currentApproverMinutes = existingMinutes.filter(m => m.userId === correspondence.currentApproverId);
      const hasNonRecalledMinute = currentApproverMinutes.some(m => !m.isRecalled);
      if (hasNonRecalledMinute) {
        usersWhoAlreadyActed.add(correspondence.currentApproverId);
      }
    }
    
    // Get current user's primary office to check lateral routing permission
    const primaryOfficeMembership = officeMemberships.find(
      (m) => m.userId === actingUser?.id && m.isPrimary && m.isActive
    );
    const primaryOffice = primaryOfficeMembership
      ? offices.find((o) => o.id === primaryOfficeMembership.officeId)
      : undefined;
    const canRouteLaterally = primaryOffice?.allowLateralRouting ?? true; // Default to true if office not found
    
    // Get grade levels sorted by level (higher level = more authority)
    const gradeOrder = [...GRADE_LEVELS].sort((a, b) => b.level - a.level).map(g => g.code);
    const currentGradeIndex = actingUser?.gradeLevel ? gradeOrder.indexOf(actingUser.gradeLevel) : -1;
    
    // Get current user's division and directorate info
    const currentDivisionId = actingUser?.division;
    const currentDivision = currentDivisionId ? getDivisionById(currentDivisionId) : null;
    const currentDirectorateId = currentDivision?.directorateId ?? actingUser?.directorate;
    
    const base = activeUsers.filter((user) => {
      // Exclude acting user
      if (user.id === actingUser?.id) return false;
      // Exclude users who have already acted
      if (usersWhoAlreadyActed.has(user.id)) return false;
      
      // Standard routing: allow routing within same division/directorate hierarchy
      const userDivision = user.division ? getDivisionById(user.division) : null;
      const userDirectorateId = userDivision?.directorateId ?? user.directorate;
      
      // Check if user belongs to same division or directorate
      const sameDivision = Boolean(currentDivisionId && user.division && currentDivisionId === user.division);
      const sameDirectorate = Boolean(currentDirectorateId && userDirectorateId && currentDirectorateId === userDirectorateId);
      
      // Allow if same division or directorate
      if (sameDivision || sameDirectorate) {
        return true;
      }
      
      // Lateral routing: same grade level peers (if allowed)
      if (canRouteLaterally && user.gradeLevel === actingUser?.gradeLevel) {
        // AGM to AGM, GM to GM (peer-to-peer across any organizational boundaries)
        return true;
      }
      
      // Cross-tier routing: AGM can route to GM (if allowed)
      if (canRouteLaterally && actingUser?.gradeLevel === 'AGMCS' && user.gradeLevel === 'GMCS') {
        return true;
      }
      
      // For executives (MD, ED), allow routing to anyone
      const isExecutive = actingUser?.gradeLevel && ['MDCS', 'EDCS'].includes(actingUser.gradeLevel);
      if (isExecutive) {
        return true;
      }
      
      return false;
    });
    
    const byDivision = selectedDivision === 'all' ? base : base.filter((user) => user.division === selectedDivision);

    if (!searchQuery.trim()) {
      return byDivision;
    }

    const query = searchQuery.toLowerCase();
    return byDivision.filter((user) => {
      const division = user.division ? getDivisionById(user.division) : null;
      const department = user.department ? getDepartmentById(user.department) : null;
      return (
        user.name.toLowerCase().includes(query) ||
        user.systemRole.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.gradeLevel.toLowerCase().includes(query) ||
        (division?.name.toLowerCase().includes(query) ?? false) ||
        (department?.name.toLowerCase().includes(query) ?? false)
      );
    });
  }, [activeUsers, actingUser, searchQuery, selectedDivision, correspondence.id, correspondence.currentApproverId, getMinutesByCorrespondenceId, officeMemberships, offices]);

  const handleTextChange = (text: string) => {
    if (text.length <= MODAL_CONSTANTS.ROUTING_NOTES.MAX) {
      setRoutingNotes(text);
      setCharacterCount(text.length);
      if (routingNotesError) setRoutingNotesError('');
    }
  };

  const validateForm = (): boolean => {
    setRoutingNotesError('');
    setSelectedUserError('');

    if (!actingUser) {
      toast.error('Active user not found. Please refresh and try again.');
      return false;
    }

    const trimmedNotes = routingNotes.trim();
    if (!trimmedNotes) {
      setRoutingNotesError('Please enter routing notes/instructions');
      return false;
    }

    if (trimmedNotes.length < MODAL_CONSTANTS.ROUTING_NOTES.MIN) {
      setRoutingNotesError(`Routing notes must be at least ${MODAL_CONSTANTS.ROUTING_NOTES.MIN} characters long`);
      return false;
    }

    if (!selectedUser) {
      setSelectedUserError('Please select a recipient');
      return false;
    }

    // Prevent routing to users who have already acted on this correspondence
    const existingMinutes = getMinutesByCorrespondenceId(correspondence.id);
    const usersWhoAlreadyActed = new Set(
      existingMinutes.map(minute => minute.userId).filter(Boolean)
    );
    if (usersWhoAlreadyActed.has(selectedUser)) {
      setSelectedUserError('This user has already acted on this correspondence. Please select a different recipient.');
      return false;
    }

    // Prevent routing back to the current approver if they've already acted
    if (correspondence.currentApproverId && correspondence.currentApproverId === selectedUser && usersWhoAlreadyActed.has(selectedUser)) {
      setSelectedUserError('This user has already received and acted on this correspondence. Please select a different recipient.');
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
    if (!actingUser) {
      toast.error('Active user not found. Unable to route.');
      setShowConfirmation(false);
      return;
    }

    setIsSubmitting(true);
    const recipient = getUserById(selectedUser);
    
    // Prevent routing to yourself
    if (selectedUser === actingUser.id) {
      toast.error('Cannot route correspondence to yourself. Please select a different recipient.');
      setShowConfirmation(false);
      setIsSubmitting(false);
      return;
    }
    
    // Automatically determine recipient's office from their office memberships
    const recipientOfficeMembership = officeMemberships.find(
      (membership) => membership.userId === selectedUser && membership.isActive && membership.isPrimary
    );
    const recipientOfficeId = recipientOfficeMembership?.officeId || undefined;
    
    // Get current user's office for from_office
    const currentUserOfficeMembership = officeMemberships.find(
      (membership) => membership.userId === actingUser.id && membership.isActive && membership.isPrimary
    );
    const currentUserOfficeId = currentUserOfficeMembership?.officeId || correspondence.currentOfficeId || undefined;
    
    try {
      // Create minute via API
      const existingMinutes = getMinutesByCorrespondenceId(correspondence.id);
      const nextStep = getNextStepNumber(existingMinutes);

      await apiFetch('/correspondence/minutes/', {
        method: 'POST',
        body: JSON.stringify({
          correspondence: correspondence.id,
          user_id: actingUser.id,
          grade_level: actingUser.gradeLevel,
          action_type: 'forward',
          minute_text: `[MANUAL ROUTE] ${routingNotes.trim()}`,
          direction: 'downward',
          step_number: nextStep,
          from_office_id: currentUserOfficeId || undefined,
          to_office_id: recipientOfficeId || undefined,
          to_user_id: selectedUser || undefined,  // Set to_user when user is selected
        }),
      });

      // Update correspondence via API
      const updatePayload: any = {
        current_approver_id: selectedUser,
        status: 'in-progress',
      };
      // Always update the office to the recipient's office
      if (recipientOfficeId) {
        updatePayload.current_office = recipientOfficeId;
      }
      await apiFetch(`/correspondence/items/${correspondence.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(updatePayload),
      });

      await syncFromApi();

      setShowConfirmation(false);

      setTimeout(() => {
        onClose();

        setTimeout(() => {
          setRoutingNotes('');
          setSelectedUser('');
          setSelectedDivision('all');
          setSearchQuery('');
          setRoutingNotesError('');
          setSelectedUserError('');
        }, 100);
      }, 200);

      toast.success('Correspondence routed successfully', {
        description: `Manually routed to ${recipient?.name ?? 'selected user'}`,
      });
    } catch (error: any) {
      logError('Failed to route correspondence', error);
      const modalError = ModalErrorHandler.createErrorFromApi(error);
      toast.error(ModalErrorHandler.getUserFriendlyMessage(modalError));
      setShowConfirmation(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const division = getDivisionById(correspondence.divisionId);
  const selectedRecipient = selectedUser ? getUserById(selectedUser) : null;
  const recipientDivision = selectedRecipient?.division ? getDivisionById(selectedRecipient.division) : null;
  const recipientDepartment = selectedRecipient?.department ? getDepartmentById(selectedRecipient.department) : null;

  if (!hydrated && !actingUser) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Manual Route Correspondence
          </DialogTitle>
          <DialogDescription>
            Override normal workflow and route to any user in the organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <Card className="bg-warning/10 border-warning/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-warning mb-1">Manual Routing</p>
                  <p className="text-xs text-muted-foreground">
                    You are bypassing the normal approval hierarchy. This action will be logged and tracked.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm mb-1">{correspondence.subject}</p>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    <span>Ref: {correspondence.referenceNumber}</span>
                    <span>•</span>
                    <span>From: {correspondence.senderName}</span>
                    <span>•</span>
                    <span>{division?.name}</span>
                  </div>
                </div>
                <Badge
                  variant={
                    correspondence.priority === 'urgent'
                      ? 'destructive'
                      : correspondence.priority === 'high'
                        ? 'default'
                        : 'secondary'
                  }
                >
                  {correspondence.priority}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="notes">
              Routing Instructions * <span className="text-muted-foreground text-xs font-normal">(10-500 characters)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Enter reason for manual routing and specific instructions..."
              value={routingNotes}
              onChange={(e) => handleTextChange(e.target.value)}
              className={`min-h-[120px] resize-none ${routingNotesError ? 'border-destructive' : ''}`}
              maxLength={MODAL_CONSTANTS.ROUTING_NOTES.MAX}
              aria-label="Routing instructions"
              aria-required="true"
              aria-invalid={!!routingNotesError}
              aria-describedby={routingNotesError ? "notes-error" : "notes-help"}
            />
            <div className="flex justify-between items-center">
              <div>
                {routingNotesError && (
                  <p id="notes-error" className="text-xs text-destructive" role="alert">
                    {routingNotesError}
                  </p>
                )}
                <p id="notes-help" className="text-xs text-muted-foreground">
                  Be specific about why you&apos;re bypassing normal workflow
                </p>
              </div>
              <div className={`text-xs ${characterCount > MODAL_CONSTANTS.ROUTING_NOTES.MAX ? 'text-destructive' : 'text-muted-foreground'}`}>
                {characterCount}/{MODAL_CONSTANTS.ROUTING_NOTES.MAX} characters
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="division" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Filter by Division (Optional)
            </Label>
            <Select
              value={selectedDivision}
              onValueChange={(value) => {
                setSelectedDivision(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All divisions" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="all">All Divisions</SelectItem>
                <Separator className="my-1" />
                {divisionOptions.map((div) => (
                  <SelectItem key={div.id} value={div.id}>
                    {div.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <UserSelector
            users={availableUsers}
            value={selectedUser}
            onValueChange={(value) => {
              setSelectedUser(value);
              if (selectedUserError) setSelectedUserError('');
            }}
            label="Route To"
            placeholder="Select any user in the organization"
            required
            error={selectedUserError}
            currentUser={actingUser ?? undefined}
            offices={offices}
            officeMemberships={officeMemberships}
            maxHeight="300px"
            emptyMessage="No users found matching your criteria"
            aria-label="Select user to route to"
            aria-required
            aria-invalid={!!selectedUserError}
            aria-describedby={selectedUserError ? "recipient-error" : undefined}
          />

          {selectedRecipient && (
            <Card className="bg-info/5 border-info/20">
              <CardContent className="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-info" />
                    <div>
                      <p className="font-semibold">{selectedRecipient.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedRecipient.systemRole} • {selectedRecipient.gradeLevel}
                      </p>
                    </div>
                  </div>
                  {recipientDivision && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      <span>
                        {recipientDivision.name}
                        {recipientDepartment && ` • ${recipientDepartment.name}`}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {routingNotes && selectedUser && (
            <Card className="bg-accent/10 border-accent/20">
              <CardContent className="p-4">
                <Label className="text-sm font-semibold mb-2 block">Action Summary</Label>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    <strong>{actingUser?.name ?? 'You'}</strong> will manually route to{' '}
                    <strong>{selectedRecipient?.name ?? 'selected user'}</strong> bypassing normal workflow
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This action will be logged with [MANUAL ROUTE] tag
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} aria-label="Cancel manual routing">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-gradient-primary hover:opacity-90 transition-opacity gap-2"
            aria-label="Route correspondence manually"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Routing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Route Now
              </>
            )}
          </Button>
        </DialogFooter>

        <ConfirmationDialog
          isOpen={showConfirmation}
          onClose={() => !isSubmitting && setShowConfirmation(false)}
          onConfirm={handleConfirm}
          type="minute"
          data={{
            currentUserName: actingUser?.name ?? '',
            recipientName: selectedRecipient?.name || '',
            actionType: 'forward',
            content: routingNotes,
            direction: 'downward',
          }}
          disabled={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
};