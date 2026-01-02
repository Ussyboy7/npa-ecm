import { logError } from '@/lib/client-logger';
import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Loader2, MessageSquare, FileText, AlertCircle, Info, Plus } from 'lucide-react';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Minute, Correspondence } from '@/lib/npa-structure';
import { apiFetch } from '@/lib/api-client';
import { formatDateTime } from '@/lib/correspondence-helpers';
import { MODAL_CONSTANTS } from '@/lib/modal-constants';
import { ModalErrorHandler } from '@/lib/modal-errors';

interface AdditionalMinuteModalProps {
  correspondence: Correspondence;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedMinuteId?: string;
}

export const AdditionalMinuteModal = ({
  correspondence,
  isOpen,
  onClose,
  onSuccess,
  preSelectedMinuteId,
}: AdditionalMinuteModalProps) => {
  const { getMinutesByCorrespondenceId, syncFromApi } = useCorrespondence();
  const { currentUser } = useCurrentUser();
  const { officeMemberships } = useOrganization();
  const minutes = getMinutesByCorrespondenceId(correspondence.id);
  
  const [selectedMinuteId, setSelectedMinuteId] = useState<string>('');
  const [minuteType, setMinuteType] = useState<'instruction' | 'clarification' | 'addendum'>('instruction');
  const [minuteText, setMinuteText] = useState('');
  const [characterCount, setCharacterCount] = useState(0);
  const [minuteTextError, setMinuteTextError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out minutes that are already additional minutes (to avoid nesting)
  const availableMinutes = useMemo(() => {
    return minutes.filter(m => !m.isAdditional);
  }, [minutes]);

  useEffect(() => {
    if (isOpen) {
      setSelectedMinuteId(preSelectedMinuteId || '');
      setMinuteType('instruction');
      setMinuteText('');
      setCharacterCount(0);
      setMinuteTextError('');
    }
  }, [isOpen, preSelectedMinuteId]);

  const handleTextChange = (text: string) => {
    setMinuteText(text);
    setCharacterCount(text.length);
    if (text.trim().length > 0) {
      setMinuteTextError('');
    }
  };

  const validateForm = (): boolean => {
    if (!selectedMinuteId) {
      toast.error('Please select a minute to add additional instructions to.');
      return false;
    }
    if (!minuteText.trim()) {
      setMinuteTextError('Additional minute content cannot be empty.');
      return false;
    }
    if (minuteText.length > MODAL_CONSTANTS.ADDITIONAL_MINUTE.MAX) {
      setMinuteTextError(`Additional minute content cannot exceed ${MODAL_CONSTANTS.ADDITIONAL_MINUTE.MAX} characters.`);
      return false;
    }
    return true;
  };

  const getMinuteTypeLabel = (type: string) => {
    switch (type) {
      case 'instruction':
        return 'Additional Instruction';
      case 'clarification':
        return 'Clarification';
      case 'addendum':
        return 'Addendum';
      default:
        return type;
    }
  };

  const getMinuteTypeDescription = (type: string) => {
    switch (type) {
      case 'instruction':
        return 'Add additional instructions or follow-up actions to an existing minute.';
      case 'clarification':
        return 'Request clarification or provide additional context to an existing minute.';
      case 'addendum':
        return 'Add supplementary information or corrections to an existing minute.';
      default:
        return '';
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!currentUser) {
      toast.error('User information not available. Please refresh the page.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get current user's primary office
      const currentUserOfficeMembership = officeMemberships.find(
        (membership) => membership.userId === currentUser.id && membership.isActive && membership.isPrimary
      );
      const currentUserOfficeId = currentUserOfficeMembership?.officeId || correspondence.currentOfficeId || undefined;

      await apiFetch('/correspondence/minutes/', {
        method: 'POST',
        body: JSON.stringify({
          correspondence: correspondence.id,
          user_id: currentUser.id,
          grade_level: currentUser.gradeLevel,
          minute_text: minuteText.trim(),
          action_type: 'minute',
          direction: correspondence.direction,
          step_number: minutes.length + 1,
          from_office_id: currentUserOfficeId,
          minute_type: minuteType,
          is_additional: true,
          relates_to_minute: selectedMinuteId,
          purpose: 'action', // Additional minutes are typically for action
          requires_response: true,
        }),
      });

      await syncFromApi();
      toast.success(`${getMinuteTypeLabel(minuteType)} added successfully.`);
      onSuccess();
      onClose();
    } catch (error: Record<string, unknown>) {
      logError('Failed to add additional minute', error);
      const modalError = ModalErrorHandler.createErrorFromApi(error);
      toast.error(ModalErrorHandler.getUserFriendlyMessage(modalError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedMinute = availableMinutes.find(m => m.id === selectedMinuteId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px] w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Add Additional Minute / Instruction
          </DialogTitle>
          <DialogDescription>
            Add follow-up instructions, clarifications, or addendums to an existing minute.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-6 py-4">
            {/* Select Minute */}
            <div className="space-y-2">
              <Label htmlFor="minute-select">Select Minute *</Label>
              <Select value={selectedMinuteId} onValueChange={setSelectedMinuteId}>
                <SelectTrigger id="minute-select">
                  <SelectValue placeholder="Choose a minute to add instructions to" />
                </SelectTrigger>
                <SelectContent>
                  {availableMinutes.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No minutes available
                    </div>
                  ) : (
                    availableMinutes.map((minute) => (
                      <SelectItem key={minute.id} value={minute.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {minute.userName || 'Unknown'} - Step {minute.stepNumber}
                          </span>
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {minute.minuteText.substring(0, 60)}...
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedMinute && (
                <Card className="mt-2">
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          {selectedMinute.userName || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(selectedMinute.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-foreground line-clamp-3">
                        {selectedMinute.minuteText}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            {/* Minute Type */}
            <div className="space-y-2">
              <Label htmlFor="minute-type">Type *</Label>
              <Select value={minuteType} onValueChange={(v) => setMinuteType(v as 'instruction' | 'clarification' | 'addendum')}>
                <SelectTrigger id="minute-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instruction">
                    <div className="flex flex-col">
                      <span className="font-medium">Additional Instruction</span>
                      <span className="text-xs text-muted-foreground">
                        Add follow-up actions or instructions
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="clarification">
                    <div className="flex flex-col">
                      <span className="font-medium">Clarification</span>
                      <span className="text-xs text-muted-foreground">
                        Request or provide clarification
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="addendum">
                    <div className="flex flex-col">
                      <span className="font-medium">Addendum</span>
                      <span className="text-xs text-muted-foreground">
                        Add supplementary information or corrections
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-start gap-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{getMinuteTypeDescription(minuteType)}</span>
              </div>
            </div>

            <Separator />

            {/* Minute Text */}
            <div className="space-y-2">
              <Label htmlFor="additional-minute-text">
                {getMinuteTypeLabel(minuteType)} Content *
              </Label>
              <Textarea
                id="additional-minute-text"
                placeholder={
                  minuteType === 'instruction'
                    ? 'Enter additional instructions or follow-up actions...'
                    : minuteType === 'clarification'
                    ? 'Enter your clarification request or response...'
                    : 'Enter supplementary information or corrections...'
                }
                value={minuteText}
                onChange={(e) => handleTextChange(e.target.value)}
                className="min-h-[120px] resize-none"
              maxLength={MODAL_CONSTANTS.ADDITIONAL_MINUTE.MAX}
              aria-label="Additional minute content"
              aria-required="true"
              aria-invalid={!!minuteTextError}
              aria-describedby="additional-minute-text-help"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                {minuteTextError && <p className="text-destructive" role="alert">{minuteTextError}</p>}
                <span className={characterCount > MODAL_CONSTANTS.ADDITIONAL_MINUTE.MAX ? 'text-destructive' : ''}>
                  {characterCount} / {MODAL_CONSTANTS.ADDITIONAL_MINUTE.MAX} characters
                </span>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} aria-label="Cancel adding additional minute">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedMinuteId || !minuteText.trim()} aria-label={`Add ${getMinuteTypeLabel(minuteType)}`}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add {getMinuteTypeLabel(minuteType)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

