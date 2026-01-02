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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Send, User, AlertCircle, Users } from 'lucide-react';

interface DistributionRecipient {
  id?: string;
  type: 'directorate' | 'division' | 'department';
  name?: string;
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
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6">
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
                            (recipient.type === 'directorate' ? 'Directorate' : 
                             recipient.type === 'division' ? 'Division' : 'Department');
                          const purposeLabel = recipient.purpose === 'action' ? 'Action' : 
                                               recipient.purpose === 'comment' ? 'Comment' : 'Information';
                          return (
                            <div key={recipient.id || idx} className="flex items-center gap-2 text-xs">
                              <Badge variant="outline" className="text-[10px] h-4 flex-shrink-0">
                                {recipient.type === 'directorate' ? 'Dir' : 
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
                <p className="text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {data.content}
                </p>
              </CardContent>
            </Card>
          </div>
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
