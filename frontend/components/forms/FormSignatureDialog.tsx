"use client";

import { useState, useEffect, useMemo } from "react";
import { logError } from '@/lib/client-logger';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ImageIcon, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { formatDateTime } from "@/lib/datetime";
import { signForm } from "@/lib/api/forms";
import { fetchUserSignature, type StoredSignature } from "@/lib/api/signatures";
import { buildDownloadUrl } from "@/lib/correspondence-url-utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { FormSignature, FormSignatureWorkflow } from "@/lib/types/forms";

interface FormSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signature: FormSignature;
  workflow: FormSignatureWorkflow;
  onSigned?: () => void;
}

function resolveSignatureImageSrc(signature: StoredSignature | null): string | null {
  if (!signature?.imageData) return null;
  if (signature.imageData.startsWith("data:")) return signature.imageData;
  return buildDownloadUrl(signature.imageData) ?? signature.imageData;
}

export function FormSignatureDialog({
  open,
  onOpenChange,
  signature,
  workflow,
  onSigned,
}: FormSignatureDialogProps) {
  const { currentUser } = useCurrentUser();
  const [userSignature, setUserSignature] = useState<StoredSignature | null>(null);
  const [signing, setSigning] = useState(false);
  const [signedDate, setSignedDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (!open || !currentUser?.id) return;

    let cancelled = false;
    void fetchUserSignature()
      .then((stored) => {
        if (cancelled) return;
        setUserSignature(stored);
        if (!stored) {
          toast.error("Please upload your digital signature in Settings → Signature first");
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        logError("Failed to load signature", error);
        setUserSignature(null);
        toast.error("Please upload your digital signature in Settings → Signature first");
      });

    return () => {
      cancelled = true;
    };
  }, [open, currentUser?.id]);

  const signatureSrc = useMemo(() => resolveSignatureImageSrc(userSignature), [userSignature]);

  const handleSign = async () => {
    if (!userSignature) {
      toast.error("Please upload your digital signature in Settings → Signature first");
      return;
    }

    try {
      setSigning(true);

      // Backend applies the Settings signature automatically — no re-upload needed.
      await signForm(workflow.id, {
        signature_id: signature.id,
        signed_date: signedDate,
      });

      toast.success("Form signed successfully");
      onSigned?.();
      onOpenChange(false);
    } catch (error: unknown) {
      logError("Error signing form:", error);
      toast.error(error instanceof Error ? error.message : "Failed to sign form");
    } finally {
      setSigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" height="fill">
        <DialogHeader>
          <DialogTitle>Sign Form: {signature.field_label}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Form Information</Label>
            <Card>
              <CardContent className="space-y-2 p-4">
                <div className="flex justify-between gap-4">
                  <span className="text-sm text-muted-foreground">Form:</span>
                  <span className="text-sm font-medium text-right">{workflow.submission_template_name}</span>
                </div>
                {workflow.submission_reference && (
                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Reference:</span>
                    <span className="text-sm font-medium text-right">{workflow.submission_reference}</span>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <span className="text-sm text-muted-foreground">Signature Field:</span>
                  <span className="text-sm font-medium text-right">{signature.field_label}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Your Signature</Label>
            <Card className="border-dashed">
              <CardContent className="space-y-4 p-4">
                {userSignature && signatureSrc ? (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <div className="flex-1 space-y-1 text-sm">
                        <p className="font-medium text-foreground">From Settings → Signature</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {formatDateTime(userSignature.uploadedAt)}
                          {userSignature.fileName ? ` • ${userSignature.fileName}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Confirm below to apply this signature to the form. To change it, update
                          Settings → Signature first.
                        </p>
                      </div>
                      <div className="self-start rounded-lg border doc-paper p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={signatureSrc}
                          alt="Your digital signature"
                          className="max-h-24 w-auto object-contain"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="text-xs">Sign Date</Label>
                      <Input
                        type="date"
                        value={signedDate}
                        onChange={(e) => setSignedDate(e.target.value)}
                        className="max-w-xs"
                      />
                    </div>

                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">
                        Your name, designation, and department will be filled from your profile.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 py-8 text-center">
                    <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">No Signature Found</p>
                      <p className="text-sm text-muted-foreground">
                        Upload your digital signature in Settings → Signature before signing forms.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href="/settings">Go to Settings</a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {(signature.assigned_to_office_name ||
            signature.assigned_to_department_name ||
            signature.assigned_to_division_name ||
            signature.assigned_to_user_name) && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Assigned To</Label>
              <Card>
                <CardContent className="space-y-2 p-4">
                  {signature.assigned_to_user_name && (
                    <div className="flex justify-between gap-4">
                      <span className="text-sm text-muted-foreground">User:</span>
                      <span className="text-sm font-medium">{signature.assigned_to_user_name}</span>
                    </div>
                  )}
                  {signature.assigned_to_office_name && (
                    <div className="flex justify-between gap-4">
                      <span className="text-sm text-muted-foreground">Office:</span>
                      <span className="text-sm font-medium">{signature.assigned_to_office_name}</span>
                    </div>
                  )}
                  {signature.assigned_to_department_name && (
                    <div className="flex justify-between gap-4">
                      <span className="text-sm text-muted-foreground">Department:</span>
                      <span className="text-sm font-medium">
                        {signature.assigned_to_department_name}
                      </span>
                    </div>
                  )}
                  {signature.assigned_to_division_name && (
                    <div className="flex justify-between gap-4">
                      <span className="text-sm text-muted-foreground">Division:</span>
                      <span className="text-sm font-medium">{signature.assigned_to_division_name}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={signing}>
            Cancel
          </Button>
          <Button onClick={handleSign} disabled={signing || !userSignature}>
            {signing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing...
              </>
            ) : (
              <>
                <ImageIcon className="mr-2 h-4 w-4" />
                Sign Form
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
