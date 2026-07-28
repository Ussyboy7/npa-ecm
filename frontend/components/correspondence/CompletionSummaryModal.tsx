"use client";

import { useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, FileText, Calendar, User, Clock, Download, Printer } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { formatDateTime } from "@/lib/correspondence-helpers";
import type { Correspondence, Minute } from "@/lib/npa-structure";
import { ModalErrorBoundary } from "@/components/shared/ModalErrorBoundary";

interface CompletionSummaryModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  correspondence?: Correspondence;
  minutes?: Minute[];
  documentContentHtml?: string;
}

function buildExportHtml(correspondence: Correspondence, minutes: Minute[], completionDate?: string): string {
  const rows = minutes
    .map(
      (m) =>
        `<tr><td>${m.actionType}</td><td>${m.userName || m.userEmail || "—"}</td><td>${formatDateTime(m.timestamp)}</td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Completion Summary — ${correspondence.referenceNumber}</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;max-width:800px;margin:0 auto}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}h1{font-size:1.25rem}</style></head><body>
<h1>Correspondence Completion Summary</h1>
<p><strong>Reference:</strong> ${correspondence.referenceNumber}</p>
<p><strong>Subject:</strong> ${correspondence.subject}</p>
<p><strong>Completed:</strong> ${completionDate ? formatDateTime(completionDate) : "Unknown"}</p>
<h2>Minute Trail (${minutes.length})</h2>
<table><thead><tr><th>Action</th><th>User</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
}

function CompletionSummaryModalContent({
  open = false,
  onOpenChange,
  correspondence,
  minutes = [],
  documentContentHtml
}: CompletionSummaryModalProps) {
  const finalMinute = minutes[minutes.length - 1];
  const completionDate = finalMinute?.timestamp || correspondence?.updatedAt;

  const handlePrint = useCallback(() => {
    if (!correspondence) return;
    const html = buildExportHtml(correspondence, minutes, completionDate);
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Allow pop-ups to print the completion summary");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }, [correspondence, minutes, completionDate]);

  const handleDownload = useCallback(() => {
    if (!correspondence) return;
    const html = buildExportHtml(correspondence, minutes, completionDate);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `completion-${correspondence.referenceNumber || correspondence.id}.html`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Completion summary downloaded");
  }, [correspondence, minutes, completionDate]);

  if (!correspondence) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" height="fill">
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
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Export HTML
            </Button>
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CompletionSummaryModal(props: CompletionSummaryModalProps) {
  return (
    <ModalErrorBoundary onClose={() => props.onOpenChange?.(false)}>
      <CompletionSummaryModalContent {...props} />
    </ModalErrorBoundary>
  );
}
