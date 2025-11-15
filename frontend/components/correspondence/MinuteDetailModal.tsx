import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Building2, FileText, User, Calendar, MessageSquare, ArrowDown, ArrowUp, Image as ImageIcon } from "lucide-react";
import { Minute } from "@/lib/npa-structure";

interface MinuteDetailModalProps {
  minute: Minute | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorName?: string;
}

export const MinuteDetailModal = ({ minute, open, onOpenChange, authorName }: MinuteDetailModalProps) => {
  if (!minute) return null;

  const getActionColor = (action: string) => {
    switch (action) {
      case 'approve': return 'bg-success/10 text-success border-success/20';
      case 'forward': return 'bg-info/10 text-info border-info/20';
      case 'treat': return 'bg-primary/10 text-primary border-primary/20';
      case 'minute': return 'bg-secondary/10 text-secondary border-secondary/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Minute Details
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6 pr-4">
            {/* Header Info */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="font-medium text-foreground">{authorName || 'Unknown Author'}</span>
                  <Badge variant="outline" className="text-xs">
                    {minute.gradeLevel}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(minute.timestamp), 'PPp')}
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Badge variant="outline" className={getActionColor(minute.actionType)}>
                  {minute.actionType.toUpperCase()}
                </Badge>
                <Badge variant="outline" className={
                  minute.direction === 'downward' 
                    ? 'bg-info/10 text-info border-info/20' 
                    : 'bg-success/10 text-success border-success/20'
                }>
                  {minute.direction === 'downward' ? (
                    <>
                      <ArrowDown className="h-3 w-3 mr-1" />
                      Downward
                    </>
                  ) : (
                    <>
                      <ArrowUp className="h-3 w-3 mr-1" />
                      Upward
                    </>
                  )}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Main Content */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Minute Content
                </h4>
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {minute.minuteText}
                  </p>
                </div>
              </div>

              {/* Additional Fields */}
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Step Number</h4>
                  <p className="text-muted-foreground">Step {minute.stepNumber}</p>
                </div>
                
                {minute.fromOfficeName && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-1 flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      From Office
                    </h4>
                    <p className="text-muted-foreground">{minute.fromOfficeName}</p>
                  </div>
                )}
                
                {minute.toOfficeName && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-1 flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      To Office
                    </h4>
                    <p className="text-muted-foreground">{minute.toOfficeName}</p>
                  </div>
                )}
                
                {minute.actedBySecretary && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Processed By</h4>
                    <Badge variant="secondary">Secretary</Badge>
                  </div>
                )}
                
                {minute.actedByAssistant && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Assistant Type</h4>
                    <Badge variant="secondary">{minute.assistantType}</Badge>
                  </div>
                )}
                
                {minute.readAt && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Read At</h4>
                    <p className="text-muted-foreground text-xs">
                      {format(new Date(minute.readAt), 'PPp')}
                    </p>
                  </div>
                )}
              </div>

              {minute.mentions && minute.mentions.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">Mentions</h4>
                    <div className="flex flex-wrap gap-2">
                      {minute.mentions.map((mention: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          @{mention}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {minute.signature && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      Digital Signature
                    </h4>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="p-3 border rounded-lg bg-muted/50">
                        <img
                          src={minute.signature.imageData}
                          alt="Applied digital signature preview"
                          className="max-h-32 object-contain"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Applied at {format(new Date(minute.signature.appliedAt), 'PPp')}</p>
                        {minute.signature.fileName && <p>Source file: {minute.signature.fileName}</p>}
                        {minute.signature.templateId && (
                          <p>Template ID: {minute.signature.templateId}</p>
                        )}
                        {minute.signature.templateType && (
                          <p>Type: {minute.signature.templateType}</p>
                        )}
                      </div>
                    </div>
                    {minute.signature.renderedText && (
                      <div className="p-3 border border-dashed rounded bg-muted/30">
                        <p className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                          {minute.signature.renderedText}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
