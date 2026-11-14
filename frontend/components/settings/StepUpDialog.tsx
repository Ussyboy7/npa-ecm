"use client";

import { useEffect, useState } from "react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type StepUpMode = "password" | "code";

interface StepUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  mode: StepUpMode;
  confirmLabel?: string;
  onConfirm: (value: string) => Promise<void>;
}

export function StepUpDialog({
  open,
  onOpenChange,
  title,
  description,
  mode,
  confirmLabel = "Confirm",
  onConfirm,
}: StepUpDialogProps) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setValue("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const submit = async () => {
    if (!value.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(value.trim());
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "password" ? (
              <Lock className="h-5 w-5" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="step-up-value">
            {mode === "password" ? "Current password" : "Authenticator code"}
          </Label>
          <Input
            id="step-up-value"
            type={mode === "password" ? "password" : "text"}
            autoComplete={mode === "password" ? "current-password" : "one-time-code"}
            inputMode={mode === "password" ? undefined : "numeric"}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submit();
            }}
            placeholder={mode === "password" ? "Enter current password" : "6-digit code"}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!value.trim() || busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}