"use client";

import { useState, useEffect } from "react";
import { logError, logWarn, logInfo } from '@/lib/client-logger';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ImageIcon, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { signForm, getSignatureWorkflow } from "@/lib/api/forms";
import { loadUserSignature, type StoredSignature } from "@/lib/signature-storage";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { FormSignature, FormSignatureWorkflow } from "@/lib/types/forms";

interface FormSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signature: FormSignature;
  workflow: FormSignatureWorkflow;
  onSigned?: () => void;
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
    if (open && currentUser?.id) {
      const signature = loadUserSignature(currentUser.id);
      setUserSignature(signature);
      if (!signature) {
        toast.error("Please upload your digital signature in Settings → Signature first");
      }
    }
  }, [open, currentUser?.id]);

  const handleSign = async () => {
    if (!userSignature) {
      toast.error("Please upload your digital signature in Settings → Signature first");
      return;
    }

    try {
      setSigning(true);

      // Convert base64 signature to File
      const base64Data = userSignature.imageData.replace(/^data:image\/\w+;base64,/, "");
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/png" });
      const signatureFile = new File([blob], userSignature.fileName || "signature.png", {
        type: "image/png",
      });

      await signForm(workflow.id, {
        signature_id: signature.id,
        signature_file: signatureFile,
        signed_date: signedDate,
      });

      toast.success("Form signed successfully");
      onSigned?.();
      onOpenChange(false);
    } catch (error) {
      logError("Error signing form:", error);
      toast.error(error instanceof Error ? error.message : "Failed to sign form");
    } finally {
      setSigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Sign Form: {signature.field_label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Form Information */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Form Information</Label>
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Form:</span>
                  <span className="text-sm font-medium">{workflow.submission_template_name}</span>
                </div>
                {workflow.submission_reference && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Reference:</span>
                    <span className="text-sm font-medium">{workflow.submission_reference}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Signature Field:</span>
                  <span className="text-sm font-medium">{signature.field_label}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Digital Signature */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Digital Signature</Label>
            <Card className="border-dashed">
              <CardContent className="p-4 space-y-4">
                {userSignature ? (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1 space-y-1 text-sm">
                        <p className="font-medium text-foreground">Signature on File</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(userSignature.uploadedAt).toLocaleString()}{" "}
                          {userSignature.fileName ? `• ${userSignature.fileName}` : ""}
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg bg-background self-start">
                        <img
                          src={userSignature.imageData}
                          alt="Digital signature preview"
                          className="max-h-24 object-contain"
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

                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        Your signature will be applied to this form. Your name, designation, and
                        department will be automatically populated from your profile.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-3">
                    <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">No Signature Found</p>
                      <p className="text-sm text-muted-foreground">
                        Please upload your digital signature in Settings → Signature before signing
                        forms.
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

          {/* Assignment Information */}
          {(signature.assigned_to_office_name ||
            signature.assigned_to_department_name ||
            signature.assigned_to_division_name) && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Assigned To</Label>
              <Card>
                <CardContent className="p-4 space-y-2">
                  {signature.assigned_to_office_name && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Office:</span>
                      <span className="text-sm font-medium">{signature.assigned_to_office_name}</span>
                    </div>
                  )}
                  {signature.assigned_to_department_name && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Department:</span>
                      <span className="text-sm font-medium">
                        {signature.assigned_to_department_name}
                      </span>
                    </div>
                  )}
                  {signature.assigned_to_division_name && (
                    <div className="flex justify-between">
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
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing...
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4 mr-2" />
                Sign Form
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

