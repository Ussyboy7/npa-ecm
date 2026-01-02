import { logError } from '@/lib/client-logger';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, X } from 'lucide-react';
import type { Minute } from '@/lib/npa-structure';
import { apiFetch } from '@/lib/api-client';
import { MODAL_CONSTANTS } from '@/lib/modal-constants';
import { ModalErrorHandler } from '@/lib/modal-errors';

interface RecallMinuteModalProps {
  minute: Minute | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecallMinuteModal = ({
  minute,
  isOpen,
  onClose,
  onSuccess,
}: RecallMinuteModalProps) => {
  const [recallReason, setRecallReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!minute) return null;

  // Log minute status for debugging
  if (minute.isRecalled || minute.recalledAt) {
    logWarn('[RecallMinuteModal] Minute is already recalled:', {
      id: minute.id,
      isRecalled: minute.isRecalled,
      recalledAt: minute.recalledAt,
      canBeRecalled: minute.canBeRecalled,
    });
  }

  const handleSubmit = async () => {
    // Validate character limit
    if (recallReason.length > MODAL_CONSTANTS.RECALL_REASON.MAX) {
      toast.error(`Reason cannot exceed ${MODAL_CONSTANTS.RECALL_REASON.MAX} characters.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch(`/correspondence/minutes/${minute.id}/recall/`, {
        method: 'POST',
        body: JSON.stringify({
          recall_reason: recallReason.trim() || undefined,
        }),
      });

      toast.success('Minute recalled successfully. Recipients have been notified.');
      onSuccess();
      onClose();
      setRecallReason('');
    } catch (error: Record<string, unknown>) {
      logError('Failed to recall minute', error);
      const modalError = ModalErrorHandler.createErrorFromApi(error);
      const errorMessage = ModalErrorHandler.getUserFriendlyMessage(modalError);
      
      // If backend says it's already recalled, close modal and refresh parent data
      if (errorMessage.toLowerCase().includes('already been recalled')) {
        onSuccess(); // Refresh parent data to sync state
        onClose(); // Close modal so UI can update
        setRecallReason('');
        return;
      }
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[500px] w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Recall Minute
          </DialogTitle>
          <DialogDescription>
            Withdraw this minute. This action cannot be undone. The minute will be marked as recalled and recipients will be notified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Recalling this minute will withdraw it from the recipient. This action is permanent and will be recorded in the audit trail.
            </AlertDescription>
          </Alert>

          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm font-semibold text-foreground mb-1">Minute Content:</p>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {minute.minuteText}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recall-reason">
              Reason for Recall <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="recall-reason"
              placeholder="Enter reason for recalling this minute (optional)..."
              value={recallReason}
              onChange={(e) => setRecallReason(e.target.value)}
              className="min-h-[80px] resize-none"
              maxLength={MODAL_CONSTANTS.RECALL_REASON.MAX}
              aria-label="Reason for recall"
              aria-describedby="recall-reason-help"
            />
            <p id="recall-reason-help" className="text-xs text-muted-foreground">
              {recallReason.length} / {MODAL_CONSTANTS.RECALL_REASON.MAX} characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} aria-label="Cancel recall">
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit} 
            disabled={isSubmitting || !minute.canBeRecalled || minute.isRecalled || !!minute.recalledAt}
            aria-label="Confirm recall minute"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Recalling...
              </>
            ) : (
              <>
                <X className="h-4 w-4 mr-2" />
                Recall Minute
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

