import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useOrganization } from '@/contexts/OrganizationContext';
import { MOCK_USERS } from '@/lib/npa-structure';
import { toast } from 'sonner';

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
  const { assistantAssignments } = useOrganization();
  const [selectedAssistant, setSelectedAssistant] = useState('');
  const [delegationNotes, setDelegationNotes] = useState('');

  // Get assistants assigned to this executive
  const availableAssistants = assistantAssignments
    .filter(assignment => assignment.executiveId === executiveId)
    .map(assignment => {
      const user = MOCK_USERS.find(u => u.id === assignment.assistantId);
      return {
        ...assignment,
        userName: user?.name || 'Unknown User',
      };
    });

  useEffect(() => {
    if (!open) {
      setSelectedAssistant('');
      setDelegationNotes('');
    }
  }, [open]);

  const handleSubmit = () => {
    if (!selectedAssistant) {
      toast.error('Please select an assistant');
      return;
    }

    const assignment = availableAssistants.find(a => a.assistantId === selectedAssistant);
    if (!assignment) {
      toast.error('Invalid assistant selection');
      return;
    }

    onDelegate(selectedAssistant, assignment.type, delegationNotes);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delegate to Assistant</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {availableAssistants.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No assistants assigned to you. Please contact administration to assign a TA or PA.
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="assistant">Select Assistant</Label>
                <Select value={selectedAssistant} onValueChange={setSelectedAssistant}>
                  <SelectTrigger id="assistant">
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Delegation Instructions (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any specific instructions for the assistant..."
                  value={delegationNotes}
                  onChange={(e) => setDelegationNotes(e.target.value)}
                  rows={4}
                />
              </div>

              {selectedAssistant && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium mb-1">Permissions granted:</p>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {availableAssistants
                      .find(a => a.assistantId === selectedAssistant)
                      ?.permissions.map(permission => (
                        <li key={permission}>{permission}</li>
                      ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {availableAssistants.length > 0 && (
            <Button onClick={handleSubmit} disabled={!selectedAssistant}>
              Delegate
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
