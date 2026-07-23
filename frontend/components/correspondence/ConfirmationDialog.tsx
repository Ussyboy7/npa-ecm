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
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Send, User, AlertCircle, Users, Paperclip, Eye } from 'lucide-react';

interface DistributionRecipient {
  id?: string;
  type: 'office' | 'directorate' | 'division' | 'department';
  name?: string;
  officeId?: string;
  directorateId?: string;
  divisionId?: string;
  departmentId?: string;
  purpose?: 'information' | 'action' | 'comment';
}

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  type: 'minute' | 'treatment';
  data: {
    currentUserName: string;
    recipientName: string;
    actionType?: string;
    subject?: string;
    content: string;
    onBehalfOf?: string;
    direction?: 'upward' | 'downward';
    distribution?: DistributionRecipient[];
    fileAttachments?: { name: string; size: number; url?: string }[];
  };
  disabled?: boolean;
}

export const ConfirmationDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  type,
  data,
  disabled = false
}: ConfirmationDialogProps) => {
  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent size="2xl" height="scroll">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-accent" />
            Confirm {type === 'minute' ? 'Minute Submission' : 'Response Submission'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Please review the details before submitting. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Action Summary */}
          <Card className="bg-muted/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">From</p>
                  <p className="text-sm text-muted-foreground">{data.currentUserName}</p>
                  {data.onBehalfOf && (
                    <p className="text-xs text-muted-foreground mt-1">
                      On behalf of: {data.onBehalfOf}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-2">
                <Send className="h-4 w-4 text-secondary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">To</p>
                  <p className="text-sm text-muted-foreground">{data.recipientName}</p>
                </div>
              </div>

              {type === 'minute' && data.actionType && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <Badge variant={data.actionType === 'approve' ? 'default' : 'secondary'}>
                      {data.actionType === 'approve' ? 'Approve & Forward' : 'Minute Only'}
                    </Badge>
                    {data.direction && (
                      <Badge variant="outline">
                        {data.direction === 'upward' ? 'Upward' : 'Downward'}
                      </Badge>
                    )}
                  </div>
                </>
              )}

              {data.distribution && data.distribution.length > 0 && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Distribution (CC)</p>
                      <div className="mt-2 space-y-1.5">
                        {data.distribution.map((recipient, idx) => {
                          const recipientName = recipient.name || 
                            (recipient.type === 'office' ? 'Office' :
                             recipient.type === 'directorate' ? 'Directorate' : 
                             recipient.type === 'division' ? 'Division' : 'Department');
                          const purposeLabel = recipient.purpose === 'action' ? 'Action' : 
                                               recipient.purpose === 'comment' ? 'Comment' : 'Information';
                          return (
                            <div key={recipient.id || idx} className="flex items-center gap-2 text-xs">
                              <Badge variant="outline" className="text-[10px] h-4 flex-shrink-0">
                                {recipient.type === 'office' ? 'Off' :
                                 recipient.type === 'directorate' ? 'Dir' : 
                                 recipient.type === 'department' ? 'Dept' : 'Div'}
                              </Badge>
                              <span className="text-muted-foreground flex-1">{recipientName}</span>
                              <Badge variant="outline" className="text-[10px] h-4 flex-shrink-0">
                                {purposeLabel}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {type === 'treatment' && data.subject && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium">Subject</p>
                    <p className="text-sm text-muted-foreground">{data.subject}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Content Preview */}
          <div>
            <p className="text-sm font-semibold mb-2">Content Preview</p>
            <Card>
              <CardContent className="p-4">
                <div
                  className="prose prose-sm dark:prose-invert max-w-none max-h-80 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: data.content }}
                />
              </CardContent>
            </Card>
          </div>

          {data.fileAttachments && data.fileAttachments.length > 0 && (
            <>
              <Separator />
              <div className="flex items-start gap-2">
                <Paperclip className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Attachments ({data.fileAttachments.length})</p>
                  <div className="mt-1 space-y-1">
                    {data.fileAttachments.map((f, i) => (
                      <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="flex-1 truncate">{f.name}</span>
                        <span className="text-xs flex-shrink-0">({(f.size / 1024).toFixed(1)} KB)</span>
                        {f.url && (
                          <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                            <Eye className="h-3.5 w-3.5 text-primary hover:text-primary/80" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={disabled}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            disabled={disabled}
            className="bg-gradient-primary hover:opacity-90"
          >
            <Send className="h-4 w-4 mr-2" />
            Confirm & Send
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
