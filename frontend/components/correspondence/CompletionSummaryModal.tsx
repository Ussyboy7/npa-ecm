import { logError } from '@/lib/client-logger';
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ModalErrorHandler } from '@/lib/modal-errors';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileCheck,
  Send,
  Edit3,
  Users,
  Download,
  CheckSquare,
  Square,
  Loader2,
  FileText,
  Calendar,
  Clock,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { type Correspondence, type Minute } from '@/lib/npa-structure';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';

interface CompletionSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  correspondence: Correspondence;
  minutes: Minute[];
}

export const CompletionSummaryModal = ({ 
  open, 
  onOpenChange, 
  correspondence,
  minutes 
}: CompletionSummaryModalProps) => {
  const { syncFromApi } = useCorrespondence();
  const { currentUser } = useCurrentUser();
  const { users } = useOrganization();
  const [isEditing, setIsEditing] = useState(false);
  const [summary, setSummary] = useState(generateAutoSummary(correspondence, minutes, users));
  const [stakeholdersError, setStakeholdersError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Get all unique stakeholders who participated in processing this correspondence
  const stakeholders = useMemo(() => {
    const participantMap = new Map<string, { id: string; name: string; role: string; department?: string }>();
    
    // Add all minute creators
    minutes.forEach(minute => {
      if (!participantMap.has(minute.userId)) {
        const user = users.find((u) => u.id === minute.userId);
        participantMap.set(minute.userId, {
          id: minute.userId,
          name: user?.name || 'Unknown User',
          role: minute.gradeLevel,
          department: user?.department
        });
      }
    });

    // Add current approver if exists and not already included
    if (correspondence.currentApproverId && !participantMap.has(correspondence.currentApproverId)) {
      const user = users.find((u) => u.id === correspondence.currentApproverId);
      if (user) {
        participantMap.set(correspondence.currentApproverId, {
          id: correspondence.currentApproverId,
          name: user.name,
          role: user.gradeLevel || 'Staff',
          department: user.department
        });
      }
    }

    // Add correspondence creator if not already included
    if (correspondence.createdById && !participantMap.has(correspondence.createdById)) {
      const user = users.find((u) => u.id === correspondence.createdById);
      if (user) {
        participantMap.set(correspondence.createdById, {
          id: correspondence.createdById,
          name: user.name,
          role: user.gradeLevel || 'Staff',
          department: user.department
        });
      }
    }

    return Array.from(participantMap.values());
  }, [minutes, users, correspondence.currentApproverId, correspondence.createdById]);

  // Auto-select all stakeholders by default
  const [selectedStakeholders, setSelectedStakeholders] = useState<string[]>([]);
  
  // Initialize selected stakeholders when stakeholders list changes
  useEffect(() => {
    setSelectedStakeholders(stakeholders.map(s => s.id));
  }, [stakeholders]);

  const handleToggleStakeholder = (userId: string) => {
    setSelectedStakeholders(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const validateForm = (): boolean => {
    setStakeholdersError('');

    if (selectedStakeholders.length === 0) {
      setStakeholdersError('Please select at least one stakeholder to receive the summary');
      return false;
    }

    return true;
  };

  const handleSendSummary = () => {
    if (!validateForm()) {
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      // Update correspondence status to completed via API
      const updateData: Record<string, unknown> = {
        status: 'completed',
        completed_at: new Date().toISOString(),
        archive_level: 'department', // Set default archive level for completed correspondence
      };

      // Only set organizational fields if they're not already set
      if (!correspondence.divisionId) {
        updateData.division = currentUser?.division;
      }
      if (!correspondence.departmentId) {
        updateData.department = currentUser?.department;
      }
      if (!correspondence.directorateId) {
        updateData.directorate = currentUser?.directorate;
      }

      await apiFetch(`/correspondence/items/${correspondence.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      await syncFromApi();

      toast.success('Correspondence completed & archived', {
        description: `Completion summary will be sent to ${selectedStakeholders.length} participant(s)`
      });

      setShowConfirmation(false);
      onOpenChange(false);
    } catch (error: unknown) {
      logError('Failed to archive correspondence', error);
      const modalError = ModalErrorHandler.createErrorFromApi(error);
      toast.error(ModalErrorHandler.getUserFriendlyMessage(modalError));
      setShowConfirmation(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAll = () => {
    setSelectedStakeholders(stakeholders.map(s => s.id));
    if (stakeholdersError) setStakeholdersError('');
  };

  const handleDeselectAll = () => {
    setSelectedStakeholders([]);
  };

  const allSelected = selectedStakeholders.length === stakeholders.length;
  const noneSelected = selectedStakeholders.length === 0;

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Generate PDF using browser's print functionality with styled HTML
      const selectedStakeholderNames = stakeholders
        .filter(s => selectedStakeholders.includes(s.id))
        .map(s => `${s.name} (${s.role})`)
        .join(', ');

      const processingTime = calculateProcessingTime(correspondence.receivedDate);
      const completionDate = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Completion Summary - ${correspondence.referenceNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Times New Roman', Times, serif; 
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              line-height: 1.6;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #1a365d;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo-text {
              font-size: 18px;
              font-weight: bold;
              color: #1a365d;
              margin-bottom: 5px;
            }
            .doc-title {
              font-size: 24px;
              font-weight: bold;
              color: #1a365d;
              margin-top: 15px;
            }
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 14px;
              font-weight: bold;
              color: #1a365d;
              text-transform: uppercase;
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
              margin-bottom: 10px;
            }
            .field {
              margin-bottom: 12px;
            }
            .field-label {
              font-weight: bold;
              color: #555;
              font-size: 12px;
              text-transform: uppercase;
            }
            .field-value {
              font-size: 14px;
              margin-top: 3px;
            }
            .routing-path {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin-top: 10px;
            }
            .routing-step {
              background: #f0f4f8;
              padding: 6px 12px;
              border-radius: 4px;
              font-size: 12px;
              border: 1px solid #d0d7de;
            }
            .minutes-list {
              margin-top: 10px;
            }
            .minute-item {
              padding: 12px;
              background: #f8f9fa;
              border-left: 3px solid #1a365d;
              margin-bottom: 10px;
            }
            .minute-header {
              font-weight: bold;
              font-size: 13px;
              color: #1a365d;
            }
            .minute-text {
              font-size: 13px;
              margin-top: 5px;
              font-style: italic;
            }
            .minute-date {
              font-size: 11px;
              color: #666;
              margin-top: 5px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ccc;
              font-size: 11px;
              color: #666;
              text-align: center;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              background: #22c55e;
              color: white;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-top: 15px;
            }
            .stat-box {
              text-align: center;
              padding: 15px;
              background: #f0f4f8;
              border-radius: 8px;
            }
            .stat-value {
              font-size: 20px;
              font-weight: bold;
              color: #1a365d;
            }
            .stat-label {
              font-size: 11px;
              color: #666;
              text-transform: uppercase;
            }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-text">NIGERIAN PORTS AUTHORITY</div>
            <div style="font-size: 12px; color: #666;">Enterprise Content Management System</div>
            <div class="doc-title">Correspondence Completion Summary</div>
          </div>

          <div class="section">
            <div class="section-title">Correspondence Details</div>
            <div class="field">
              <div class="field-label">Reference Number</div>
              <div class="field-value">${correspondence.referenceNumber}</div>
            </div>
            <div class="field">
              <div class="field-label">Subject</div>
              <div class="field-value">${correspondence.subject}</div>
            </div>
            <div class="field">
              <div class="field-label">Status</div>
              <div class="field-value"><span class="status-badge">COMPLETED</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Timeline</div>
            <div class="stats-grid">
              <div class="stat-box">
                <div class="stat-value">${new Date(correspondence.receivedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                <div class="stat-label">Date Received</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${completionDate}</div>
                <div class="stat-label">Date Completed</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${processingTime}</div>
                <div class="stat-label">Processing Time</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Routing Path (${minutes.length} steps)</div>
            <div class="routing-path">
              ${minutes.map((m, idx) => {
                const user = users.find(u => u.id === m.userId);
                return `<div class="routing-step">${idx + 1}. ${user?.name || 'Unknown'} (${m.gradeLevel})</div>`;
              }).join(' → ')}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Minute Thread</div>
            <div class="minutes-list">
              ${minutes.length > 0 ? minutes.map(m => {
                const user = users.find(u => u.id === m.userId);
                return `
                  <div class="minute-item">
                    <div class="minute-header">${user?.name || 'Unknown'} — ${m.gradeLevel}</div>
                    <div class="minute-text">"${m.minuteText}"</div>
                    <div class="minute-date">${new Date(m.timestamp).toLocaleString('en-GB')}</div>
                  </div>
                `;
              }).join('') : '<p style="color: #666; font-style: italic;">No minutes recorded.</p>'}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Participants Notified (${selectedStakeholders.length})</div>
            <div class="field-value">${selectedStakeholderNames || 'None selected'}</div>
          </div>

          <div class="footer">
            <p>Generated by NPA ECM System on ${new Date().toLocaleString('en-GB')}</p>
            <p>This is an official completion summary document.</p>
          </div>
        </body>
        </html>
      `;

      // Open print dialog
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        
        // Slight delay to ensure content is loaded
        setTimeout(() => {
          printWindow.print();
        }, 250);
        
        toast.success('PDF export ready', {
          description: 'Use Print → Save as PDF in the dialog'
        });
      } else {
        throw new Error('Could not open print window. Please check popup blocker settings.');
      }
    } catch (error: unknown) {
      logError('Failed to export PDF', error);
      toast.error('Unable to export summary', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate processing time
  function calculateProcessingTime(receivedDate: string): string {
    const received = new Date(receivedDate);
    const now = new Date();
    const diffMs = now.getTime() - received.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    }
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Complete & Archive Correspondence
          </DialogTitle>
          <DialogDescription>
            Mark this correspondence as complete and notify all participants
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-220px)] sm:max-h-[calc(90vh-220px)] pr-4">
          <div className="space-y-6 py-2">
          {/* Document Summary */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm mb-1">{correspondence.subject}</p>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    <span>Ref: {correspondence.referenceNumber}</span>
                    <span>•</span>
                    <span>Received: {new Date(correspondence.receivedDate).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Processing: {calculateProcessingTime(correspondence.receivedDate)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    correspondence.priority === 'urgent' ? 'destructive' :
                    correspondence.priority === 'high' ? 'default' :
                    'secondary'
                  }>
                    {correspondence.priority}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto-Generated Summary */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Summary</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                {isEditing ? 'View Mode' : 'Edit Summary'}
              </Button>
            </div>

            {isEditing ? (
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={15}
                className="font-mono text-sm"
              />
            ) : (
              <div className="p-4 border border-border rounded-lg bg-muted/30 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Subject:</p>
                  <p className="text-sm">{correspondence.subject}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Reference:</p>
                  <p className="text-sm">{correspondence.referenceNumber}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Date Received:</p>
                  <p className="text-sm">{new Date(correspondence.receivedDate).toLocaleDateString()}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Routing Path:</p>
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    {minutes.map((minute, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Badge variant="outline">{minute.gradeLevel}</Badge>
                        {idx < minutes.length - 1 && (
                          <span className="text-muted-foreground">→</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">Key Actions:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {minutes
                      .filter(m => m.actionType === 'treat')
                      .map((minute, idx) => (
                        <li key={idx}>{minute.minuteText}</li>
                      ))}
                  </ul>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Final Outcome:</p>
                  <p className="text-sm mt-1">
                    {summary.split('Final Outcome:')[1]?.trim() || 'Successfully completed'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Participants Selection */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <Label>
                      Notify Participants ({selectedStakeholders.length} of {stakeholders.length} selected)
                      <span className="text-muted-foreground text-xs font-normal ml-1">*</span>
                    </Label>
                  </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={allSelected}
                  className="h-7 text-xs"
                >
                  <CheckSquare className="h-3 w-3 mr-1" />
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                  disabled={noneSelected}
                  className="h-7 text-xs"
                >
                  <Square className="h-3 w-3 mr-1" />
                  Deselect All
                </Button>
              </div>
            </div>
            
            {stakeholders.length === 0 ? (
              <div className="border rounded-lg p-4 bg-muted/30 text-center">
                <p className="text-sm text-muted-foreground">
                  No participants found. The correspondence creator will be notified.
                </p>
              </div>
            ) : (
              <div className={`border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto ${stakeholdersError ? 'border-destructive' : 'border-border'}`}>
                {stakeholders.map(stakeholder => (
                  <div key={stakeholder.id} className="flex items-center gap-3 p-2 rounded hover:bg-accent/50 transition-colors">
                    <Checkbox
                      id={stakeholder.id}
                      checked={selectedStakeholders.includes(stakeholder.id)}
                      onCheckedChange={() => {
                        handleToggleStakeholder(stakeholder.id);
                        if (stakeholdersError) setStakeholdersError('');
                      }}
                      aria-label={`Select ${stakeholder.name} as participant`}
                    />
                    <Label 
                      htmlFor={stakeholder.id} 
                      className="flex-1 cursor-pointer font-normal"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{stakeholder.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground ml-5">
                        {stakeholder.role}{stakeholder.department ? ` • ${stakeholder.department}` : ''}
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            )}
            {stakeholdersError && (
              <p className="text-xs text-destructive" role="alert">
                {stakeholdersError}
              </p>
            )}
                <p className="text-xs text-muted-foreground">
                  All selected participants will receive an email notification with the completion summary and attachments.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Email Notification Preview */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Send className="h-4 w-4 text-primary" />
                <Label>Notification Preview</Label>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><strong>Subject:</strong> Correspondence Completed - {correspondence.referenceNumber}</p>
                <p><strong>Recipients:</strong> {selectedStakeholders.length} participant(s)</p>
                <p className="mt-2 pt-2 border-t">
                  This notification will include the completion summary, minute thread, and any attachments.
                </p>
              </div>
            </CardContent>
          </Card>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={isExporting || isSubmitting}
            className="gap-2"
            aria-label="Export summary as PDF"
          >
            <Download className="h-4 w-4" />
            Export Summary
            {isExporting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || isExporting}
              aria-label="Cancel archiving"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendSummary}
              disabled={isSubmitting || isExporting || noneSelected}
              className="bg-gradient-primary hover:opacity-90 transition-opacity gap-2"
              aria-label="Complete correspondence and notify participants"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4" />
                  Complete & Notify
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-success" />
              Confirm Completion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this correspondence as complete?
            </AlertDialogDescription>
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>Reference: <strong>{correspondence.referenceNumber}</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Notify: <strong>{selectedStakeholders.length} participant(s)</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Processing time: <strong>{calculateProcessingTime(correspondence.receivedDate)}</strong></span>
                </li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              This action cannot be undone. The correspondence will be archived and all selected participants will receive a notification.
            </p>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="bg-gradient-success hover:opacity-90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4 mr-2" />
                  Confirm Completion
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

function generateAutoSummary(correspondence: Correspondence, minutes: Minute[], users: unknown[]): string {
  const routingPath = minutes.map(m => {
    const user = (users as any[]).find((u: any) => u.id === m.userId);
    return `${user?.name || 'Unknown'} (${m.gradeLevel})`;
  }).join(' → ');

  const actions = minutes
    .filter(m => m.actionType === 'treat')
    .map(m => {
      const user = (users as any[]).find((u: any) => u.id === m.userId);
      return `- ${user?.name || 'Unknown'}: ${m.minuteText}`;
    })
    .join('\n');

  const receivedDate = new Date(correspondence.receivedDate);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));

  return `CORRESPONDENCE COMPLETION SUMMARY
================================

Subject: ${correspondence.subject}

Reference: ${correspondence.referenceNumber}

Date Received: ${receivedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}

Date Completed: ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}

Processing Time: ${diffDays} day(s)

Routing Path:
${routingPath || 'Direct processing'}

Key Actions Taken:
${actions || '- Processed as per standard procedures'}

Final Outcome: Successfully completed and archived.

Participants: ${minutes.length} officer(s) involved in processing this correspondence.`;
}