"use client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { User } from "@/lib/npa-structure";

interface ConfirmSwitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onConfirm: () => void;
  isSwitching: boolean;
}

export const ConfirmSwitchDialog = ({
  open,
  onOpenChange,
  user,
  onConfirm,
  isSwitching,
}: ConfirmSwitchDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="confirm-description">
        <DialogHeader>
          <DialogTitle>Confirm Role Switch</DialogTitle>
          <DialogDescription id="confirm-description">
            You are about to switch to <strong>{user?.name || user?.username}</strong>. 
            You will be able to return to your primary account at any time.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isSwitching}>
            {isSwitching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Switching...
              </>
            ) : (
              "Switch Role"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
