import { logError } from '@/lib/client-logger';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import type { Minute } from '@/lib/npa-structure';
import { apiFetch } from '@/lib/api-client';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { MODAL_CONSTANTS } from '@/lib/modal-constants';
import { ModalErrorHandler } from '@/lib/modal-errors';

interface EditMinuteModalProps {
  minute: Minute | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditMinuteModal = ({ minute, isOpen, onClose, onSuccess }: EditMinuteModalProps) => {
  const { syncFromApi } = useCorrespondence();
  const [minuteText, setMinuteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (minute && isOpen) {
      setMinuteText(minute.minuteText);
      setError(null);
    }
  }, [minute, isOpen]);

  useEffect(() => {
    if (!minute?.editWindowExpiresAt || !isOpen) return;

    const updateTimeRemaining = () => {
      const expiresAt = new Date(minute.editWindowExpiresAt!);
      const now = new Date();
      const diffMs = expiresAt.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeRemaining('Edit window expired');
        return;
      }

      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      setTimeRemaining(`${diffMins}m ${diffSecs}s remaining`);
    };

    updateTimeRemaining();
    // Update every 10 seconds instead of every second for better performance
    const interval = setInterval(updateTimeRemaining, 10000);

    return () => clearInterval(interval);
  }, [minute?.editWindowExpiresAt, isOpen]);

  const handleSubmit = async () => {
    if (!minute) return;

    if (!minuteText.trim()) {
      setError('Minute text is required');
      return;
    }

    if (minuteText.trim() === minute.minuteText) {
      toast.info('No changes made');
      onClose();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiFetch(`/correspondence/minutes/${minute.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          minute_text: minuteText.trim(),
        }),
      });

      await syncFromApi();
      toast.success('Minute updated successfully');
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      logError('Failed to update minute', error);
      const modalError = ModalErrorHandler.createErrorFromApi(error as Record<string, unknown>);
      const errorMessage = ModalErrorHandler.getUserFriendlyMessage(modalError);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!minute) return null;

  const canEdit = minute.canBeEdited ?? false;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Edit Minute
          </DialogTitle>
          <DialogDescription>
            {canEdit ? (
              <>
                Edit your minute within the {MODAL_CONSTANTS.EDIT_WINDOW_MINUTES}-minute window. 
                {timeRemaining && <span className="text-warning ml-1">{timeRemaining}</span>}
              </>
            ) : (
              `This minute cannot be edited. It has either been opened/acted upon or the ${MODAL_CONSTANTS.EDIT_WINDOW_MINUTES}-minute window has expired.`
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!canEdit && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>This minute can no longer be edited.</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="minute-text">Minute Text *</Label>
            <Textarea
              id="minute-text"
              placeholder="Enter your comments, instructions, or recommendations..."
              value={minuteText}
              onChange={(e) => setMinuteText(e.target.value)}
              className="min-h-[200px] resize-none"
              disabled={!canEdit || isSubmitting}
              maxLength={MODAL_CONSTANTS.MINUTE_TEXT.MAX}
              aria-label="Minute text"
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby="minute-text-help"
            />
            <p id="minute-text-help" className={`text-xs ${minuteText.length > MODAL_CONSTANTS.MINUTE_TEXT.MAX ? 'text-destructive' : 'text-muted-foreground'}`}>
              {minuteText.length} / {MODAL_CONSTANTS.MINUTE_TEXT.MAX} characters
            </p>
          </div>

          {minute.originalMinuteText && minute.originalMinuteText !== minute.minuteText && (
            <div className="p-3 rounded-lg bg-muted/30 border border-border border-dashed">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Original Text:</p>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap line-through">
                {minute.originalMinuteText}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isSubmitting} aria-label="Cancel edit">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canEdit || isSubmitting || !minuteText.trim() || minuteText.trim() === minute.minuteText}
              aria-label="Update minute"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Update Minute
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

