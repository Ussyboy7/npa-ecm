"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer, Download } from "lucide-react";
import { generateDocumentHTML, downloadAsPDF } from "@/lib/document-generator";
import type { Correspondence, Minute } from "@/lib/npa-structure";

interface DocumentPreviewModalProps {
  correspondence: Correspondence;
  minutes: Minute[];
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentPreviewModal = ({ correspondence, minutes, isOpen, onClose }: DocumentPreviewModalProps) => {
  const documentHtml = useMemo(() => generateDocumentHTML({ correspondence, minutes }), [correspondence, minutes]);

  const handlePrint = () => {
    downloadAsPDF({ correspondence, minutes });
    onClose();
  };

  const handleDownloadPdf = () => {
    downloadAsPDF({ correspondence, minutes });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="max-w-6xl w-full">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg font-semibold">Correspondence Preview</DialogTitle>
          <DialogDescription>
            {correspondence.referenceNumber} · {correspondence.subject}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh] border border-border rounded-md bg-background">
          <div
            className="prose prose-base dark:prose-invert max-w-none p-6"
            dangerouslySetInnerHTML={{ __html: documentHtml }}
          />
        </ScrollArea>

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Preview reflects the latest document details and minute thread.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
