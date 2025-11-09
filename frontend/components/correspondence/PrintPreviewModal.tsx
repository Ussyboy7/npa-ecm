"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { generateDocumentHTML, downloadAsPDF } from '@/lib/document-generator';
import type { Correspondence, Minute } from '@/lib/npa-structure';

interface PrintPreviewModalProps {
  correspondence: Correspondence;
  minutes: Minute[];
  isOpen: boolean;
  onClose: () => void;
}

export const PrintPreviewModal = ({ correspondence, minutes, isOpen, onClose }: PrintPreviewModalProps) => {
  const handlePrint = () => {
    downloadAsPDF({ correspondence, minutes });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Print Preview & Download
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto border border-border rounded-lg bg-background">
          <iframe
            srcDoc={generateDocumentHTML({ correspondence, minutes })}
            className="w-full h-full min-h-[600px] border-0"
            title="Print Preview"
          />
        </div>

        <div className="flex items-center justify-between gap-4 pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            Preview reflects the latest document details and minute thread.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

