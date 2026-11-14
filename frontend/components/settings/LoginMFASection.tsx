"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api-client";
import { toast } from "@/components/ui/sonner";
import { Copy, Loader2, Shield } from "lucide-react";
import Image from "next/image";
import { StepUpDialog } from "@/components/settings/StepUpDialog";
import { appType } from "@/lib/app-type";

type LoginMFAStatus = {
  mfa_enabled: boolean;
  mfa_required: boolean;
  totp_confirmed: boolean;
  preferred_method: string;
  available_methods: string[];
  email: string;
};

export function LoginMFASection() {
  const [status, setStatus] = useState<LoginMFAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDisableStepUp, setShowDisableStepUp] = useState(false);
  const [showSetupStepUp, setShowSetupStepUp] = useState(false);
  const [showGenerateStepUp, setShowGenerateStepUp] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [codesSaved, setCodesSaved] = useState(false);

  useEffect(() => {
    if (!showBackupCodes) setCodesSaved(false);
  }, [showBackupCodes]);

  useEffect(() => {
    setCodesSaved(false);
  }, [backupCodes]);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<LoginMFAStatus>("/accounts/auth/login-mfa/status/");
      setStatus(data);
    } catch {
      toast.error("Could not load login MFA settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleEnable = async () => {
    setBusy(true);
    try {
      await apiFetch("/accounts/auth/login-mfa/enable/", { method: "POST" });
      await loadStatus();
      toast.success("Sign-in MFA enabled.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to enable MFA.");
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async (password: string) => {
    setBusy(true);
    try {
      await apiFetch("/accounts/auth/login-mfa/disable/", {
        method: "POST",
        body: JSON.stringify({ current_password: password }),
      });
      setQrCode(null);
      setSecret("");
      setVerifyCode("");
      await loadStatus();
      toast.success("Sign-in MFA disabled. The login authenticator was also removed.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to disable MFA.");
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const setupTotp = async (password?: string) => {
    setBusy(true);
    try {
      const data = await apiFetch<{ secret: string; qr_code: string }>(
        "/accounts/auth/login-mfa/totp/setup/",
        {
          method: "POST",
          body: JSON.stringify(password ? { current_password: password } : {}),
        },
      );
      setSecret(data.secret);
      setQrCode(data.qr_code);
      setShowSetupStepUp(false);
    } catch (error: unknown) {
      const status = (error as { status?: number }).status;
      if (!password && status === 400) {
        setShowSetupStepUp(true);
      } else {
        toast.error(error instanceof Error ? error.message : "TOTP setup failed.");
      }
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const handleSetupTotp = () => {
    void setupTotp().catch(() => undefined);
  };

  const handleVerifyTotp = async () => {
    if (!verifyCode.trim()) return;
    setBusy(true);
    try {
      const response = await apiFetch<{ backup_codes?: string[] }>("/accounts/auth/login-mfa/totp/verify/", {
        method: "POST",
        body: JSON.stringify({ code: verifyCode.trim() }),
      });
      if (response.backup_codes?.length) {
        setBackupCodes(response.backup_codes);
        setShowBackupCodes(true);
      }
      setVerifyCode("");
      setQrCode(null);
      await loadStatus();
      toast.success("Authenticator app verified for login.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Invalid code.");
    } finally {
      setBusy(false);
    }
  };

  const generateBackupCodes = async (password: string) => {
    setBusy(true);
    try {
      const response = await apiFetch<{ backup_codes: string[] }>(
        "/accounts/2fa/backup-codes/generate/",
        {
          method: "POST",
          body: JSON.stringify({ current_password: password }),
        },
      );
      setBackupCodes(response.backup_codes);
      setShowBackupCodes(true);
      setShowGenerateStepUp(false);
      toast.success("Backup codes generated.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to generate backup codes.");
      throw error;
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border/60 py-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasDurableLoginMethod = Boolean(
    status?.available_methods?.some((method) => method === "email" || method === "totp"),
  );
  const loginMfaActive = Boolean(status?.mfa_enabled || status?.mfa_required);
  const emailAvailable = Boolean(status?.available_methods?.includes("email"));

  return (
    <div className="rounded-xl border border-border/60">
      <div className="border-b border-border/60 px-4 py-3">
        <h2 className={`${appType.panelTitle} flex items-center gap-2`}>
          <Shield className="h-4 w-4" />
          Sign-in protection
        </h2>
        <p className={appType.caption}>
          Ask for a second check after your password when signing in. This is separate from seal protection.
        </p>
      </div>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Sign-in MFA</p>
            <p className="text-sm text-muted-foreground">
              {status?.mfa_required
                ? "Required by your administrator"
                : status?.mfa_enabled
                ? "Enabled for sign-in"
                : "Not enabled for sign-in"}
            </p>
            {emailAvailable && (
              <p className="mt-1 text-sm text-muted-foreground">
                {status?.email ? `Email codes will be sent to ${status.email} when sign-in MFA is enabled.` : "Email codes are available when sign-in MFA is enabled."}
              </p>
            )}
            {status?.mfa_required && (
              <p className="mt-1 text-sm text-muted-foreground">
                Your administrator requires an extra sign-in check. Use an available method below.
              </p>
            )}
          </div>
          <Switch
            checked={loginMfaActive}
            disabled={
              busy ||
              Boolean(status?.mfa_required) ||
              (!status?.mfa_enabled && !hasDurableLoginMethod)
            }
            onCheckedChange={(checked) => {
              if (checked) void handleEnable();
              else setShowDisableStepUp(true);
            }}
          />
        </div>

        {status && (loginMfaActive || !hasDurableLoginMethod || !emailAvailable || !status.totp_confirmed) && (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">
              {status.totp_confirmed
                ? "Authenticator app"
                : emailAvailable
                ? "Authenticator app (optional)"
                : "Choose a sign-in verification method"}
            </p>
            {emailAvailable && !status.totp_confirmed && (
              <p className="text-sm text-muted-foreground">
                {loginMfaActive
                  ? "Email codes are available for sign-in. An authenticator app is optional."
                  : "Turn on sign-in MFA above to require an email code after your password. An authenticator app is optional; setting one up will also turn on sign-in MFA."}
              </p>
            )}
            {!emailAvailable && !status.totp_confirmed && (
              <p className="text-sm text-muted-foreground">
                Add an email address or set up an authenticator app before enabling sign-in MFA.
              </p>
            )}
            {!status.totp_confirmed ? (
              <>
                <Button type="button" variant="outline" size="sm" onClick={handleSetupTotp} disabled={busy}>
                  Set up authenticator
                </Button>
                {qrCode && (
                  <div className="space-y-3">
                    <div className="relative h-40 w-40 mx-auto">
                      <Image src={qrCode} alt="TOTP QR code" fill unoptimized className="object-contain" />
                    </div>
                    <p className="text-xs text-center text-muted-foreground break-all">Secret: {secret}</p>
                    <div className="space-y-2">
                      <Label htmlFor="loginMfaCode">Verification code</Label>
                      <Input
                        id="loginMfaCode"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value)}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="6-digit code"
                      />
                      <Button type="button" size="sm" onClick={handleVerifyTotp} disabled={busy}>
                        Confirm authenticator
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">Authenticator app is available for sign-in verification.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGenerateStepUp(true)}
                  disabled={busy}
                >
                  Backup codes
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      <StepUpDialog
        open={showDisableStepUp}
        onOpenChange={setShowDisableStepUp}
        title="Disable login MFA"
        description="Confirm your password before removing the extra sign-in step."
        mode="password"
        confirmLabel="Disable MFA"
        onConfirm={handleDisable}
      />
      <StepUpDialog
        open={showSetupStepUp}
        onOpenChange={setShowSetupStepUp}
        title="Confirm authenticator setup"
        description="An authenticator is already configured. Confirm your password to view the seed again."
        mode="password"
        confirmLabel="Continue setup"
        onConfirm={async (password) => {
          await setupTotp(password);
        }}
      />
      <StepUpDialog
        open={showGenerateStepUp}
        onOpenChange={setShowGenerateStepUp}
        title="Generate backup codes"
        description="This replaces every existing backup code. Confirm your password to continue."
        mode="password"
        confirmLabel="Generate codes"
        onConfirm={generateBackupCodes}
      />
      <Dialog
        open={showBackupCodes}
        onOpenChange={(open) => {
          if (!open && backupCodes.length > 0 && !codesSaved) {
            toast.error("Confirm that you have saved the backup codes first.");
            return;
          }
          if (!open) setBackupCodes([]);
          setShowBackupCodes(open);
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Backup codes</DialogTitle>
            <DialogDescription>
              These codes work once for sign-in or seal verification. Save them now; they are hashed on the server and cannot be shown again. Generating a new set replaces existing codes.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Use each backup code once after your password when signing in or to verify a seal.
          </p>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-4 font-mono text-sm">
            {backupCodes.map((code) => (
              <div key={code} className="rounded bg-background p-2 text-center">
                {code}
              </div>
            ))}
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={codesSaved}
              onChange={(event) => setCodesSaved(event.target.checked)}
            />
            <span>I have saved these codes somewhere secure.</span>
          </label>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(backupCodes.join("\n"));
                toast.success("Backup codes copied");
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <Button
              onClick={() => setShowBackupCodes(false)}
              disabled={backupCodes.length > 0 && !codesSaved}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
