"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, FileText, Calendar, User, Clock } from "lucide-react";
import { formatDateTime } from "@/lib/correspondence-helpers";
import type { Correspondence, Minute } from "@/lib/npa-structure";

interface CompletionSummaryModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  correspondence?: Correspondence;
  minutes?: Minute[];
  documentContentHtml?: string;
  [key: string]: unknown;
}

export function CompletionSummaryModal({
  open = false,
  onOpenChange,
  correspondence,
  minutes = [],
  documentContentHtml
}: CompletionSummaryModalProps) {
  if (!correspondence) return null;

  const finalMinute = minutes[minutes.length - 1]; // Last minute is typically the final one
  const completionDate = finalMinute?.timestamp || correspondence.updatedAt;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Correspondence Completion Summary
          </DialogTitle>
          <DialogDescription>
            Final status and documentation for correspondence {correspondence.referenceNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Correspondence Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Correspondence Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Reference Number</label>
                  <p className="text-sm font-mono">{correspondence.referenceNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Completed
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Subject</label>
                  <p className="text-sm">{correspondence.subject}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Completed At</label>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {completionDate ? formatDateTime(completionDate) : 'Unknown'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Final Action Summary */}
          {finalMinute && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Final Action
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Action:</span>
                    <Badge variant="secondary">{finalMinute.actionType}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(finalMinute.timestamp)}
                  </div>
                </div>
                {finalMinute.minuteText && (
                  <div>
                    <span className="text-sm font-medium">Content:</span>
                    <p className="text-sm mt-1 p-3 bg-muted rounded-md">{finalMinute.minuteText}</p>
                  </div>
                )}
                {(finalMinute.userName || finalMinute.userEmail) && (
                  <div>
                    <span className="text-sm font-medium">Processed by:</span>
                    <span className="text-sm ml-2">{finalMinute.userName || finalMinute.userEmail}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Document Content Preview */}
          {documentContentHtml && (
            <Card>
              <CardHeader>
                <CardTitle>Final Document</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm max-w-none border rounded-md p-4 max-h-96 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: documentContentHtml }}
                />
              </CardContent>
            </Card>
          )}

          {/* Action Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Process Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Minutes:</span>
                <span className="font-medium">{minutes.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Final Action:</span>
                <span className="font-medium">{finalMinute?.actionType || 'Unknown'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Completion Date:</span>
                <span className="font-medium">
                  {completionDate ? formatDateTime(completionDate) : 'Unknown'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}