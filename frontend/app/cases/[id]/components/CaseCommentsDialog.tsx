"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CaseComments } from "@/components/cases/CaseComments";

interface CaseCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
}

export function CaseCommentsDialog({ open, onOpenChange, caseId }: CaseCommentsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" height="fill">
        <DialogHeader>
          <DialogTitle>Case comments</DialogTitle>
          <DialogDescription>Discuss this case with your team.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          {open ? <CaseComments caseId={caseId} /> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
