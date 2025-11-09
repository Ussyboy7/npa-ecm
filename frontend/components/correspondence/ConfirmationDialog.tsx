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
import { CheckCircle, Send, User, AlertCircle } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: 'minute' | 'treatment';
  data: {
    currentUserName: string;
    recipientName: string;
    actionType?: string;
    subject?: string;
    content: string;
    onBehalfOf?: string;
    direction?: 'upward' | 'downward';
  };
}

export const ConfirmationDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  type,
  data 
}: ConfirmationDialogProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
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
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
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
