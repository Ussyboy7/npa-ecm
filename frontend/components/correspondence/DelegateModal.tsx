import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { logError } from '@/lib/client-logger';

interface DelegateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  correspondenceId: string;
  executiveId: string;
  onDelegate: (assistantId: string, assistantType: 'TA' | 'PA', notes: string) => void;
}

export const DelegateModal = ({
  open,
  onOpenChange,
  correspondenceId,
  executiveId,
  onDelegate,
}: DelegateModalProps) => {
  const { assistantAssignments, users } = useOrganization();
  const [selectedAssistant, setSelectedAssistant] = useState('');
  const [selectedAssistantError, setSelectedAssistantError] = useState('');
  const [delegationNotes, setDelegationNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Get assistants assigned to this executive
  const availableAssistants = assistantAssignments
    .filter(assignment => assignment.executiveId === executiveId)
    .map(assignment => {
      const user = users.find(u => u.id === assignment.assistantId);
      return {
        ...assignment,
        userName: user?.name || 'Unknown User',
      };
    });

  useEffect(() => {
    if (!open) {
      setSelectedAssistant('');
      setDelegationNotes('');
      setSelectedAssistantError('');
      setShowConfirmation(false);
    }
  }, [open]);

  const validateForm = (): boolean => {
    setSelectedAssistantError('');

    if (!selectedAssistant) {
      setSelectedAssistantError('Please select an assistant');
      return false;
    }

    const assignment = availableAssistants.find(a => a.assistantId === selectedAssistant);
    if (!assignment) {
      setSelectedAssistantError('Invalid assistant selection');
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
    const assignment = availableAssistants.find(a => a.assistantId === selectedAssistant);
    if (!assignment) {
      toast.error('Invalid assistant selection');
      setShowConfirmation(false);
      return;
    }

    setIsSubmitting(true);
    try {
      onDelegate(selectedAssistant, assignment.type, delegationNotes);
      setShowConfirmation(false);
      onOpenChange(false);
    } catch (error) {
      logError('Failed to delegate correspondence', error);
      toast.error('Unable to delegate correspondence', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
      setShowConfirmation(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAssistantData = availableAssistants.find(a => a.assistantId === selectedAssistant);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delegate to Assistant</DialogTitle>
          <DialogDescription>
            Assign this correspondence to your TA or PA to handle on your behalf. They will have the permissions you've granted them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {availableAssistants.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No assistants assigned to you. Please contact administration to assign a TA or PA.
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="assistant">
                  Select Assistant * <span className="text-muted-foreground text-xs font-normal">(Required)</span>
                </Label>
                <Select 
                  value={selectedAssistant} 
                  onValueChange={(value) => {
                    setSelectedAssistant(value);
                    if (selectedAssistantError) setSelectedAssistantError('');
                  }}
                >
                  <SelectTrigger 
                    id="assistant"
                    aria-label="Select assistant"
                    aria-required="true"
                    aria-invalid={!!selectedAssistantError}
                    aria-describedby={selectedAssistantError ? "assistant-error" : undefined}
                  >
                    <SelectValue placeholder="Choose TA or PA" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAssistants.map(assistant => (
                      <SelectItem key={assistant.assistantId} value={assistant.assistantId}>
                        {assistant.userName} ({assistant.type})
                        {assistant.specialization && ` - ${assistant.specialization}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAssistantError && (
                  <p id="assistant-error" className="text-xs text-destructive" role="alert">
                    {selectedAssistantError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">
                  Delegation Instructions <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Add any specific instructions for the assistant..."
                  value={delegationNotes}
                  onChange={(e) => setDelegationNotes(e.target.value)}
                  rows={4}
                  aria-label="Delegation instructions"
                  aria-describedby="notes-help"
                />
                <p id="notes-help" className="text-xs text-muted-foreground">
                  Provide specific guidance on how the assistant should handle this correspondence
                </p>
              </div>

              {selectedAssistantData && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium mb-1">Permissions granted:</p>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {selectedAssistantData.permissions.map(permission => (
                      <li key={permission}>{permission}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} aria-label="Cancel delegation">
            Cancel
          </Button>
          {availableAssistants.length > 0 && (
            <Button 
              onClick={handleSubmit} 
              disabled={!selectedAssistant || isSubmitting}
              aria-label="Delegate to assistant"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Delegating...
                </>
              ) : (
                'Delegate'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delegation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delegate this correspondence to <strong>{selectedAssistantData?.userName}</strong> ({selectedAssistantData?.type})?
              {delegationNotes && (
                <>
                  <br /><br />
                  <strong>Instructions:</strong> {delegationNotes}
                </>
              )}
              <br /><br />
              The assistant will be able to act on your behalf based on their assigned permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="bg-primary hover:opacity-90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Delegating...
                </>
              ) : (
                'Confirm Delegation'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
