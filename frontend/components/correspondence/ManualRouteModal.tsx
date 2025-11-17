import { logError } from '@/lib/client-logger';
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  Search,
} from 'lucide-react';
import {
  getUserById,
  getDivisionById,
  getDepartmentById,
} from '@/lib/npa-structure';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Input } from '@/components/ui/input';

interface ManualRouteModalProps {
  correspondence: Correspondence;
  isOpen: boolean;
  onClose: () => void;
}

export const ManualRouteModal = ({ correspondence, isOpen, onClose }: ManualRouteModalProps) => {
  const { addMinute, updateCorrespondence, getMinutesByCorrespondenceId, syncFromApi } = useCorrespondence();
  const { users } = useOrganization();
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
    const base = activeUsers.filter((user) => user.id !== actingUser?.id);
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
  }, [activeUsers, actingUser?.id, searchQuery, selectedDivision]);

  const MAX_ROUTING_NOTES_LENGTH = 500;

  const handleTextChange = (text: string) => {
    if (text.length <= MAX_ROUTING_NOTES_LENGTH) {
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

    if (trimmedNotes.length < 10) {
      setRoutingNotesError('Routing notes must be at least 10 characters long');
      return false;
    }

    if (!selectedUser) {
      setSelectedUserError('Please select a recipient');
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
        }),
      });

      // Update correspondence via API
      await apiFetch(`/correspondence/items/${correspondence.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          current_approver: selectedUser,
          status: 'in-progress',
        }),
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
      const errorMessage = error?.response?.data?.detail || 
                          error?.response?.data?.minute_text?.[0] ||
                          error?.message || 
                          'Unable to route correspondence. Please try again.';
      toast.error(errorMessage);
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
              <div className={`text-xs ${characterCount > MAX_ROUTING_NOTES_LENGTH ? 'text-destructive' : 'text-muted-foreground'}`}>
                {characterCount}/{MAX_ROUTING_NOTES_LENGTH} characters
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

          <div className="space-y-2">
            <Label htmlFor="recipient" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Route To *
            </Label>
            <Select 
              value={selectedUser} 
              onValueChange={(value) => {
                setSelectedUser(value);
                if (selectedUserError) setSelectedUserError('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select any user in the organization" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50 max-h-[300px]">
                <div className="sticky top-0 z-10 bg-popover p-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search name, role, division..."
                      className="pl-8 h-9"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    />
                  </div>
                </div>
                {availableUsers.length === 0 ? (
                  <SelectItem value="no-users" disabled>
                    No users found
                  </SelectItem>
                ) : (
                  availableUsers.map((user) => {
                    const userDiv = user.division ? getDivisionById(user.division) : null;
                    const userDept = user.department ? getDepartmentById(user.department) : null;

                    return (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex flex-col py-1">
                          <span className="font-medium">{user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {user.systemRole} - {user.gradeLevel}
                          </span>
                          {userDiv && (
                            <span className="text-xs text-muted-foreground">
                              {userDiv.name}
                              {userDept && ` • ${userDept.name}`}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
            {selectedUserError && (
              <p className="text-xs text-destructive" role="alert">
                {selectedUserError}
              </p>
            )}
          </div>

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

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
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
        </div>

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