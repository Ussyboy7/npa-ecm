import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  FileCheck,
  Send,
  Edit3,
  Users,
  Download,
  Building2,
  Layers,
  Network
} from 'lucide-react';
import { toast } from 'sonner';
import { type Correspondence, type Minute, MOCK_USERS, getDivisionById, getDepartmentById } from '@/lib/npa-structure';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useUserPermissions } from '@/hooks/use-user-permissions';

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
  const { updateCorrespondence } = useCorrespondence();
  const { currentUser } = useCurrentUser();
  const permissions = useUserPermissions(currentUser ?? undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [summary, setSummary] = useState(generateAutoSummary(correspondence, minutes));
  const [selectedStakeholders, setSelectedStakeholders] = useState<string[]>(
    minutes.map(m => m.userId)
  );
  const allowedArchiveLevels = useMemo(
    () => permissions.allowedArchiveLevels,
    [permissions.allowedArchiveLevels]
  );
  const [archiveLevel, setArchiveLevel] = useState<'department' | 'division' | 'directorate'>(
    allowedArchiveLevels[allowedArchiveLevels.length - 1] ?? 'department'
  );

  useEffect(() => {
    if (!allowedArchiveLevels.includes(archiveLevel)) {
      setArchiveLevel(allowedArchiveLevels[allowedArchiveLevels.length - 1] ?? 'department');
    }
  }, [allowedArchiveLevels, archiveLevel]);

  const stakeholders = minutes.reduce((acc, minute) => {
    if (!acc.find(s => s.id === minute.userId)) {
      const user = MOCK_USERS.find(u => u.id === minute.userId);
      acc.push({ id: minute.userId, name: user?.name || 'Unknown User', role: minute.gradeLevel });
    }
    return acc;
  }, [] as { id: string; name: string; role: string }[]);

  const handleToggleStakeholder = (userId: string) => {
    setSelectedStakeholders(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSendSummary = () => {
    if (selectedStakeholders.length === 0) {
      toast.error('Please select at least one stakeholder');
      return;
    }

    // Mark correspondence as archived with selected archive level
    updateCorrespondence(correspondence.id, {
      status: 'archived',
      archiveLevel: archiveLevel,
    });

    const levelName = archiveLevel === 'department' ? 'Department' : archiveLevel === 'division' ? 'Division' : 'Directorate';
    toast.success('Correspondence archived successfully', {
      description: `Archived at ${levelName} level. Summary sent to ${selectedStakeholders.length} stakeholder(s)`
    });

    onOpenChange(false);
  };

  const handleExportPDF = () => {
    toast.info('Exporting summary as PDF...');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-success" />
            Correspondence Completion Summary
          </DialogTitle>
          <DialogDescription>
            Review and send summary to all stakeholders
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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

          {/* Stakeholder Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label>Stakeholders ({selectedStakeholders.length} selected)</Label>
            </div>
            <div className="border border-border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
              {stakeholders.map(stakeholder => (
                <div key={stakeholder.id} className="flex items-center gap-3">
                  <Checkbox
                    id={stakeholder.id}
                    checked={selectedStakeholders.includes(stakeholder.id)}
                    onCheckedChange={() => handleToggleStakeholder(stakeholder.id)}
                  />
                  <Label 
                    htmlFor={stakeholder.id} 
                    className="flex-1 cursor-pointer font-normal"
                  >
                    <span className="font-medium">{stakeholder.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({stakeholder.role})
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Archive Level Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-muted-foreground" />
              <Label>Archive Level *</Label>
            </div>
            <div className="p-4 border border-border rounded-lg bg-muted/30">
              <RadioGroup value={archiveLevel} onValueChange={(v: any) => setArchiveLevel(v)}>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                    <RadioGroupItem
                      value="department"
                      id="archive-department"
                      className="mt-1"
                      disabled={!allowedArchiveLevels.includes('department')}
                    />
                    <Label htmlFor="archive-department" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="font-semibold">Departmental Archive</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Only visible to members of this department
                      </p>
                    </Label>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                    <RadioGroupItem
                      value="division"
                      id="archive-division"
                      className="mt-1"
                      disabled={!allowedArchiveLevels.includes('division')}
                    />
                    <Label htmlFor="archive-division" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <Layers className="h-4 w-4 text-secondary" />
                        <span className="font-semibold">Divisional Archive</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Visible to only division head (General Manager)
                      </p>
                    </Label>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                    <RadioGroupItem
                      value="directorate"
                      id="archive-directorate"
                      className="mt-1"
                      disabled={!allowedArchiveLevels.includes('directorate')}
                    />
                    <Label htmlFor="archive-directorate" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <Network className="h-4 w-4 text-success" />
                        <span className="font-semibold">Directorate Archive</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Visible to only directorate head (Executive Director or Managing Director)
                      </p>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Preview Email */}
          <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
            <p className="text-sm font-semibold mb-2">Email Preview:</p>
            <p className="text-xs text-muted-foreground">
              Subject: Completion Summary - {correspondence.referenceNumber}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              This summary will be sent to all selected stakeholders with a PDF attachment.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendSummary} className="bg-gradient-secondary">
              <Send className="h-4 w-4 mr-2" />
              Archive & Send Summary
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function generateAutoSummary(correspondence: Correspondence, minutes: Minute[]): string {
  const routingPath = minutes.map(m => m.gradeLevel).join(' → ');
  const actions = minutes
    .filter(m => m.actionType === 'treat')
    .map(m => `- ${m.minuteText}`)
    .join('\n');

  return `Subject: ${correspondence.subject}

Reference: ${correspondence.referenceNumber}

Date Received: ${new Date(correspondence.receivedDate).toLocaleDateString()}

Routing Path: ${routingPath}

Key Actions Taken:
${actions || '- Actions completed as per instructions'}

Final Outcome: Successfully completed and ready for archival.

Participants: ${minutes.length} stakeholder(s) involved in processing`;
}
